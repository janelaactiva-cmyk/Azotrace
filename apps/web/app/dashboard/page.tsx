import { connection } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { DashboardContent } from './_components/dashboard-content';

export default async function DashboardPage() {
  await connection();

  // 1. Obter as cookies de forma assíncrona
  const cookieStore = await cookies();

  // 2. Inicializar o cliente do Supabase com createServerClient
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 3. Obter o utilizador atual (Sessão)
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // 4. Verificar se o Super Admin está a impersonar outro utilizador através das cookies
  const impersonatedUserId = cookieStore.get('impersonate_user_id')?.value;
  const isSuperAdmin = user?.email === 'admin@azotrace.com';

  // Se for super admin e houver um ID guardado na cookie, usamos esse ID. Caso contrário, usamos o do próprio utilizador logado.
  const targetUserId = (isSuperAdmin && impersonatedUserId) ? impersonatedUserId : user?.id;

  // 5. Buscar os negócios filtrando explicitamente pelo targetUserId correto
  let query = supabase.from('negocios').select('*');

  if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  }

  const { data: negocios, error } = await query;

  if (error) {
    console.error('Erro ao carregar dados do dashboard:', error);
  }

  // Obter o email ativo para exibir (se estiver a impersonar, mostra o email da conta selecionada)
  const impersonatedEmail = cookieStore.get('impersonate_user_email')?.value;
  const activeDisplayEmail = (isSuperAdmin && impersonatedEmail) ? impersonatedEmail : user?.email;

  return <DashboardContent negocios={negocios || []} userEmail={activeDisplayEmail} />;
}