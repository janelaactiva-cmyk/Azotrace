import {currentSupportPlans,prioritizeSupportTickets} from '~/lib/support-priority-server';
import {classifySupport} from '~/lib/support-priority';
import {createHash,timingSafeEqual} from 'node:crypto';
import {getSupabaseAdminClient} from '~/lib/supabase-admin';
import {verifiedOnlineUser} from '~/app/api/azotrace/_lib/online-auth';
import type {LocalAppUser} from '~/app/dashboard/_lib/local-users';
const fields='id,created_by_user_id,ticket_number,company_id,assignee_user_id,subject,status,priority,requester_name,requester_email,company_label,source,created_at,updated_at';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class Failure extends Error{constructor(message:string,public status=400){super(message);}}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function reply(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store, private'}});}
function fail(error:unknown){if(error instanceof Failure)return reply({error:error.message},error.status);console.error('Falha no suporte:',error instanceof Error?error.name:'desconhecido');return reply({error:'Não foi possível concluir o pedido. Confirma a migração do suporte e tenta novamente.'},500);}
async function actor(request:Request){
 if(request.headers.has('x-azotrace-user-id'))throw new Failure('O suporte não permite operar como outro utilizador.',403);
 if(!request.headers.has('authorization'))return null;
 try{const user=await verifiedOnlineUser(request);if(!user.active)throw new Error();return user;}catch{throw new Failure('Inicia sessão e confirma o MFA, se estiver ativo.',401);}
}
function text(value:unknown,name:string,min:number,max:number){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new Failure(name+' inválido.');return value.trim();}
async function body(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new Failure('Origem do pedido inválida.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))throw new Failure('Formato inválido.',415);
 if(Number(request.headers.get('content-length'))>20000)throw new Failure('Pedido demasiado grande.',413);
 const reader=request.body?.getReader();if(!reader)throw new Failure('Dados em falta.');let size=0;const chunks:Uint8Array[]=[];
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>20000){await reader.cancel();throw new Failure('Pedido demasiado grande.',413);}chunks.push(part.value);}
 try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();return data as Record<string,unknown>;}catch{throw new Failure('Dados inválidos.');}
}
async function access(request:Request,user:LocalAppUser|null,id:string){
 if(!uuid.test(id))throw new Failure('Ticket inválido.');
 const db=getSupabaseAdminClient();const {data,error}=await db.from('azotrace_support_tickets').select('*').eq('id',id).maybeSingle();if(error)throw error;
 if(!data)throw new Failure('Ticket não encontrado.',404);
 if(user?.role==='superadmin')return data;
 // Contactos públicos nunca dão acesso a tickets de uma empresa pelo email indicado.
 if(user&&data.created_by_user_id===user.id&&(!data.company_id||data.company_id===user.companyId))return data;
 const token=request.headers.get('x-support-token');
 if(!user&&token&&/^[0-9a-f]{64}$/i.test(token)&&data.public_token_hash){const supplied=Buffer.from(hash(token),'hex'),stored=Buffer.from(data.public_token_hash,'hex');if(stored.length===supplied.length&&timingSafeEqual(stored,supplied))return data;}
 throw new Failure('Sem acesso a este ticket.',403);
}
export async function GET(request:Request){try{
 const user=await actor(request);const url=new URL(request.url);const db=getSupabaseAdminClient();
 if(url.searchParams.has('context')){
  if(!user)return reply({authenticated:false});
  let companyName:string|undefined;if(user.companyId){const {data,error}=await db.from('azotrace_companies').select('name,active').eq('id',user.companyId).maybeSingle();if(error)throw error;if(data?.active)companyName=data.name;}
  return reply({authenticated:true,userId:user.id,name:user.name,email:user.email,companyId:companyName?user.companyId:undefined,companyName,role:user.role});
 }
 const id=url.searchParams.get('id');if(id){await access(request,user,id);const {data:ticket,error}=await db.from('azotrace_support_tickets').select(fields).eq('id',id).single();if(error)throw error;
  let query=db.from('azotrace_support_ticket_messages').select('id,author_name,body,is_internal,created_at').eq('ticket_id',id).order('created_at');if(user?.role!=='superadmin')query=query.eq('is_internal',false);const result=await query;if(result.error)throw result.error;return reply({ticket:user?.role==='superadmin'?(await prioritizeSupportTickets(db,[ticket]))[0]:ticket,messages:result.data});
 }
 if(user?.role!=='superadmin')throw new Failure('Área exclusiva do Super Admin.',403);
 const offset=Math.max(0,Number(url.searchParams.get('offset')||0));if(!Number.isSafeInteger(offset))throw new Failure('Página inválida.');
 const {data,error}=await db.from('azotrace_support_tickets').select(fields).order('updated_at',{ascending:false}).order('id').range(offset,offset+199);if(error)throw error;return reply({tickets:await prioritizeSupportTickets(db,data),hasMore:data.length===200});
 }catch(error){return fail(error);}}
export async function POST(request:Request){try{
 const input=await body(request);const user=await actor(request);const db=getSupabaseAdminClient();
 if(input.ticket_id){const id=text(input.ticket_id,'Ticket',36,36);await access(request,user,id);const internal=input.is_internal===true;if(input.is_internal!==undefined&&typeof input.is_internal!=='boolean')throw new Failure('Tipo de mensagem inválido.');if(internal&&user?.role!=='superadmin')throw new Failure('Apenas o Super Admin pode guardar notas internas.',403);
  const content=text(input.body,'Mensagem',1,6000);const messageId=text(input.message_id,'Identificador',36,36);if(!uuid.test(messageId))throw new Failure('Identificador inválido.');
  const {error}=await db.rpc('az_support_append_message',{p_ticket:id,p_message_id:messageId,p_author:user?.id||null,p_name:user?.name||'Visitante',p_body:content,p_internal:internal,p_reopen:user?.role!=='superadmin'});if(error){if(error.message.includes('support_rate_limit'))throw new Failure('Aguarda um minuto antes de enviar mais mensagens.',429);throw error;}return reply({ok:true});
 }
 if(user?.role==='superadmin')throw new Failure('O Super Admin recebe e acompanha os tickets; a criação é feita pelos clientes no chatbot.',403);
 if(input.source!==undefined&&input.source!=='chatbot')throw new Failure('Os tickets são criados no chatbot.');
 const id=text(input.request_id,'Identificador',36,36);if(!uuid.test(id))throw new Failure('Identificador inválido.');
 const subject=text(input.subject,'Assunto',3,180),description=text(input.body,'Descrição',3,6000);
 if(input.website)throw new Failure('Não foi possível criar o pedido.');
 let name=user?.name,email=user?.email,company:string|null=null;
 if(user){if(!name||!email)throw new Failure('Completa o nome e email da conta antes de abrir um pedido.');if(user.companyId){const {data,error}=await db.from('azotrace_companies').select('id,active').eq('id',user.companyId).maybeSingle();if(error)throw error;if(!data?.active)throw new Failure('A empresa está inativa.',403);company=data.id;}}
 else {if(process.env.SUPPORT_PUBLIC_ENABLED!=='true')throw new Failure('Inicia sessão para criar um ticket.',401);name=text(input.name,'Nome',2,100);email=text(input.email,'Email',3,180).toLowerCase();}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!))throw new Failure('Email inválido.');
 const label=!user&&input.company_label?text(input.company_label,'Empresa',1,180):null;
 const token=!user?text(input.public_token,'Código do pedido',64,64):null;if(token&&!/^[0-9a-f]{64}$/i.test(token))throw new Failure('Código inválido.');
 const plans=await currentSupportPlans(db,company?[company]:[]);
 const classification=classifySupport(company?plans.get(company)||null:null,[subject,description]);
 const {data,error}=await db.rpc('az_support_create_chatbot_ticket',{p_request:id,p_company:company,p_actor:user?.id||null,p_name:name,p_email:email,p_company_label:label,p_subject:subject,p_body:description,p_token_hash:token?hash(token):null,p_rate_key:hash(user?.id||email!),p_source:'chatbot',p_priority:classification.priority});
 if(error){if(error.message.includes('support_rate_limit'))throw new Failure('Atingiste o limite de pedidos. Tenta novamente mais tarde.',429);if(error.message.includes('support_conflict'))throw new Failure('O pedido já existe com outros dados.',409);throw error;}
 return reply({id:data},201);
 }catch(error){return fail(error);}}
export async function PATCH(request:Request){try{const input=await body(request);const user=await actor(request);if(user?.role!=='superadmin')throw new Failure('Área exclusiva do Super Admin.',403);const id=text(input.id,'Ticket',36,36);await access(request,user,id);if(!['open','in_progress','waiting','resolved'].includes(String(input.status)))throw new Failure('Estado inválido.');const db=getSupabaseAdminClient();const {error}=await db.from('azotrace_support_tickets').update({status:input.status,resolved_at:input.status==='resolved'?new Date().toISOString():null,resolved_by_user_id:input.status==='resolved'?user.id:null}).eq('id',id);if(error)throw error;return reply({ok:true});}catch(error){return fail(error);}}
