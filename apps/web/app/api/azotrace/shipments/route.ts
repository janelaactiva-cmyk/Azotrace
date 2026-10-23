import {traceReply,traceFailure,traceBody,shipmentScope,traceDbError,TraceError,receiptToken,receiptHash,receiptUrl} from '~/lib/trace-receipts-server';
import {validateShipment} from '~/lib/trace-receipts';
import type {ProducerLocalState} from '~/app/dashboard/onboarding/_lib/local-store';
const columns='id,business_id,batch_id,step,recipient_org,recipient_email,quantity,unit,status,created_at,expires_at,confirmed_at,receiver_name,received_quantity,receiver_notes';
export async function GET(request:Request){try{
 const params=new URL(request.url).searchParams,businessId=params.get('businessId')||'',batchId=params.get('batchId')||'';
 const {db,business}=await shipmentScope(request,businessId,batchId);
 if(!batchId)throw new TraceError('Seleciona um lote.');
 const result=await db.from('az_trace_shipments').select(columns).eq('business_id',business.business_id).eq('company_id',business.company_id).eq('batch_id',batchId).order('created_at',{ascending:false}).limit(101);traceDbError(result.error);
 return traceReply({shipments:(result.data||[]).slice(0,100).map(row=>({...row,quantity:Number(row.quantity),received_quantity:row.received_quantity===null?null:Number(row.received_quantity)})),hasMore:(result.data||[]).length>100});
}catch(error){return traceFailure(error)}}
export async function POST(request:Request){try{
 const body=await traceBody(request),businessId=String(body.businessId||''),batchId=String(body.batchId||'');
 const {db,user,business,company}=await shipmentScope(request,businessId,batchId,true);
 if(body.action==='link'){
  if(typeof body.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))throw new TraceError('Entrega inválida.');
  const row=await db.from('az_trace_shipments').select('id,token_hash,status,expires_at').eq('id',body.id).eq('business_id',business.business_id).eq('company_id',business.company_id).maybeSingle();traceDbError(row.error);
  if(!row.data||row.data.status!=='awaiting'||Date.parse(row.data.expires_at)<=Date.now())throw new TraceError('Esta entrega já não tem um link ativo.',409);
  const token=receiptToken(row.data.id);if(receiptHash(token)!==row.data.token_hash)throw new TraceError('É necessário cancelar esta entrega e gerar um novo link.',409);
  return traceReply({...receiptUrl(request,token),expiresAt:row.data.expires_at});
 }
 if(body.action==='cancel'){
  if(typeof body.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))throw new TraceError('Entrega inválida.');
  const result=await db.rpc('az_trace_cancel',{p_id:body.id,p_company:business.company_id,p_business:business.business_id});traceDbError(result.error);
  if(!result.data)throw new TraceError('A entrega já não pode ser cancelada.',409);
  return traceReply({ok:true});
 }
 if(body.action!=='create')throw new TraceError('Ação inválida.');
 const input=validateShipment(body,user.email),workspace=await db.from('producer_workspaces').select('state').eq('business_id',business.business_id).eq('company_id',business.company_id).maybeSingle();traceDbError(workspace.error);
 const state=workspace.data?.state as ProducerLocalState|undefined,batch=state?.batches?.find(row=>row.id===batchId);
 if(!batch)throw new TraceError('Lote não encontrado neste negócio.',404);
 const token=receiptToken(input.requestId),destination=receiptUrl(request,token);
 const result=await db.rpc('az_trace_create_shipment',{p_id:input.requestId,p_company:business.company_id,p_business:business.business_id,p_batch:batch.id,p_batch_code:batch.code,p_product:state?.products?.find(row=>row.id===batch.productId)?.name||'Produto',p_sender_company:company.name,p_step:input.step,p_org:input.org,p_email:input.email,p_quantity:input.quantity,p_unit:input.unit,p_actor:user.id,p_token_hash:receiptHash(token)});traceDbError(result.error);
 return traceReply({id:input.requestId,...destination,expiresAt:result.data.expires_at},201);
}catch(error){return error instanceof Error&&!(error instanceof TraceError)?traceReply({error:error.message.startsWith('Indica ')||error.message.startsWith('A receção')||error.message.startsWith('Identificador')?error.message:'Não foi possível criar a entrega.'},400):traceFailure(error)}}
