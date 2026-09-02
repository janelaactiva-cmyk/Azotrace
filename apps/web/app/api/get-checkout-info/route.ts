import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID em falta' }, { status: 400 });
  }

  try {
    // Vai buscar a sessão ao Stripe usando o session_id do URL
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.customer_details?.email || session.customer_email;

    return NextResponse.json({ email });
  } catch (err: any) {
    console.error('Erro ao buscar dados da sessão ao Stripe:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}