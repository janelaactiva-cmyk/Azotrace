-- Azotrace: subscrições reais e alterações confirmadas pelo Stripe.
begin;
create or replace function public.az_online_context(target_user_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor public.profiles%rowtype; effective public.profiles%rowtype;
  member public.azotrace_company_members%rowtype; app_role text; company text;
  company_rows jsonb; permissions jsonb; business_ids jsonb; businesses jsonb;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or actor.active is not true then raise exception 'Sessão inválida, conta inativa ou perfil em falta.' using errcode='42501'; end if;
  effective := actor;
  if target_user_id is not null and target_user_id <> actor.id then
    if actor.platform_role is distinct from 'superadmin' then raise exception 'Só o Super Admin pode entrar como outro utilizador.' using errcode='42501'; end if;
    select * into effective from public.profiles where id = target_user_id;
    if effective.id is null or effective.active is not true then raise exception 'Utilizador inexistente ou inativo.' using errcode='42501'; end if;
  end if;
  if effective.platform_role = 'superadmin' then
    app_role := 'superadmin';
    permissions := '["dashboard.view","users.manage","billing.manage","chatbot.manage","rgpd.manage","security.view"]'::jsonb;
    business_ids := '[]'::jsonb;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'active',active,'ownerAdminUserId',owner_admin_user_id,'createdAt',created_at,'updatedAt',updated_at) order by name),'[]'::jsonb) into company_rows from public.azotrace_companies;
    -- O Super Admin recebe metadados; não descarrega estados operacionais.
    select coalesce(jsonb_agg(jsonb_build_object('id',business_id,'companyId',company_id,'name',business_name,'kind',business_kind)),'[]'::jsonb) into businesses from public.producer_workspaces;
  else
    if (select count(*) from public.azotrace_company_members where user_id=effective.id and active is true) <> 1 then
      raise exception 'O utilizador deve estar associado a uma única empresa ativa.' using errcode='42501';
    end if;
    select * into member from public.azotrace_company_members where user_id=effective.id and active is true;
    company := member.company_id;
    if not exists(select 1 from public.azotrace_companies where id=company and active is true) then raise exception 'A empresa está inativa.' using errcode='42501'; end if;
    app_role := case when member.role = 'admin' then 'admin' else case when member.app_role in ('manager','operator','quality','traceability','viewer','custom') then member.app_role else 'viewer' end end;
    select coalesce(jsonb_agg(permission),'[]'::jsonb) into permissions from public.azotrace_user_permissions where user_id=effective.id and company_id=company and permission <> 'chatbot.manage' and (permission <> 'billing.manage' or app_role='admin');
    if app_role='admin' and not (permissions ? 'billing.manage') then permissions := permissions || '["billing.manage"]'::jsonb; end if;
    select coalesce(jsonb_agg(a.business_id),'[]'::jsonb) into business_ids from public.azotrace_business_access a join public.producer_workspaces w on w.business_id=a.business_id where a.user_id=effective.id and w.company_id=company;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'active',active,'ownerAdminUserId',owner_admin_user_id,'createdAt',created_at,'updatedAt',updated_at)),'[]'::jsonb) into company_rows from public.azotrace_companies where id=company;
    select coalesce(jsonb_agg(jsonb_build_object('id',w.business_id,'companyId',w.company_id,'name',w.business_name,'kind',w.business_kind,'state',w.state,'accentColor',w.accent_color)),'[]'::jsonb) into businesses from public.producer_workspaces w where w.company_id=company and (app_role='admin' or business_ids ? w.business_id);
  end if;
  return jsonb_build_object('user',jsonb_build_object('id',effective.id,'name',coalesce(effective.name,effective.email,'Utilizador'),'email',effective.email,'role',app_role,'active',true,'companyId',company,'permissions',permissions,'businessIds',business_ids,'createdAt',effective.created_at,'updatedAt',effective.updated_at),'companies',company_rows,'businesses',businesses,'canImpersonate',actor.platform_role='superadmin');
end $$;
revoke all on function public.az_online_context(uuid) from public, anon;
grant execute on function public.az_online_context(uuid) to authenticated;


-- Usa o tipo real de azotrace_companies.id (as versões locais usam text).
do $$
declare company_type text;
begin
  if to_regclass('public.subscriptions') is null
    or to_regclass('public.azotrace_companies') is null
    or to_regclass('public.azotrace_company_members') is null
    or to_regclass('public.profiles') is null then
    raise exception 'Falta o esquema Azotrace: subscriptions, companies, members e profiles são obrigatórios.';
  end if;
  select format_type(a.atttypid, a.atttypmod) into company_type
    from pg_attribute a where a.attrelid = 'public.azotrace_companies'::regclass
    and a.attname = 'id' and not a.attisdropped;
  execute format('alter table public.subscriptions add column if not exists company_id %s', company_type);
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass and conname = 'subscriptions_company_id_fkey') then
    alter table public.subscriptions add constraint subscriptions_company_id_fkey
      foreign key (company_id) references public.azotrace_companies(id) on delete restrict;
  end if;
end $$;

create index if not exists subscriptions_company_started_idx
  on public.subscriptions(company_id, started_at desc, id desc);
comment on column public.subscriptions.company_id is
  'Empresa titular. NULL = compra anterior à associação ou correspondência ambígua; só o Super Admin a consulta.';

-- O email só serve para MIGRAR/ASSOCIAR compras antigas. Nunca concede acesso.
-- Exige um perfil ativo, membro Admin ativo de uma única empresa ativa.
-- Um nome que aponta para outra empresa torna a associação ambígua.
create or replace function public.az_subscription_company_for_email(target_email text, target_name text default '')
returns text language sql stable security definer set search_path = '' as $$
  with email_candidates as (
    select distinct c.id::text as id
    from public.azotrace_companies c
    join public.azotrace_company_members m on m.company_id = c.id
    join public.profiles p on p.id = m.user_id
    where c.active is true and m.active is true and m.role::text = 'admin'
      and p.active is true and coalesce(p.platform_role::text, 'user') <> 'superadmin'
      and nullif(btrim(target_email), '') is not null
      and lower(btrim(p.email)) = lower(btrim(target_email))
  ), name_candidates as (
    select c.id::text as id from public.azotrace_companies c
    where c.active is true and nullif(btrim(target_name), '') is not null
      and lower(btrim(c.name)) = lower(btrim(target_name))
  )
  select case when count(*) = 1 and not exists (
    select 1 from name_candidates n where n.id <> (select min(e.id) from email_candidates e)
  ) then min(id) else null end from email_candidates;
$$;
revoke all on function public.az_subscription_company_for_email(text, text) from public, anon, authenticated;
grant execute on function public.az_subscription_company_for_email(text, text) to service_role;

-- Idempotente: só associa registos ainda sem empresa; nunca transfere titularidade.
create or replace function public.az_backfill_subscription_companies()
returns bigint language plpgsql security definer set search_path = '' as $$
declare affected bigint;
begin
  update public.subscriptions s set company_id = c.id
  from public.azotrace_companies c
  where s.company_id is null
    and c.id::text = public.az_subscription_company_for_email(s.email, s.nome_empresa);
  get diagnostics affected = row_count;
  return affected;
end $$;
revoke all on function public.az_backfill_subscription_companies() from public, anon, authenticated;
grant execute on function public.az_backfill_subscription_companies() to service_role;
select public.az_backfill_subscription_companies();

-- Compras feitas antes da criação do Admin permanecem pendentes até à associação.
create or replace function public.az_subscription_assign_company()
returns trigger language plpgsql security definer set search_path = '' as $$
declare resolved text;
begin
  if new.company_id is null then
    resolved := public.az_subscription_company_for_email(new.email, new.nome_empresa);
    if resolved is not null then new.company_id := resolved; end if;
  end if;
  return new;
end $$;
revoke all on function public.az_subscription_assign_company() from public, anon, authenticated;
drop trigger if exists az_subscription_assign_company on public.subscriptions;
create trigger az_subscription_assign_company before insert or update of email, nome_empresa
  on public.subscriptions for each row execute function public.az_subscription_assign_company();

-- Reavalia apenas compras pendentes quando o Admin passa a existir na BD.
create or replace function public.az_subscription_membership_link()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role::text = 'admin' and new.active is true then
    perform public.az_backfill_subscription_companies();
  end if;
  return new;
end $$;
revoke all on function public.az_subscription_membership_link() from public, anon, authenticated;
drop trigger if exists az_subscription_membership_link on public.azotrace_company_members;
create trigger az_subscription_membership_link after insert or update of company_id, user_id, role, active
  on public.azotrace_company_members for each row execute function public.az_subscription_membership_link();

-- Protege também consultas diretas ao Supabase, além da validação na API.
create or replace function public.az_can_read_subscription(target_company_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.active is true
      and (p.platform_role::text = 'superadmin' or exists (
        select 1 from public.azotrace_company_members m
        join public.azotrace_companies c on c.id = m.company_id
        where m.user_id = p.id and m.company_id::text = target_company_id
          and m.role::text = 'admin' and m.active is true and c.active is true
      ))
  );
$$;
revoke all on function public.az_can_read_subscription(text) from public, anon, authenticated;
grant execute on function public.az_can_read_subscription(text) to authenticated;
alter table public.subscriptions enable row level security;
revoke all on table public.subscriptions from public, anon, authenticated;
grant select on table public.subscriptions to authenticated;
grant all on table public.subscriptions to service_role;

-- As restritivas limitam políticas antigas permissivas, sem as apagar.
drop policy if exists az_subscription_read on public.subscriptions;
drop policy if exists az_subscription_read_scope on public.subscriptions;
drop policy if exists az_subscription_no_client_insert on public.subscriptions;
drop policy if exists az_subscription_no_client_update on public.subscriptions;
drop policy if exists az_subscription_no_client_delete on public.subscriptions;
create policy az_subscription_read on public.subscriptions for select to authenticated
  using (public.az_can_read_subscription(company_id::text));
create policy az_subscription_read_scope on public.subscriptions as restrictive for select to public
  using (public.az_can_read_subscription(company_id::text));
create policy az_subscription_no_client_insert on public.subscriptions as restrictive for insert to public
  with check (false);
create policy az_subscription_no_client_update on public.subscriptions as restrictive for update to public
  using (false) with check (false);
create policy az_subscription_no_client_delete on public.subscriptions as restrictive for delete to public
  using (false);


alter table public.subscriptions add column if not exists billing_version bigint not null default 1;
alter table public.subscriptions add column if not exists billing_history jsonb not null default '[]';
alter table public.subscriptions add column if not exists billing_updated_at timestamptz not null default now();
create or replace function public.az_subscription_revision() returns trigger language plpgsql set search_path='' as $$
begin new.billing_version:=old.billing_version+1; new.billing_updated_at:=clock_timestamp(); return new; end $$;
drop trigger if exists az_subscription_revision on public.subscriptions;
create trigger az_subscription_revision before update on public.subscriptions for each row execute function public.az_subscription_revision();

create or replace function public.az_billing_plan(raw text) returns text language sql immutable set search_path='' as $$
select case lower(btrim(raw)) when 'base' then 'Base' when 'essential' then 'Essential' when 'pro' then 'Pro' else null end $$;
create or replace function public.az_billing_price(plan text) returns numeric language sql immutable set search_path='' as $$
select case plan when 'Base' then 239.88 when 'Essential' then 371.88 when 'Pro' then 851.88 else null end $$;
create or replace function public.az_billing_row(s public.subscriptions) returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object('id',s.id,'companyId',coalesce(s.company_id,''),'plan',public.az_billing_plan(s.plan_name),'planName',s.plan_name,'status',s.status,'startedAt',s.started_at,'expiresAt',s.expires_at,'billingName',coalesce(s.nome,s.nome_empresa,''),'billingEmail',coalesce(s.email,''),'nif',coalesce(s.nif_empresa,s.nif,''),'address',coalesce(s.morada,''),'createdAt',s.created_at,'updatedAt',s.billing_updated_at,'version',s.billing_version,'history',s.billing_history,'stripeSessionId',s.stripe_session_id);
$$;
create table if not exists public.azotrace_billing_orders (
 id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.subscriptions(id), company_id text not null references public.azotrace_companies(id),
 expected_version bigint not null, expected_plan text not null, target_plan text not null,
 amount_cents bigint not null check(amount_cents>0), currency text not null default 'eur',
 stripe_session_id text unique, status text not null default 'pending' check(status in ('pending','applied','conflict','expired')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours', paid_at timestamptz
);
create unique index if not exists az_billing_one_pending on public.azotrace_billing_orders(subscription_id) where status='pending';
alter table public.azotrace_billing_orders enable row level security;
revoke all on public.azotrace_billing_orders from public, anon, authenticated;
grant all on public.azotrace_billing_orders to service_role;

create or replace function public.az_billing_snapshot(target_user_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare context jsonb; effective jsonb; rows jsonb; eligible jsonb; contacts jsonb; orders jsonb;
begin
 context:=public.az_online_context(target_user_id); effective:=context->'user';
 if effective->>'role' not in ('superadmin','admin') then raise exception 'Sem acesso a subscrições.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(public.az_billing_row(s) order by s.started_at desc nulls last,s.created_at desc),'[]') into rows from public.subscriptions s where effective->>'role'='superadmin' or s.company_id=effective->>'companyId';
 select coalesce(jsonb_agg(c.id),'[]') into eligible from public.azotrace_companies c where c.active is true and (effective->>'role'='superadmin' or c.id=effective->>'companyId') and exists(select 1 from public.azotrace_company_members m join public.profiles p on p.id=m.user_id where m.company_id=c.id and m.active is true and m.role='admin' and p.active is true);
 select coalesce(jsonb_agg(jsonb_build_object('companyId',m.company_id,'name',p.name,'email',p.email)),'[]') into contacts from public.azotrace_company_members m join public.profiles p on p.id=m.user_id where m.active is true and m.role='admin' and p.active is true and (effective->>'role'='superadmin' or m.company_id=effective->>'companyId');
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'subscriptionId',o.subscription_id,'targetPlan',o.target_plan,'status',o.status,'amountCents',o.amount_cents,'createdAt',o.created_at)),'[]') into orders from public.azotrace_billing_orders o where effective->>'role'='superadmin' or o.company_id=effective->>'companyId';
 return context||jsonb_build_object('subscriptions',rows,'eligibleCompanyIds',eligible,'billingContacts',contacts,'orders',orders);
end $$;

create or replace function public.az_billing_change(input jsonb, target_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare effective jsonb; s public.subscriptions%rowtype; plan text; event jsonb; company text;
begin
 effective:=public.az_online_context(target_user_id)->'user';
 if effective->>'role' not in ('superadmin','admin') then raise exception 'Sem acesso a subscrições.' using errcode='42501'; end if;
 select * into s from public.subscriptions where id=(input->>'id')::uuid for update;
 if s.id is null then raise exception 'Subscrição inexistente.'; end if;
 if effective->>'role'='admin' and s.company_id is distinct from effective->>'companyId' then raise exception 'Esta subscrição pertence a outra empresa.' using errcode='42501'; end if;
 if s.billing_version is distinct from (input->>'version')::bigint then raise exception 'A subscrição mudou. Atualize a página.' using errcode='40001'; end if;
 if input->>'action'='associate' then
  if effective->>'role'<>'superadmin' or s.company_id is not null then raise exception 'Só o Super Admin pode associar uma compra pendente.' using errcode='42501'; end if;
  company:=input->>'companyId';
  if not exists(select 1 from public.azotrace_companies c join public.azotrace_company_members m on m.company_id=c.id join public.profiles p on p.id=m.user_id where c.id=company and c.active is true and m.active is true and m.role='admin' and p.active is true) then raise exception 'Selecione uma empresa com Admin ativo.'; end if;
  event:=jsonb_build_object('id',gen_random_uuid(),'date',now(),'action','Compra associada à empresa','oldPlan',null,'newPlan',s.plan_name);
  update public.subscriptions set company_id=company,billing_history=jsonb_build_array(event)||billing_history where id=s.id returning * into s;
 elsif input->>'action'='downgrade' then
  plan:=input->>'plan';
  if s.company_id is null or public.az_billing_plan(s.plan_name) is null or public.az_billing_price(plan) is null or public.az_billing_price(plan)>=public.az_billing_price(public.az_billing_plan(s.plan_name)) then raise exception 'Downgrade inválido.'; end if;
  if s.status<>'active' or s.started_at is null or s.started_at>now() or s.expires_at is null or s.expires_at<=now() then raise exception 'A subscrição não está ativa.'; end if;
  if exists(select 1 from public.azotrace_billing_orders where subscription_id=s.id and status='pending' and expires_at>now()) then raise exception 'Existe um pagamento pendente. Conclua-o ou aguarde a expiração antes de alterar o plano.'; end if;
  event:=jsonb_build_object('id',gen_random_uuid(),'date',now(),'action','Downgrade imediato, sem reembolso','oldPlan',s.plan_name,'newPlan',plan);
  update public.subscriptions set plan_name=plan,billing_history=jsonb_build_array(event)||billing_history where id=s.id returning * into s;
 else raise exception 'Operação inválida.'; end if;
 return public.az_billing_row(s);
end $$;

create or replace function public.az_billing_prepare(input jsonb, target_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare effective jsonb; s public.subscriptions%rowtype; o public.azotrace_billing_orders%rowtype; plan text; cents bigint;
begin
 effective:=public.az_online_context(target_user_id)->'user';
 if effective->>'role' not in ('superadmin','admin') then raise exception 'Sem acesso a subscrições.' using errcode='42501'; end if;
 select * into s from public.subscriptions where id=(input->>'id')::uuid for update;
 if s.id is null then raise exception 'Subscrição inexistente.'; end if;
 if s.company_id is null or (effective->>'role'='admin' and s.company_id is distinct from effective->>'companyId') then raise exception 'Sem acesso a esta subscrição.' using errcode='42501'; end if;
 if s.billing_version is distinct from (input->>'version')::bigint then raise exception 'A subscrição mudou. Atualize a página.' using errcode='40001'; end if;
 plan:=input->>'plan';
 if public.az_billing_plan(s.plan_name) is null or public.az_billing_price(plan) is null or public.az_billing_price(plan)<=public.az_billing_price(public.az_billing_plan(s.plan_name)) then raise exception 'Upgrade inválido ou plano antigo por identificar.'; end if;
 if s.status<>'active' or s.started_at is null or s.started_at>now() or s.expires_at is null or s.expires_at<=now() or s.expires_at<=s.started_at then raise exception 'A subscrição não está ativa.'; end if;
 select * into o from public.azotrace_billing_orders where subscription_id=s.id and status='pending' for update;
 if o.id is not null and o.expires_at>now() then
  if o.target_plan<>plan or o.expected_version<>s.billing_version then raise exception 'Já existe um pagamento pendente para outra alteração.'; end if;
  return to_jsonb(o)||jsonb_build_object('email',s.email);
 elsif o.id is not null then update public.azotrace_billing_orders set status='expired' where id=o.id; end if;
 -- Mantém o IVA de 16% do checkout existente. O valor vem sempre do servidor.
 cents:=round((public.az_billing_price(plan)-public.az_billing_price(public.az_billing_plan(s.plan_name)))*1.16*100*extract(epoch from (s.expires_at-now()))/extract(epoch from (s.expires_at-s.started_at)));
 if cents<50 then raise exception 'O ajuste é inferior ao mínimo de pagamento. Aguarde a renovação.'; end if;
 insert into public.azotrace_billing_orders(subscription_id,company_id,expected_version,expected_plan,target_plan,amount_cents) values(s.id,s.company_id,s.billing_version,s.plan_name,plan,cents) returning * into o;
 return to_jsonb(o)||jsonb_build_object('email',s.email);
end $$;

-- Só o webhook assinado, usando service_role, confirma o pagamento.
create or replace function public.az_billing_apply(order_id uuid, session_id text, paid_amount bigint, paid_currency text)
returns text language plpgsql security definer set search_path='' as $$
declare o public.azotrace_billing_orders%rowtype; s public.subscriptions%rowtype; event jsonb;
begin
 -- Mesma ordem de locks que prepare/downgrade para evitar deadlocks.
 select * into o from public.azotrace_billing_orders where id=order_id;
 if o.id is null then raise exception 'Pedido de pagamento inexistente.'; end if;
 select * into s from public.subscriptions where id=o.subscription_id for update;
 select * into o from public.azotrace_billing_orders where id=order_id for update;
 if o.stripe_session_id is distinct from session_id or o.amount_cents is distinct from paid_amount or o.currency is distinct from paid_currency then raise exception 'Pagamento não corresponde ao pedido.'; end if;
 if o.status='applied' then return 'applied'; end if;
 if o.status='conflict' then return 'conflict'; end if;
 if o.status<>'pending' or s.billing_version<>o.expected_version or s.plan_name<>o.expected_plan or s.company_id<>o.company_id or s.status<>'active' or s.expires_at<=now() then
  update public.azotrace_billing_orders set status='conflict',paid_at=now() where id=o.id; return 'conflict';
 end if;
 event:=jsonb_build_object('id',o.id,'date',now(),'action','Upgrade pago pelo Stripe','oldPlan',s.plan_name,'newPlan',o.target_plan,'stripeSessionId',session_id,'amountCents',paid_amount);
 update public.subscriptions set plan_name=o.target_plan,billing_history=jsonb_build_array(event)||billing_history where id=s.id;
 update public.azotrace_billing_orders set status='applied',paid_at=now() where id=o.id;
 return 'applied';
end $$;
revoke all on function public.az_billing_apply(uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function public.az_billing_apply(uuid,text,bigint,text) to service_role;
revoke all on function public.az_billing_snapshot(uuid),public.az_billing_change(jsonb,uuid),public.az_billing_prepare(jsonb,uuid) from public,anon;
grant execute on function public.az_billing_snapshot(uuid),public.az_billing_change(jsonb,uuid),public.az_billing_prepare(jsonb,uuid) to authenticated;
revoke insert,update,delete on public.profiles,public.azotrace_companies,public.azotrace_company_members,public.azotrace_user_permissions,public.azotrace_business_access from anon,authenticated;
create or replace function public.az_billing_admin(input jsonb,target_user_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare effective jsonb; s public.subscriptions%rowtype; f jsonb; company text; plan text; started timestamptz; expires timestamptz; event jsonb;
begin
 effective:=public.az_online_context(target_user_id)->'user';
 if effective->>'role'<>'superadmin' then raise exception 'Só o Super Admin pode registar e editar dados.' using errcode='42501'; end if;
 f:=input->'fields'; company:=f->>'companyId'; plan:=f->>'plan';
 if f->>'status' is null or f->>'status' not in ('active','inactive','canceled') then raise exception 'Estado inválido.'; end if;
 if not exists(select 1 from public.azotrace_companies c join public.azotrace_company_members m on m.company_id=c.id join public.profiles p on p.id=m.user_id where c.id=company and c.active is true and m.active is true and m.role='admin' and p.active is true) then raise exception 'Empresa sem Admin ativo.'; end if;
 started:=nullif(f->>'startedAt','')::timestamptz; expires:=nullif(f->>'expiresAt','')::timestamptz;
 if started is null or expires is null or expires<=started then raise exception 'Datas inválidas.'; end if;
 if input->>'action'='create' then
  perform 1 from public.azotrace_companies where id=company for update;
  if public.az_billing_price(plan) is null then raise exception 'Plano inválido.'; end if;
  if exists(select 1 from public.subscriptions where company_id=company and status='active' and expires_at>now()) then raise exception 'Já existe uma subscrição ativa para esta empresa.'; end if;
  event:=jsonb_build_object('id',gen_random_uuid(),'date',now(),'action','Registo manual pelo Super Admin, sem cobrança','oldPlan',null,'newPlan',plan);
  insert into public.subscriptions(company_id,plan_name,status,started_at,expires_at,nome,email,nif,morada,billing_history)
   values(company,plan,f->>'status',started,expires,left(f->>'billingName',200),left(f->>'billingEmail',254),left(f->>'nif',40),left(f->>'address',1000),jsonb_build_array(event)) returning * into s;
 elsif input->>'action'='update' then
  select * into s from public.subscriptions where id=(input->>'id')::uuid for update;
  if s.id is null then raise exception 'Subscrição inexistente.'; end if;
  if s.company_id is distinct from company or s.billing_version is distinct from (input->>'version')::bigint then raise exception 'A subscrição mudou ou a empresa não corresponde.'; end if;
  if public.az_billing_plan(s.plan_name) is not null and plan is distinct from public.az_billing_plan(s.plan_name) then raise exception 'Utilize upgrade ou downgrade para alterar um plano identificado.'; end if;
  if public.az_billing_plan(s.plan_name) is null and plan is distinct from s.plan_name and public.az_billing_price(plan) is null then raise exception 'Plano inválido.'; end if;
  if exists(select 1 from public.azotrace_billing_orders where subscription_id=s.id and status='pending' and expires_at>now()) then raise exception 'Existe um pagamento pendente.'; end if;
  event:=jsonb_build_object('id',gen_random_uuid(),'date',now(),'action','Dados atualizados pelo Super Admin','oldPlan',s.plan_name,'newPlan',plan);
  update public.subscriptions set plan_name=case when public.az_billing_plan(s.plan_name) is null then plan else s.plan_name end,
   status=f->>'status',started_at=started,expires_at=expires,nome=left(f->>'billingName',200),email=left(f->>'billingEmail',254),
   nif=case when is_commercial then nif else left(f->>'nif',40) end,nif_empresa=case when is_commercial then left(f->>'nif',40) else nif_empresa end,
   morada=left(f->>'address',1000),billing_history=jsonb_build_array(event)||billing_history where id=s.id returning * into s;
 else raise exception 'Operação inválida.'; end if;
 return public.az_billing_row(s);
end $$;
revoke all on function public.az_billing_admin(jsonb,uuid) from public,anon;
grant execute on function public.az_billing_admin(jsonb,uuid) to authenticated;

commit;
-- Compras por associar: aparecem na página do Super Admin.
select id,email,plan_name,status from public.subscriptions where company_id is null;
