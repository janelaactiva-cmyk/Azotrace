-- Azotrace: expedições e receções por negócio/lote.
-- Não altera registos de produção existentes nem envia emails.
begin;
create table if not exists public.az_trace_shipments (
 id uuid primary key,
 company_id text not null references public.azotrace_companies(id) on delete cascade,
 business_id text not null references public.producer_workspaces(business_id) on delete cascade,
 batch_id text not null,
 batch_code text not null,
 product_name text not null,
 sender_company text not null,
 step text not null check(step in ('warehouse','supermarket')),
 recipient_org text not null check(length(recipient_org) between 2 and 180),
 recipient_email text not null,
 quantity numeric(18,3) not null check(quantity>0 and quantity<=1000000000),
 unit text not null check(length(unit) between 1 and 30),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz not null default(now()+interval '14 days'),
 status text not null default 'awaiting' check(status in ('awaiting','received','rejected','cancelled')),
 code_hash text,
 code_expires_at timestamptz,
 code_attempts integer not null default 0,
 code_sends integer not null default 0,
 code_sent_at timestamptz,
 confirmed_at timestamptz,
 receiver_name text,
 received_quantity numeric(18,3),
 receiver_notes text,
 constraint receipt_quantity check(received_quantity is null or received_quantity>=0 and received_quantity<=quantity),
 constraint completed_receipt check(status not in ('received','rejected') or confirmed_at is not null and receiver_name is not null)
);
create index if not exists az_trace_shipments_scope on public.az_trace_shipments(company_id,business_id,batch_id,created_at desc);
create index if not exists az_trace_shipments_actor on public.az_trace_shipments(created_by,created_at desc);
create unique index if not exists az_trace_one_step on public.az_trace_shipments(business_id,batch_id,step) where status in ('awaiting','received');
alter table public.az_trace_shipments enable row level security;
revoke all on public.az_trace_shipments from public,anon,authenticated;
grant select,insert,update,delete on public.az_trace_shipments to service_role;

create or replace function public.az_trace_create_shipment(p_id uuid,p_company text,p_business text,p_batch text,p_batch_code text,p_product text,p_sender_company text,p_step text,p_org text,p_email text,p_quantity numeric,p_unit text,p_actor uuid,p_token_hash text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.az_trace_shipments; warehouse public.az_trace_shipments; result public.az_trace_shipments; workspace public.producer_workspaces;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_business||':'||p_batch,0));
 if p_quantity is null or p_quantity<=0 or p_quantity>1000000000 or p_quantity<>round(p_quantity,3) then raise exception 'trace_quantity_exceeds';end if;
 select * into workspace from public.producer_workspaces where business_id=p_business and company_id=p_company for share;
 if not found or not exists(select 1 from jsonb_array_elements(coalesce(workspace.state->'batches','[]'::jsonb)) b where b->>'id'=p_batch) then raise exception 'trace_batch_missing'; end if;
 select * into existing from public.az_trace_shipments where id=p_id;
 if found then
  if existing.created_by is distinct from p_actor or existing.company_id<>p_company or existing.business_id<>p_business or existing.batch_id<>p_batch or existing.token_hash<>p_token_hash or existing.step<>p_step or existing.recipient_email<>p_email or existing.recipient_org<>p_org or existing.quantity<>p_quantity or existing.unit<>p_unit then raise exception 'trace_conflict';end if;
  return to_jsonb(existing);
 end if;
 if(select count(*) from public.az_trace_shipments where created_by=p_actor and created_at>now()-interval '1 day')>=50 then raise exception 'trace_create_limit';end if;
 if exists(select 1 from public.az_trace_shipments where business_id=p_business and batch_id=p_batch and step=p_step and status in ('awaiting','received'))then raise exception 'trace_step_exists';end if;
 if p_step='supermarket' then
  select * into warehouse from public.az_trace_shipments where business_id=p_business and batch_id=p_batch and step='warehouse' and status='received' order by confirmed_at desc limit 1;
  if not found then raise exception 'trace_warehouse_required';end if;
  if warehouse.unit<>p_unit or p_quantity>warehouse.received_quantity then raise exception 'trace_quantity_exceeds';end if;
 elsif p_step<>'warehouse' then raise exception 'trace_step_invalid';end if;
 insert into public.az_trace_shipments(id,company_id,business_id,batch_id,batch_code,product_name,sender_company,step,recipient_org,recipient_email,quantity,unit,created_by,token_hash)
 values(p_id,p_company,p_business,p_batch,p_batch_code,p_product,p_sender_company,p_step,p_org,p_email,p_quantity,p_unit,p_actor,p_token_hash) returning * into result;
 return to_jsonb(result);
end $$;

create or replace function public.az_trace_issue_code(p_token_hash text,p_code_hash text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare item public.az_trace_shipments;
begin
 select * into item from public.az_trace_shipments where token_hash=p_token_hash for update;
 if not found or item.expires_at<=now() then return jsonb_build_object('ok',false,'reason','expired');end if;
 if item.status<>'awaiting' then return jsonb_build_object('ok',false,'reason','closed');end if;
 if item.code_sent_at>now()-interval '60 seconds' or item.code_sends>=10 then return jsonb_build_object('ok',false,'reason','rate_limit');end if;
 update public.az_trace_shipments set code_hash=p_code_hash,code_expires_at=now()+interval '10 minutes',code_attempts=0,code_sends=code_sends+1,code_sent_at=now() where id=item.id;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.az_trace_confirm(p_token_hash text,p_code_hash text,p_name text,p_quantity numeric,p_notes text,p_accept boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare item public.az_trace_shipments;
begin
 select * into item from public.az_trace_shipments where token_hash=p_token_hash for update;
 if not found or item.expires_at<=now() then return jsonb_build_object('ok',false,'reason','expired');end if;
 if item.status<>'awaiting' then return jsonb_build_object('ok',false,'reason','closed');end if;
 if item.code_hash is null or item.code_expires_at<=now() or item.code_attempts>=5 then return jsonb_build_object('ok',false,'reason','code_expired');end if;
 if item.code_hash<>p_code_hash then
  update public.az_trace_shipments set code_attempts=code_attempts+1 where id=item.id;
  return jsonb_build_object('ok',false,'reason','code_invalid');
 end if;
 if p_accept is null or p_name is null or length(trim(p_name))<2 or length(p_name)>120 or p_quantity is null or p_quantity<0 or p_quantity>item.quantity or p_quantity<>round(p_quantity,3) or p_accept and p_quantity<=0 or not p_accept and (p_quantity<>0 or length(trim(coalesce(p_notes,'')))<3) or length(coalesce(p_notes,''))>1000 then return jsonb_build_object('ok',false,'reason','invalid');end if;
 update public.az_trace_shipments set status=case when p_accept then 'received' else 'rejected' end,confirmed_at=now(),receiver_name=trim(p_name),received_quantity=p_quantity,receiver_notes=left(coalesce(p_notes,''),1000),code_hash=null,code_expires_at=null
 where id=item.id returning * into item;
 return jsonb_build_object('ok',true,'status',item.status,'confirmedAt',item.confirmed_at,'receivedQuantity',item.received_quantity);
end $$;

create or replace function public.az_trace_cancel(p_id uuid,p_company text,p_business text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 update public.az_trace_shipments set status='cancelled',code_hash=null,code_expires_at=null
 where id=p_id and company_id=p_company and business_id=p_business and status='awaiting';
 return found;
end $$;
revoke all on function public.az_trace_create_shipment(uuid,text,text,text,text,text,text,text,text,text,numeric,text,uuid,text) from public,anon,authenticated;
revoke all on function public.az_trace_issue_code(text,text) from public,anon,authenticated;
revoke all on function public.az_trace_confirm(text,text,text,numeric,text,boolean) from public,anon,authenticated;
revoke all on function public.az_trace_cancel(uuid,text,text) from public,anon,authenticated;
grant execute on function public.az_trace_create_shipment(uuid,text,text,text,text,text,text,text,text,text,numeric,text,uuid,text) to service_role;
grant execute on function public.az_trace_issue_code(text,text) to service_role;
grant execute on function public.az_trace_confirm(text,text,text,numeric,text,boolean) to service_role;
grant execute on function public.az_trace_cancel(uuid,text,text) to service_role;
notify pgrst,'reload schema';
commit;
