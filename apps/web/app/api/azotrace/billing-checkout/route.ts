import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getPlanCatalog } from '~/lib/plan-catalog-server';
import { verifiedOnlineSession } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { client, target } = await verifiedOnlineSession(request);
    const input = await request.json();
    if (!input.id || !Number.isSafeInteger(input.version) || !['Base','Essential','Pro'].includes(input.plan)) {
      return NextResponse.json({ error: 'Pedido de upgrade inválido.' }, { status: 400 });
    }
    if(input.catalog_version!==undefined&&(await getPlanCatalog()).version!==input.catalog_version)return NextResponse.json({error:'Os preços foram atualizados. Recarrega os planos antes de continuar.'},{status:409});
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const site = new URL(process.env.NEXT_PUBLIC_SITE_URL!);
    if (!['https:', 'http:'].includes(site.protocol)) throw new Error('Endereço do site inválido.');
    const result = await client.rpc('az_billing_prepare', { input: { id: input.id, version: input.version, plan: input.plan }, target_user_id: target });
    if (result.error) throw new Error(result.error.message);
    const order = result.data;
    if (order.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.status === 'open' && session.url) return NextResponse.json({ url: session.url });
      throw new Error(session.status === 'complete' ? 'Pagamento recebido. Aguarde a confirmação e atualize a página.' : 'O pagamento expirou. Atualize a página.');
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', customer_email: order.email || undefined, locale: 'pt',
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: Number(order.amount_cents), product_data: { name: `Upgrade Azotrace para ${order.target_plan}`, description: 'Ajuste proporcional até ao fim da validade atual. IVA incluído.' } } }],
      success_url: new URL('/dashboard/subscricoes?pagamento=recebido', site).href,
      cancel_url: new URL('/dashboard/subscricoes?pagamento=cancelado', site).href,
      expires_at: Math.floor(new Date(order.expires_at).getTime() / 1000),
      metadata: { azotrace_billing_order_id: order.id },
    }, { idempotencyKey: `azotrace-upgrade-${order.id}` });
    const { error } = await getSupabaseAdminClient().from('azotrace_billing_orders')
      .update({ stripe_session_id: session.id }).eq('id', order.id).eq('status', 'pending');
    if (error) throw new Error(error.message);
    if (!session.url) throw new Error('O Stripe não devolveu o endereço de pagamento.');
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento.' }, { status: 400 });
  }
}
