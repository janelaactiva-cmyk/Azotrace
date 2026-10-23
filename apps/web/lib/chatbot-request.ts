import { supabase } from '~/lib/supabase';
import { notifyChatbotChanged } from './chatbot-questions';
export async function chatbotRequest<T>(path = '', method = 'GET', body?: unknown): Promise<T> {
  const {data,error} = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Inicia sessão para gerir as perguntas.');
  const response = await fetch('/api/chatbot' + path, {
    method,cache:'no-store',signal:AbortSignal.timeout(20000),
    headers:{Authorization:'Bearer ' + data.session.access_token,'Content-Type':'application/json'},
    ...(body === undefined ? {} : {body:JSON.stringify(body)}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Não foi possível concluir o pedido. Tenta novamente.');
  if (result === null) throw new Error('O servidor devolveu uma resposta inválida.');
  if (method !== 'GET') notifyChatbotChanged();
  return result as T;
}
