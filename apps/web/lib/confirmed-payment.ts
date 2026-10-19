import 'server-only';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from './supabase-admin';

type PaymentLookup = { email?: string; productKey?: string; companyId?: string };
type ConfirmedSubscription = { id: string; email: string; company_id: string | null; stripe_session_id: string | null; expires_at: string };

// A subscrição deve existir após o webhook e o Stripe deve confirmar o pagamento.
export async function requireConfirmedPayment({ email, productKey, companyId }: PaymentLookup): Promise<ConfirmedSubscription> {
  const admin = getSupabaseAdminClient();
  let query = admin.from('subscriptions')
    .select('id,email,company_id,stripe_session_id,expires_at')
    .eq('status', 'active').gt('expires_at', new Date().toISOString())
    .not('stripe_session_id', 'is', null);
  if (productKey) query = query.eq('product_key', productKey.trim().toUpperCase());
  else if (companyId) query = query.eq('company_id', companyId);
  else if (email) query = query.ilike('email', email.trim().replace(/[\\%_]/g, '\\$&'));
  else throw new Error('É necessária a confirmação do pagamento.');
  const { data, error } = await query;
  if (error) throw new Error('Não foi possível verificar o pagamento. Tenta novamente.');
  if (!data?.length && companyId && email) {
    const subscription = await requireConfirmedPayment({ email });
    if (!subscription.company_id || subscription.company_id === companyId) return subscription;
    throw new Error('O pagamento está associado a outra empresa.');
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  for (const subscription of data || []) {
    const expectedEmail = String(subscription.email || '').trim().toLowerCase();
    if (!expectedEmail || (!companyId && email && expectedEmail !== email.trim().toLowerCase())) continue;
    if (companyId && subscription.company_id && subscription.company_id !== companyId) continue;
    const session = await stripe.checkout.sessions.retrieve(subscription.stripe_session_id!);
    const paidEmail = (session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
    if (session.payment_status === 'paid' && session.status === 'complete' && paidEmail === expectedEmail) return subscription;
  }
  throw new Error('O pagamento ainda não foi confirmado. Aguarda a confirmação e utiliza a chave recebida por email.');
}

export async function requireOnboardingPayment(companyId: string) {
  const admin = getSupabaseAdminClient();
  const { data: company, error } = await admin.from('azotrace_companies').select('owner_admin_user_id').eq('id', companyId).single();
  if (error || !company?.owner_admin_user_id) throw new Error('Não foi possível verificar o pagamento da empresa.');
  const { data, error: ownerError } = await admin.auth.admin.getUserById(company.owner_admin_user_id);
  if (ownerError || !data.user?.email) throw new Error('Não foi possível verificar o titular do pagamento.');
  return requireConfirmedPayment({ companyId, email: data.user.email });
}
