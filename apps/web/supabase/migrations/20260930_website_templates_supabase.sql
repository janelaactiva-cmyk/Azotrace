-- Azotrace - Website templates + Supabase Storage
-- Pode ser executado no SQL Editor do Supabase.
-- Compatível com o modelo multitenant (can_access_business/can_manage_business)
-- e inclui fallback para business_members / negocios.user_id.

begin;

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

create index if not exists business_websites_status_idx
  on public.business_websites (status);

create or replace function public.website_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_websites_touch_updated_at on public.business_websites;
create trigger business_websites_touch_updated_at
before update on public.business_websites
for each row execute function public.website_touch_updated_at();

-- Helper que tenta primeiro as funções RBAC multitenant já existentes.
-- Se ainda não existirem, usa business_members ou o proprietário em negocios.user_id.
create or replace function public.website_can_manage_business(target_business_id text)
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

  if to_regprocedure('public.can_manage_business(text)') is not null then
    execute 'select public.can_manage_business($1)' into allowed using target_business_id;
    if coalesce(allowed, false) then
      return true;
    end if;
  end if;

  if to_regclass('public.profiles') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'profiles'
         and column_name = 'platform_role'
     ) then
    execute 'select exists (
      select 1 from public.profiles p
      where p.id::text = $1 and p.platform_role::text = ''superadmin''
    )' into allowed using auth.uid()::text;

    if coalesce(allowed, false) then
      return true;
    end if;
  end if;

  if to_regclass('public.business_members') is not null then
    execute 'select exists (
      select 1 from public.business_members bm
      where bm.business_id::text = $1
        and bm.user_id::text = $2
        and bm.role::text = ''admin''
    )' into allowed using target_business_id, auth.uid()::text;

    if coalesce(allowed, false) then
      return true;
    end if;
  end if;

  if to_regclass('public.negocios') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'negocios'
         and column_name = 'user_id'
     ) then
    execute 'select exists (
      select 1 from public.negocios n
      where n.id::text = $1 and n.user_id::text = $2
    )' into allowed using target_business_id, auth.uid()::text;

    if coalesce(allowed, false) then
      return true;
    end if;
  end if;

  return false;
end;
$$;

create or replace function public.website_can_access_business(target_business_id text)
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

  if public.website_can_manage_business(target_business_id) then
    return true;
  end if;

  if to_regprocedure('public.can_access_business(text)') is not null then
    execute 'select public.can_access_business($1)' into allowed using target_business_id;
    if coalesce(allowed, false) then
      return true;
    end if;
  end if;

  if to_regclass('public.business_members') is not null then
    execute 'select exists (
      select 1 from public.business_members bm
      where bm.business_id::text = $1
        and bm.user_id::text = $2
    )' into allowed using target_business_id, auth.uid()::text;

    if coalesce(allowed, false) then
      return true;
    end if;
  end if;

  return false;
end;
$$;

grant execute on function public.website_can_manage_business(text) to anon, authenticated;
grant execute on function public.website_can_access_business(text) to anon, authenticated;

alter table public.business_websites enable row level security;

grant select on public.business_websites to anon, authenticated;
grant insert, update, delete on public.business_websites to authenticated;

drop policy if exists business_websites_select on public.business_websites;
drop policy if exists business_websites_insert on public.business_websites;
drop policy if exists business_websites_update on public.business_websites;
drop policy if exists business_websites_delete on public.business_websites;

-- Published é público. Drafts só são visíveis a membros da empresa.
create policy business_websites_select
on public.business_websites
for select
to anon, authenticated
using (
  status = 'published'
  or public.website_can_access_business(business_id)
);

create policy business_websites_insert
on public.business_websites
for insert
to authenticated
with check (public.website_can_manage_business(business_id));

create policy business_websites_update
on public.business_websites
for update
to authenticated
using (public.website_can_manage_business(business_id))
with check (public.website_can_manage_business(business_id));

create policy business_websites_delete
on public.business_websites
for delete
to authenticated
using (public.website_can_manage_business(business_id));

-- Bucket público para que os sites publicados consigam mostrar as imagens.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'website-assets',
  'website-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage: cada objeto deve ficar em website-assets/<business_id>/...
drop policy if exists website_assets_select on storage.objects;
drop policy if exists website_assets_insert on storage.objects;
drop policy if exists website_assets_update on storage.objects;
drop policy if exists website_assets_delete on storage.objects;

create policy website_assets_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'website-assets'
  and public.website_can_access_business(split_part(name, '/', 1))
);

create policy website_assets_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'website-assets'
  and public.website_can_manage_business(split_part(name, '/', 1))
);

create policy website_assets_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'website-assets'
  and public.website_can_manage_business(split_part(name, '/', 1))
)
with check (
  bucket_id = 'website-assets'
  and public.website_can_manage_business(split_part(name, '/', 1))
);

create policy website_assets_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'website-assets'
  and public.website_can_manage_business(split_part(name, '/', 1))
);

commit;
