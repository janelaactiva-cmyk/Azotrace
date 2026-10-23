import 'server-only';
import { verifiedOnlineUser } from '~/app/api/azotrace/_lib/online-auth';
export async function authorizeChatbot(request: Request) {
  try {
    const user = await verifiedOnlineUser(request);
    if (!user.active || user.role !== 'superadmin') return Response.json({error:'A gestão do chatbot é exclusiva do Super Admin.'},{status:403});
    return null;
  } catch { return Response.json({error:'Inicia sessão e confirma o MFA, se estiver ativo.'},{status:401}); }
}
export function chatbotPayload(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Dados inválidos.');
  const value = body as Record<string, unknown>;
  const question = typeof value.question === 'string' ? value.question.trim() : '';
  const answer = typeof value.answer === 'string' ? value.answer.trim() : '';
  if (!question || !answer) throw new Error('Preenche a pergunta e a resposta.');
  const category = typeof value.category === 'string' ? value.category.trim() || 'Geral' : 'Geral';
  if (value.is_active !== undefined && typeof value.is_active !== 'boolean') throw new Error('Estado inválido.');
  if (value.order_position !== undefined && (!Number.isInteger(value.order_position) || Number(value.order_position) < 0 || Number(value.order_position) > 2147483647)) throw new Error('Ordem inválida.');
  return {question,answer,category,is_active:(value.is_active ?? true) as boolean,...(value.order_position === undefined ? {} : {order_position:value.order_position as number})};
}
export function chatbotFailure(error: {code?:string} | null) {
  if (error?.code === '42P01' || error?.code === 'PGRST205') return Response.json({error:'A tabela de perguntas do chatbot não está disponível. Confirma a migração create_chatbot_questions no Supabase.'},{status:503});
  return Response.json({error:'Não foi possível guardar ou carregar as perguntas. Tenta novamente.'},{status:500});
}
