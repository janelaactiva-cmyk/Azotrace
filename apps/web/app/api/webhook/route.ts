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

const KEYINVOICE_API_KEY = process.env.KEYINVOICE_API_KEY as string;

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
      // 1. Verificar idempotência
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .single();

      if (existingSub) {
        console.log(`ℹ️ A subscrição para a sessão ${sessionId} já tinha sido gerada anteriormente.`);
        return NextResponse.json({ received: true });
      }

      // 🔍 2. Obter dinamicamente o nome correto do plano
      let planName = 'Plano Azotrace';
      
      try {
        if (session.metadata && session.metadata.plano_nome) {
          planName = session.metadata.plano_nome;
        } else {
          const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
            limit: 1,
            expand: ['data.price.product'],
          });
          
          const firstItem = lineItems?.data?.[0];
          if (firstItem && firstItem.price && firstItem.price.product) {
            const productObj = firstItem.price.product;
            
            if (typeof productObj === 'object' && productObj !== null && 'name' in productObj) {
              planName = (productObj as Stripe.Product).name;
            } else if (typeof productObj === 'string') {
              const productDetails = await stripe.products.retrieve(productObj);
              if (productDetails && productDetails.name) {
                planName = productDetails.name;
              }
            } else if (firstItem.description) {
              planName = firstItem.description;
            }
          }
        }
      } catch (itemErr) {
        console.warn('⚠️ Não foi possível obter o nome exato do plano no Stripe, a usar predefinição.', itemErr);
      }

      // 3. Gerar a chave aleatória de forma segura
      const parte1 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const parte2 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const productKey = `AZO-${parte1}-${parte2}`;

      // 4. Calcular a data de expiração (1 ano)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

     // 5. Guardar na tabela 'subscriptions'
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          email: customerEmail,
          nome: session.metadata?.nome || 'Cliente Azotrace',
          plan_name: planName,
          status: 'active',
          product_key: productKey,
          stripe_session_id: sessionId,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          reminder_15_sent: false,
          reminder_10_sent: false,
          reminder_5_sent: false,
        });

      if (insertError) {
        console.error('❌ Erro ao guardar a subscrição na base de dados:', insertError);
        return NextResponse.json({ error: 'Erro interno ao guardar dados' }, { status: 500 });
      }

      // 5.1 🔑 Guardar TAMBÉM na tabela dedicada 'product_keys'
      const { error: keyInsertError } = await supabaseAdmin
        .from('product_keys')
        .insert({
          product_key: productKey,
          email: customerEmail,
          stripe_session_id: sessionId,
          used: false,
        });

      if (keyInsertError) {
        console.error('❌ Erro ao guardar a product key na base de dados:', keyInsertError);
      }

      // 6. Enviar o e-mail para o cliente com a chave gerada
      try {
        await enviarEmailComChave(customerEmail, productKey);
        console.log(`✅ Subscrição (${planName}) criada e e-mail enviado com sucesso para ${customerEmail}: ${productKey}`);
      } catch (emailError) {
        console.error(`⚠️ Subscrição criada na BD, mas erro ao enviar e-mail para ${customerEmail}:`, emailError);
      }

      // 7. 🧾 Obter Sessão Dinâmica (Authenticate) e Emitir Fatura no Keyinvoice
      let dynamicSid: string | null = null;

      try {
        const cleanApiKey = KEYINVOICE_API_KEY ? KEYINVOICE_API_KEY.trim() : '';

        if (!cleanApiKey) {
          throw new Error('KEYINVOICE_API_KEY não está definida nas variáveis de ambiente.');
        }

        // Passo 7.1: Autenticar para obter o Sid dinâmico válido
        const authResponse = await fetch('https://login.keyinvoice.com/API5.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Apikey': cleanApiKey,
          },
          body: JSON.stringify({ 
            method: 'authenticate'
          }),
        });

        const authText = await authResponse.text();
        const authData = JSON.parse(authText);

        if (authData.Status !== 1 || !authData.Sid) {
          throw new Error(`Falha na autenticação Keyinvoice: ${authData.ErrorMessage || 'Sid não retornado'}`);
        }

        dynamicSid = authData.Sid;
        console.log('🔑 Sessão Keyinvoice obtida com sucesso:', dynamicSid);

       // Passo 7.2: Inserir documento com DocType 'FT' e Série '71'
        const documentPayload = {
          method: 'insertDocument',
          DocType: 'FT', // <--- Testar com 'FT' (Fatura) mantendo a série configurada
          Series: '71',
          Name: session.customer_details?.name || 'Cliente Azotrace',
          Nif: '999999990',
          Reference: sessionId,
          DocLines: [
            {
              Reference: 'SUB-AZO',
              Designation: planName,
              Quantity: 1,
              Price: session.amount_total ? session.amount_total / 100 : 0,
            }
          ]
        };

        const keyinvoiceResponse = await fetch('https://login.keyinvoice.com/API5.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Sid': dynamicSid as string,
          },
          body: JSON.stringify(documentPayload),
        });

        const responseText = await keyinvoiceResponse.text();
        console.log(`🔍 Keyinvoice HTTP Status: ${keyinvoiceResponse.status}`);
        console.log('🔍 Keyinvoice Resposta Bruta Completa:', responseText);

        try {
          const data = JSON.parse(responseText);
          console.log('🔍 Objeto JSON parseado do Keyinvoice:', JSON.stringify(data, null, 2));
          if (data.Status === 1) {
            console.log('🧾 Fatura emitida com sucesso no Keyinvoice!', data.Data);
          } else {
            console.error('⚠️ Erro retornado pelo Keyinvoice:', data.ErrorMessage);
          }
        } catch (e) {
          console.error('⚠️ A resposta não é um JSON válido:', responseText);
        }

      } catch (invoiceErr: any) {
        console.error('❌ Erro inesperado ao emitir fatura no Keyinvoice:', invoiceErr.message || invoiceErr);
      }

    } catch (err: any) {
      console.error('❌ Erro inesperado ao processar o webhook:', err);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}