-- Preparação de apagamento de uma conta pessoal Azotrace.
-- Aplicar primeiro em Supabase de teste e rever o inventário antes de produção.
begin;

create table if not exists public.azotrace_account_deletion_log (
  id uuid primary key default gen_random_uuid(),
  target_digest text not null,
  company_ids text[] not null default '{}',
  actor_user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('prepared','completed')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.azotrace_account_deletion_log enable row level security;
revoke all on public.azotrace_account_deletion_log from public, anon, authenticated;
grant select, insert, update on public.azotrace_account_deletion_log to service_role;

create or replace function public.az_rgpd_scrub_text(p_value text, p_email text, p_user_id text)
returns text language plpgsql immutable set search_path = '' as $$
declare result text := p_value; at_pos integer; lowered text; needle text;
begin
  if result is null then return result; end if;
  foreach needle in array array[lower(p_email),lower(p_user_id)] loop
    if needle is null or needle = '' then continue; end if;
    loop
      lowered := lower(result);
      at_pos := strpos(lowered, needle);
      exit when at_pos = 0;
      result := substring(result from 1 for at_pos - 1) || '[referência removida]' || substring(result from at_pos + length(needle));
    end loop;
  end loop;
  return result;
end;
$$;

create or replace function public.az_rgpd_scrub_jsonb(p_value jsonb, p_email text, p_user_id text)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare kind text; result jsonb;
begin
  if p_value is null then return null; end if;
  kind := jsonb_typeof(p_value);
  if kind = 'object' then
    select coalesce(jsonb_object_agg(public.az_rgpd_scrub_text(key, p_email, p_user_id), public.az_rgpd_scrub_jsonb(value, p_email, p_user_id)), '{}'::jsonb) into result from jsonb_each(p_value);
    return result;
  elsif kind = 'array' then
    select coalesce(jsonb_agg(public.az_rgpd_scrub_jsonb(value, p_email, p_user_id)), '[]'::jsonb) into result from jsonb_array_elements(p_value);
    return result;
  elsif kind = 'string' then
    return to_jsonb(public.az_rgpd_scrub_text(p_value #>> '{}', p_email, p_user_id));
  end if;
  return p_value;
end;
$$;

create or replace function public.az_rgpd_account_deletion_inventory(p_user_id uuid, p_email text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  fk_rows jsonb := '[]'::jsonb; direct_rows jsonb := '[]'::jsonb; email_rows jsonb := '[]'::jsonb; embedded_id_rows jsonb := '[]'::jsonb;
  rel record; amount bigint; target_email text := lower(btrim(p_email)); auth_email text;
  storage_rows jsonb := '[]'::jsonb; unhandled_storage_rows jsonb := '[]'::jsonb;
begin
  select lower(email) into auth_email from auth.users where id = p_user_id;
  if auth_email is null or auth_email <> target_email then raise exception 'A conta e o email não correspondem.'; end if;
  for rel in
    select ns.nspname schema_name, tbl.relname table_name, att.attname column_name, con.confdeltype delete_action
    from pg_constraint con join pg_class tbl on tbl.oid=con.conrelid join pg_namespace ns on ns.oid=tbl.relnamespace
    join pg_attribute att on att.attrelid=tbl.oid and att.attnum=con.conkey[1]
    where con.contype='f' and con.confrelid='auth.users'::regclass and array_length(con.conkey,1)=1
      and ns.nspname not in ('pg_catalog','information_schema')
  loop
    execute format('select count(*) from %I.%I where %I = $1', rel.schema_name, rel.table_name, rel.column_name) into amount using p_user_id;
    if amount > 0 then
      fk_rows := fk_rows || jsonb_build_array(jsonb_build_object('schema',rel.schema_name,'table',rel.table_name,'column',rel.column_name,'rows',amount,'onDelete',case rel.delete_action when 'c' then 'cascade' when 'n' then 'set null' when 'd' then 'set default' when 'r' then 'restrict' else 'no action' end));
    end if;
  end loop;
  for rel in
    select c.table_name,c.column_name,c.data_type,c.is_nullable
    from information_schema.columns c
    where c.table_schema='public' and c.data_type in ('uuid','text','character varying')
      and c.column_name ~* '(^|_)(user|owner|created_by|updated_by|author|assignee|resolved_by|actor|requester)(_|$)' and c.is_generated='NEVER'
      and exists(select 1 from information_schema.tables t where t.table_schema='public' and t.table_name=c.table_name and t.table_type='BASE TABLE')
      and not exists (
        select 1 from pg_constraint con join pg_class t on t.oid=con.conrelid join pg_namespace n on n.oid=t.relnamespace join pg_attribute a on a.attrelid=t.oid and a.attnum=con.conkey[1]
        where con.contype='f' and con.confrelid='auth.users'::regclass and array_length(con.conkey,1)=1
          and n.nspname='public' and t.relname=c.table_name and a.attname=c.column_name
      )
  loop
    if rel.data_type='uuid' then
      execute format('select count(*) from public.%I where %I=$1',rel.table_name,rel.column_name) into amount using p_user_id;
    else
      execute format('select count(*) from public.%I where %I=$1',rel.table_name,rel.column_name) into amount using p_user_id::text;
    end if;
    if amount > 0 then direct_rows := direct_rows || jsonb_build_array(jsonb_build_object('table',rel.table_name,'column',rel.column_name,'rows',amount,'nullable',rel.is_nullable='YES')); end if;
  end loop;
  for rel in
    select c.table_name,c.column_name,c.data_type
    from information_schema.columns c where c.table_schema='public' and c.data_type in ('text','character varying','jsonb')
      and c.table_name not in ('azotrace_account_deletion_log') and c.is_generated='NEVER'
      and exists(select 1 from information_schema.tables t where t.table_schema='public' and t.table_name=c.table_name and t.table_type='BASE TABLE')
  loop
    execute format('select count(*) from public.%I where strpos(lower(%I::text),$1)>0',rel.table_name,rel.column_name) into amount using target_email;
    if amount > 0 then email_rows := email_rows || jsonb_build_array(jsonb_build_object('table',rel.table_name,'column',rel.column_name,'rows',amount)); end if;
    execute format('select count(*) from public.%I where strpos(lower(%I::text),$1)>0',rel.table_name,rel.column_name) into amount using lower(p_user_id::text);
    if amount > 0 then embedded_id_rows := embedded_id_rows || jsonb_build_array(jsonb_build_object('table',rel.table_name,'column',rel.column_name,'rows',amount)); end if;
  end loop;
  if to_regclass('storage.objects') is not null then
    select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'rows',n)), '[]'::jsonb) into storage_rows
      from (select bucket_id,count(*) n from storage.objects where name like p_user_id::text || '/%' group by bucket_id) s;
    select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'rows',n)), '[]'::jsonb) into unhandled_storage_rows
      from (select bucket_id,count(*) n from storage.objects where (strpos(lower(name),target_email)>0 or strpos(lower(name),lower(p_user_id::text))>0) and name not like p_user_id::text || '/%' group by bucket_id) s;
  end if;
  return jsonb_build_object('foreignKeyReferences',fk_rows,'directReferences',direct_rows,'emailReferences',email_rows,'embeddedIdReferences',embedded_id_rows,'personalStorage',storage_rows,'unhandledStorageReferences',unhandled_storage_rows,
    'scope',jsonb_build_array('Conta Supabase Auth','Perfil e permissões de acesso','Referências pessoais em tabelas públicas','Email em campos de texto e JSON','Ficheiros guardados numa pasta com o UUID exato da conta'),
    'preserved',jsonb_build_array('Empresa e subscrição partilhadas','Histórico operacional sem identidade do utilizador','Ficheiros partilhados da empresa'),
    'outsideSupabase',jsonb_build_array('Faturas e dados mantidos pelo Stripe ou outros prestadores','Emails já entregues','Backups e registos de retenção do fornecedor'));
end;
$$;

create or replace function public.az_rgpd_execute_account_deletion(p_user_id uuid, p_email text, p_actor_id uuid, p_company_ids text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target_email text := lower(btrim(p_email)); auth_email text; target_companies text[]; allowed boolean := false;
  rel record; amount bigint; updated_rows bigint; summary jsonb := '{}'::jsonb; audit_id uuid; salt text;
begin
  select lower(email) into auth_email from auth.users where id=p_user_id;
  if auth_email is null or auth_email <> target_email then raise exception 'A conta e o email não correspondem.'; end if;
  if public.azotrace_is_superadmin(p_actor_id) then raise exception 'O Super Admin pode consultar os dados, mas não executar o apagamento.'; end if;
  if p_actor_id<>p_user_id then raise exception 'O Admin só pode apagar os dados pessoais da própria conta.'; end if;
  select coalesce(array_agg(distinct company_id order by company_id),'{}') into target_companies from public.azotrace_company_members where user_id=p_user_id;
  if coalesce(array(select distinct v.company_id from unnest(coalesce(p_company_ids,'{}')) as v(company_id) order by v.company_id),'{}') is distinct from target_companies then raise exception 'A empresa associada à conta mudou. Atualiza a pré-visualização.'; end if;
  select coalesce(public.azotrace_is_superadmin(p_actor_id),false) into allowed;
  if not allowed then
    select exists(select 1 from public.profiles p join public.azotrace_company_members m on m.user_id=p.id
      where p.id=p_actor_id and p.active is true and m.active is true and m.role='admin'
      and m.company_id=any(target_companies)
      and (p_actor_id=p_user_id or exists(select 1 from public.azotrace_user_permissions perm where perm.user_id=p_actor_id and perm.company_id=m.company_id and perm.permission='users.manage'))) into allowed;
  end if;
  if not allowed then raise exception 'Sem autorização para apagar dados desta conta.'; end if;
  if not public.azotrace_is_superadmin(p_actor_id) and (cardinality(target_companies)<>1 or not exists(select 1 from public.azotrace_company_members where user_id=p_actor_id and role='admin' and active is true and company_id=target_companies[1])) then raise exception 'Um administrador só pode apagar contas da sua própria empresa.'; end if;
  if public.azotrace_is_superadmin(p_user_id) then raise exception 'Não é permitido apagar uma conta Super Admin.'; end if;
  if to_regclass('storage.objects') is not null and exists(select 1 from storage.objects where (strpos(lower(name),target_email)>0 or strpos(lower(name),lower(p_user_id::text))>0) and name not like p_user_id::text || '/%') then raise exception 'Há ficheiros com referências à conta fora da pasta pessoal. Revê-os antes do apagamento.'; end if;

  -- Preserva os tickets para auditoria, removendo a identidade e as mensagens do titular.
  if to_regclass('public.azotrace_support_ticket_messages') is not null then
    if to_regclass('public.azotrace_support_tickets') is not null then
      delete from public.azotrace_support_ticket_messages m using public.azotrace_support_tickets t
        where m.ticket_id=t.id and lower(coalesce(t.requester_email,''))=target_email and m.author_user_id is null;
    end if;
    delete from public.azotrace_support_ticket_messages where author_user_id=p_user_id;
    get diagnostics amount = row_count; summary:=summary||jsonb_build_object('mensagensDeSuporteRemovidas',amount);
  end if;
  if to_regclass('public.azotrace_support_tickets') is not null then
    update public.azotrace_support_tickets set requester_name='Utilizador removido',requester_email=null,created_by_user_id=null
      where created_by_user_id=p_user_id or lower(coalesce(requester_email,''))=target_email;
    get diagnostics amount = row_count; summary:=summary||jsonb_build_object('ticketsAnonimizados',amount);
  end if;
  if to_regclass('public.accounts') is not null then
    update public.accounts set created_by=null where created_by=p_user_id;
    update public.accounts set updated_by=null where updated_by=p_user_id;
  end if;

  -- Desliga FKs restritivas quando a coluna permite NULL; uma referência obrigatória interrompe a transação.
  for rel in
    select ns.nspname schema_name,tbl.relname table_name,att.attname column_name,att.attnotnull
    from pg_constraint con join pg_class tbl on tbl.oid=con.conrelid join pg_namespace ns on ns.oid=tbl.relnamespace
    join pg_attribute att on att.attrelid=tbl.oid and att.attnum=con.conkey[1]
    where con.contype='f' and con.confrelid='auth.users'::regclass and array_length(con.conkey,1)=1
      and con.confdeltype in ('a','r') and not (ns.nspname='public' and tbl.relname='azotrace_support_ticket_messages' and att.attname='author_user_id')
  loop
    execute format('select count(*) from %I.%I where %I=$1',rel.schema_name,rel.table_name,rel.column_name) into amount using p_user_id;
    if amount>0 then
      if rel.attnotnull then raise exception 'A tabela %.% tem % referências obrigatórias em %. É necessária uma revisão antes do apagamento.',rel.table_name,rel.column_name,amount,rel.schema_name; end if;
      execute format('update %I.%I set %I=null where %I=$1',rel.schema_name,rel.table_name,rel.column_name,rel.column_name) using p_user_id;
      get diagnostics updated_rows = row_count;
      summary:=summary||jsonb_build_object(rel.table_name||'.'||rel.column_name,updated_rows);
    end if;
  end loop;

  -- Referências sem FK (por exemplo owner_user_id/created_by) são removidas só se forem anuláveis.
  for rel in
    select c.table_name,c.column_name,c.data_type,c.is_nullable from information_schema.columns c
    where c.table_schema='public' and c.data_type in ('uuid','text','character varying')
      and c.column_name ~* '(^|_)(user|owner|created_by|updated_by|author|assignee|resolved_by|actor|requester)(_|$)' and c.is_generated='NEVER'
      and exists(select 1 from information_schema.tables t where t.table_schema='public' and t.table_name=c.table_name and t.table_type='BASE TABLE')
      and not exists (select 1 from pg_constraint con join pg_class t on t.oid=con.conrelid join pg_namespace n on n.oid=t.relnamespace join pg_attribute a on a.attrelid=t.oid and a.attnum=con.conkey[1]
        where con.contype='f' and con.confrelid='auth.users'::regclass and array_length(con.conkey,1)=1 and n.nspname='public' and t.relname=c.table_name and a.attname=c.column_name)
  loop
    if rel.data_type='uuid' then execute format('select count(*) from public.%I where %I=$1',rel.table_name,rel.column_name) into amount using p_user_id;
    else execute format('select count(*) from public.%I where %I=$1',rel.table_name,rel.column_name) into amount using p_user_id::text; end if;
    if amount>0 then
      if rel.is_nullable<>'YES' then raise exception 'A tabela %.% tem % referências obrigatórias sem FK. É necessária uma revisão antes do apagamento.',rel.table_name,rel.column_name,amount; end if;
      if rel.data_type='uuid' then
        execute format('update public.%I set %I=null where %I=$1',rel.table_name,rel.column_name,rel.column_name) using p_user_id;
      else
        execute format('update public.%I set %I=null where %I=$1',rel.table_name,rel.column_name,rel.column_name) using p_user_id::text;
      end if;
      get diagnostics updated_rows = row_count;
      summary:=summary||jsonb_build_object(rel.table_name||'.'||rel.column_name,updated_rows);
    end if;
  end loop;

  -- Elimina o email em texto e JSON em todas as tabelas públicas, incluindo billing e logs.
  for rel in select table_name,column_name,data_type from information_schema.columns where table_schema='public' and data_type in ('text','character varying','jsonb') and table_name not in ('azotrace_account_deletion_log','profiles') and is_generated='NEVER'
    and table_name in (select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE')
  loop
    if rel.data_type='jsonb' then
      execute format('update public.%I set %I=public.az_rgpd_scrub_jsonb(%I,$1,$2) where strpos(lower(%I::text),$1)>0 or strpos(lower(%I::text),$2)>0',rel.table_name,rel.column_name,rel.column_name,rel.column_name,rel.column_name) using target_email,p_user_id::text;
    else
      execute format('update public.%I set %I=public.az_rgpd_scrub_text(%I,$1,$2) where strpos(lower(%I),$1)>0 or strpos(lower(%I),$2)>0',rel.table_name,rel.column_name,rel.column_name,rel.column_name,rel.column_name) using target_email,p_user_id::text;
    end if;
  end loop;

  salt:=gen_random_uuid()::text;
  insert into public.azotrace_account_deletion_log(target_digest,company_ids,actor_user_id,status,summary)
    values(md5(target_email||':'||salt),target_companies,p_actor_id,'prepared',summary) returning id into audit_id;
  return jsonb_build_object('audit_id',audit_id,'summary',summary);
end;
$$;

create or replace function public.az_rgpd_finalize_account_deletion(p_audit_id uuid, p_storage_objects integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 update public.azotrace_account_deletion_log set status='completed',completed_at=now(),summary=summary||jsonb_build_object('ficheirosPessoaisRemovidos',greatest(0,p_storage_objects)) where id=p_audit_id and status='prepared';
 return found;
end;
$$;

revoke all on function public.az_rgpd_scrub_text(text,text,text) from public,anon,authenticated;
revoke all on function public.az_rgpd_scrub_jsonb(jsonb,text,text) from public,anon,authenticated;
revoke all on function public.az_rgpd_account_deletion_inventory(uuid,text) from public,anon,authenticated;
revoke all on function public.az_rgpd_execute_account_deletion(uuid,text,uuid,text[]) from public,anon,authenticated;
revoke all on function public.az_rgpd_finalize_account_deletion(uuid,integer) from public,anon,authenticated;
grant execute on function public.az_rgpd_account_deletion_inventory(uuid,text) to service_role;
grant execute on function public.az_rgpd_execute_account_deletion(uuid,text,uuid,text[]) to service_role;
grant execute on function public.az_rgpd_finalize_account_deletion(uuid,integer) to service_role;
commit;



