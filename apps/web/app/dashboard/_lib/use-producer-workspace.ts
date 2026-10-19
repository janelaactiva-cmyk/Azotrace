'use client';

import { useCallback, useEffect, useState } from 'react';
import { useBusiness } from '~/lib/business-context';
import {
  BUSINESS_CHANGED_EVENT,
  BUSINESSES_UPDATED_EVENT,
  getActiveProducerState,
  saveProducerState,
  type ProducerLocalState,
} from '../onboarding/_lib/local-store';
import {
  loadRemoteProducerState,
  saveRemoteProducerState,
} from '../onboarding/_lib/supabase-store';

export function useProducerWorkspace() {
  const { selectedBusinessId } = useBusiness();
  const [store, setStore] = useState<ProducerLocalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setSyncError('');
    const businessId = selectedBusinessId ? String(selectedBusinessId) : null;

    // Mostra imediatamente a cache local, se existir.
    const cached = getActiveProducerState(businessId);
    if (cached) setStore(cached);

    try {
      if (businessId) {
        const remote = await loadRemoteProducerState(businessId);
        if (remote) setStore(remote);
      }
    } catch (error: any) {
      setSyncError(error?.message || 'Não foi possível sincronizar os dados com o Supabase.');
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
    // Cache local para UI instantânea/offline temporária.
    saveProducerState(next);
    setStore(next);

    // Supabase é a fonte persistente. Não bloqueia a UI, mas expõe o erro.
    void saveRemoteProducerState(next)
      .then(() => setSyncError(''))
      .catch((error: any) => setSyncError(error?.message || 'Não foi possível guardar no Supabase.'));
  }, []);

  return { store, setStore, persist, loading, refresh, syncError };
}
