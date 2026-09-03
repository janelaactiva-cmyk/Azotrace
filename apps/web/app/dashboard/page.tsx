import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { unstable_noStore as noStore } from 'next/cache';
import { DashboardContent } from './_components/dashboard-content';

// 🔥 Informa o Next.js para ignorar a validação estática de instant navigation nesta rota
export const instant = false;

export default async function DashboardPage() {
  // Desativa a cache estática para garantir dados frescos a cada navegação / refresh
  noStore();

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const impersonatedUserId = cookieStore.get('impersonate_user_id')?.value;
  const impersonatedEmail = cookieStore.get('impersonate_user_email')?.value;
  const isSuperAdmin = user?.email === 'admin@azotrace.com';

  const activeDisplayEmail = (isSuperAdmin && impersonatedEmail) ? impersonatedEmail : (user?.email || 'Convidado');

  let query = supabase.from('negocios').select('*');

  if (isSuperAdmin && impersonatedUserId) {
    query = query.eq('user_id', impersonatedUserId);
  } else if (isSuperAdmin) {
    // Admin puro vê tudo
  } else if (user?.id) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
  }

  const { data: negocios } = await query;

  return <DashboardContent negocios={negocios || []} userEmail={activeDisplayEmail} />;
}