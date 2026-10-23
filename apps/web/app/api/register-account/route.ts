import { createClient } from '@supabase/supabase-js';
import { requireConfirmedPayment } from '~/lib/confirmed-payment';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const body = await request.json();
    const productKey = typeof body.productKey === 'string' ? body.productKey.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!productKey || productKey.length > 100) return Response.json({ error: 'Introduz a chave recebida após o pagamento.' }, { status: 400, headers });
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return Response.json({ error: 'A password não está de acordo com as regras de criação de password.' }, { status: 400, headers });
    const subscription = await requireConfirmedPayment({ productKey });
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const redirect = new URL('/checkout/create-account', process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).href;
    const { data, error } = await client.auth.signUp({ email: subscription.email, password, options: { emailRedirectTo: redirect } });
    if (error) return Response.json({ error: error.message }, { status: 400, headers });
    if (data.user?.identities?.length === 0) return Response.json({ error: "Já existe uma conta com o email da compra. Inicia sessão ou recupera a password." }, { status: 409, headers });
    return Response.json({ email: subscription.email, session: data.session }, { headers });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Não foi possível confirmar o pagamento.' }, { status: 403, headers });
  }
}

