import { supabase } from '~/lib/supabase';
export async function settingsRequest<T>(method='GET',body?:unknown,services=false):Promise<T>{
 const{data,error}=await supabase.auth.getSession();if(error||!data.session)throw new Error('Inicia sessão para continuar.');
 const response=await fetch('/api/azotrace/platform-settings'+(services?'?section=services':''),{method,cache:'no-store',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível concluir o pedido.');return result as T;
}
