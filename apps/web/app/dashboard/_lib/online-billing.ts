'use client';
import { supabase } from '~/lib/supabase';
import { withAuthTimeout } from '~/lib/auth-navigation';
import { setOnlineContext, invalidateOnlineContext, targetUserId, onlineUser, type OnlineContext } from './online-state';
import type { LocalSubscription, LocalPlan } from './local-subscriptions';
export const ONLINE_BILLING_EVENT = 'azotrace:online-billing';
export async function onlineRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(name, { ...args, target_user_id: targetUserId() });
  if (error) throw new Error(error.message);
  return data as T;
}
let pending: Promise<OnlineContext> | null = null;
let generation = 0;
let recent: { context: OnlineContext; target: string | null; expires: number } | null = null;
export function resetOnlineSession() { generation++; pending = null; recent = null; invalidateOnlineContext(); }
// Only read-only entry points opt in. Saves and explicit refreshes remain fresh.
export function loadOnlineContext({ reuse = false }: { reuse?: boolean } = {}): Promise<OnlineContext> {
  if (pending) return pending;
  const target = targetUserId();
  if (reuse && recent && recent.expires > Date.now() && recent.target === target && onlineUser === recent.context.user) {
    return Promise.resolve(recent.context);
  }
  const currentGeneration = generation;
  const operation = withAuthTimeout((async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error('Não foi possível validar a sessão. Inicia sessão novamente.');
    if (!data.session) throw new Error('Inicia sessão para aceder ao dashboard.');
    return onlineRpc<OnlineContext>('az_online_context');
  })(), 'A validação da conta demorou demasiado. Tenta novamente.').then((context) => {
    if (generation !== currentGeneration) throw new Error('A sessão mudou.');
    setOnlineContext(context);
    recent = { context, target, expires: Date.now() + 15_000 };
    return context;
  }).catch((error) => {
    if (generation === currentGeneration) { recent = null; invalidateOnlineContext(error.message); }
    throw error;
  }).finally(() => { if (pending === operation) pending = null; });
  pending = operation; return operation;
}
export type BillingContact = { companyId: string; name: string; email: string };
export type BillingHistoryEntry = { id: string; date: string; action: string; oldPlan: string | null; newPlan: string; amountCents?: number; stripeSessionId?: string };
export type OnlineSubscription = Omit<LocalSubscription, 'plan' | 'status' | 'startedAt' | 'expiresAt' | 'history'> & {
  plan: LocalPlan | null; planName: string | null; status: string | null;
  startedAt: string | null; expiresAt: string | null; version: number; stripeSessionId: string | null;
  history: BillingHistoryEntry[];
};
export type BillingOrder = { id: string; subscriptionId: string; targetPlan: LocalPlan; status: string; amountCents: number; createdAt: string };
export type OnlineBilling = OnlineContext & { subscriptions: OnlineSubscription[]; eligibleCompanyIds: string[]; billingContacts: BillingContact[]; orders: BillingOrder[] };
export function loadOnlineBilling() { return onlineRpc<OnlineBilling>('az_billing_snapshot'); }
export async function writeOnlineSubscription(input: Record<string, unknown>): Promise<OnlineSubscription> {
  const row = await onlineRpc<OnlineSubscription>('az_billing_change', { input });
  window.dispatchEvent(new Event(ONLINE_BILLING_EVENT)); return row;
}
export function downgradeOnlinePlan(row: OnlineSubscription, plan: LocalPlan) { return writeOnlineSubscription({ action: 'downgrade', id: row.id, version: row.version, plan }); }
export function associateOnlineSubscription(row: OnlineSubscription, companyId: string) { return writeOnlineSubscription({ action: 'associate', id: row.id, version: row.version, companyId }); }
export async function checkoutOnlineUpgrade(row: OnlineSubscription, plan: LocalPlan, catalogVersion?: number): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sessão expirada.');
  const headers: Record<string,string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` };
  const target = targetUserId(); if (target) headers['x-azotrace-user-id'] = target;
  const response = await fetch('/api/azotrace/billing-checkout', { method: 'POST', headers, body: JSON.stringify({ id: row.id, version: row.version, plan, catalog_version: catalogVersion }) });
  const result = await response.json();
  if (!response.ok || !result.url) throw new Error(result.error || 'Não foi possível iniciar o pagamento.');
  return result.url;
}
