import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
export async function POST(request: Request) {
 try {
  const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return NextResponse.json({error:'Sessão em falta.'},{status:401});
  const admin=getSupabaseAdminClient();const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)return NextResponse.json({error:'Sessão inválida.'},{status:401});
  const {sessionId,userId}=await request.json();
  if(typeof sessionId!=='string'||(userId&&userId!==data.user.id))return NextResponse.json({error:'Pedido inválido.'},{status:400});
  const session=await new Stripe(process.env.STRIPE_SECRET_KEY!).checkout.sessions.retrieve(sessionId);
  const email=session.customer_details?.email||session.customer_email;
  if(session.payment_status!=='paid'||!email||email.trim().toLowerCase()!==data.user.email?.trim().toLowerCase())return NextResponse.json({error:'A compra não está paga ou não pertence a esta conta.'},{status:403});
  const updated=await admin.from('checkouts').update({user_id:data.user.id,status:'completed'})
   .eq('stripe_session_id',sessionId).or(`user_id.is.null,user_id.eq.${data.user.id}`).select('id');
  if(updated.error)throw updated.error;
  if(!updated.data?.length)return NextResponse.json({error:'Checkout inexistente ou já associado a outra conta.'},{status:409});
  const linked=await admin.rpc('az_backfill_subscription_companies');
  if(linked.error)throw linked.error;
  return NextResponse.json({success:true});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Não foi possível associar a compra.'},{status:400});}
}
