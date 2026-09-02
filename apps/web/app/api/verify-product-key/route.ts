import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar privilégios totais para contornar o RLS
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

    // Normalizar a chave para maiúsculas e remover espaços indesejados
    const chaveLimpa = productKey.trim().toUpperCase();

    // 1. Procurar a chave na tabela correta: 'subscriptions'
    const { data: record, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('product_key', chaveLimpa)
      .single();

    if (error || !record) {
      return NextResponse.json({ message: '❌ Chave de produto inválida.' }, { status: 400 });
    }

    // 2. Verificar o estado da subscrição
    if (record.status !== 'active') {
      return NextResponse.json({ message: '⚠️ Esta chave já expirou ou foi cancelada.' }, { status: 400 });
    }

    // Devolvemos o sucesso e o email associado para preencher a página de registo
    return NextResponse.json({ success: true, email: record.email });

  } catch (err: any) {
    console.error('Erro na validação da chave:', err);
    return NextResponse.json({ message: 'Erro interno no servidor.' }, { status: 500 });
  }
}