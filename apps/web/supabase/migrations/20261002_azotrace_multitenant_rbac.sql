-- Azotrace — Supabase: multiempresa, RBAC, produção, website e QR
-- 2026-10-02
--
-- Esta migration evita colidir com tabelas antigas do projeto usando o prefixo
-- azotrace_ nas estruturas novas de empresa/permissões.
-- Mantém producer_workspaces, business_websites e public_trace_pages para ser
-- compatível com as versões anteriores do editor/produção.

begin;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Perfil de autenticação
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  platform_role text not null default 'user',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists platform_role text not null default 'user';
alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create or replace function public.azotrace_sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, platform_role, active, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    'user',
    true,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(nullif(public.profiles.name, ''), excluded.name),
    updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'azotrace_auth_user_profile') then
    create trigger azotrace_auth_user_profile
    after insert or update of email, raw_user_meta_data on auth.users
    for each row execute function public.azotrace_sync_auth_profile();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Empresas e permissões
-- Super Admin -> Admin da empresa -> utilizadores -> negócios permitidos
-- ---------------------------------------------------------------------------
create table if not exists public.azotrace_companies (
  id text primary key default ('company-' || gen_random_uuid()::text),
  name text not null,
  owner_admin_user_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.azotrace_company_members (
  company_id text not null references public.azotrace_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'user')),
  app_role text not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.azotrace_user_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null references public.azotrace_companies(id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id, permission)
);

-- Uma linha significa: este utilizador não-admin pode entrar neste negócio.
create table if not exists public.azotrace_business_access (
  business_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index if not exists azotrace_company_members_user_idx on public.azotrace_company_members(user_id);
create index if not exists azotrace_permissions_user_idx on public.azotrace_user_permissions(user_id);
create index if not exists azotrace_business_access_user_idx on public.azotrace_business_access(user_id);

-- ---------------------------------------------------------------------------
-- 3. Workspace de produção por negócio
-- O estado JSONB mantém exatamente o modelo atual da UI:
-- unidades permanentes, um lote/ciclo ativo por unidade e histórico completo.
-- ---------------------------------------------------------------------------
create table if not exists public.producer_workspaces (
  business_id text primary key,
  owner_user_id uuid,
  company_id text,
  business_name text,
  business_kind text,
  accent_color text not null default '#47B37D',
  completed boolean not null default false,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.producer_workspaces add column if not exists owner_user_id uuid;
alter table public.producer_workspaces add column if not exists company_id text;
alter table public.producer_workspaces add column if not exists business_name text;
alter table public.producer_workspaces add column if not exists business_kind text;
alter table public.producer_workspaces add column if not exists accent_color text not null default '#47B37D';
alter table public.producer_workspaces add column if not exists completed boolean not null default false;
alter table public.producer_workspaces add column if not exists state jsonb not null default '{}'::jsonb;
alter table public.producer_workspaces add column if not exists created_at timestamptz not null default now();
alter table public.producer_workspaces add column if not exists updated_at timestamptz not null default now();

-- Compatibilidade com migration anterior que podia ter owner_user_id NOT NULL.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='producer_workspaces' and column_name='owner_user_id'
  ) then
    alter table public.producer_workspaces alter column owner_user_id drop not null;
  end if;
end $$;

create index if not exists producer_workspaces_company_idx on public.producer_workspaces(company_id);
create index if not exists producer_workspaces_updated_idx on public.producer_workspaces(updated_at desc);

-- ---------------------------------------------------------------------------
-- 4. Website e página pública aberta pelo QR
-- ---------------------------------------------------------------------------
create table if not exists public.business_websites (
  id uuid primary key default gen_random_uuid(),
  business_id text not null unique,
  template_id text not null default 'template-1',
  asset_base_url text not null default '',
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_trace_pages (
  business_id text not null,
  batch_id text not null,
  owner_user_id uuid,
  status text not null default 'published' check (status in ('draft', 'published')),
  snapshot jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, batch_id)
);

alter table public.public_trace_pages add column if not exists owner_user_id uuid;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='public_trace_pages' and column_name='owner_user_id'
  ) then
    alter table public.public_trace_pages alter column owner_user_id drop not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4.1 Limpeza de políticas/funções de protótipos anteriores
-- Permite aplicar esta migration também sobre uma base onde a versão antiga
-- producer_workspaces já tinha sido testada.
-- ---------------------------------------------------------------------------
drop policy if exists producer_workspaces_select on public.producer_workspaces;
drop policy if exists producer_workspaces_insert on public.producer_workspaces;
drop policy if exists producer_workspaces_update on public.producer_workspaces;
drop policy if exists producer_workspaces_delete on public.producer_workspaces;
drop policy if exists business_websites_select on public.business_websites;
drop policy if exists business_websites_insert on public.business_websites;
drop policy if exists business_websites_update on public.business_websites;
drop policy if exists business_websites_delete on public.business_websites;
drop policy if exists public_trace_pages_select on public.public_trace_pages;
drop policy if exists public_trace_pages_insert on public.public_trace_pages;
drop policy if exists public_trace_pages_update on public.public_trace_pages;
drop policy if exists public_trace_pages_delete on public.public_trace_pages;

drop policy if exists producer_assets_insert on storage.objects;
drop policy if exists producer_assets_update on storage.objects;
drop policy if exists producer_assets_delete on storage.objects;
drop policy if exists website_assets_insert on storage.objects;
drop policy if exists website_assets_update on storage.objects;
drop policy if exists website_assets_delete on storage.objects;

-- As funções antigas tinham apenas 1 argumento. A versão atual usa um segundo
-- argumento opcional (target_user_id) e é a única que deve ficar ativa.
drop function if exists public.azotrace_can_manage_business(text);
drop function if exists public.azotrace_can_access_business(text);

-- ---------------------------------------------------------------------------
-- 5. Helpers de autorização
-- ---------------------------------------------------------------------------
create or replace function public.azotrace_is_superadmin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select p.active and p.platform_role = 'superadmin'
    from public.profiles p
    where p.id = target_user_id
  ), false);
$$;

create or replace function public.azotrace_can_access_company(target_company_id text, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.azotrace_is_superadmin(target_user_id)
  or exists (
    select 1 from public.azotrace_company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = target_user_id
      and cm.active = true
  );
$$;

create or replace function public.azotrace_can_manage_company(target_company_id text, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.azotrace_is_superadmin(target_user_id)
  or exists (
    select 1 from public.azotrace_company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = target_user_id
      and cm.role = 'admin'
      and cm.active = true
  );
$$;

create or replace function public.azotrace_business_company(target_business_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pw.company_id
  from public.producer_workspaces pw
  where pw.business_id = target_business_id
  limit 1;
$$;

create or replace function public.azotrace_can_access_business(target_business_id text, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.azotrace_is_superadmin(target_user_id)
  or exists (
    select 1
    from public.producer_workspaces pw
    join public.azotrace_company_members cm on cm.company_id = pw.company_id
    where pw.business_id = target_business_id
      and cm.user_id = target_user_id
      and cm.role = 'admin'
      and cm.active = true
  )
  or exists (
    select 1
    from public.azotrace_business_access ba
    join public.producer_workspaces pw on pw.business_id = ba.business_id
    join public.azotrace_company_members cm on cm.company_id = pw.company_id and cm.user_id = ba.user_id
    where ba.business_id = target_business_id
      and ba.user_id = target_user_id
      and cm.active = true
  );
$$;

create or replace function public.azotrace_can_manage_business(target_business_id text, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.azotrace_is_superadmin(target_user_id)
  or exists (
    select 1
    from public.producer_workspaces pw
    join public.azotrace_company_members cm on cm.company_id = pw.company_id
    where pw.business_id = target_business_id
      and cm.user_id = target_user_id
      and cm.role = 'admin'
      and cm.active = true
  )
  or (
    exists (
      select 1 from public.azotrace_business_access ba
      where ba.business_id = target_business_id and ba.user_id = target_user_id
    )
    and exists (
      select 1
      from public.producer_workspaces pw
      join public.azotrace_user_permissions up on up.company_id = pw.company_id
      where pw.business_id = target_business_id
        and up.user_id = target_user_id
        and up.permission in ('business.manage','production.write','products.manage','lots.manage','traceability.manage')
    )
  );
$$;

create or replace function public.azotrace_has_permission(target_permission text, target_business_id text default null, target_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  company_for_check text;
begin
  if public.azotrace_is_superadmin(target_user_id) then return true; end if;
  if target_permission = 'chatbot.manage' then return false; end if;

  if target_business_id is not null then
    if not public.azotrace_can_access_business(target_business_id, target_user_id) then return false; end if;
    company_for_check := public.azotrace_business_company(target_business_id);
  else
    select cm.company_id into company_for_check
    from public.azotrace_company_members cm
    where cm.user_id = target_user_id and cm.active = true
    order by case when cm.role='admin' then 0 else 1 end
    limit 1;
  end if;

  if company_for_check is null then return false; end if;

  return exists (
    select 1 from public.azotrace_user_permissions up
    where up.user_id = target_user_id
      and up.company_id = company_for_check
      and up.permission = target_permission
  );
end;
$$;

grant execute on function public.azotrace_is_superadmin(uuid) to authenticated;
grant execute on function public.azotrace_can_access_company(text, uuid) to authenticated;
grant execute on function public.azotrace_can_manage_company(text, uuid) to authenticated;
grant execute on function public.azotrace_business_company(text) to authenticated, anon;
grant execute on function public.azotrace_can_access_business(text, uuid) to authenticated, anon;
grant execute on function public.azotrace_can_manage_business(text, uuid) to authenticated;
grant execute on function public.azotrace_has_permission(text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. updated_at
-- ---------------------------------------------------------------------------
create or replace function public.azotrace_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare item record;
begin
  for item in select * from (values
    ('profiles','azotrace_profiles_touch'),
    ('azotrace_companies','azotrace_companies_touch'),
    ('azotrace_company_members','azotrace_company_members_touch'),
    ('producer_workspaces','azotrace_workspaces_touch'),
    ('business_websites','azotrace_websites_touch'),
    ('public_trace_pages','azotrace_trace_touch')
  ) as x(table_name, trigger_name)
  loop
    if not exists (select 1 from pg_trigger where tgname=item.trigger_name) then
      execute format('create trigger %I before update on public.%I for each row execute function public.azotrace_touch_updated_at()', item.trigger_name, item.table_name);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.azotrace_companies enable row level security;
alter table public.azotrace_company_members enable row level security;
alter table public.azotrace_user_permissions enable row level security;
alter table public.azotrace_business_access enable row level security;
alter table public.producer_workspaces enable row level security;
alter table public.business_websites enable row level security;
alter table public.public_trace_pages enable row level security;

-- Perfis
drop policy if exists azotrace_profiles_select on public.profiles;
create policy azotrace_profiles_select on public.profiles for select to authenticated using (
  id=auth.uid()
  or public.azotrace_is_superadmin()
  or exists (
    select 1
    from public.azotrace_company_members actor
    join public.azotrace_company_members target on target.company_id=actor.company_id
    where actor.user_id=auth.uid() and actor.role='admin' and actor.active=true and target.user_id=profiles.id
  )
);

-- Empresas
drop policy if exists azotrace_companies_select on public.azotrace_companies;
drop policy if exists azotrace_companies_update on public.azotrace_companies;
create policy azotrace_companies_select on public.azotrace_companies for select to authenticated using (public.azotrace_can_access_company(id));
create policy azotrace_companies_update on public.azotrace_companies for update to authenticated using (public.azotrace_can_manage_company(id)) with check (public.azotrace_can_manage_company(id));

-- Membros/permissões/acessos: browser só lê. Escrita é feita por API server com service_role.
drop policy if exists azotrace_company_members_select on public.azotrace_company_members;
create policy azotrace_company_members_select on public.azotrace_company_members for select to authenticated using (
  user_id=auth.uid() or public.azotrace_is_superadmin() or public.azotrace_can_manage_company(company_id)
);

drop policy if exists azotrace_user_permissions_select on public.azotrace_user_permissions;
create policy azotrace_user_permissions_select on public.azotrace_user_permissions for select to authenticated using (
  user_id=auth.uid() or public.azotrace_is_superadmin() or public.azotrace_can_manage_company(company_id)
);

drop policy if exists azotrace_business_access_select on public.azotrace_business_access;
create policy azotrace_business_access_select on public.azotrace_business_access for select to authenticated using (
  user_id=auth.uid() or public.azotrace_is_superadmin() or public.azotrace_can_manage_business(business_id)
);

-- Workspaces
drop policy if exists azotrace_workspaces_select on public.producer_workspaces;
drop policy if exists azotrace_workspaces_insert on public.producer_workspaces;
drop policy if exists azotrace_workspaces_update on public.producer_workspaces;
drop policy if exists azotrace_workspaces_delete on public.producer_workspaces;
create policy azotrace_workspaces_select on public.producer_workspaces for select to authenticated using (public.azotrace_can_access_business(business_id));
create policy azotrace_workspaces_insert on public.producer_workspaces for insert to authenticated with check (
  public.azotrace_is_superadmin() or public.azotrace_can_manage_company(company_id)
);
create policy azotrace_workspaces_update on public.producer_workspaces for update to authenticated using (public.azotrace_can_manage_business(business_id)) with check (public.azotrace_can_manage_business(business_id));
create policy azotrace_workspaces_delete on public.producer_workspaces for delete to authenticated using (public.azotrace_can_manage_business(business_id));

-- Website
drop policy if exists azotrace_websites_select on public.business_websites;
drop policy if exists azotrace_websites_insert on public.business_websites;
drop policy if exists azotrace_websites_update on public.business_websites;
drop policy if exists azotrace_websites_delete on public.business_websites;
create policy azotrace_websites_select on public.business_websites for select to anon, authenticated using (status='published' or public.azotrace_can_access_business(business_id));
create policy azotrace_websites_insert on public.business_websites for insert to authenticated with check (public.azotrace_can_manage_business(business_id));
create policy azotrace_websites_update on public.business_websites for update to authenticated using (public.azotrace_can_manage_business(business_id)) with check (public.azotrace_can_manage_business(business_id));
create policy azotrace_websites_delete on public.business_websites for delete to authenticated using (public.azotrace_can_manage_business(business_id));

-- QR público
drop policy if exists azotrace_trace_select on public.public_trace_pages;
drop policy if exists azotrace_trace_insert on public.public_trace_pages;
drop policy if exists azotrace_trace_update on public.public_trace_pages;
drop policy if exists azotrace_trace_delete on public.public_trace_pages;
create policy azotrace_trace_select on public.public_trace_pages for select to anon, authenticated using (status='published' or public.azotrace_can_access_business(business_id));
create policy azotrace_trace_insert on public.public_trace_pages for insert to authenticated with check (public.azotrace_can_manage_business(business_id));
create policy azotrace_trace_update on public.public_trace_pages for update to authenticated using (public.azotrace_can_manage_business(business_id)) with check (public.azotrace_can_manage_business(business_id));
create policy azotrace_trace_delete on public.public_trace_pages for delete to authenticated using (public.azotrace_can_manage_business(business_id));

-- Grants
grant select on public.profiles, public.azotrace_companies, public.azotrace_company_members, public.azotrace_user_permissions, public.azotrace_business_access to authenticated;
grant select, insert, update, delete on public.producer_workspaces, public.business_websites, public.public_trace_pages to authenticated;
grant select on public.business_websites, public.public_trace_pages to anon;

-- ---------------------------------------------------------------------------
-- 8. Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('producer-assets','producer-assets',true,10485760,array['image/jpeg','image/png','image/webp','image/gif']),
  ('website-assets','website-assets',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists azotrace_producer_assets_insert on storage.objects;
drop policy if exists azotrace_producer_assets_update on storage.objects;
drop policy if exists azotrace_producer_assets_delete on storage.objects;
drop policy if exists azotrace_website_assets_insert on storage.objects;
drop policy if exists azotrace_website_assets_update on storage.objects;
drop policy if exists azotrace_website_assets_delete on storage.objects;

create policy azotrace_producer_assets_insert on storage.objects for insert to authenticated with check (bucket_id='producer-assets' and public.azotrace_can_manage_business(split_part(name,'/',1)));
create policy azotrace_producer_assets_update on storage.objects for update to authenticated using (bucket_id='producer-assets' and public.azotrace_can_manage_business(split_part(name,'/',1))) with check (bucket_id='producer-assets' and public.azotrace_can_manage_business(split_part(name,'/',1)));
create policy azotrace_producer_assets_delete on storage.objects for delete to authenticated using (bucket_id='producer-assets' and public.azotrace_can_manage_business(split_part(name,'/',1)));
create policy azotrace_website_assets_insert on storage.objects for insert to authenticated with check (bucket_id='website-assets' and public.azotrace_can_manage_business(split_part(name,'/',1)));
create policy azotrace_website_assets_update on storage.objects for update to authenticated using (bucket_id='website-assets' and public.azotrace_can_manage_business(split_part(name,'/',1))) with check (bucket_id='website-assets' and public.azotrace_can_manage_business(split_part(name,'/',1)));
create policy azotrace_website_assets_delete on storage.objects for delete to authenticated using (bucket_id='website-assets' and public.azotrace_can_manage_business(split_part(name,'/',1)));

commit;

-- ---------------------------------------------------------------------------
-- PRIMEIRO SUPER ADMIN (executar UMA vez depois de criar a conta no Auth)
-- ---------------------------------------------------------------------------
-- update public.profiles
-- set platform_role='superadmin', active=true
-- where lower(email)=lower('SEU_EMAIL@EXEMPLO.PT');
