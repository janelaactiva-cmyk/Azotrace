begin;
create table if not exists public.public_trace_pages (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  batch_id text not null,
  owner_user_id uuid not null,
  status text not null default 'draft' check (status in ('draft','published')),
  snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (business_id,batch_id)
);
-- Uses the authenticated company and business assignments from the existing context.
create or replace function public.az_publication_access(business text, permission_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare ctx jsonb;
begin
  if auth.uid() is null then return false; end if;
  ctx := public.az_online_context(null);
  if not coalesce((ctx->'user'->>'active')::boolean,false) then return false; end if;
  if ctx->'user'->>'role' = 'superadmin' then return true; end if;
  return coalesce(ctx->'user'->'permissions' ? permission_name,false)
    and exists(select 1 from jsonb_array_elements(ctx->'businesses') b where b->>'id'=business);
end;
$$;
revoke all on function public.az_publication_access(text,text) from public;
grant execute on function public.az_publication_access(text,text) to authenticated;
create or replace function public.website_can_manage_business(target_business_id text)
returns boolean language sql stable security definer set search_path = public as $$
 select public.az_publication_access(target_business_id,'traceability.manage');
$$;
create or replace function public.website_can_access_business(target_business_id text)
returns boolean language sql stable security definer set search_path = public as $$
 select public.az_publication_access(target_business_id,'production.read');
$$;
alter table public.public_trace_pages enable row level security;
alter table public.business_websites enable row level security;
-- Replace the old policies on these two publication tables only.
do $$ declare p record; begin
 for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('public_trace_pages','business_websites') loop
  execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
 end loop;
end $$;
create policy published_trace_read on public.public_trace_pages for select to anon,authenticated using (status='published');
create policy private_trace_read on public.public_trace_pages for select to authenticated using (public.az_publication_access(business_id,'traceability.manage'));
create policy trace_insert on public.public_trace_pages for insert to authenticated with check (public.az_publication_access(business_id,'traceability.manage') and owner_user_id=auth.uid());
create policy trace_update on public.public_trace_pages for update to authenticated using (public.az_publication_access(business_id,'traceability.manage')) with check (public.az_publication_access(business_id,'traceability.manage'));
create policy trace_delete on public.public_trace_pages for delete to authenticated using (public.az_publication_access(business_id,'traceability.manage'));
create policy published_website_read on public.business_websites for select to anon,authenticated using (status='published');
create policy private_website_read on public.business_websites for select to authenticated using (public.az_publication_access(business_id,'traceability.manage'));
create policy website_insert on public.business_websites for insert to authenticated with check (public.az_publication_access(business_id,'traceability.manage'));
create policy website_update on public.business_websites for update to authenticated using (public.az_publication_access(business_id,'traceability.manage')) with check (public.az_publication_access(business_id,'traceability.manage'));
create policy website_delete on public.business_websites for delete to authenticated using (public.az_publication_access(business_id,'traceability.manage'));
grant select on public.public_trace_pages,public.business_websites to anon;
grant select,insert,update,delete on public.public_trace_pages,public.business_websites to authenticated;
commit;
