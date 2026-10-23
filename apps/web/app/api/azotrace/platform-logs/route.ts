import {verifiedOnlineUser} from '../_lib/online-auth';
import {getSupabaseAdminClient} from '~/lib/supabase-admin';
import {parseLogQuery} from '~/lib/platform-logs';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 if(request.headers.has('x-azotrace-user-id'))return reply({error:'Sai do modo de representação de outro utilizador para consultar os logs da plataforma.'},403);
 let user;try{user=await verifiedOnlineUser(request);}catch{return reply({error:'Inicia sessão e confirma o MFA, se estiver ativo.'},401);}
 if(!user.active||user.role!=='superadmin')return reply({error:'Esta página está disponível apenas para o superadmin.'},403);
 let filters;try{filters=parseLogQuery(new URL(request.url));}catch{return reply({error:'Filtros inválidos.'},400);}
 try{const started=performance.now(),db=getSupabaseAdminClient();
  let query=db.from('azotrace_platform_events').select('id,created_at,level,module,action,summary,resource,resource_id,company_id,actor_id,request_id,status_code,duration_ms,details').gte('created_at',filters.from).lt('created_at',filters.until);
  if(filters.level!=='all')query=query.eq('level',filters.level);if(filters.module!=='all')query=query.eq('module',filters.module);
  if(filters.q)query=query.ilike('summary','%'+filters.q.replace(/[\\%_]/g,'\\$&')+'%');
  const [rows,summary]=await Promise.all([query.order('created_at',{ascending:false}).order('id',{ascending:false}).range(filters.offset,filters.offset+49),db.rpc('az_platform_event_summary',{p_from:filters.from,p_until:filters.until})]);
  if(rows.error||summary.error)return reply({error:'Os registos não estão disponíveis. Confirma a migração de Logs e métricas e tenta novamente.'},503);
  return reply({events:rows.data,summary:summary.data,hasMore:rows.data.length===50,from:filters.from,until:filters.until,generatedAt:new Date().toISOString(),queryMs:Math.round(performance.now()-started)});
 }catch{return reply({error:'Não foi possível consultar os registos. Tenta novamente.'},503);}
}
