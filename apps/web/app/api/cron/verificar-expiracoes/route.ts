import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enviarEmailComChave } from '~/lib/email'; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET(request: Request) {
  try {
    // Marcos de dias em que queremos notificar
    const marcos = [15, 10, 5];
    let totalAvisosEnviados = 0;

    for (const dias of marcos) {
      // 1. Criamos sempre uma nova instância de data atual para cada iteração
      const dataAlvo = new Date();
      dataAlvo.setDate(dataAlvo.getDate() + dias);

      // 2. Definimos o início e o fim do dia alvo com segurança
      const inicioDoDia = new Date(dataAlvo);
      inicioDoDia.setHours(0, 0, 0, 0);

      const fimDoDia = new Date(dataAlvo);
      fimDoDia.setHours(23, 59, 59, 999);

      // 3. Procurar utilizadores que expiram exatamente neste dia específico 
      // e cujo último lembrete enviado ainda não seja este
      const { data: subscricoes, error } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .neq('last_reminder_days', dias) 
        .gte('expires_at', inicioDoDia.toISOString())
        .lte('expires_at', fimDoDia.toISOString());

      if (error) {
        console.error(`Erro ao buscar subscrições para ${dias} dias:`, error);
        continue;
      }

      for (const sub of subscricoes || []) {
        // Enviar o e-mail ao cliente a avisar
        await enviarEmailComChave(sub.email, sub.product_key);

        // Atualizar na base de dados qual foi o último lembrete enviado
        await supabaseAdmin
          .from('subscriptions')
          .update({ last_reminder_days: dias })
          .eq('id', sub.id);

        totalAvisosEnviados++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Verificação concluída. ${totalAvisosEnviados} avisos enviados.` 
    });

  } catch (err: any) {
    console.error('Erro na cron de expirações:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}