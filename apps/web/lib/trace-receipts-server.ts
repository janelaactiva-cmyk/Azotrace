import 'server-only';
import {createHash,createHmac} from 'node:crypto';
import {getSupabaseAdminClient} from './supabase-admin';
import {verifiedOnlineSession} from '~/app/api/azotrace/_lib/online-auth';
import {canReadBusinessChain} from './business-blockchain';
export class TraceError extends Error{constructor(message:string,public status=400,public code='TRACE_ERROR'){super(message);}}
export const traceReply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export const receiptHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function receiptToken(id:string){const key=process.env.TRACE_RECEIPT_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new TraceError('O serviço de receção não está disponível.',503);return createHmac('sha256',key).update('azotrace:receipt:v1:'+id).digest('base64url');}
export function receiptUrl(request:Request,token:string){const configured=process.env.TRACE_RECEIPT_BASE_URL||(process.env.NODE_ENV==='production'?process.env.NEXT_PUBLIC_SITE_URL:undefined);const base=new URL(configured||request.url);if(!['https:','http:'].includes(base.protocol)||base.username||base.password||process.env.NODE_ENV==='production'&&base.protocol!=='https:')throw new TraceError('O endereço público de receção tem de usar HTTPS.',503);const link=new URL('/receber-lote',base.origin);link.hash=token;return{link:link.toString(),localOnly:['localhost','127.0.0.1','[::1]'].includes(link.hostname)};}
export function traceDbError(error:{code?:string;message?:string}|null){
 if(!error)return;
 if(['42P01','42883','PGRST202','PGRST205'].includes(error.code||''))throw new TraceError('O registo de entregas e receções ainda não foi ativado nesta plataforma.',503,'TRACE_SETUP_REQUIRED');
 const messages:Record<string,string>={trace_recipient_pending:'Já existe uma entrega pendente para este email. Confirma ou cancela essa entrega primeiro.',trace_step_exists:'Já existe uma entrega pendente ou recebida para este destino.',trace_warehouse_required:'O armazém tem de confirmar a receção antes da expedição para o supermercado.',trace_quantity_exceeds:'A quantidade não pode superar a recebida no armazém e tem de usar a mesma unidade.',trace_batch_missing:'O lote já não existe neste negócio.',trace_conflict:'Este pedido já foi usado com outros dados. Reabre o formulário.',trace_create_limit:'Atingiste o limite diário de expedições.'};
 for(const [key,message]of Object.entries(messages))if(error.message?.includes(key))throw new TraceError(message,409);
 throw new TraceError('Não foi possível guardar ou consultar a receção. Tenta novamente.',503);
}
export function traceFailure(error:unknown){return error instanceof TraceError?traceReply({error:error.message,code:error.code},error.status):traceReply({error:'Não foi possível concluir o pedido.'},503);}
export async function traceBody(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new TraceError('Origem do pedido inválida.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))throw new TraceError('Formato inválido.',415);
 const reader=request.body?.getReader();if(!reader)throw new TraceError('Dados em falta.');const chunks:Uint8Array[]=[];let size=0;
 while(true){const{value,done}=await reader.read();if(done)break;size+=value.length;if(size>12000){await reader.cancel();throw new TraceError('Pedido demasiado longo.',413)}chunks.push(value);}
 try{const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body as Record<string,unknown>}catch{throw new TraceError('Dados inválidos.');}
}
export async function shipmentScope(request:Request,businessId:string,batchId?:string,writing=false){
 let session;try{session=await verifiedOnlineSession(request)}catch{throw new TraceError('Inicia sessão e confirma o MFA, se estiver ativo.',401)}
 const {user,target}=session;
 if(writing&&(target||user.role==='superadmin'||!user.permissions.includes('production.write')))throw new TraceError('A expedição tem de ser registada por um responsável do negócio.',403);
 if(!businessId||businessId.length>200)throw new TraceError('Seleciona um negócio válido.');
 const db=getSupabaseAdminClient(),result=await db.from('producer_workspaces').select('business_id,company_id,business_name').eq('business_id',businessId).maybeSingle();traceDbError(result.error);
 if(!result.data||!canReadBusinessChain(user,{id:result.data.business_id,companyId:result.data.company_id}))throw new TraceError('Não tens acesso a este negócio.',403);
 const company=await db.from('azotrace_companies').select('name,active').eq('id',result.data.company_id).maybeSingle();traceDbError(company.error);
 if(!company.data||!company.data.active&&user.role!=='superadmin')throw new TraceError('A empresa não está disponível.',403);
 if(batchId&&batchId.length>200)throw new TraceError('Lote inválido.');
 return {db,user,business:result.data,company:company.data,batchId};
}
