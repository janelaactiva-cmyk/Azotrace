import { getSupabaseAdminClient } from '~/lib/supabase-admin';

const noStore = { 'Cache-Control': 'no-store' };
const attempts = new Map<string, { count: number; resetAt: number }>();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function allowed(key: string) {
  const now = Date.now();
  if (attempts.size > 2000) {
    for (const [entryKey, entry] of attempts) if (entry.resetAt <= now) attempts.delete(entryKey);
    if (attempts.size > 2000) attempts.delete(attempts.keys().next().value!);
  }
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 12;
}

export async function POST(request: Request) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return Response.json({ error: 'Formato inválido.' }, { status: 415, headers: noStore });
    }

    const raw = await request.text();
    if (raw.length > 1024) return Response.json({ error: 'Pedido demasiado grande.' }, { status: 413, headers: noStore });
    const body = JSON.parse(raw) as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !emailPattern.test(email)) {
      return Response.json({ error: 'Email inválido.' }, { status: 400, headers: noStore });
    }

    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const clientIp = request.headers.get('x-real-ip') || forwardedFor || 'unknown';
    if (!allowed(clientIp)) return Response.json({ error: 'Aguarda um minuto antes de tentar novamente.' }, { status: 429, headers: noStore });

    const { data, error } = await getSupabaseAdminClient()
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[login] Não foi possível verificar a conta.');
      return Response.json({ exists: null }, { status: 503, headers: noStore });
    }
    return Response.json({ exists: Boolean(data) }, { headers: noStore });
  } catch {
    return Response.json({ exists: null }, { status: 503, headers: noStore });
  }
}
