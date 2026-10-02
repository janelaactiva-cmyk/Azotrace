-- Azotrace - onboarding e rastreabilidade genérica por unidades de produção
-- Compatível com negocios.id de qualquer tipo porque business_id é guardado como text.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers multitenant: funcionam com business_members quando existe e também
-- com o modelo antigo negocios.user_id.
-- ---------------------------------------------------------------------------
create or replace function public.az_can_access_business(target_business_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  allowed boolean := false;
begin
  if uid is null or target_business_id is null then return false; end if;

  if to_regclass('public.profiles') is not null then
    begin
      execute $q$
        select exists (
          select 1 from public.profiles p
          where p.id::text = $1
            and coalesce(to_jsonb(p)->>'platform_role','user') = 'superadmin'
        )
      $q$ into allowed using uid::text;
      if allowed then return true; end if;
    exception when others then null;
    end;
  end if;

  if to_regclass('public.business_members') is not null then
    begin
      execute $q$
        select exists (
          select 1 from public.business_members bm
          where bm.business_id::text = $1 and bm.user_id::text = $2
        )
      $q$ into allowed using target_business_id, uid::text;
      if allowed then return true; end if;
    exception when others then null;
    end;
  end if;

  if to_regclass('public.negocios') is not null then
    execute $q$
      select exists (
        select 1 from public.negocios n
        where n.id::text = $1 and n.user_id::text = $2
      )
    $q$ into allowed using target_business_id, uid::text;
  end if;

  return coalesce(allowed, false);
end;
$$;

create or replace function public.az_can_manage_business(target_business_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  allowed boolean := false;
begin
  if uid is null or target_business_id is null then return false; end if;

  if to_regclass('public.profiles') is not null then
    begin
      execute $q$
        select exists (
          select 1 from public.profiles p
          where p.id::text = $1
            and coalesce(to_jsonb(p)->>'platform_role','user') = 'superadmin'
        )
      $q$ into allowed using uid::text;
      if allowed then return true; end if;
    exception when others then null;
    end;
  end if;

  if to_regclass('public.business_members') is not null then
    begin
      execute $q$
        select exists (
          select 1 from public.business_members bm
          where bm.business_id::text = $1
            and bm.user_id::text = $2
            and coalesce(bm.role::text,'user') = 'admin'
        )
      $q$ into allowed using target_business_id, uid::text;
      if allowed then return true; end if;
    exception when others then null;
    end;
  end if;

  if to_regclass('public.negocios') is not null then
    execute $q$
      select exists (
        select 1 from public.negocios n
        where n.id::text = $1 and n.user_id::text = $2
      )
    $q$ into allowed using target_business_id, uid::text;
  end if;

  return coalesce(allowed, false);
end;
$$;

grant execute on function public.az_can_access_business(text) to authenticated;
grant execute on function public.az_can_manage_business(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table if not exists public.az_business_profiles (
  business_id text primary key,
  location text,
  logo_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.az_onboarding_state (
  business_id text primary key,
  user_id uuid,
  step integer not null default 0 check (step between 0 and 8),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.az_product_types (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  name text not null,
  preset_id text,
  unit_label text not null default 'Unidade',
  unit_prefix text not null default 'UND',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.az_production_units (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  product_type_id uuid not null references public.az_product_types(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'active' check (status in ('active','inactive','maintenance')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, product_type_id, code)
);

create table if not exists public.az_product_fields (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  product_type_id uuid not null references public.az_product_types(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null check (field_type in ('text','textarea','number','date','datetime','select','boolean','image')),
  unit text,
  required boolean not null default false,
  public boolean not null default true,
  options jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_type_id, field_key)
);

create table if not exists public.az_production_stages (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  product_type_id uuid not null references public.az_product_types(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_type_id, name)
);

create table if not exists public.az_products (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  product_type_id uuid not null references public.az_product_types(id) on delete restrict,
  name text not null,
  sku text,
  description text,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sku)
);

create table if not exists public.az_batches (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  product_id uuid not null references public.az_products(id) on delete cascade,
  code text not null,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('draft','active','production','finished','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

create table if not exists public.az_batch_sources (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  batch_id uuid not null references public.az_batches(id) on delete cascade,
  production_unit_id uuid not null references public.az_production_units(id) on delete restrict,
  quantity numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique (batch_id, production_unit_id)
);

create table if not exists public.az_production_records (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  product_id uuid not null references public.az_products(id) on delete cascade,
  batch_id uuid not null references public.az_batches(id) on delete cascade,
  stage_id uuid references public.az_production_stages(id) on delete set null,
  production_unit_ids uuid[] not null default '{}'::uuid[],
  data jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists az_product_types_business_idx on public.az_product_types(business_id);
create index if not exists az_units_business_idx on public.az_production_units(business_id);
create index if not exists az_units_type_idx on public.az_production_units(product_type_id);
create index if not exists az_fields_type_idx on public.az_product_fields(product_type_id, position);
create index if not exists az_stages_type_idx on public.az_production_stages(product_type_id, position);
create index if not exists az_products_business_idx on public.az_products(business_id);
create index if not exists az_batches_business_idx on public.az_batches(business_id);
create index if not exists az_batches_product_idx on public.az_batches(product_id);
create index if not exists az_records_business_idx on public.az_production_records(business_id, created_at desc);
create index if not exists az_records_batch_idx on public.az_production_records(batch_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.az_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'az_business_profiles','az_onboarding_state','az_product_types','az_production_units',
    'az_products','az_batches','az_production_records'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'trg_' || t || '_updated', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.az_touch_updated_at()', 'trg_' || t || '_updated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'az_business_profiles','az_onboarding_state','az_product_types','az_production_units',
    'az_product_fields','az_production_stages','az_products','az_batches','az_batch_sources','az_production_records'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists az_select on public.%I', t);
    execute format('drop policy if exists az_insert on public.%I', t);
    execute format('drop policy if exists az_update on public.%I', t);
    execute format('drop policy if exists az_delete on public.%I', t);
    execute format('create policy az_select on public.%I for select to authenticated using (public.az_can_access_business(business_id))', t);
  end loop;
end $$;

-- Configuração: só gestores/admins.
create policy az_insert on public.az_business_profiles for insert to authenticated with check (public.az_can_manage_business(business_id));
create policy az_update on public.az_business_profiles for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_business_profiles for delete to authenticated using (public.az_can_manage_business(business_id));

create policy az_insert on public.az_onboarding_state for insert to authenticated with check (public.az_can_manage_business(business_id));
create policy az_update on public.az_onboarding_state for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_onboarding_state for delete to authenticated using (public.az_can_manage_business(business_id));

create policy az_insert on public.az_product_types for insert to authenticated with check (public.az_can_manage_business(business_id));
create policy az_update on public.az_product_types for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_product_types for delete to authenticated using (public.az_can_manage_business(business_id));

create policy az_insert on public.az_production_units for insert to authenticated with check (public.az_can_manage_business(business_id));
create policy az_update on public.az_production_units for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_production_units for delete to authenticated using (public.az_can_manage_business(business_id));

create policy az_insert on public.az_product_fields for insert to authenticated with check (public.az_can_manage_business(business_id));
create policy az_update on public.az_product_fields for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_product_fields for delete to authenticated using (public.az_can_manage_business(business_id));

create policy az_insert on public.az_production_stages for insert to authenticated with check (public.az_can_manage_business(business_id));
create policy az_update on public.az_production_stages for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_production_stages for delete to authenticated using (public.az_can_manage_business(business_id));

create policy az_insert on public.az_products for insert to authenticated with check (public.az_can_manage_business(business_id));
create policy az_update on public.az_products for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_products for delete to authenticated using (public.az_can_manage_business(business_id));

create policy az_insert on public.az_batches for insert to authenticated with check (public.az_can_manage_business(business_id));
create policy az_update on public.az_batches for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_batches for delete to authenticated using (public.az_can_manage_business(business_id));

create policy az_insert on public.az_batch_sources for insert to authenticated with check (public.az_can_manage_business(business_id));
create policy az_update on public.az_batch_sources for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_batch_sources for delete to authenticated using (public.az_can_manage_business(business_id));

-- Registos: qualquer membro do negócio pode inserir; só gestor pode alterar/apagar.
create policy az_insert on public.az_production_records for insert to authenticated with check (public.az_can_access_business(business_id));
create policy az_update on public.az_production_records for update to authenticated using (public.az_can_manage_business(business_id)) with check (public.az_can_manage_business(business_id));
create policy az_delete on public.az_production_records for delete to authenticated using (public.az_can_manage_business(business_id));

-- ---------------------------------------------------------------------------
-- Storage para logos, produtos e fotos dos registos.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'azotrace-product-images',
  'azotrace-product-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists az_storage_insert on storage.objects;
drop policy if exists az_storage_update on storage.objects;
drop policy if exists az_storage_delete on storage.objects;

create policy az_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'azotrace-product-images'
  and public.az_can_access_business((storage.foldername(name))[1])
);

create policy az_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'azotrace-product-images'
  and public.az_can_access_business((storage.foldername(name))[1])
)
with check (
  bucket_id = 'azotrace-product-images'
  and public.az_can_access_business((storage.foldername(name))[1])
);

create policy az_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'azotrace-product-images'
  and public.az_can_manage_business((storage.foldername(name))[1])
);

commit;
