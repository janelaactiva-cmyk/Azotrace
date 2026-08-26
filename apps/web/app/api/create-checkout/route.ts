import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      plano,
      plano_nome,
      valor_base,
      valor_iva,
      valor_total,
      nome,
      email,
      telefone,
      nif,
      is_commercial,
      nome_empresa,
      nif_empresa,
      morada,
      include_setup,
      config_price,
      config_iva,
      config_total,
    } = body;

    // ✅ VALIDAÇÃO
    if (!nome || !email || !telefone) {
      return NextResponse.json(
        { error: 'Nome, email e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    if (is_commercial && (!nome_empresa || nif_empresa || morada)) {
      // (validações comerciais...)
    }

    // ✅ CONSTRUIR CAMPOS PERSONALIZADOS (Apenas 2 campos para poupar espaço, já que o email vai em cima)
    const customFields: Stripe.Checkout.SessionCreateParams.CustomField[] = [];

    if (is_commercial) {
      customFields.push({
        key: 'nome_empresa',
        label: { type: 'custom', custom: '🏢 Nome da empresa' },
        type: 'text',
        optional: false,
        text: { default_value: nome_empresa },
      });

      customFields.push({
        key: 'nif_empresa',
        label: { type: 'custom', custom: '📄 NIF da empresa' },
        type: 'text',
        optional: false,
        text: { default_value: nif_empresa },
      });
    } else {
      customFields.push({
        key: 'nome',
        label: { type: 'custom', custom: '👤 Nome completo' },
        type: 'text',
        optional: false,
        text: { default_value: nome },
      });

      customFields.push({
        key: 'telefone',
        label: { type: 'custom', custom: '📱 Telemóvel' },
        type: 'text',
        optional: false,
        text: { default_value: telefone },
      });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Plano e Extras ${plano_nome} - Azotrace`,
            description: `Plano anual com IVA 16% incluído`,
          },
          unit_amount: Math.round(valor_total * 100),
        },
        quantity: 1,
      },
    ];

    if (include_setup && config_total) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Pacote de Configuração Inicial & Formação Guiada',
            description: 'IVA 16% incluído',
          },
          unit_amount: Math.round(config_total * 100),
        },
        quantity: 1,
      });
    }

    // ✅ CRIAR SESSÃO NO STRIPE (Com o email nativo pré-preenchido no topo)
    const session = await stripe.checkout.sessions.create({
      customer_email: email, // 👈 Preenche automaticamente o campo de email de cima com o email do cliente
      managed_payments: { enabled: false },
      payment_method_types: [
        'card',
        'paypal',
        'mb_way',
        'multibanco',
      ],
      mode: 'payment',
      locale: 'pt',
      billing_address_collection: 'required',
      custom_fields: customFields, // 👈 Fica apenas com Nome e Telemóvel (ou Empresa/NIF) em baixo
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/cancel`,
      metadata: {
        plano,
        plano_nome,
        nome,
        email,
        telefone,
        nif: nif || '',
        is_commercial: is_commercial ? 'true' : 'false',
        nome_empresa: nome_empresa || '',
        nif_empresa: nif_empresa || '',
        morada: morada || '',
        include_setup: include_setup ? 'true' : 'false',
        config_price: config_price?.toString() || '0',
        config_iva: config_iva?.toString() || '0',
        config_total: config_total?.toString() || '0',
        valor_base: valor_base?.toString() || '0',
        valor_iva: valor_iva?.toString() || '0',
        valor_total: valor_total?.toString() || '0',
      },
    });

    // ✅ GUARDAR NO SUPABASE
    const { error: checkoutError } = await supabase
      .from('checkouts')
      .insert([{
        plano,
        plano_nome,
        valor_base,
        valor_iva,
        valor_total,
        nome,
        email,
        telefone,
        nif: nif || null,
        is_commercial: is_commercial || false,
        nome_empresa: is_commercial ? nome_empresa : null,
        nif_empresa: is_commercial ? nif_empresa : null,
        morada: is_commercial ? morada : null,
        include_setup: include_setup || false,
        config_price: include_setup ? config_price : null,
        config_iva: include_setup ? config_iva : null,
        config_total: include_setup ? config_total : null,
        stripe_session_id: session.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      }]);

    if (checkoutError) {
      console.error('❌ Erro ao guardar checkout:', checkoutError);
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('❌ Erro no checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}