-- Requer 20261013_azotrace_support_tickets.sql. Executar manualmente no Supabase.
begin;
alter table public.azotrace_support_tickets alter column company_id drop not null;
alter table public.azotrace_support_tickets alter column created_by_user_id drop not null;
alter table public.azotrace_support_ticket_messages alter column author_user_id drop not null;
alter table public.azotrace_support_tickets add column if not exists source text not null default 'manual';
alter table public.azotrace_support_tickets add column if not exists company_label text;
alter table public.azotrace_support_tickets add column if not exists public_token_hash text;
alter table public.azotrace_support_tickets add column if not exists chatbot_request_id uuid;
create unique index if not exists az_support_chatbot_request_idx on public.azotrace_support_tickets(chatbot_request_id) where chatbot_request_id is not null;
create table if not exists public.az_support_rate_limits(rate_key text not null,window_start timestamptz not null,requests integer not null,primary key(rate_key,window_start));
alter table public.az_support_rate_limits enable row level security;
revoke all on public.az_support_rate_limits from public,anon,authenticated;
grant all on public.az_support_rate_limits to service_role;

create or replace function public.az_support_create_chatbot_ticket(p_request uuid,p_company text,p_actor uuid,p_name text,p_email text,p_company_label text,p_subject text,p_body text,p_token_hash text,p_rate_key text,p_source text,p_priority text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare existing public.azotrace_support_tickets; new_id uuid; n integer; total integer; current_window timestamptz:=date_trunc('hour',now());
begin
 -- Uma secção crítica para deduplicação e limites, incluindo pedidos concorrentes.
 perform pg_advisory_xact_lock(741210421);
 select * into existing from public.azotrace_support_tickets where chatbot_request_id=p_request;
 if found then
   if existing.created_by_user_id is not distinct from p_actor and existing.public_token_hash is not distinct from p_token_hash then return existing.id; end if;
   raise exception 'support_conflict';
 end if;
 if length(btrim(p_name)) not between 2 and 100 or length(p_email) not between 3 and 180 or length(btrim(p_subject)) not between 3 and 180 or length(btrim(p_body)) not between 3 and 6000 then raise exception 'invalid_support_payload'; end if;
 if p_priority not in ('low','medium','high') then raise exception 'invalid_priority'; end if;
 if p_source not in ('manual','chatbot') then raise exception 'invalid_source'; end if;
 if p_actor is null and (p_company is not null or p_token_hash is null or length(p_token_hash)<>64) then raise exception 'invalid_public_ticket'; end if;
 delete from public.az_support_rate_limits where window_start<now()-interval '2 hours';
 select coalesce(sum(requests),0) into total from public.az_support_rate_limits where window_start=current_window;
 if total>=100 then raise exception 'support_rate_limit'; end if;
 insert into public.az_support_rate_limits values(p_rate_key,current_window,1) on conflict(rate_key,window_start) do update set requests=az_support_rate_limits.requests+1 returning requests into n;
 if n>3 then raise exception 'support_rate_limit'; end if;
 insert into public.azotrace_support_tickets(company_id,subject,priority,status,requester_name,requester_email,created_by_user_id,source,company_label,public_token_hash,chatbot_request_id)
 values(p_company,btrim(p_subject),p_priority,'open',btrim(p_name),p_email,p_actor,p_source,p_company_label,p_token_hash,p_request) returning id into new_id;
 insert into public.azotrace_support_ticket_messages(ticket_id,author_user_id,author_name,body,is_internal) values(new_id,p_actor,btrim(p_name),btrim(p_body),false);
 return new_id;
end; $$;
revoke all on function public.az_support_create_chatbot_ticket(uuid,text,uuid,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.az_support_create_chatbot_ticket(uuid,text,uuid,text,text,text,text,text,text,text,text,text) to service_role;

create or replace function public.az_support_append_message(p_ticket uuid,p_message_id uuid,p_author uuid,p_name text,p_body text,p_internal boolean,p_reopen boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare existing public.azotrace_support_ticket_messages;
begin
 perform 1 from public.azotrace_support_tickets where id=p_ticket for update;
 if not found then raise exception 'support_not_found'; end if;
 select * into existing from public.azotrace_support_ticket_messages where id=p_message_id;
 if found then
   if existing.ticket_id=p_ticket and existing.author_user_id is not distinct from p_author and existing.body=p_body and existing.is_internal=p_internal then return; end if;
   raise exception 'support_conflict';
 end if;
 if length(btrim(p_body)) not between 1 and 6000 then raise exception 'invalid_support_message'; end if;
 if (select count(*) from public.azotrace_support_ticket_messages where ticket_id=p_ticket and created_at>now()-interval '1 minute')>=10 then raise exception 'support_rate_limit'; end if;
 insert into public.azotrace_support_ticket_messages(id,ticket_id,author_user_id,author_name,body,is_internal) values(p_message_id,p_ticket,p_author,p_name,p_body,p_internal);
 if p_reopen then update public.azotrace_support_tickets set status='open',resolved_at=null,resolved_by_user_id=null where id=p_ticket; end if;
end; $$;
revoke all on function public.az_support_append_message(uuid,uuid,uuid,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.az_support_append_message(uuid,uuid,uuid,text,text,boolean,boolean) to service_role;
commit;
