begin;
create table if not exists public.azotrace_platform_settings (
 id text primary key check(id='platform'),
 site_name text not null check(length(trim(site_name)) between 1 and 100),
 description text not null default '' check(length(description)<=500),
 contact_email text not null default '' check(length(contact_email)<=254),
 version integer not null default 1 check(version>0),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
alter table public.azotrace_platform_settings enable row level security;
revoke all on public.azotrace_platform_settings from public,anon,authenticated;
grant select,update on public.azotrace_platform_settings to service_role;
insert into public.azotrace_platform_settings(id,site_name,description) values('platform','Azotrace','Sistema de Gestão de Negócios') on conflict(id) do nothing;
commit;
