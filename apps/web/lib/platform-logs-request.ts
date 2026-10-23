import {supabase} from '~/lib/supabase';
import {targetUserId} from '~/app/dashboard/_lib/online-state';
import type {LogsSnapshot} from '~/lib/platform-logs';
export async function platformLogsRequest(query:string):Promise<LogsSnapshot>{
 const {data,error}=await supabase.auth.getSession();if(error||!data.session)throw new Error('A sessão expirou. Inicia sessão novamente.');
 const headers:Record<string,string>={Authorization:'Bearer '+data.session.access_token},target=targetUserId();if(target)headers['x-azotrace-user-id']=target;
 try{const response=await fetch('/api/azotrace/platform-logs'+query,{headers,cache:'no-store',signal:AbortSignal.timeout(20000)});const result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.error||'Não foi possível consultar os registos.');if(!result)throw new Error('Resposta inválida do servidor.');return result;}
 catch(error){if(error instanceof TypeError)throw new Error('Não foi possível contactar o servidor. Verifica a ligação.');if(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name))throw new Error('A consulta demorou demasiado tempo. Tenta novamente.');throw error;}
}
