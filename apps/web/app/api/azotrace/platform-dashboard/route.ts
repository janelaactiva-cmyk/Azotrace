import Stripe from 'stripe';
import { verifiedOnlineUser } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { buildPlatformClients, platformYearStart, sumPlatformRevenue, type PlatformCompany, type PlatformSubscription, type PlatformRevenue, type PlatformPayment } from '~/app/dashboard/_lib/platform-summary';

export async function GET(request: Request) {
  let user;
  try { user = await verifiedOnlineUser(request); }
  catch { return Response.json({ error: 'Inicia sessão para aceder à gestão da plataforma.' }, { status: 401 }); }
  if (!user.active || user.role !== 'superadmin') return Response.json({ error: 'Esta área é exclusiva do Super Admin.' }, { status: 403 });
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const admin = getSupabaseAdminClient();
    async function readAll(table: string, columns: string) {
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await admin.from(table).select(columns).order('id').range(offset, offset + 999);
        if (error) throw new Error('Não foi possível carregar os dados da plataforma.');
        rows.push(...(data || []));
        if (!data || data.length < 1000) return rows;
      }
    }
    const [companies, subscriptions] = await Promise.all([
      readAll('azotrace_companies', 'id,name,active,created_at'),
      readAll('subscriptions', 'id,company_id,plan_name,status,started_at,expires_at,stripe_session_id'),
    ]);
    const now = new Date();
    const summary = buildPlatformClients(companies as PlatformCompany[], subscriptions as PlatformSubscription[], now);
    let revenue: PlatformRevenue = { monthCents: null, yearCents: null, monthly: [], warning: '', testMode: false, partial: false };
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) revenue.warning = 'Liga o Stripe para consultar os pagamentos confirmados.';
    else {
      try {
        const stripe = new Stripe(stripeKey, { timeout: 10000, maxNetworkRetries: 0 });
        const knownSessions = new Set((subscriptions as PlatformSubscription[]).map(row => row.stripe_session_id).filter((id): id is string => !!id));
        const payments: PlatformPayment[] = [];
        let cursor: string | undefined, partial = false;
        for (let page = 0; page < 50; page++) {
          const result = await stripe.checkout.sessions.list({ limit: 100, status: 'complete', created: { gte: platformYearStart(summary.year) }, ...(cursor ? { starting_after: cursor } : {}) });
          payments.push(...result.data);
          partial = result.has_more;
          if (!result.has_more || !result.data.length) break;
          const lastSession = result.data.at(-1);
          if (!lastSession) break;
          cursor = lastSession.id;
        }
        revenue = { ...sumPlatformRevenue(payments, knownSessions, now), testMode: stripeKey.includes('_test_'), partial,
          warning: partial ? 'A consulta atingiu o limite de 5 000 checkouts. Os valores apresentados são parciais.' : '' };
      } catch { revenue.warning = 'Não foi possível consultar o Stripe. Os valores recebidos estão temporariamente indisponíveis.'; }
    }
    return Response.json({ ...summary, revenue, updatedAt: now.toISOString() }, { headers });
  } catch {
    return Response.json({ error: 'Não foi possível carregar os clientes e subscrições. Verifica a ligação ao Supabase e tenta novamente.' }, { status: 503, headers });
  }
}
