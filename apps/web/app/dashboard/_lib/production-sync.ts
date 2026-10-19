'use client';
import { supabase } from '~/lib/supabase';
import { targetUserId, onlineUser, onlineBusinesses } from './online-state';
import { loadOnlineContext } from './online-billing';
import { cacheProducerState, getActiveProducerState } from '../onboarding/_lib/local-store';
import { applyLocalChanges } from './workspace-merge';
import type { ProducerLocalState } from '../onboarding/_lib/local-store';
type FailedSave = { localBase: ProducerLocalState; serverBase: ProducerLocalState; error: Error };
type Queue = { pending: Promise<void>; failed: FailedSave | null; scope: string; businessId: string };
const queues = new Map<string, Queue>();
function scopeKey() { return JSON.stringify([onlineUser.id, targetUserId()]); }
export async function flushProduction(businessId?: string) {
  const scope = scopeKey();
  const active = [...queues.values()].filter(queue => queue.scope === scope && (!businessId || queue.businessId === businessId));
  for (const queue of active) {
    let tail: Promise<void>;
    do { tail = queue.pending; await tail; } while (tail !== queue.pending);
    if (queue.failed) throw queue.failed.error;
  }
}
export function syncProduction(base: ProducerLocalState, state: ProducerLocalState) {
  const target = targetUserId();
  const scope = scopeKey();
  const businessId = state.business.id;
  const key = JSON.stringify([scope, businessId]);
  let queue = queues.get(key);
  if (!queue) { queue = { pending: Promise.resolve(), failed: null, scope, businessId }; queues.set(key, queue); }
  const currentQueue = queue;
  const localBase = structuredClone(base), desired = structuredClone(state);
  const operation = currentQueue.pending.then(async () => {
    if (scopeKey() !== scope) throw new Error('A sessão mudou. Abre novamente o negócio antes de guardar.');
    const previousFailure = currentQueue.failed;
    const effectiveBase = previousFailure?.localBase || localBase;
    const serverBase = previousFailure?.serverBase || onlineBusinesses.find(business => business.id === businessId)?.state || localBase;
    try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Inicia sessão novamente.');
    if (scopeKey() !== scope) throw new Error('A sessão mudou. Abre novamente o negócio antes de guardar.');
    const payload = applyLocalChanges(serverBase, effectiveBase, desired);
    let result: { state?: ProducerLocalState; error?: string; code?: string } = {};
    for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch('/api/azotrace/production', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, ...(target ? { 'x-azotrace-user-id': target } : {}) },
      body: JSON.stringify({ base: serverBase, state: payload }),
    });
    result = await response.json();
    if (response.ok) break;
    if (response.status === 409 && result.code === 'WORKSPACE_CHANGED' && attempt === 0) continue;
    throw new Error(result.error || 'Não foi possível guardar a produção.');
    }
    if (!result.state || result.state.business?.id !== businessId) throw new Error('O servidor não confirmou os dados guardados.');
    currentQueue.failed = null;
    if (scopeKey() === scope) {
      const business = onlineBusinesses.find(item => item.id === businessId);
      if (business) { business.state = result.state; business.name = result.state.business.name; business.kind = result.state.business.kind; business.accentColor = result.state.business.accentColor; }
      const cached = getActiveProducerState(businessId);
      if (cached) cacheProducerState(applyLocalChanges(result.state, desired, cached), { makeCurrent: false });
    }
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      currentQueue.failed = { localBase: effectiveBase, serverBase, error };
      throw error;
    }
  });
  currentQueue.pending = operation.catch(() => undefined);
  return operation;
}
export async function freshProduction(businessId: string) {
  await flushProduction(businessId);
  const context = await loadOnlineContext();
  const state = context.businesses.find(business => business.id === businessId)?.state;
  if (!state) throw new Error('Negócio indisponível.');
  return state;
}
