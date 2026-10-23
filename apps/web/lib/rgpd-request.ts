import {supabase} from '~/lib/supabase';
import {targetUserId} from '~/app/dashboard/_lib/online-state';
export async function rgpdRequest<T>(query:string,body?:unknown):Promise<T>{
 const {data,error}=await supabase.auth.getSession();if(error||!data.session)throw new Error('A sessão expirou. Inicia sessão novamente.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{const headers:Record<string,string>={Authorization:`Bearer ${data.session.access_token}`};const target=targetUserId();if(target)headers['x-azotrace-user-id']=target;
  if(body)headers['Content-Type']='application/json';
  const response=await fetch('/api/azotrace/rgpd'+query,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});
  const result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.error||'Não foi possível concluir o pedido.');if(!result)throw new Error('Resposta inválida do servidor.');return result as T;
 }catch(error){if(error instanceof Error&&error.name==='AbortError')throw new Error('O pedido demorou demasiado tempo. Tenta novamente.');if(error instanceof TypeError)throw new Error('Não foi possível contactar o servidor. Verifica a ligação.');throw error;}finally{clearTimeout(timer);}
}
export function rgpdNewId(){const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]!&15)|64;bytes[8]=(bytes[8]!&63)|128;const s=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
