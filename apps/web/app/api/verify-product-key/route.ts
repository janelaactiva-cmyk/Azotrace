import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar privilégios totais para contornar o RLS ao atualizar a tabela
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(request: Request) {
  try {
    const { productKey } = await request.json();

    if (!productKey) {
      return NextResponse.json({ message: 'Chave em falta.' }, { status: 400 });
    }

    // 1. Procurar a chave na base de dados com privilégios de admin
    const { data: record, error } = await supabaseAdmin
      .from('product_keys')
      .select('*')
      .eq('product_key', productKey.trim())
      .single();

    if (error || !record) {
      return NextResponse.json({ message: '❌ Chave de produto inválida.' }, { status: 400 });
    }

    if (record.used) {
      return NextResponse.json({ message: '⚠️ Esta chave já foi utilizada.' }, { status: 400 });
    }

    // 2. Marcar a chave como usada com privilégios de admin
    const { error: updateError } = await supabaseAdmin
      .from('product_keys')
      .update({ used: true })
      .eq('id', record.id);

    if (updateError) {
      return NextResponse.json({ message: 'Erro ao atualizar o estado da chave.' }, { status: 500 });
    }

    // Devolvemos o sucesso e o email associado para preencher a página de registo
    return NextResponse.json({ success: true, email: record.email });

  } catch (err: any) {
    return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
  }
}