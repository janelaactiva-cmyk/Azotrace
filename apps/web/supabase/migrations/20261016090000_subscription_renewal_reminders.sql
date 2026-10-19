begin;

create table if not exists public.azotrace_renewal_reminders (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  expires_at timestamptz not null,
  email text not null,
  customer_name text not null default '',
  status text not null default 'pending' check (status in ('pending','sending','sent','review')),
  token uuid,
  lease_until timestamptz,
  first_attempt_at timestamptz,
  retry_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_id text,
  attempts integer not null default 0,
  unique(subscription_id, expires_at)
);
alter table public.azotrace_renewal_reminders enable row level security;
revoke all on public.azotrace_renewal_reminders from public, anon, authenticated;
grant all on public.azotrace_renewal_reminders to service_role;

create or replace function public.az_claim_renewal_reminders()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  insert into public.azotrace_renewal_reminders(subscription_id,expires_at,email,customer_name)
  select s.id,s.expires_at,trim(s.email),coalesce(s.nome,s.nome_empresa,'')
  from public.subscriptions s
  where s.status='active' and s.started_at<=now() and s.expires_at>now()
    and s.expires_at>s.started_at
    and (s.expires_at at time zone 'Atlantic/Azores')::date
      <= (now() at time zone 'Atlantic/Azores')::date + 15
    and trim(s.email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  on conflict(subscription_id,expires_at) do nothing;

  -- The provider retains idempotency keys for 24h. Ambiguous old attempts
  -- require reconciliation rather than risking a duplicate email later.
  update public.azotrace_renewal_reminders r set status='review',token=null,lease_until=null
  where r.status in ('pending','sending') and r.first_attempt_at<=now()-interval '23 hours'
    and (r.lease_until is null or r.lease_until<now());

  with candidates as (
    select r.id from public.azotrace_renewal_reminders r
    join public.subscriptions s on s.id=r.subscription_id and s.expires_at=r.expires_at
    where r.status in ('pending','sending') and r.retry_at<=now()
      and (r.lease_until is null or r.lease_until<now())
      and s.status='active' and s.started_at<=now() and s.expires_at>now()
      and s.expires_at>s.started_at
      and trim(s.email)=r.email
    order by r.expires_at,r.id limit 25 for update of r skip locked
  ), claimed as (
    update public.azotrace_renewal_reminders r
    set status='sending',token=gen_random_uuid(),lease_until=now()+interval '10 minutes',
        first_attempt_at=coalesce(r.first_attempt_at,now()),attempts=r.attempts+1
    from candidates c where r.id=c.id
    returning r.id,r.token,r.email,r.customer_name,r.expires_at,r.first_attempt_at
  ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
  return result;
end $$;

create or replace function public.az_finish_renewal_reminder(reminder_id uuid,claim_token uuid,provider_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  update public.azotrace_renewal_reminders r
  set status=case when $3 is null then 'pending' else 'sent' end,
      provider_id=$3,sent_at=case when $3 is null then null else now() end,
      token=null,lease_until=null,retry_at=now()+interval '15 minutes'
  where r.id=$1 and r.token=$2 and r.status='sending';
  get diagnostics affected = row_count;
  return affected=1;
end $$;
revoke all on function public.az_claim_renewal_reminders() from public,anon,authenticated;
revoke all on function public.az_finish_renewal_reminder(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.az_claim_renewal_reminders() to service_role;
grant execute on function public.az_finish_renewal_reminder(uuid,uuid,text) to service_role;

commit;
