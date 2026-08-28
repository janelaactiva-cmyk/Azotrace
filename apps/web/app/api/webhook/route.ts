import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js'; 
import { enviarEmailComChave } from '~/lib/email'; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-28.acacia' as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error(`⚠️ Erro na assinatura do webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Verificar se o pagamento foi concluído com sucesso
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email || session.customer_email;
    const sessionId = session.id;

    if (!customerEmail) {
      console.error('❌ Sessão concluída sem e-mail de cliente associado:', sessionId);
      return NextResponse.json({ received: true });
    }

    try {
      // 1. Verificar se já existe uma subscrição para esta sessão (Idempotência na tabela subscriptions)
      const { data: existingSub, error: fetchError } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .single();

      if (existingSub) {
        console.log(`ℹ️ A subscrição para a sessão ${sessionId} já tinha sido gerada anteriormente.`);
        return NextResponse.json({ received: true });
      }

      // 2. Gerar a chave aleatória de forma segura (podes continuar a usar a chave como ID/referência ou como parte do plano)
      const parte1 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const parte2 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const productKey = `AZO-${parte1}-${parte2}`;

      // 3. Calcular a data de expiração para daqui a exato 1 ano
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // 4. Guardar na nova tabela 'subscriptions' usando o supabaseAdmin
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          email: customerEmail,
          plan_name: 'Plano Anual',
          status: 'active',
          product_key: productKey, // Certifica-te de que adicionaste esta coluna na tabela subscriptions se quiseres guardar a chave lá
          stripe_session_id: sessionId,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          reminder_sent: false,
        });

      if (insertError) {
        console.error('❌ Erro ao guardar a subscrição na base de dados:', insertError);
        return NextResponse.json({ error: 'Erro interno ao guardar dados' }, { status: 500 });
      }

      // 5. Enviar o e-mail para o cliente com a chave gerada
      try {
        await enviarEmailComChave(customerEmail, productKey);
        console.log(`✅ Subscrição criada e e-mail enviado com sucesso para ${customerEmail}: ${productKey}`);
      } catch (emailError) {
        console.error(`⚠️ Subscrição criada na BD, mas erro ao enviar e-mail para ${customerEmail}:`, emailError);
      }

    } catch (err: any) {
      console.error('❌ Erro inesperado ao processar o webhook:', err);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}