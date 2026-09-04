import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
  supabaseUrl as string,
  supabaseServiceKey as string
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stripeSessionId, newPriceId } = body;

    if (!stripeSessionId || !newPriceId) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros em falta (stripeSessionId ou newPriceId).' },
        { status: 400 }
      );
    }

    // Mapeia o ID do preço para o nome amigável do plano
    let planName = 'Base';
    
    // Podes ajustar estes identificadores conforme os IDs que defines no teu seletor
    if (newPriceId.includes('Essential') || newPriceId.toLowerCase().includes('essential')) {
      planName = 'Essential';
    } else if (newPriceId.includes('Pro') || newPriceId.toLowerCase().includes('pro')) {
      planName = 'Pro';
    } else {
      // Se mandares diretamente o nome ou outro identificador
      planName = newPriceId; 
    }

    // Atualiza apenas a coluna plan_name que já existe na tabela
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ 
        plan_name: planName
      })
      .eq('stripe_session_id', stripeSessionId);

    if (updateError) {
      console.error('Erro ao atualizar no Supabase:', updateError.message);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erro na API route:', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}