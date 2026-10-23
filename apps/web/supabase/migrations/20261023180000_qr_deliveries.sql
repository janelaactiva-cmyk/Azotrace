-- Azotrace: etiqueta logística por envio, locais identificados e prova de receção.
-- Não modifica os registos/receções do fluxo anterior.
begin;
create table if not exists public.az_delivery_places(
 id uuid primary key,company_id text not null references public.azotrace_companies(id) on delete cascade,
 name text not null check(length(name) between 2 and 160),address text not null check(length(address) between 3 and 300),
 kind text not null check(kind in ('production','warehouse','store')),active boolean not null default true,
 created_at timestamptz not null default now(),unique(company_id,id)
);
create table if not exists public.az_delivery_staff(
 id uuid primary key,company_id text not null references public.azotrace_companies(id) on delete cascade,
 email text not null check(email=lower(trim(email)) and length(email)<=254),name text not null check(length(name) between 2 and 120),
 role text not null check(role in ('courier','receiver')),place_id uuid,active boolean not null default true,
 created_at timestamptz not null default now(),
 foreign key(company_id,place_id) references public.az_delivery_places(company_id,id) on delete cascade,
 check((role='courier' and place_id is null) or (role='receiver' and place_id is not null)),
 unique nulls not distinct(company_id,email,place_id)
);
create table if not exists public.az_delivery_dispatches(
 id uuid primary key,company_id text not null references public.azotrace_companies(id) on delete cascade,
 business_id text not null references public.producer_workspaces(business_id) on delete cascade,
 batch_id text not null,batch_code text not null,product_name text not null,
 from_place uuid not null,to_place uuid not null,parent_id uuid,
 from_name text not null,from_address text not null,to_name text not null,to_address text not null,
 quantity numeric(18,3) not null check(quantity>0 and quantity<=1000000000),unit text not null check(length(unit) between 1 and 30),
 status text not null default 'in_transit' check(status in ('in_transit','received')),
 created_at timestamptz not null default now(),created_by uuid references auth.users(id) on delete set null,
 received_at timestamptz,received_by uuid references auth.users(id) on delete set null,receiver_name text,
 received_quantity numeric(18,3),notes text,signature jsonb,
 unique(company_id,id),foreign key(company_id,from_place) references public.az_delivery_places(company_id,id),
 foreign key(company_id,to_place) references public.az_delivery_places(company_id,id),
 foreign key(company_id,parent_id) references public.az_delivery_dispatches(company_id,id),
 check(from_place<>to_place),check(received_quantity is null or received_quantity>=0 and received_quantity<=quantity),
 check(status<>'received' or (received_at is not null and receiver_name is not null and signature is not null and received_quantity is not null))
);
create index if not exists az_delivery_dispatch_scope on public.az_delivery_dispatches(company_id,business_id,batch_id,created_at);
create index if not exists az_delivery_parent on public.az_delivery_dispatches(parent_id);
create table if not exists public.az_delivery_events(
 id uuid primary key default gen_random_uuid(),company_id text not null references public.azotrace_companies(id) on delete cascade,
 dispatch_id uuid not null references public.az_delivery_dispatches(id) on delete cascade,
 kind text not null check(kind in ('dispatched','received')),actor_id uuid references auth.users(id) on delete set null,
 at timestamptz not null default now(),details jsonb not null
);
alter table public.az_delivery_places enable row level security;
alter table public.az_delivery_staff enable row level security;
alter table public.az_delivery_dispatches enable row level security;
alter table public.az_delivery_events enable row level security;
revoke all on public.az_delivery_places,public.az_delivery_staff,public.az_delivery_dispatches,public.az_delivery_events from public,anon,authenticated;
grant select,insert,update on public.az_delivery_places,public.az_delivery_staff to service_role;
grant select on public.az_delivery_dispatches,public.az_delivery_events to service_role;

create or replace function public.az_delivery_create(p_id uuid,p_company text,p_business text,p_batch text,p_from uuid,p_to uuid,p_parent uuid,p_quantity numeric,p_unit text,p_actor uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare origin public.az_delivery_places;destination public.az_delivery_places;parent public.az_delivery_dispatches;existing public.az_delivery_dispatches;
 workspace public.producer_workspaces;batch jsonb;reserved numeric;actor_email text;producer boolean;
begin
 if p_quantity is null or p_quantity<=0 or p_quantity>1000000000 or p_quantity<>round(p_quantity,3) or p_unit is null or length(trim(p_unit)) not between 1 and 30 then raise exception 'delivery_quantity';end if;
 if not exists(select 1 from public.azotrace_companies where id=p_company and active is true) then raise exception 'delivery_forbidden';end if;
 select lower(u.email) into actor_email from auth.users u join public.profiles p on p.id=u.id where u.id=p_actor and u.email_confirmed_at is not null and p.active is true and p.platform_role<>'superadmin';
 if not found then raise exception 'delivery_forbidden';end if;
 select exists(select 1 from public.azotrace_company_members m where m.company_id=p_company and m.user_id=p_actor and m.active is true and (m.role='admin' or exists(select 1 from public.azotrace_user_permissions a where a.user_id=p_actor and a.company_id=p_company and a.permission='production.write') and exists(select 1 from public.azotrace_business_access b where b.user_id=p_actor and b.business_id=p_business))) into producer;
 perform pg_advisory_xact_lock(hashtextextended('delivery:'||p_business||':'||p_batch,0));
 select * into workspace from public.producer_workspaces where business_id=p_business and company_id=p_company for share;
 if not found then raise exception 'delivery_batch';end if;
 select b into batch from jsonb_array_elements(coalesce(workspace.state->'batches','[]'::jsonb)) b where b->>'id'=p_batch;
 if batch is null then raise exception 'delivery_batch';end if;
 select * into origin from public.az_delivery_places where id=p_from and company_id=p_company and active is true for share;
 if not found then raise exception 'delivery_place';end if;
 select * into destination from public.az_delivery_places where id=p_to and company_id=p_company and active is true for share;
 if not found or p_from=p_to then raise exception 'delivery_place';end if;
 if p_parent is null then
  if not producer or origin.kind<>'production' or destination.kind<>'warehouse' then raise exception 'delivery_forbidden';end if;
 else
  select * into parent from public.az_delivery_dispatches where id=p_parent and company_id=p_company and business_id=p_business and batch_id=p_batch for update;
  if not found or parent.status<>'received' or parent.to_place<>p_from or origin.kind<>'warehouse' or destination.kind<>'store' then raise exception 'delivery_parent';end if;
  if not producer and not exists(select 1 from public.az_delivery_staff where company_id=p_company and email=actor_email and active is true and (role='courier' or place_id=p_from)) then raise exception 'delivery_forbidden';end if;
 end if;
 select * into existing from public.az_delivery_dispatches where id=p_id;
 if found then
  if existing.created_by is distinct from p_actor or existing.company_id<>p_company or existing.business_id<>p_business or existing.batch_id<>p_batch or existing.from_place<>p_from or existing.to_place<>p_to or existing.parent_id is distinct from p_parent or existing.quantity<>p_quantity or existing.unit<>trim(p_unit) then raise exception 'delivery_conflict';end if;
  return jsonb_build_object('id',existing.id,'status',existing.status);
 end if;
 if p_parent is not null then
  select coalesce(sum(quantity),0) into reserved from public.az_delivery_dispatches where parent_id=p_parent;
  if parent.unit<>trim(p_unit) or reserved+p_quantity>parent.received_quantity then raise exception 'delivery_balance';end if;
 end if;
 if (select count(*) from public.az_delivery_dispatches where created_by=p_actor and created_at>now()-interval '1 day')>=100 then raise exception 'delivery_rate';end if;
 insert into public.az_delivery_dispatches(id,company_id,business_id,batch_id,batch_code,product_name,from_place,to_place,parent_id,from_name,from_address,to_name,to_address,quantity,unit,created_by)
 values(p_id,p_company,p_business,p_batch,coalesce(batch->>'code','Lote'),coalesce((select pr->>'name' from jsonb_array_elements(coalesce(workspace.state->'products','[]'::jsonb)) pr where pr->>'id'=batch->>'productId' limit 1),'Produto'),p_from,p_to,p_parent,origin.name,origin.address,destination.name,destination.address,p_quantity,trim(p_unit),p_actor);
 insert into public.az_delivery_events(company_id,dispatch_id,kind,actor_id,details) values(p_company,p_id,'dispatched',p_actor,jsonb_build_object('from',origin.name,'to',destination.name,'address',destination.address,'quantity',p_quantity,'unit',trim(p_unit)));
 return jsonb_build_object('id',p_id,'status','in_transit');
end $$;

create or replace function public.az_delivery_receive(p_id uuid,p_actor uuid,p_name text,p_quantity numeric,p_notes text,p_signature jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare item public.az_delivery_dispatches;actor_email text;stroke jsonb;point jsonb;points integer:=0;minx numeric:=1;maxx numeric:=0;miny numeric:=1;maxy numeric:=0;x numeric;y numeric;
begin
 select * into item from public.az_delivery_dispatches where id=p_id for update;
 if not found then raise exception 'delivery_missing';end if;
 select lower(u.email) into actor_email from auth.users u join public.profiles p on p.id=u.id where u.id=p_actor and u.email_confirmed_at is not null and p.active is true and p.platform_role<>'superadmin';
 if not found or not exists(select 1 from public.azotrace_companies where id=item.company_id and active is true) then raise exception 'delivery_forbidden';end if;
 if not exists(select 1 from public.az_delivery_staff s join public.az_delivery_places l on l.id=item.to_place and l.company_id=s.company_id and l.active is true where s.company_id=item.company_id and s.email=actor_email and s.active is true and (s.role='courier' or s.place_id=item.to_place)) then raise exception 'delivery_forbidden';end if;
 if p_name is null or length(trim(p_name)) not between 2 and 120 or p_quantity is null or p_quantity<0 or p_quantity>item.quantity or p_quantity<>round(p_quantity,3) or length(coalesce(p_notes,''))>1000 or (p_quantity<>item.quantity and length(trim(coalesce(p_notes,'')))<3) then raise exception 'delivery_quantity';end if;
 if p_signature is null or jsonb_typeof(p_signature)<>'array' or jsonb_array_length(p_signature) not between 1 and 80 then raise exception 'delivery_signature';end if;
 for stroke in select value from jsonb_array_elements(p_signature) loop
  if jsonb_typeof(stroke)<>'array' or jsonb_array_length(stroke) not between 2 and 3000 then raise exception 'delivery_signature';end if;
  for point in select value from jsonb_array_elements(stroke) loop
   if jsonb_typeof(point)<>'array' or jsonb_array_length(point)<>2 or jsonb_typeof(point->0)<>'number' or jsonb_typeof(point->1)<>'number' then raise exception 'delivery_signature';end if;
   x:=(point->>0)::numeric;y:=(point->>1)::numeric;if x<0 or x>1 or y<0 or y>1 then raise exception 'delivery_signature';end if;
   minx:=least(minx,x);maxx:=greatest(maxx,x);miny:=least(miny,y);maxy:=greatest(maxy,y);points:=points+1;if points>3000 then raise exception 'delivery_signature';end if;
  end loop;
 end loop;
 if points<8 or maxx-minx+maxy-miny<0.12 then raise exception 'delivery_signature';end if;
 if item.status='received' then
  if item.received_by is distinct from p_actor or item.receiver_name<>trim(p_name) or item.received_quantity<>p_quantity or item.signature<>p_signature or coalesce(item.notes,'')<>trim(coalesce(p_notes,'')) then raise exception 'delivery_closed';end if;
  return jsonb_build_object('ok',true,'receivedAt',item.received_at);
 end if;
 update public.az_delivery_dispatches set status='received',received_at=now(),received_by=p_actor,receiver_name=trim(p_name),received_quantity=p_quantity,notes=trim(coalesce(p_notes,'')),signature=p_signature where id=p_id;
 insert into public.az_delivery_events(company_id,dispatch_id,kind,actor_id,details) values(item.company_id,p_id,'received',p_actor,jsonb_build_object('place',item.to_name,'address',item.to_address,'quantity',p_quantity,'unit',item.unit,'receiver',trim(p_name),'difference',item.quantity-p_quantity));
 return jsonb_build_object('ok',true,'receivedAt',now());
end $$;
revoke all on function public.az_delivery_create(uuid,text,text,text,uuid,uuid,uuid,numeric,text,uuid),public.az_delivery_receive(uuid,uuid,text,numeric,text,jsonb) from public,anon,authenticated;
grant execute on function public.az_delivery_create(uuid,text,text,text,uuid,uuid,uuid,numeric,text,uuid),public.az_delivery_receive(uuid,uuid,text,numeric,text,jsonb) to service_role;
commit;
