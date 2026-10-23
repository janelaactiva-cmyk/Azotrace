import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { authorizeChatbot, chatbotPayload, chatbotFailure } from '~/lib/chatbot-server';
type Context = {params: Promise<{id:string}>};
async function prepare(request: Request, context: Context) {
  const denied = await authorizeChatbot(request); if (denied) return {response:denied};
  const {id} = await context.params;
  if (!/^[1-9]\d*$/.test(id)) return {response:Response.json({error:'Pergunta inválida.'},{status:400})};
  return {id};
}
export async function PUT(request: Request, context: Context) {
  const auth = await prepare(request,context); if (auth.response) return auth.response;
  let payload;
  try { payload = chatbotPayload(await request.json()); }
  catch (cause) { return Response.json({error:cause instanceof Error ? cause.message : 'Dados inválidos.'},{status:400}); }
  try {
    const {data,error} = await getSupabaseAdminClient().from('chatbot_questions').update({...payload,updated_at:new Date().toISOString()}).eq('id',auth.id!).select().maybeSingle();
    if (error) return chatbotFailure(error);
    if (!data) return Response.json({error:'Esta pergunta já não existe. Atualiza a lista.'},{status:404});
    return Response.json(data);
  } catch { return chatbotFailure(null); }
}
export async function DELETE(request: Request, context: Context) {
  const auth = await prepare(request,context); if (auth.response) return auth.response;
  try {
    const {data,error} = await getSupabaseAdminClient().from('chatbot_questions').delete().eq('id',auth.id!).select('id').maybeSingle();
    if (error) return chatbotFailure(error);
    if (!data) return Response.json({error:'Esta pergunta já não existe. Atualiza a lista.'},{status:404});
    return Response.json({success:true});
  } catch { return chatbotFailure(null); }
}
