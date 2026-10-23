begin;
create table if not exists public.azotrace_platform_events(
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default clock_timestamp(),
 level text not null check(level in ('info','warning','error')),module text not null check(module in ('accounts','billing','support','system')),
 action text not null check(length(action)<=100),summary text not null check(length(summary)<=300),
 resource text,resource_id text,company_id text,actor_id uuid,request_id uuid,
 status_code integer check(status_code between 100 and 599),duration_ms integer check(duration_ms between 0 and 3600000),
 details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object' and octet_length(details::text)<=10000)
);
create index if not exists az_platform_events_created on public.azotrace_platform_events(created_at desc,id desc);
create index if not exists az_platform_events_level_created on public.azotrace_platform_events(level,created_at desc);
create index if not exists az_platform_events_module_created on public.azotrace_platform_events(module,created_at desc);
alter table public.azotrace_platform_events enable row level security;
revoke all on public.azotrace_platform_events from public,anon,authenticated,service_role;
grant select,insert on public.azotrace_platform_events to service_role;

-- No request body, email, NIF, telephone, password, token or private document is copied.
create or replace function public.az_record_platform_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare current_row jsonb;prior_row jsonb;current_safe jsonb:='{}';prior_safe jsonb:='{}';field text;fields text[];module_name text;label text;kind text;record_id text;
begin
 if tg_op='DELETE' then current_row:=to_jsonb(old);prior_row:=current_row;else current_row:=to_jsonb(new);if tg_op='UPDATE' then prior_row:=to_jsonb(old);else prior_row:='{}';end if;end if;
 case tg_table_name
 when 'azotrace_companies' then fields:=array['active'];module_name:='accounts';label:='Empresa';
 when 'profiles' then fields:=array['active','platform_role','status'];module_name:='accounts';label:='Perfil de utilizador';
 when 'subscriptions' then fields:=array['status','plan_name','started_at','expires_at','company_id'];module_name:='billing';label:='Subscrição';
 when 'azotrace_support_tickets' then fields:=array['status','priority','assignee_user_id'];module_name:='support';label:='Ticket de suporte';
 when 'azotrace_plan_catalog' then fields:=array['version'];module_name:='billing';label:='Catálogo de planos';
 else raise exception 'unsupported_audit_source';end case;
 foreach field in array fields loop
  if current_row ? field then current_safe:=current_safe||jsonb_build_object(field,current_row->field);end if;
  if prior_row ? field then prior_safe:=prior_safe||jsonb_build_object(field,prior_row->field);end if;
 end loop;
 if tg_op='UPDATE' and current_safe=prior_safe then return new;end if;
 kind:=case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;
 record_id:=left(current_row->>'id',200);
 insert into public.azotrace_platform_events(level,module,action,summary,resource,resource_id,company_id,actor_id,details)
 values(case when tg_op='DELETE' then 'warning' else 'info' end,module_name,tg_table_name||'.'||kind,
 label||case tg_op when 'INSERT' then ': registo criado' when 'UPDATE' then ': estado ou configuração alterados' else ': registo removido' end,
 tg_table_name,record_id,case when tg_table_name='azotrace_companies' then record_id else left(current_row->>'company_id',200) end,auth.uid(),
 jsonb_build_object('previous',case when tg_op='INSERT' then '{}'::jsonb else prior_safe end,'current',case when tg_op='DELETE' then '{}'::jsonb else current_safe end));
 if tg_op='DELETE' then return old;else return new;end if;
end;$$;
revoke all on function public.az_record_platform_change() from public,anon,authenticated;

do $$ declare source text;begin
 foreach source in array array['azotrace_companies','profiles','subscriptions','azotrace_support_tickets','azotrace_plan_catalog'] loop
  if to_regclass('public.'||source) is not null then
   execute format('drop trigger if exists az_platform_change_log on public.%I',source);
   execute format('create trigger az_platform_change_log after insert or update or delete on public.%I for each row execute function public.az_record_platform_change()',source);
  end if;
 end loop;
end;$$;

create or replace function public.az_platform_event_summary(p_from timestamptz,p_until timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;daily jsonb;
begin
 if p_from is null or p_until is null or p_until<=p_from or p_until-p_from>interval '31 days' then raise exception 'invalid_period';end if;
 select jsonb_build_object('total',count(*),'errors',count(*) filter(where level='error'),'warnings',count(*) filter(where level='warning'),
 'requests',count(*) filter(where duration_ms is not null),'average_ms',round(avg(duration_ms),2),'latest_at',max(created_at)) into result
 from public.azotrace_platform_events where created_at>=p_from and created_at<p_until;
 select coalesce(jsonb_agg(to_jsonb(b) order by b.day),'[]'::jsonb) into daily from(
  select to_char(created_at at time zone 'Atlantic/Azores','YYYY-MM-DD') as "day",
  count(*) filter(where level='info') info,count(*) filter(where level='warning') warning,count(*) filter(where level='error') error
  from public.azotrace_platform_events where created_at>=p_from and created_at<p_until group by 1
 )b;
 return result||jsonb_build_object('daily',daily);
end;$$;
revoke all on function public.az_platform_event_summary(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.az_platform_event_summary(timestamptz,timestamptz) to service_role;
commit;
