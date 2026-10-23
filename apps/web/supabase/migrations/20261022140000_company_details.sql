begin;

alter table public.azotrace_companies
  add column if not exists legal_name text not null default '',
  add column if not exists nif text not null default '',
  add column if not exists address text not null default '',
  add column if not exists city text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists contact_name text not null default '',
  add column if not exists website text not null default '',
  add column if not exists suspension_reason text not null default '',
  add column if not exists details_version integer not null default 0 check (details_version >= 0);

-- Preserve the existing company identifier type (text or uuid).
do $schema$ declare company_type text; begin
select pg_catalog.format_type(atttypid,atttypmod) into company_type from pg_catalog.pg_attribute
where attrelid='public.azotrace_companies'::regclass and attname='id' and not attisdropped;
execute format($table$ create table if not exists public.azotrace_company_changes (
  id uuid primary key default gen_random_uuid(),
  company_id %s not null references public.azotrace_companies(id) on delete cascade,
  version integer not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  actor_role text not null check (actor_role in ('superadmin','admin')),
  before_data jsonb not null, after_data jsonb not null,
  changed_fields text[] not null, reason text not null default '',
  created_at timestamptz not null default now(), unique(company_id,version)
)$table$,company_type);
end $schema$;
create index if not exists az_company_changes_recent on public.azotrace_company_changes(company_id,version desc);
create table if not exists public.azotrace_company_change_receipts (
  change_id uuid not null references public.azotrace_company_changes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(), primary key(change_id,user_id)
);
alter table public.azotrace_company_changes enable row level security;
alter table public.azotrace_company_change_receipts enable row level security;
revoke all on public.azotrace_company_changes,public.azotrace_company_change_receipts from public,anon,authenticated,service_role;
grant select,insert on public.azotrace_company_changes to service_role;
grant select,insert,update on public.azotrace_company_change_receipts to service_role;
-- All edits to the shared company profile go through the audited server operation.
revoke update on public.azotrace_companies from anon,authenticated;

-- Initialize only untouched company profiles, using explicit company links.
-- Historical subscriptions and invoices are never rewritten.
with latest as (
  select distinct on (company_id) company_id,nome_empresa,nif_empresa,nif,morada,nome,email
  from public.subscriptions where company_id is not null order by company_id,created_at desc,id desc
)
update public.azotrace_companies c set
  legal_name=coalesce(nullif(s.nome_empresa,''),c.legal_name),
  nif=coalesce(nullif(s.nif_empresa,''),nullif(s.nif,''),c.nif),
  address=coalesce(nullif(s.morada,''),c.address),
  contact_name=coalesce(nullif(s.nome,''),c.contact_name),
  contact_email=coalesce(nullif(s.email,''),c.contact_email)
from latest s where c.id::text=s.company_id::text and c.details_version=0
  and c.legal_name='' and c.nif='' and c.address='' and c.contact_name='' and c.contact_email='';
update public.azotrace_companies c set
  contact_name=coalesce(nullif(c.contact_name,''),p.name,''),
  contact_email=coalesce(nullif(c.contact_email,''),p.email,'')
from public.profiles p where p.id=c.owner_admin_user_id and c.details_version=0 and (c.contact_name='' or c.contact_email='');

create or replace function public.az_update_company_details(p_company_id text,p_actor_id uuid,p_version integer,p_values jsonb,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  company_row public.azotrace_companies%rowtype;
  actor public.profiles%rowtype;
  is_super boolean;
  allowed text[]:=array['name','legal_name','nif','address','city','postal_code','phone','contact_email','contact_name','website','active','suspension_reason'];
  before_json jsonb; after_json jsonb; changed text[]; key text; val jsonb;
  old_diff jsonb:='{}'; new_diff jsonb:='{}'; change_id uuid;
begin
  select * into actor from public.profiles where id=p_actor_id and active=true for share;
  if not found then raise exception using errcode='42501',message='Sem acesso.'; end if;
  is_super:=actor.platform_role='superadmin';
  if not is_super then
    perform 1 from public.azotrace_company_members where company_id::text=p_company_id and user_id=p_actor_id and role='admin' and active=true for share;
    if not found then raise exception using errcode='42501',message='Sem acesso a esta empresa.'; end if;
  end if;
  select * into company_row from public.azotrace_companies where id::text=p_company_id for update;
  if not found then raise exception using errcode='P0002',message='Empresa não encontrada.'; end if;
  if not is_super and not company_row.active then raise exception using errcode='42501',message='A empresa está suspensa.'; end if;
  if p_version is null or p_version<>company_row.details_version then raise exception using errcode='40001',message='A ficha foi alterada entretanto. Recarrega os dados antes de guardar.'; end if;
  if p_values is null or jsonb_typeof(p_values)<>'object' or p_values='{}' or char_length(coalesce(p_reason,''))>1000 then raise exception using errcode='22023',message='Pedido inválido.'; end if;
  for key,val in select * from jsonb_each(p_values) loop
    if not key=any(allowed) or (key='active' and jsonb_typeof(val)<>'boolean') or (key<>'active' and jsonb_typeof(val)<>'string') then raise exception using errcode='22023',message='Campo inválido.'; end if;
    if not is_super and key in ('active','suspension_reason') then raise exception using errcode='42501',message='Só o Super Admin pode alterar o estado.'; end if;
  end loop;
  before_json:=to_jsonb(company_row)-array['id','owner_admin_user_id','created_at','updated_at','details_version'];
  select jsonb_object_agg(k,before_json->k) into before_json from unnest(allowed) k;
  after_json:=before_json||p_values;
  if btrim(after_json->>'name')='' or char_length(after_json->>'name')>200 or char_length(after_json->>'legal_name')>250
    or char_length(after_json->>'address')>500 or char_length(after_json->>'city')>120 or char_length(after_json->>'postal_code')>20
    or char_length(after_json->>'phone')>30 or char_length(after_json->>'contact_email')>254 or char_length(after_json->>'contact_name')>200
    or char_length(after_json->>'website')>500 or char_length(after_json->>'suspension_reason')>1000 or char_length(after_json->>'nif')>9 then
    raise exception using errcode='22023',message='Dados inválidos ou demasiado longos.';
  end if;
  if not (after_json->>'active')::boolean and btrim(after_json->>'suspension_reason')='' then raise exception using errcode='22023',message='Indica o motivo da suspensão.'; end if;
  if (after_json->>'active')::boolean then after_json:=jsonb_set(after_json,'{suspension_reason}','""'); end if;
  select array_agg(k order by k) into changed from unnest(allowed) k where before_json->k is distinct from after_json->k;
  if changed is null then return jsonb_build_object('company',to_jsonb(company_row),'changed',false); end if;
  foreach key in array changed loop old_diff:=old_diff||jsonb_build_object(key,before_json->key); new_diff:=new_diff||jsonb_build_object(key,after_json->key); end loop;
  update public.azotrace_companies set
    name=after_json->>'name',legal_name=after_json->>'legal_name',nif=after_json->>'nif',address=after_json->>'address',
    city=after_json->>'city',postal_code=after_json->>'postal_code',phone=after_json->>'phone',
    contact_email=after_json->>'contact_email',contact_name=after_json->>'contact_name',website=after_json->>'website',
    active=(after_json->>'active')::boolean,suspension_reason=after_json->>'suspension_reason',
    details_version=details_version+1,updated_at=clock_timestamp() where id::text=p_company_id returning * into company_row;
  insert into public.azotrace_company_changes(company_id,version,actor_id,actor_name,actor_role,before_data,after_data,changed_fields,reason)
  values(company_row.id,company_row.details_version,p_actor_id,coalesce(nullif(actor.name,''),actor.email,'Utilizador'),case when is_super then 'superadmin' else 'admin' end,old_diff,new_diff,changed,btrim(coalesce(p_reason,''))) returning id into change_id;
  return jsonb_build_object('company',to_jsonb(company_row),'changed',true,'changeId',change_id);
end;
$$;
revoke all on function public.az_update_company_details(text,uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.az_update_company_details(text,uuid,integer,jsonb,text) to service_role;

-- Filter unread changes before limiting, so older unread notices are never
-- hidden behind twenty newer changes that have already been acknowledged.
create or replace function public.az_pending_company_changes(p_company_id text,p_user_id uuid)
returns setof public.azotrace_company_changes language sql stable security definer set search_path=pg_catalog,public as $$
  select changes.* from public.azotrace_company_changes changes
  where changes.company_id::text=p_company_id and changes.actor_role='superadmin'
    and changes.actor_id is distinct from p_user_id
    and exists(select 1 from public.profiles p join public.azotrace_company_members m on m.user_id=p.id
      join public.azotrace_companies c on c.id=m.company_id
      where p.id=p_user_id and p.active and m.active and m.role='admin' and c.active and c.id::text=p_company_id)
    and not exists(select 1 from public.azotrace_company_change_receipts r where r.change_id=changes.id and r.user_id=p_user_id)
  order by changes.version desc limit 20;
$$;
revoke all on function public.az_pending_company_changes(text,uuid) from public,anon,authenticated;
grant execute on function public.az_pending_company_changes(text,uuid) to service_role;
commit;
