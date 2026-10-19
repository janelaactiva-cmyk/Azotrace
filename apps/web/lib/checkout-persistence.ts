import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

export function confirmedCheckoutRow(session: Stripe.Checkout.Session) {
  if (session.status !== 'complete' || session.payment_status !== 'paid') throw new Error('É necessária a confirmação do pagamento antes de guardar a compra.');
  const metadata = session.metadata || {};
  const email = session.customer_details?.email || session.customer_email;
  if (!email || !metadata.plano_nome) throw new Error('O pagamento não contém os dados necessários da compra Azotrace.');
  const amount = (name: string) => {
    const value = Number(metadata[name]);
    if (!metadata[name] || !Number.isFinite(value) || value < 0) throw new Error('Os valores da compra não são válidos.');
    return value;
  };
  const setup = metadata.include_setup === 'true', commercial = metadata.is_commercial === 'true';
  return {
    stripe_session_id: session.id, status: 'completed',
    plano: metadata.plano || metadata.plano_nome, plano_nome: metadata.plano_nome,
    nome: metadata.nome || 'Cliente Azotrace', email: email.trim().toLowerCase(), telefone: metadata.telefone || null,
    nif: metadata.nif || null, morada: metadata.morada || null,
    is_commercial: commercial, nome_empresa: commercial ? metadata.nome_empresa || null : null,
    nif_empresa: commercial ? metadata.nif_empresa || null : null,
    valor_base: amount('valor_base'), valor_iva: amount('valor_iva'), valor_total: amount('valor_total'),
    include_setup: setup, config_price: setup ? amount('config_price') : null,
    config_iva: setup ? amount('config_iva') : null, config_total: setup ? amount('config_total') : null,
  };
}

export async function persistConfirmedCheckout(admin: SupabaseClient, session: Stripe.Checkout.Session) {
  const {error} = await admin.from('checkouts').upsert(confirmedCheckoutRow(session), {onConflict:'stripe_session_id'});
  if (error) throw new Error('Não foi possível guardar a compra paga. Confirme a migração de checkouts e volte a processar o webhook.');
}

/** Only called after the Stripe webhook signature has been verified. */
export async function deleteExpiredCheckout(admin: SupabaseClient, session: Stripe.Checkout.Session) {
  if (session.status !== 'expired' || session.payment_status !== 'unpaid' || session.metadata?.azotrace_billing_order_id) return;
  const {error} = await admin.from('checkouts').delete().eq('stripe_session_id',session.id).eq('status','pending');
  if (error) throw new Error('Não foi possível limpar a tentativa expirada.');
}
