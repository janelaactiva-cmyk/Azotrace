import { NextResponse } from 'next/server';
import { supabase } from '~/lib/supabase'; // ou supabaseAdmin se precisares de privilégios totais

export async function POST(request: Request) {
  try {
    const { productKey } = await request.json();

    if (!productKey) {
      return NextResponse.json({ message: 'Chave em falta.' }, { status: 400 });
    }

    // 1. Procurar a chave na base de dados
    const { data: record, error } = await supabase
      .from('product_keys')
      .select('*')
      .eq('product_key', productKey)
      .single();

    if (error || !record) {
      return NextResponse.json({ message: '❌ Chave de produto inválida.' }, { status: 400 });
    }

    if (record.used) {
      return NextResponse.json({ message: '⚠️ Esta chave já foi utilizada.' }, { status: 400 });
    }

    // 2. Marcar a chave como usada para não poder ser repetida
    await supabase
      .from('product_keys')
      .update({ used: true })
      .eq('id', record.id);

    return NextResponse.json({ success: true, email: record.email });

  } catch (err: any) {
    return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
  }
}