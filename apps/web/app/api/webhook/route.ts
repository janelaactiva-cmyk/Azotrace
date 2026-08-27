import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js'; // Importação recomendada para o client admin
import { enviarEmailComChave } from '~/lib/email'; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-28.acacia' as any,
});

// IMPORTANTE: Usa o cliente Admin (Service Role) para operações seguras no backend
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
      // 1. Verificar se já existe uma chave para esta sessão (Idempotência)
      const { data: existingKey, error: fetchError } = await supabaseAdmin
        .from('product_keys')
        .select('product_key')
        .eq('stripe_session_id', sessionId)
        .single();

      if (existingKey) {
        console.log(`ℹ️ A chave para a sessão ${sessionId} já tinha sido gerada anteriormente.`);
        return NextResponse.json({ received: true });
      }

      // 2. Gerar a chave aleatória de forma segura
      const parte1 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const parte2 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const productKey = `AZO-${parte1}-${parte2}`;

      // 3. Guardar na base de dados usando o supabaseAdmin
      const { error: insertError } = await supabaseAdmin
        .from('product_keys')
        .insert({
          email: customerEmail,
          product_key: productKey,
          stripe_session_id: sessionId,
          used: false,
        });

      if (insertError) {
        console.error('❌ Erro ao guardar a chave na base de dados:', insertError);
        return NextResponse.json({ error: 'Erro interno ao guardar dados' }, { status: 500 });
      }

      // 4. Enviar o e-mail para o cliente com a chave gerada
      try {
        await enviarEmailComChave(customerEmail, productKey);
        console.log(`✅ Chave gerada e enviada com sucesso para ${customerEmail}: ${productKey}`);
      } catch (emailError) {
        console.error(`⚠️ Chave gerada na BD, mas erro ao enviar e-mail para ${customerEmail}:`, emailError);
        // Nota: O webhook retorna 200 ao Stripe para não entrar em loop, mas deves monitorizar este log
      }

    } catch (err: any) {
      console.error('❌ Erro inesperado ao processar o webhook:', err);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}