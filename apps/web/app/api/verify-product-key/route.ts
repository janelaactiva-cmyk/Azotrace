import { requireConfirmedPayment } from '~/lib/confirmed-payment';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const { productKey } = await request.json();
    if (typeof productKey !== 'string' || !productKey.trim() || productKey.length > 100) return Response.json({ message: 'Introduz a chave recebida após o pagamento.' }, { status: 400, headers });
    const subscription = await requireConfirmedPayment({ productKey });
    return Response.json({ success: true, email: subscription.email }, { headers });
  } catch (cause) {
    return Response.json({ message: cause instanceof Error ? cause.message : 'Não foi possível verificar o pagamento.' }, { status: 403, headers });
  }
}
