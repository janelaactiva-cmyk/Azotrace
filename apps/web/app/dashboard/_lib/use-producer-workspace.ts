'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBusiness } from '~/lib/business-context';
import {
  BUSINESS_CHANGED_EVENT,
  BUSINESSES_UPDATED_EVENT,
  getActiveProducerState,
  getCurrentLocalBusinessId,
  saveProducerState,
  type ProducerLocalState,
} from '../onboarding/_lib/local-store';
import {
  listRemoteProducerStates,
  loadRemoteProducerState,
  saveRemoteProducerState,
} from '../onboarding/_lib/supabase-store';

export function useProducerWorkspace() {
  const { selectedBusinessId } = useBusiness();
  const [store, setStore] = useState<ProducerLocalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const refresh = useCallback(async () => {
    const preferredId = selectedBusinessId ? String(selectedBusinessId) : getCurrentLocalBusinessId();
    const local = getActiveProducerState(preferredId || null);
    if (local) {
      setStore(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      let remote = preferredId ? await loadRemoteProducerState(preferredId) : null;

      if (!remote && !preferredId) {
        const rows = await listRemoteProducerStates();
        remote = rows[0] ?? null;
      }

      if (!remote && local) {
        await saveRemoteProducerState(local);
        remote = local;
      }

      if (remote) setStore(remote);
      setSyncError('');
    } catch (error) {
      console.error('Erro ao sincronizar negócio com Supabase:', error);
      setSyncError(error instanceof Error ? error.message : 'Não foi possível sincronizar com o Supabase.');
    } finally {
      setLoading(false);
    }
  }, [selectedBusinessId]);

  useEffect(() => {
    void refresh();
    const localRefresh = () => void refresh();
    window.addEventListener('storage', localRefresh);
    window.addEventListener(BUSINESS_CHANGED_EVENT, localRefresh as EventListener);
    window.addEventListener(BUSINESSES_UPDATED_EVENT, localRefresh as EventListener);
    return () => {
      window.removeEventListener('storage', localRefresh);
      window.removeEventListener(BUSINESS_CHANGED_EVENT, localRefresh as EventListener);
      window.removeEventListener(BUSINESSES_UPDATED_EVENT, localRefresh as EventListener);
    };
  }, [refresh]);

  const persist = useCallback((next: ProducerLocalState) => {
    saveProducerState(next);
    setStore(next);
    setSyncing(true);
    setSyncError('');
    void saveRemoteProducerState(next)
      .catch((error) => {
        console.error('Erro ao guardar no Supabase:', error);
        setSyncError(error instanceof Error ? error.message : 'Não foi possível guardar no Supabase.');
      })
      .finally(() => setSyncing(false));
  }, []);

  const persistAsync = useCallback(async (next: ProducerLocalState) => {
    saveProducerState(next);
    setStore(next);
    setSyncing(true);
    setSyncError('');
    try {
      await saveRemoteProducerState(next);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Não foi possível guardar no Supabase.');
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { store, setStore, persist, persistAsync, loading, refresh, syncing, syncError };
}
