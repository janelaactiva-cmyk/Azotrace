import 'server-only';
import {getSupabaseAdminClient} from '~/lib/supabase-admin';
import {verifiedOnlineUser} from '~/app/api/azotrace/_lib/online-auth';
import type {RgpdScope} from '~/lib/rgpd';
export class RgpdError extends Error{constructor(message:string,public status=400){super(message);}}
export const rgpdReply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function rgpdActor(request:Request){
 if(request.headers.has('x-azotrace-user-id'))throw new RgpdError('Sai do modo de representação de outro utilizador para gerir o RGPD.',403);
 let user;try{user=await verifiedOnlineUser(request);}catch{throw new RgpdError('Inicia sessão e confirma o MFA, se estiver ativo.',401);}
 if(!user.active||!(user.role==='superadmin'||user.role==='admin'||user.permissions.includes('rgpd.manage')))throw new RgpdError('Não tens permissão para gerir o RGPD.',403);
 const db=getSupabaseAdminClient();let scope:RgpdScope;
 if(user.role==='superadmin')scope={key:'platform:azotrace',name:'Azotrace',companyId:null,platform:true};
 else{if(!user.companyId)throw new RgpdError('A conta não tem uma empresa associada.',403);const result=await db.from('azotrace_companies').select('id,name,active').eq('id',user.companyId).maybeSingle();if(result.error)throw result.error;if(!result.data?.active)throw new RgpdError('A empresa está inativa ou não está disponível.',403);scope={key:'company:'+result.data.id,name:result.data.name,companyId:result.data.id,platform:false};}
 const url=new URL(request.url);if(url.searchParams.has('scope')&&url.searchParams.get('scope')!==scope.key||url.searchParams.has('company')&&url.searchParams.get('company')!==scope.companyId)throw new RgpdError('Só podes gerir o RGPD da tua própria organização.',403);
 return {user,scope,db};
}
export async function rgpdBody(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new RgpdError('Origem do pedido inválida.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))throw new RgpdError('Formato inválido.',415);
 const reader=request.body?.getReader();if(!reader)throw new RgpdError('Dados em falta.');const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>150000){await reader.cancel();throw new RgpdError('O pedido é demasiado grande.',413);}chunks.push(value);}
 try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value as Record<string,unknown>;}catch{throw new RgpdError('Dados inválidos.');}
}
export function rgpdFailure(error:unknown){if(error instanceof RgpdError)return rgpdReply({error:error.message},error.status);const message=error&&typeof error==='object'&&'message'in error?String(error.message):'';if(message.includes('rgpd_conflict'))return rgpdReply({error:'Este registo foi alterado entretanto. Copia as alterações e recarrega antes de guardar.'},409);return rgpdReply({error:'Não foi possível concluir o pedido. Confirma as migrações de RGPD e tenta novamente.'},503);}
export const rgpdUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
