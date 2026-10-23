import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { authorizeChatbot, chatbotPayload, chatbotFailure } from '~/lib/chatbot-server';
export async function GET(request: Request) {
  const publicOnly = new URL(request.url).searchParams.get('active') === 'true';
  if (!publicOnly) { const denied = await authorizeChatbot(request); if (denied) return denied; }
  try {
    let query = getSupabaseAdminClient().from('chatbot_questions').select('id,question,answer,category,is_active,order_position').order('order_position',{ascending:true}).order('id',{ascending:true});
    if (publicOnly) query = query.eq('is_active',true);
    const {data,error} = await query;
    if (error) return chatbotFailure(error);
    return Response.json(data || [],{headers:{'Cache-Control':'no-store'}});
  } catch { return chatbotFailure(null); }
}
export async function POST(request: Request) {
  const denied = await authorizeChatbot(request); if (denied) return denied;
  let payload;
  try { payload = chatbotPayload(await request.json()); }
  catch (cause) { return Response.json({error:cause instanceof Error ? cause.message : 'Dados inválidos.'},{status:400}); }
  try {
    const {data,error} = await getSupabaseAdminClient().from('chatbot_questions').insert(payload).select().single();
    if (error) return chatbotFailure(error);
    return Response.json(data,{status:201});
  } catch { return chatbotFailure(null); }
}
