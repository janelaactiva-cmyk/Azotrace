import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enviarEmailComChave } from '~/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET() {
  try {
    const customerEmail = 'janelaactiva@gmail.com';
    const sessionId = 'test_session_' + Date.now();

    // 1. Gerar chave aleatória
    const parte1 = Math.random().toString(36).substring(2, 8).toUpperCase();
    const parte2 = Math.random().toString(36).substring(2, 8).toUpperCase();
    const productKey = `AZO-${parte1}-${parte2}`;

    // 2. Guardar na BD com o Supabase Admin
    const { error: insertError } = await supabaseAdmin
      .from('product_keys')
      .insert({
        email: customerEmail,
        product_key: productKey,
        stripe_session_id: sessionId,
        used: false,
      });

    if (insertError) {
      return NextResponse.json({ success: false, error: 'Erro no Supabase: ' + JSON.stringify(insertError) }, { status: 500 });
    }

    // 3. Enviar o e-mail com a chave (agora protegido para apanhar o erro do Resend)
    try {
      await enviarEmailComChave(customerEmail, productKey);
    } catch (emailErr: any) {
      console.error('❌ ERRO CAPTURADO NA ROTA:', emailErr);
      return NextResponse.json({ 
        success: false, 
        error: 'O Resend falhou: ' + (emailErr.message || JSON.stringify(emailErr)) 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sucesso! Chave ${productKey} gerada e enviada para ${customerEmail}.` 
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Erro geral: ' + err.message }, { status: 500 });
  }
}