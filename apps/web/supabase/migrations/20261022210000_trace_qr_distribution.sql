-- Executar depois de ATIVAR-RECECOES.sql. Mantém as receções existentes.
begin;
drop index if exists public.az_trace_one_step;
create unique index if not exists az_trace_one_warehouse on public.az_trace_shipments(business_id,batch_id) where step='warehouse' and status in ('awaiting','received');
create or replace function public.az_trace_create_shipment(p_id uuid,p_company text,p_business text,p_batch text,p_batch_code text,p_product text,p_sender_company text,p_step text,p_org text,p_email text,p_quantity numeric,p_unit text,p_actor uuid,p_token_hash text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.az_trace_shipments; warehouse public.az_trace_shipments; result public.az_trace_shipments; workspace public.producer_workspaces; allocated numeric;
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
 if p_step='warehouse' and exists(select 1 from public.az_trace_shipments where business_id=p_business and batch_id=p_batch and step=p_step and status in ('awaiting','received'))then raise exception 'trace_step_exists';end if;
 if p_step='supermarket' then
  select * into warehouse from public.az_trace_shipments where business_id=p_business and batch_id=p_batch and step='warehouse' and status='received' order by confirmed_at desc limit 1;
  if not found then raise exception 'trace_warehouse_required';end if;
  select coalesce(sum(quantity),0) into allocated from public.az_trace_shipments where business_id=p_business and batch_id=p_batch and step='supermarket' and status in ('awaiting','received');
  if exists(select 1 from public.az_trace_shipments where business_id=p_business and batch_id=p_batch and step='supermarket' and status='awaiting' and recipient_email=p_email) then raise exception 'trace_recipient_pending';end if;
  if warehouse.unit<>p_unit or p_quantity+allocated>warehouse.received_quantity then raise exception 'trace_quantity_exceeds';end if;
 elsif p_step<>'warehouse' then raise exception 'trace_step_invalid';end if;
 insert into public.az_trace_shipments(id,company_id,business_id,batch_id,batch_code,product_name,sender_company,step,recipient_org,recipient_email,quantity,unit,created_by,token_hash)
 values(p_id,p_company,p_business,p_batch,p_batch_code,p_product,p_sender_company,p_step,p_org,p_email,p_quantity,p_unit,p_actor,p_token_hash) returning * into result;
 return to_jsonb(result);
end $$;


commit;
