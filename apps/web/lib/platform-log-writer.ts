import 'server-only';
import {randomUUID} from 'node:crypto';
import {getSupabaseAdminClient} from '~/lib/supabase-admin';
type RouteName='checkout.create'|'stripe.webhook';
/** Stores only fixed route labels, HTTP status and timing. Never request bodies/errors. */
export function withPlatformRequestLog(action:RouteName,handler:(request:Request)=>Promise<Response>){
 return async(request:Request)=>{const started=performance.now(),requestId=randomUUID();let status=500;
  try{const response=await handler(request);status=response.status;return response;}
  finally{
   const duration=Math.max(0,Math.min(3600000,Math.round(performance.now()-started)));
   try{const result=await getSupabaseAdminClient().from('azotrace_platform_events').insert({module:'billing',level:status>=500?'error':status>=400?'warning':'info',action,summary:action==='checkout.create'?'Pedido de criação de checkout':'Pedido ao webhook Stripe',resource:'http',request_id:requestId,status_code:status,duration_ms:duration,details:{}}).abortSignal(AbortSignal.timeout(1200));if(result.error)console.warn('[Azotrace] Não foi possível guardar um evento de monitorização.');}
   catch{console.warn('[Azotrace] Monitorização indisponível neste pedido.');}
  }
 };
}
