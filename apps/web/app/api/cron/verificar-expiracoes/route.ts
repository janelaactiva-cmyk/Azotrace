import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enviarEmailComChave } from '~/lib/email'; // Podes adaptar para uma função de email de aviso

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET(request: Request) {
  try {
    // Calcular a data daqui a exatos 15 dias (procurar o intervalo do dia)
    const hoje = new Date();
    const daquiA15Dias = new Date();
    daquiA15Dias.setDate(hoje.getDate() + 15);

    const inicioDoDia = new Date(daquiA15Dias.setHours(0, 0, 0, 0)).toISOString();
    const fimDoDia = new Date(daquiA15Dias.setHours(23, 59, 59, 999)).toISOString();

    // Buscar utilizadores que expiram daqui a 15 dias e ainda não receberam aviso
    const { data: subscricoes, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('reminder_sent', false)
      .gte('expires_at', inicioDoDia)
      .lte('expires_at', fimDoDia);

    if (error) throw error;

    for (const sub of subscricoes || []) {
      // Enviar o e-mail de renovação (podes criar uma função específica de aviso)
      // await enviarEmailRenovacao(sub.email);

      // Marcar que o lembrete foi enviado para não repetir
      await supabaseAdmin
        .from('subscriptions')
        .update({ reminder_sent: true })
        .eq('id', sub.id);
    }

    return NextResponse.json({ success: true, avisosEnviados: subscricoes?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}