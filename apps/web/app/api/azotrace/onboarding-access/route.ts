import { verifiedOnlineUser } from '../_lib/online-auth';
import { requireOnboardingPayment } from '~/lib/confirmed-payment';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const user = await verifiedOnlineUser(request);
    if (user.role !== 'admin' || !user.companyId || !user.permissions.includes('business.manage')) return Response.json({ error: 'Só o Admin pode configurar negócios.' }, { status: 403, headers });
    await requireOnboardingPayment(user.companyId);
    return Response.json({ allowed: true }, { headers });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'O pagamento ainda não foi confirmado.' }, { status: 403, headers });
  }
}
