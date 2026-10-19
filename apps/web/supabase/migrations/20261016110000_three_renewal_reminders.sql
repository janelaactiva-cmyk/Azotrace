begin;
-- Preserve existing 15-day deliveries when upgrading the previous migration.
alter table public.azotrace_renewal_reminders add column if not exists reminder_days integer not null default 15;
alter table public.azotrace_renewal_reminders drop constraint if exists azotrace_renewal_reminders_subscription_id_expires_at_key;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.azotrace_renewal_reminders'::regclass and conname='az_renewal_stage_unique') then
    alter table public.azotrace_renewal_reminders add constraint az_renewal_stage_unique unique(subscription_id,expires_at,reminder_days);
    alter table public.azotrace_renewal_reminders add constraint az_renewal_stage_valid check(reminder_days in (15,10,5));
  end if;
end $$;

create or replace function public.az_claim_renewal_reminders()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  insert into public.azotrace_renewal_reminders(subscription_id,expires_at,email,customer_name,reminder_days)
  select s.id,s.expires_at,trim(s.email),coalesce(s.nome,s.nome_empresa,''),
    case when (s.expires_at at time zone 'Atlantic/Azores')::date <= (now() at time zone 'Atlantic/Azores')::date+5 then 5
      when (s.expires_at at time zone 'Atlantic/Azores')::date <= (now() at time zone 'Atlantic/Azores')::date+10 then 10 else 15 end
  from public.subscriptions s
  where s.status='active' and s.started_at<=now() and s.expires_at>now() and s.expires_at>s.started_at
    and (s.expires_at at time zone 'Atlantic/Azores')::date <= (now() at time zone 'Atlantic/Azores')::date+15
    and trim(s.email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  on conflict(subscription_id,expires_at,reminder_days) do nothing;

  update public.azotrace_renewal_reminders r set status='review',token=null,lease_until=null
  where r.status in ('pending','sending') and r.first_attempt_at<=now()-interval '23 hours'
    and (r.lease_until is null or r.lease_until<now());

  with candidates as (
    select r.id from public.azotrace_renewal_reminders r
    join public.subscriptions s on s.id=r.subscription_id and s.expires_at=r.expires_at
    where r.status in ('pending','sending') and r.retry_at<=now()
      and (r.lease_until is null or r.lease_until<now())
      and s.status='active' and s.started_at<=now() and s.expires_at>now() and s.expires_at>s.started_at
      and trim(s.email)=r.email
      and r.reminder_days=case when (s.expires_at at time zone 'Atlantic/Azores')::date <= (now() at time zone 'Atlantic/Azores')::date+5 then 5
        when (s.expires_at at time zone 'Atlantic/Azores')::date <= (now() at time zone 'Atlantic/Azores')::date+10 then 10 else 15 end
    order by r.expires_at,r.id limit 25 for update of r skip locked
  ), claimed as (
    update public.azotrace_renewal_reminders r
    set status='sending',token=gen_random_uuid(),lease_until=now()+interval '10 minutes',
        first_attempt_at=coalesce(r.first_attempt_at,now()),attempts=r.attempts+1
    from candidates c where r.id=c.id
    returning r.id,r.token,r.email,r.customer_name,r.expires_at,r.first_attempt_at,r.reminder_days
  ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
  return result;
end $$;
revoke all on function public.az_claim_renewal_reminders() from public,anon,authenticated;
grant execute on function public.az_claim_renewal_reminders() to service_role;
commit;
