import {deliveryActor,deliveryBody,deliveryQuantity,deliveryDb,deliveryFailure,deliveryId,deliveryReadAll,deliveryReply,deliveryText,dispatchRow,operatorAccess} from '~/lib/delivery-server';
import {dispatchColumns,validateSignature,type Dispatch,type DeliveryPlace} from '~/lib/delivery-types';
export async function GET(request:Request){try{const{db,user}=await deliveryActor(request),p=new URL(request.url).searchParams,id=p.get('envio');
if(!id&&(p.has('businessId')||p.has('batchId'))){
 const businessId=deliveryText(p.get('businessId'),1,200,'Negócio'),batchId=deliveryText(p.get('batchId'),1,200,'Lote');
 const workspace=await db.from('producer_workspaces').select('company_id').eq('business_id',businessId).maybeSingle();deliveryDb(workspace.error);if(!workspace.data)return deliveryReply({error:'Não tens acesso a este lote.'},403);
 const companyId=workspace.data.company_id;
 const company=await db.from('azotrace_companies').select('active').eq('id',companyId).maybeSingle();deliveryDb(company.error);
 const grants=await deliveryReadAll<{role:string;place_id:string|null}>((a,b)=>db.from('az_delivery_staff').select('role,place_id').eq('company_id',companyId).eq('email',user.email!.toLowerCase()).eq('active',true).order('id').range(a,b));
 if(!company.data?.active||!grants.length)return deliveryReply({error:'O Admin tem de registar o teu email como operador desta empresa.'},403);
 const rows=await deliveryReadAll<Dispatch>((a,b)=>db.from('az_delivery_dispatches').select(dispatchColumns).eq('company_id',companyId).eq('business_id',businessId).eq('batch_id',batchId).order('created_at').order('id').range(a,b));
 const visible=rows.filter(row=>grants.some(g=>g.role==='courier'||g.place_id===row.to_place||g.place_id===row.from_place));
 return deliveryReply({dispatches:visible.map(dispatchRow)});
}
if(!id){const staff=await db.from('az_delivery_staff').select('company_id,place_id,role,name').eq('email',user.email!.toLowerCase()).eq('active',true);deliveryDb(staff.error);return deliveryReply({name:user.user_metadata?.name||user.email,access:staff.data||[]})}
const result=await db.from('az_delivery_dispatches').select(dispatchColumns+',signature').eq('id',deliveryId(id)).maybeSingle();deliveryDb(result.error);if(!result.data)return deliveryReply({error:'Envio indisponível.'},404);const row=dispatchRow(result.data as unknown as Dispatch);await operatorAccess(db,user.email!,row);
const children=await deliveryReadAll<Dispatch>((a,b)=>db.from('az_delivery_dispatches').select(dispatchColumns).eq('parent_id',row.id).eq('company_id',row.company_id).order('id').range(a,b));
const stores=await deliveryReadAll<DeliveryPlace>((a,b)=>db.from('az_delivery_places').select('id,company_id,name,address,kind,active').eq('company_id',row.company_id).eq('kind','store').eq('active',true).order('id').range(a,b));
let canReceive=true;try{await operatorAccess(db,user.email!,row,true)}catch{canReceive=false}
return deliveryReply({dispatch:row,children:children.map(dispatchRow),stores,canReceive});}catch(error){return deliveryFailure(error)}}
export async function POST(request:Request){try{const{db,user}=await deliveryActor(request),body=await deliveryBody(request),id=deliveryId(body.id);const lookup=await db.from('az_delivery_dispatches').select(dispatchColumns).eq('id',id).maybeSingle();deliveryDb(lookup.error);if(!lookup.data)return deliveryReply({error:'Envio indisponível.'},404);const row=dispatchRow(lookup.data);await operatorAccess(db,user.email!,row,body.action==='receive');
if(body.action==='receive'){let signature;try{signature=validateSignature(body.signature)}catch(error){return deliveryReply({error:(error as Error).message},400)}const result=await db.rpc('az_delivery_receive',{p_id:id,p_actor:user.id,p_name:deliveryText(body.name,2,120,'Nome de quem recebe'),p_quantity:deliveryQuantity(body.quantity),p_notes:body.notes?deliveryText(body.notes,0,1000,'Observações'):'',p_signature:signature});deliveryDb(result.error);return deliveryReply(result.data)}
if(body.action==='forward'){const result=await db.rpc('az_delivery_create',{p_id:deliveryId(body.requestId),p_company:row.company_id,p_business:row.business_id,p_batch:row.batch_id,p_from:row.to_place,p_to:deliveryId(body.to),p_parent:row.id,p_quantity:deliveryQuantity(body.quantity),p_unit:row.unit,p_actor:user.id});deliveryDb(result.error);return deliveryReply(result.data,201)}
return deliveryReply({error:'Ação inválida.'},400)}catch(error){return deliveryFailure(error)}}
