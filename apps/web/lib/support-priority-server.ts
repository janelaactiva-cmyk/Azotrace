import 'server-only';
import {getSupabaseAdminClient} from '~/lib/supabase-admin';
import {activeSupportPlan,classifySupport,type SupportPlan} from '~/lib/support-priority';
import type {SupportTicket} from '~/lib/support-types';
type TicketInput=SupportTicket&{created_by_user_id?:string|null};
type DB=ReturnType<typeof getSupabaseAdminClient>;
export async function currentSupportPlans(db:DB,companies:string[]){
 const plans=new Map<string,SupportPlan|null>();const ids=[...new Set(companies)];
 for(let start=0;start<ids.length;start+=100){for(let offset=0;;offset+=500){
  const result=await db.from('subscriptions').select('id,company_id,plan_name,status,expires_at,created_at').in('company_id',ids.slice(start,start+100)).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+499);
  if(result.error)throw result.error;
  for(const row of result.data||[])if(row.company_id&&!plans.has(row.company_id))plans.set(row.company_id,activeSupportPlan(row));
  if((result.data||[]).length<500)break;if(offset>=100000)throw new Error('Demasiadas subscrições para classificar os pedidos.');
 }}return plans;
}
export async function prioritizeSupportTickets(db:DB,tickets:TicketInput[]):Promise<SupportTicket[]>{
 if(!tickets.length)return [];
 const plans=await currentSupportPlans(db,tickets.flatMap(t=>t.company_id?[t.company_id]:[]));
 const byId=new Map(tickets.map(t=>[t.id,t]));
 const textById=new Map(tickets.map(t=>[t.id,[t.subject]]));
 // Só o texto do solicitante influencia a urgência: respostas da equipa e notas internas ficam excluídas.
 for(let start=0;start<tickets.length;start+=100){for(let offset=0;;offset+=500){
  const result=await db.from('azotrace_support_ticket_messages').select('id,ticket_id,author_user_id,body,created_at').in('ticket_id',tickets.slice(start,start+100).map(t=>t.id)).eq('is_internal',false).order('created_at').order('id').range(offset,offset+499);
  if(result.error)throw result.error;
  for(const row of result.data||[]){const ticket=byId.get(row.ticket_id);if(ticket&&(row.author_user_id??null)===(ticket.created_by_user_id??null))textById.get(ticket.id)?.push(row.body);}
  if((result.data||[]).length<500)break;if(offset>=100000)throw new Error('Demasiadas mensagens para classificar os pedidos.');
 }}
 return tickets.map(ticket=>({...ticket,...classifySupport(ticket.company_id?plans.get(ticket.company_id)||null:null,textById.get(ticket.id)||[ticket.subject])}));
}
