begin;
-- O projeto Azotrace deve ter o esquema de utilizadores e permissões instalado.
do $preflight$
begin
 if to_regclass('public.profiles') is null then
  raise exception 'Falta public.profiles. Instala primeiro as migracoes de base do Azotrace.';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='platform_role')
 or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='active') then
  raise exception 'Faltam as permissoes de plataforma. Instala primeiro a migracao RBAC do Azotrace.';
 end if;
end $preflight$;
create table if not exists public.azotrace_plan_catalog(
 id text primary key check(id='azotrace'),data jsonb not null,
 version integer not null default 1 check(version>0),updated_at timestamptz not null default now()
);
insert into public.azotrace_plan_catalog(id,data) values('azotrace',$catalog${"plans":[{"id":"Base","annualCents":23988,"description":"Para pequenos produtores que querem organizar a produção.","recommended":false,"businesses":1,"users":2,"databaseMb":100,"storageGb":1,"supportDays":3,"supportPriority":"normal","reports":"Relatórios básicos","features":["Registo das etapas e histórico dos lotes","Página pública com QR code e gráficos","Três templates para a página pública"]},{"id":"Essential","annualCents":37188,"description":"Para equipas em crescimento com vários negócios.","recommended":true,"businesses":3,"users":5,"databaseMb":500,"storageGb":5,"supportDays":2,"supportPriority":"elevada","reports":"Comparação de etapas e lotes","features":["Registo das etapas e histórico dos lotes","Página pública com QR code e gráficos","Três templates para a página pública"]},{"id":"Pro","annualCents":85188,"description":"Para empresas que procuram uma visão global da produção.","recommended":false,"businesses":10,"users":15,"databaseMb":2048,"storageGb":20,"supportDays":1,"supportPriority":"máxima","reports":"Análise global dos negócios","features":["Registo das etapas e histórico dos lotes","Página pública com QR code e gráficos","Três templates para a página pública"]}]}$catalog$::jsonb) on conflict(id) do nothing;
create table if not exists public.azotrace_plan_catalog_history(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,changed_at timestamptz not null default now(),
 previous_version integer not null,next_version integer not null,before_data jsonb not null,after_data jsonb not null
);
alter table public.azotrace_plan_catalog enable row level security;
alter table public.azotrace_plan_catalog_history enable row level security;
drop policy if exists public_catalog_read on public.azotrace_plan_catalog;
create policy public_catalog_read on public.azotrace_plan_catalog for select to anon,authenticated using(id='azotrace');
grant select on public.azotrace_plan_catalog to anon,authenticated;
revoke insert,update,delete on public.azotrace_plan_catalog from anon,authenticated;
revoke all on public.azotrace_plan_catalog_history from anon,authenticated;
grant all on public.azotrace_plan_catalog,public.azotrace_plan_catalog_history to service_role;
create or replace function public.az_update_plan_catalog(input jsonb,expected_version integer,actor_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $fn$
declare previous public.azotrace_plan_catalog; next_row public.azotrace_plan_catalog; p jsonb; amount bigint; prior_amount bigint:=0; names text[]:=array['Base','Essential','Pro']; i integer:=0;
begin
 if not exists(select 1 from public.profiles where id=actor_id and active is true and platform_role='superadmin') then raise exception 'Só o Super Admin pode gerir os planos.' using errcode='42501';end if;
 if jsonb_typeof(input->'plans') is distinct from 'array' or jsonb_array_length(input->'plans')<>3 then raise exception 'Catálogo inválido.';end if;
 for p in select value from jsonb_array_elements(input->'plans') loop
  i:=i+1;amount:=(p->>'annualCents')::bigint;
  if p->>'id' is distinct from names[i] or amount is null or amount<100 or amount>10000000 or amount<=prior_amount then raise exception 'Planos ou preços inválidos.';end if;
  prior_amount:=amount;
 end loop;
 select * into previous from public.azotrace_plan_catalog where id='azotrace' for update;
 if previous.version is distinct from expected_version then raise exception 'Outro administrador alterou os planos.' using errcode='40001';end if;
 if previous.data=input then return previous.data||jsonb_build_object('version',previous.version);end if;
 update public.azotrace_plan_catalog set data=input,version=version+1,updated_at=now() where id='azotrace' returning * into next_row;
 insert into public.azotrace_plan_catalog_history(actor_id,previous_version,next_version,before_data,after_data)values(actor_id,previous.version,next_row.version,previous.data,next_row.data);
 return next_row.data||jsonb_build_object('version',next_row.version);
end $fn$;
revoke all on function public.az_update_plan_catalog(jsonb,integer,uuid) from public,anon,authenticated;
grant execute on function public.az_update_plan_catalog(jsonb,integer,uuid) to service_role;
-- The existing subscription RPCs now obtain prices from the same catalogue.
create or replace function public.az_billing_price(plan text) returns numeric language sql stable security definer set search_path='' as $fn$
 select (entry->>'annualCents')::numeric/100 from public.azotrace_plan_catalog c cross join lateral jsonb_array_elements(c.data->'plans') entry where c.id='azotrace' and entry->>'id'=plan
$fn$;
notify pgrst, 'reload schema';
commit;
