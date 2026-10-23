begin;
create table if not exists public.azotrace_company_privacy (
 company_id text primary key references public.azotrace_companies(id) on delete cascade,
 draft_content text not null default '' check (char_length(draft_content)<=100000),
 published_content text check (char_length(published_content)<=100000),
 version bigint not null default 1 check(version>0),
 updated_at timestamptz not null default now(),
 published_at timestamptz,
 updated_by uuid references auth.users(id) on delete set null,
 check ((published_content is null and published_at is null) or (published_content is not null and length(trim(published_content))>0 and published_at is not null))
);
alter table public.azotrace_company_privacy enable row level security;
revoke all on public.azotrace_company_privacy from public, anon, authenticated;
grant select,insert,update on public.azotrace_company_privacy to service_role;
commit;
