import Stripe from 'stripe';
import {verifiedOnlineUser} from '../_lib/online-auth';
import {getSupabaseAdminClient} from '~/lib/supabase-admin';
import {buildBi,parseBiFilters,type BiInput,type Source,type Payment,type BiFilters} from '~/lib/platform-bi';
import {platformYearStart} from '~/app/dashboard/_lib/platform-summary';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 if(request.headers.has('x-azotrace-user-id'))return reply({error:'Sai do modo de representação para consultar os relatórios da plataforma.'},403);
 let user;try{user=await verifiedOnlineUser(request)}catch{return reply({error:'Inicia sessão e confirma o MFA, se estiver ativo.'},401)}
 if(!user.active||user.role!=='superadmin')return reply({error:'Esta página está disponível apenas para o superadmin.'},403);
 const now=new Date();let filters:BiFilters;try{filters=parseBiFilters(new URL(request.url),now)}catch{return reply({error:'Escolhe um ano, mês e plano válidos.'},400)}
 try{
 const db=getSupabaseAdminClient();
 async function read<T>(table:string,columns:string,key='id'):Promise<Source<T>>{
  const rows:T[]=[],deadline=Date.now()+20000;try{for(let start=0;start<50000&&Date.now()<deadline;start+=500){const result=await db.from(table).select(columns).order(key).range(start,start+499).abortSignal(AbortSignal.any([request.signal,AbortSignal.timeout(Math.max(1,deadline-Date.now()))]));if(result.error)throw Error();rows.push(...(result.data||[]) as T[]);if((result.data||[]).length<500)return{rows,available:true}}}catch{}
  const label:Record<string,string>={azotrace_companies:'empresas',subscriptions:'subscrições',producer_workspaces:'negócios',azotrace_support_tickets:'tickets',azotrace_support_ticket_messages:'respostas do suporte',azotrace_billing_orders:'alterações de plano'};
  return{rows:[],available:false,warning:`Não foi possível consultar todos os registos de ${label[table]||'esta origem'}. Os indicadores correspondentes estão indisponíveis.`};
 }
 async function payments():Promise<Source<Payment>>{
  if(process.env.STRIPE_SECRET_KEY?.includes('_test_'))return{rows:[],available:false,warning:'O Stripe está em modo de teste. Os pagamentos de teste não entram nos recebimentos reais.'};
  if(!process.env.STRIPE_SECRET_KEY)return{rows:[],available:false,warning:'Liga o Stripe para consultar os recebimentos confirmados.'};
  try{const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:8000,maxNetworkRetries:0}),rows:Payment[]=[];let cursor:string|undefined;const deadline=Date.now()+20000;
   for(let page=0;page<50&&Date.now()<deadline;page++){const result=await stripe.checkout.sessions.list({status:'complete',limit:100,created:{gte:platformYearStart(filters.year-1),lt:Math.min(platformYearStart(filters.year+1),Math.floor(+now/1000))},...(cursor?{starting_after:cursor}:{})});rows.push(...result.data.map(s=>({id:s.id,created:s.created,payment_status:s.payment_status,currency:s.currency,amount_total:s.amount_total,metadata:s.metadata})));if(!result.has_more)return{rows,available:true};cursor=result.data.at(-1)?.id;if(!cursor)break}
  }catch{}
  return{rows:[],available:false,warning:'O Stripe não devolveu uma consulta completa. Os recebimentos ficam indisponíveis para evitar totais parciais.'};
 }
 const [companies,subscriptions,workspaces,tickets,messages,orders,paid]=await Promise.all([
  read<BiInput['companies']['rows'][number]>('azotrace_companies','id,name,active,created_at'),
  read<BiInput['subscriptions']['rows'][number]>('subscriptions','id,company_id,plan_name,status,started_at,expires_at,created_at,stripe_session_id'),
  read<BiInput['workspaces']['rows'][number]>('producer_workspaces','business_id,company_id,completed,created_at,updated_at,state','business_id'),
  read<BiInput['tickets']['rows'][number]>('azotrace_support_tickets','id,ticket_number,company_id,created_by_user_id,subject,status,priority,created_at,resolved_at'),
  read<BiInput['messages']['rows'][number]>('azotrace_support_ticket_messages','id,ticket_id,author_user_id,is_internal,created_at'),
  read<BiInput['orders']['rows'][number]>('azotrace_billing_orders','id,target_plan,status'),payments()
 ]);
 if(!companies.available||filters.plan!=='all'&&!subscriptions.available)return reply({error:'As empresas ou licenças necessárias para este filtro estão indisponíveis. Tenta atualizar.'},503);
 return reply(buildBi({companies,subscriptions,workspaces,tickets,messages,orders,payments:paid,testMode:process.env.STRIPE_SECRET_KEY?.includes('_test_')||false},filters,now));
 }catch{return reply({error:'Não foi possível preparar o relatório. Tenta novamente.'},503)}
}
