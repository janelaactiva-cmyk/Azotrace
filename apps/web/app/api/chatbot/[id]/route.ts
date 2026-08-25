import { NextResponse } from 'next/server';
import { createClient } from '~/lib/supabase/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Definir params como Promise
) {
  try {
    const body = await request.json();
    const { question, answer, category, is_active, order_position } = body;

    // ✅ Aguardar a resolução de params
    const { id } = await params;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('chatbot_questions')
      .update({
        question,
        answer,
        category,
        is_active,
        order_position,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id) // ✅ Usar a variável `id` desembrulhada
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Erro no PUT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Definir params como Promise
) {
  try {
    // ✅ Aguardar a resolução de params
    const { id } = await params;

    const supabase = await createClient();
    const { error } = await supabase
      .from('chatbot_questions')
      .delete()
      .eq('id', id); // ✅ Usar a variável `id` desembrulhada

    if (error) {
      console.error('❌ Erro ao eliminar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Erro no DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}