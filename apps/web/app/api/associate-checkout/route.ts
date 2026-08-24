import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { sessionId, userId } = await request.json();

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Session ID e User ID são obrigatórios' },
        { status: 400 }
      );
    }

    // Atualizar o checkout com o user_id
    const { error } = await supabase
      .from('checkouts')
      .update({ 
        user_id: userId,
        status: 'completed'
      })
      .eq('stripe_session_id', sessionId);

    if (error) {
      console.error('Erro ao associar checkout:', error);
      return NextResponse.json(
        { error: 'Erro ao associar checkout' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
