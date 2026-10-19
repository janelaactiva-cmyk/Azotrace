export const PLATFORM_TIME_ZONE = 'Atlantic/Azores';
export type PlatformCompany = { id: string; name: string; active: boolean; created_at: string };
export type PlatformSubscription = { id: string; company_id: string | null; plan_name: string | null; status: string | null; started_at: string | null; expires_at: string | null; stripe_session_id: string | null };
export type PlatformClient = { id: string; name: string; active: boolean; createdAt: string; plan: string; status: string; renewsAt: string | null };
export type PlatformPayment = { id: string; created: number; currency: string | null; amount_total: number | null; payment_status: string; metadata: Record<string, string> | null };
export type PlatformRevenue = { monthCents: number | null; yearCents: number | null; monthly: { month: string; cents: number }[]; warning: string; testMode: boolean; partial: boolean };
export type PlatformSnapshot = {
  updatedAt: string; year: number; month: string;
  totals: { clients: number; activeClients: number; newClients: number; renewals: number; expired: number; unassociated: number };
  clients: PlatformClient[]; newClients: PlatformClient[]; renewals: PlatformClient[]; revenue: PlatformRevenue;
};
export function platformMonth(value: string | Date | number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: PLATFORM_TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(date);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}
export function platformYearStart(year: number) {
  const desired = Date.UTC(year, 0, 1);
  let candidate = desired;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: PLATFORM_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(candidate);
    const number = (type: string) => Number(parts.find(p => p.type === type)!.value);
    const local = Date.UTC(number('year'), number('month') - 1, number('day'), number('hour'), number('minute'), number('second'));
    candidate = desired - (local - candidate);
  }
  return Math.floor(candidate / 1000);
}
export function buildPlatformClients(companies: PlatformCompany[], subscriptions: PlatformSubscription[], now = new Date()) {
  const month = platformMonth(now), cutoff = now.getTime() + 30 * 86400000;
  const byCompany = new Map<string, PlatformSubscription[]>();
  for (const row of subscriptions) {
    if (!row.company_id) continue;
    const rows = byCompany.get(row.company_id) || [];
    rows.push(row); byCompany.set(row.company_id, rows);
  }
  const clients: PlatformClient[] = companies.map(company => {
    const rows = [...(byCompany.get(company.id) || [])].sort((a, b) => {
      const live = (row: PlatformSubscription) => row.status === 'active' && !!row.expires_at && Date.parse(row.expires_at) > now.getTime() ? 1 : 0;
      return live(b) - live(a) || (Date.parse(b.started_at || '') || 0) - (Date.parse(a.started_at || '') || 0);
    });
    const subscription = rows[0];
    let status = subscription?.status || 'none';
    if (status === 'active' && subscription?.expires_at && Date.parse(subscription.expires_at) <= now.getTime()) status = 'expired';
    return { id: company.id, name: company.name, active: company.active, createdAt: company.created_at,
      plan: subscription?.plan_name || 'Sem plano', status, renewsAt: subscription?.expires_at || null };
  }).sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  const newClients = clients.filter(row => platformMonth(row.createdAt) === month);
  const renewals = clients.filter(row => row.active && row.status === 'active' && row.renewsAt && Date.parse(row.renewsAt) >= now.getTime() && Date.parse(row.renewsAt) <= cutoff)
    .sort((a, b) => Date.parse(a.renewsAt!) - Date.parse(b.renewsAt!));
  return { year: Number(month.slice(0, 4)), month, clients, newClients, renewals,
    totals: { clients: clients.length, activeClients: clients.filter(row => row.active && row.status === 'active').length,
      newClients: newClients.length, renewals: renewals.length, expired: clients.filter(row => row.status === 'expired').length,
      unassociated: subscriptions.filter(row => !row.company_id).length } };
}
export function sumPlatformRevenue(payments: PlatformPayment[], knownSessions: Set<string>, now = new Date()) {
  const month = platformMonth(now), year = month.slice(0, 4);
  const monthly = Array.from({ length: Number(month.slice(5)) }, (_, i) => ({ month: `${year}-${String(i + 1).padStart(2, '0')}`, cents: 0 }));
  const seen = new Set<string>();
  for (const payment of payments) {
    if (seen.has(payment.id)) continue;
    seen.add(payment.id);
    if (payment.payment_status !== 'paid' || payment.currency !== 'eur' || !Number.isSafeInteger(payment.amount_total) || payment.amount_total! < 0) continue;
    if (!knownSessions.has(payment.id) && !payment.metadata?.plano_nome && !payment.metadata?.azotrace_billing_order_id) continue;
    const bucket = monthly.find(row => row.month === platformMonth(payment.created * 1000));
    if (bucket) bucket.cents += payment.amount_total!;
  }
  return { monthCents: monthly.find(row => row.month === month)?.cents || 0, yearCents: monthly.reduce((sum, row) => sum + row.cents, 0), monthly };
}
