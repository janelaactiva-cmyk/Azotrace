'use client';
import {supabase} from '~/lib/supabase';
export function supportToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export function supportUuid(){const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]!&15)|64;bytes[8]=(bytes[8]!&63)|128;const value=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${value.slice(0,8)}-${value.slice(8,12)}-${value.slice(12,16)}-${value.slice(16,20)}-${value.slice(20)}`;}
export async function supportRequest<T>(query='',method='GET',body?:unknown,tracking?:string):Promise<T>{
 const {data,error}=await supabase.auth.getSession();
 if(error)throw new Error('Não foi possível validar a sessão.');
 const response=await fetch('/api/support'+query,{method,cache:'no-store',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(data.session?{Authorization:'Bearer '+data.session.access_token}:{}),...(tracking?{'x-support-token':tracking}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}).catch(()=>{throw new Error('Não foi possível contactar o suporte. Verifica a ligação e tenta novamente.');});
 const result=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(result?.error||'Não foi possível concluir o pedido de suporte.');
 if(result===null)throw new Error('O servidor devolveu uma resposta inválida.');
 return result as T;
}
