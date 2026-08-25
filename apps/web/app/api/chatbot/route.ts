import { NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const supabase = await createClient();
    let query = supabase
      .from('chatbot_questions')
      .select('*')
      .order('order_position', { ascending: true });

    if (active === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro na query:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('❌ Erro no GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, answer, category, order_position } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Pergunta e resposta são obrigatórias' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('chatbot_questions')
      .insert([{
        question,
        answer,
        category: category || 'Geral',
        order_position: order_position || 0,
        is_active: true,
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Erro no POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
