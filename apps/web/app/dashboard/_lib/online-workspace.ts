'use client';
import { supabase } from '~/lib/supabase';
import { targetUserId } from './online-state';
import { loadOnlineContext } from './online-billing';
import type { ProducerLocalState } from '../onboarding/_lib/local-store';
export async function saveOnlineWorkspace(state: ProducerLocalState) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Inicia sessão novamente.');
  const response = await fetch('/api/azotrace/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, ...(targetUserId() ? { 'x-azotrace-user-id': targetUserId()! } : {}) }, body: JSON.stringify({ state }) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Não foi possível guardar o negócio.');
  await loadOnlineContext();
}
