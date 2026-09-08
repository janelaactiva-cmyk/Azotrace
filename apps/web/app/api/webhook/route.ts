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
  console.log('🔔 [WEBHOOK] Pedido HTTP recebido do Stripe...');
  
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
    console.log(`✅ [WEBHOOK] Assinatura validada com sucesso. Tipo: ${event.type}`);
  } catch (err: any) {
    console.error(`⚠️ [WEBHOOK] Erro na assinatura: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email || session.customer_email;
    const sessionId = session.id;

    console.log(`📧 [CHECKOUT] Email do cliente: ${customerEmail} | SessionID: ${sessionId}`);

    if (!customerEmail) {
      console.error('❌ Sessão concluída sem e-mail de cliente associado:', sessionId);
      return NextResponse.json({ received: true });
    }

    try {
      // 1. Verificar idempotência
      console.log('🔍 [PASSO 1] A verificar idempotência no Supabase...');
      const { data: existingSub, error: existingSubError } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (existingSubError) {
        console.error('⚠️ [PASSO 1] Erro na query de idempotência (não fatal):', existingSubError);
      }

      if (existingSub) {
        console.log(`ℹ️ A subscrição para a sessão ${sessionId} já tinha sido gerada anteriormente.`);
        return NextResponse.json({ received: true });
      }

      // 2. Obter dinamicamente o nome correto do plano (Totalmente Blindado)
      console.log('🔍 [PASSO 2] A obter nome do plano...');
      let planName = 'Plano Azotrace';
      
      try {
        if (session.metadata && session.metadata.plano_nome) {
          planName = session.metadata.plano_nome;
        } else {
          const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
            limit: 1,
            expand: ['data.price.product'],
          }).catch(() => null);
          
          const firstItem = lineItems?.data?.[0];
          if (firstItem && firstItem.price && firstItem.price.product) {
            const productObj = firstItem.price.product;
            
            if (typeof productObj === 'object' && productObj !== null && 'name' in productObj) {
              planName = (productObj as Stripe.Product).name;
            } else if (typeof productObj === 'string') {
              const productDetails = await stripe.products.retrieve(productObj).catch(() => null);
              if (productDetails && productDetails.name) {
                planName = productDetails.name;
              }
            } else if (firstItem.description) {
              planName = firstItem.description;
            }
          }
        }
      } catch (itemErr: any) {
        console.warn('⚠️ Erro não fatal ao obter nome do plano, a usar predefinição:', itemErr?.message || itemErr);
        planName = 'Plano Azotrace';
      }

      // 3. Gerar a chave aleatória de forma segura
      const parte1 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const parte2 = Math.random().toString(36).substring(2, 8).toUpperCase();
      const productKey = `AZO-${parte1}-${parte2}`;
      console.log(`🔑 [PASSO 3] Chave gerada: ${productKey}`);

      // 4. Calcular a data de expiração (1 ano)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // 5. Guardar na tabela 'subscriptions'
      console.log('💾 [PASSO 5] A guardar na tabela subscriptions...');
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          email: customerEmail,
          nome: session.metadata?.nome || 'Cliente Azotrace',
          telefone: session.metadata?.telefone || null,
          nif: session.metadata?.nif || null,
          morada: session.metadata?.morada || null,
          is_commercial: session.metadata?.is_commercial === 'true',
          nome_empresa: session.metadata?.nome_empresa || null,
          nif_empresa: session.metadata?.nif_empresa || null,
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
        console.error('❌ ERRO CRÍTICO NO INSERT DE SUBSCRIPTIONS:', JSON.stringify(insertError, null, 2));
        throw new Error(`Erro Supabase Subscriptions: ${insertError.message}`);
      }
      console.log('✅ [PASSO 5] Subscrição guardada com sucesso!');

      // 5.1 Guardar TAMBÉM na tabela dedicada 'product_keys'
      console.log('💾 [PASSO 5.1] A guardar na tabela product_keys...');
      const { error: keyInsertError } = await supabaseAdmin
        .from('product_keys')
        .insert({
          product_key: productKey,
          email: customerEmail,
          stripe_session_id: sessionId,
          used: false,
        });

      if (keyInsertError) {
        console.error('❌ ERRO NO INSERT DE PRODUCT_KEYS:', JSON.stringify(keyInsertError, null, 2));
        throw new Error(`Erro Supabase Product Keys: ${keyInsertError.message}`);
      }
      console.log('✅ [PASSO 5.1] Product key guardada com sucesso!');

      // 6. Enviar o e-mail para o cliente com a chave gerada
      console.log('📧 [PASSO 6] A enviar e-mail...');
      try {
        await enviarEmailComChave(customerEmail, productKey);
        console.log(`✅ [PASSO 6] E-mail enviado com sucesso para ${customerEmail}`);
      } catch (emailError: any) {
        console.error(`⚠️ [PASSO 6] Erro ao enviar e-mail (não bloqueia o fluxo):`, emailError?.message || emailError);
      }

      // 7. Emitir Fatura no Keyinvoice (Isolado e Seguro)
      console.log('🧾 [PASSO 7] A iniciar emissão de fatura no Keyinvoice...');
      try {
        const cleanApiKey = KEYINVOICE_API_KEY ? KEYINVOICE_API_KEY.trim() : '';

        if (!cleanApiKey) {
          console.warn('⚠️ KEYINVOICE_API_KEY não definida, a saltar emissão de fatura.');
        } else {
          const authResponse = await fetch('https://login.keyinvoice.com/API5.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Apikey': cleanApiKey,
            },
            body: JSON.stringify({ method: 'authenticate' }),
          });

          const authText = await authResponse.text();
          let authData: any = {};
          try {
            authData = JSON.parse(authText);
          } catch (e) {
            console.error('❌ Resposta de autenticação do Keyinvoice não é JSON válido:', authText);
          }

          if (authData.Status !== 1 || !authData.Sid) {
            console.error(`❌ Falha na autenticação Keyinvoice: ${authData.ErrorMessage || 'Sid não retornado'}`);
          } else {
            const dynamicSid = authData.Sid;
            const clientNif = session.metadata?.nif || session.customer_details?.tax_ids?.[0]?.value || '999999990';

            const documentPayload = {
              method: 'insertDocument',
              DocType: 'FT',
              Series: '71',
              Name: session.customer_details?.name || session.metadata?.nome || 'Cliente Azotrace',
              Nif: clientNif.replace(/\s+/g, ''),
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
                'Sid': dynamicSid,
              },
              body: JSON.stringify(documentPayload),
            });

            const responseText = await keyinvoiceResponse.text();
            console.log(`🔍 Keyinvoice HTTP Status: ${keyinvoiceResponse.status}`);
            console.log('🔍 Keyinvoice Resposta Bruta:', responseText);
          }
        }
      } catch (invoiceErr: any) {
        console.error('⚠️ Erro não fatal capturado no bloco Keyinvoice:', invoiceErr?.message || invoiceErr);
      }

      console.log('🎉 [WEBHOOK] Processo concluído de ponta a ponta com sucesso!');

    } catch (err: any) {
      console.error('🔥 [ERRO CRÍTICO CAPTURADO]:', err?.message || err);
      console.error('🔍 [STACK TRACE]:', err?.stack);
      // Devolvemos o erro detalhado para o Stripe e para o terminal verem a causa exata
      return NextResponse.json({ 
        error: 'Erro interno do servidor', 
        details: err?.message || 'Erro desconhecido',
        stack: err?.stack 
      }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}