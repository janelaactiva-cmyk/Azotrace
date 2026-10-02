-- Azotrace — produção multi-negócio + Website + QR público
-- Executar no SQL Editor do Supabase.
-- Não requer @kit/next/safe-action nem @kit/supabase/server-client.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Workspace operacional por negócio
--    Mantém o estado que a UI já usa, em JSONB, para uma migração segura
--    do protótipo local para Supabase sem reescrever todas as páginas.
-- ---------------------------------------------------------------------------
create table if not exists public.producer_workspaces (
  business_id text primary key,
  owner_user_id uuid not null,
  business_name text,
  business_kind text,
  accent_color text not null default '#47B37D',
  completed boolean not null default false,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists producer_workspaces_owner_idx
  on public.producer_workspaces(owner_user_id);
create index if not exists producer_workspaces_updated_idx
  on public.producer_workspaces(updated_at desc);

-- ---------------------------------------------------------------------------
-- 2. Website público por negócio
-- ---------------------------------------------------------------------------
create table if not exists public.business_websites (
  id uuid primary key default gen_random_uuid(),
  business_id text not null unique,
  template_id text not null check (template_id in ('template-1', 'template-2', 'template-3')),
  asset_base_url text not null default '',
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Snapshot público do lote aberto pelo QR
--    Só contém os dados que o produtor escolheu para publicar.
-- ---------------------------------------------------------------------------
create table if not exists public.public_trace_pages (
  business_id text not null,
  batch_id text not null,
  owner_user_id uuid not null,
  status text not null default 'published' check (status in ('draft', 'published')),
  snapshot jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, batch_id)
);

create index if not exists public_trace_pages_status_idx
  on public.public_trace_pages(status);

-- ---------------------------------------------------------------------------
-- Helpers multitenant.
-- Usa, por ordem: proprietário do workspace, superadmin, funções RBAC existentes,
-- business_members e negocios.user_id quando estas estruturas existirem.
-- ---------------------------------------------------------------------------
create or replace function public.azotrace_can_manage_business(target_business_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  if exists (
    select 1
    from public.producer_workspaces pw
    where pw.business_id = target_business_id
      and pw.owner_user_id = auth.uid()
  ) then
    return true;
  end if;

  if to_regclass('public.profiles') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'profiles'
         and column_name = 'platform_role'
     ) then
    execute 'select exists (
      select 1 from public.profiles p
      where p.id::text = $1 and p.platform_role::text = ''superadmin''
    )' into allowed using auth.uid()::text;
    if coalesce(allowed, false) then return true; end if;
  end if;

  if to_regprocedure('public.can_manage_business(text)') is not null then
    execute 'select public.can_manage_business($1)' into allowed using target_business_id;
    if coalesce(allowed, false) then return true; end if;
  end if;

  if to_regclass('public.business_members') is not null then
    execute 'select exists (
      select 1 from public.business_members bm
      where bm.business_id::text = $1
        and bm.user_id::text = $2
        and bm.role::text = ''admin''
    )' into allowed using target_business_id, auth.uid()::text;
    if coalesce(allowed, false) then return true; end if;
  end if;

  if to_regclass('public.negocios') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'negocios'
         and column_name = 'user_id'
     ) then
    execute 'select exists (
      select 1 from public.negocios n
      where n.id::text = $1 and n.user_id::text = $2
    )' into allowed using target_business_id, auth.uid()::text;
    if coalesce(allowed, false) then return true; end if;
  end if;

  return false;
end;
$$;

create or replace function public.azotrace_can_access_business(target_business_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
begin
  if auth.uid() is null then return false; end if;
  if public.azotrace_can_manage_business(target_business_id) then return true; end if;

  if to_regprocedure('public.can_access_business(text)') is not null then
    execute 'select public.can_access_business($1)' into allowed using target_business_id;
    if coalesce(allowed, false) then return true; end if;
  end if;

  if to_regclass('public.business_members') is not null then
    execute 'select exists (
      select 1 from public.business_members bm
      where bm.business_id::text = $1 and bm.user_id::text = $2
    )' into allowed using target_business_id, auth.uid()::text;
    if coalesce(allowed, false) then return true; end if;
  end if;

  return false;
end;
$$;

grant execute on function public.azotrace_can_manage_business(text) to anon, authenticated;
grant execute on function public.azotrace_can_access_business(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
create or replace function public.azotrace_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'producer_workspaces_touch_updated_at') then
    create trigger producer_workspaces_touch_updated_at
    before update on public.producer_workspaces
    for each row execute function public.azotrace_touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'business_websites_touch_updated_at') then
    create trigger business_websites_touch_updated_at
    before update on public.business_websites
    for each row execute function public.azotrace_touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'public_trace_pages_touch_updated_at') then
    create trigger public_trace_pages_touch_updated_at
    before update on public.public_trace_pages
    for each row execute function public.azotrace_touch_updated_at();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.producer_workspaces enable row level security;
alter table public.business_websites enable row level security;
alter table public.public_trace_pages enable row level security;

grant select, insert, update, delete on public.producer_workspaces to authenticated;
grant select on public.business_websites to anon, authenticated;
grant insert, update, delete on public.business_websites to authenticated;
grant select on public.public_trace_pages to anon, authenticated;
grant insert, update, delete on public.public_trace_pages to authenticated;

drop policy if exists producer_workspaces_select on public.producer_workspaces;
drop policy if exists producer_workspaces_insert on public.producer_workspaces;
drop policy if exists producer_workspaces_update on public.producer_workspaces;
drop policy if exists producer_workspaces_delete on public.producer_workspaces;

create policy producer_workspaces_select
on public.producer_workspaces for select to authenticated
using (
  owner_user_id = auth.uid()
  or public.azotrace_can_access_business(business_id)
);

create policy producer_workspaces_insert
on public.producer_workspaces for insert to authenticated
with check (
  owner_user_id = auth.uid()
  or public.azotrace_can_manage_business(business_id)
);

create policy producer_workspaces_update
on public.producer_workspaces for update to authenticated
using (
  owner_user_id = auth.uid()
  or public.azotrace_can_manage_business(business_id)
)
with check (
  owner_user_id = auth.uid()
  or public.azotrace_can_manage_business(business_id)
);

create policy producer_workspaces_delete
on public.producer_workspaces for delete to authenticated
using (
  owner_user_id = auth.uid()
  or public.azotrace_can_manage_business(business_id)
);

drop policy if exists business_websites_select on public.business_websites;
drop policy if exists business_websites_insert on public.business_websites;
drop policy if exists business_websites_update on public.business_websites;
drop policy if exists business_websites_delete on public.business_websites;

create policy business_websites_select
on public.business_websites for select to anon, authenticated
using (
  status = 'published'
  or public.azotrace_can_access_business(business_id)
);

create policy business_websites_insert
on public.business_websites for insert to authenticated
with check (public.azotrace_can_manage_business(business_id));

create policy business_websites_update
on public.business_websites for update to authenticated
using (public.azotrace_can_manage_business(business_id))
with check (public.azotrace_can_manage_business(business_id));

create policy business_websites_delete
on public.business_websites for delete to authenticated
using (public.azotrace_can_manage_business(business_id));

drop policy if exists public_trace_pages_select on public.public_trace_pages;
drop policy if exists public_trace_pages_insert on public.public_trace_pages;
drop policy if exists public_trace_pages_update on public.public_trace_pages;
drop policy if exists public_trace_pages_delete on public.public_trace_pages;

create policy public_trace_pages_select
on public.public_trace_pages for select to anon, authenticated
using (
  status = 'published'
  or owner_user_id = auth.uid()
  or public.azotrace_can_access_business(business_id)
);

create policy public_trace_pages_insert
on public.public_trace_pages for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and public.azotrace_can_manage_business(business_id)
);

create policy public_trace_pages_update
on public.public_trace_pages for update to authenticated
using (
  owner_user_id = auth.uid()
  or public.azotrace_can_manage_business(business_id)
)
with check (
  owner_user_id = auth.uid()
  or public.azotrace_can_manage_business(business_id)
);

create policy public_trace_pages_delete
on public.public_trace_pages for delete to authenticated
using (
  owner_user_id = auth.uid()
  or public.azotrace_can_manage_business(business_id)
);

-- ---------------------------------------------------------------------------
-- Storage público: imagens do produtor e imagens dos templates.
-- Objetos ficam sempre em <business_id>/<pasta>/ficheiro.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('producer-assets', 'producer-assets', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('website-assets', 'website-assets', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS já vem ativa no Supabase.

drop policy if exists producer_assets_insert on storage.objects;
drop policy if exists producer_assets_update on storage.objects;
drop policy if exists producer_assets_delete on storage.objects;
drop policy if exists website_assets_insert on storage.objects;
drop policy if exists website_assets_update on storage.objects;
drop policy if exists website_assets_delete on storage.objects;

create policy producer_assets_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'producer-assets'
  and public.azotrace_can_manage_business(split_part(name, '/', 1))
);

create policy producer_assets_update
on storage.objects for update to authenticated
using (
  bucket_id = 'producer-assets'
  and public.azotrace_can_manage_business(split_part(name, '/', 1))
)
with check (
  bucket_id = 'producer-assets'
  and public.azotrace_can_manage_business(split_part(name, '/', 1))
);

create policy producer_assets_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'producer-assets'
  and public.azotrace_can_manage_business(split_part(name, '/', 1))
);

create policy website_assets_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'website-assets'
  and public.azotrace_can_manage_business(split_part(name, '/', 1))
);

create policy website_assets_update
on storage.objects for update to authenticated
using (
  bucket_id = 'website-assets'
  and public.azotrace_can_manage_business(split_part(name, '/', 1))
)
with check (
  bucket_id = 'website-assets'
  and public.azotrace_can_manage_business(split_part(name, '/', 1))
);

create policy website_assets_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'website-assets'
  and public.azotrace_can_manage_business(split_part(name, '/', 1))
);

commit;
