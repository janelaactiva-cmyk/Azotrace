import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import type { LocalAppUser } from '../../../dashboard/_lib/local-users';
export async function verifiedOnlineSession(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error('Sessão em falta.');
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('Sessão inválida ou expirada.');
  if (data.user.factors?.some(factor => factor.status === 'verified')) {
    const claims = await admin.auth.getClaims(token);
    if (claims.error || claims.data?.claims?.aal !== 'aal2') throw new Error('Confirma o código do MFA ativo nesta conta.');
  }
  const target = request.headers.get('x-azotrace-user-id') || null;
  if (target && !/^[0-9a-f-]{36}$/i.test(target)) throw new Error('Utilizador inválido.');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.rpc('az_online_context', { target_user_id: target });
  if (result.error) throw new Error(result.error.message);
  return { user: result.data.user as LocalAppUser, client, target };
}
export async function verifiedOnlineUser(request: Request): Promise<LocalAppUser> {
  return (await verifiedOnlineSession(request)).user;
}
