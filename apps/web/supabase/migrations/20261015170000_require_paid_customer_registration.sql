begin;

-- O webhook de pagamento é o escritor autorizado das subscrições pagas.
-- A marca de provisionamento administrativo fica em app_metadata, que o cliente não pode escrever.
create or replace function public.az_require_paid_customer_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data ->> 'azotrace_provisioned_by' = 'admin' then
    return new;
  end if;
  if not exists (
    select 1 from public.subscriptions s
    where lower(trim(s.email)) = lower(trim(new.email))
      and s.status = 'active'
      and s.expires_at > now()
      and nullif(trim(s.stripe_session_id), '') is not null
  ) then
    raise exception 'O pagamento tem de ser confirmado antes de criar a conta.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.az_require_paid_customer_registration() from public, anon, authenticated;
drop trigger if exists az_require_paid_customer_registration on auth.users;
create trigger az_require_paid_customer_registration
before insert on auth.users
for each row execute function public.az_require_paid_customer_registration();

create or replace function public.az_require_paid_onboarding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.subscriptions s
    join public.azotrace_companies c on c.id = new.company_id
    join auth.users u on u.id = c.owner_admin_user_id
    where c.active is true
      and s.status = 'active'
      and s.expires_at > now()
      and nullif(trim(s.stripe_session_id), '') is not null
      and (s.company_id = new.company_id or (
        s.company_id is null and lower(trim(s.email)) = lower(trim(u.email))
      ))
  ) then
    raise exception 'O pagamento tem de ser confirmado antes de configurar o negócio.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.az_require_paid_onboarding() from public, anon, authenticated;
drop trigger if exists az_require_paid_onboarding on public.producer_workspaces;
create trigger az_require_paid_onboarding
before insert or update on public.producer_workspaces
for each row execute function public.az_require_paid_onboarding();

commit;
