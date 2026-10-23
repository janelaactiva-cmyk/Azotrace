'use client';

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { useBusiness } from '~/lib/business-context';
import { BUSINESS_CHANGED_EVENT, BUSINESSES_UPDATED_EVENT, getActiveProducerState, loadProducerState,
  saveProducerState, type ProducerLocalState } from '../onboarding/_lib/local-store';
import { loadRemoteProducerState, saveRemoteProducerState } from '../onboarding/_lib/supabase-store';

export function useProducerWorkspace() {
  const { selectedBusinessId } = useBusiness();
  const businessId = selectedBusinessId ? String(selectedBusinessId) : null;
  const [snapshot, setSnapshot] = useState<{ id: string | null; state: ProducerLocalState | null }>({ id: null, state: null });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState('');
  const request = useRef(0);
  const currentBusiness = useRef(businessId);
  currentBusiness.current = businessId;

  const read = useCallback(async (force: boolean) => {
    const epoch = ++request.current;
    const cached = businessId ? loadProducerState(businessId) : getActiveProducerState();
    setSnapshot({ id: businessId, state: cached });
    // Background synchronisation must not hide an available workspace.
    setLoading(!cached);
    setSyncing(true);
    setSyncError('');
    try {
      if (businessId) {
        const remote = await loadRemoteProducerState(businessId, { maxAgeMs: force ? 0 : 15_000 });
        if (request.current === epoch) setSnapshot({ id: businessId, state: remote || cached });
      }
    } catch (error) {
      if (request.current === epoch) setSyncError(error instanceof Error ? error.message : 'Não foi possível sincronizar os dados com o Supabase.');
    } finally {
      if (request.current === epoch) { setLoading(false); setSyncing(false); }
    }
  }, [businessId]);
  const refresh = useCallback(() => read(true), [read]);

  useEffect(() => {
    void read(false);
    // Local writes update the UI without downloading a previous server version.
    const localRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ businessId?: string }>).detail;
      if (detail?.businessId && businessId && detail.businessId !== businessId) return;
      if (event instanceof StorageEvent && event.key &&
        !event.key.startsWith('azotrace:producer-local:')) return;
      request.current++;
      setSnapshot({ id: businessId, state: businessId ? loadProducerState(businessId) : getActiveProducerState() });
      setLoading(false);
      setSyncing(false);
    };
    window.addEventListener('storage', localRefresh);
    window.addEventListener(BUSINESS_CHANGED_EVENT, localRefresh);
    window.addEventListener(BUSINESSES_UPDATED_EVENT, localRefresh);
    return () => {
      request.current++;
      window.removeEventListener('storage', localRefresh);
      window.removeEventListener(BUSINESS_CHANGED_EVENT, localRefresh);
      window.removeEventListener(BUSINESSES_UPDATED_EVENT, localRefresh);
    };
  }, [read, businessId]);

  const setStore = useCallback((value: SetStateAction<ProducerLocalState | null>) => {
    setSnapshot(previous => ({ id: businessId, state: typeof value === 'function' ? value(previous.id === businessId ? previous.state : null) : value }));
  }, [businessId]);

  const persist = useCallback((next: ProducerLocalState) => {
    request.current++;
    saveProducerState(next);
    setSnapshot({ id: businessId, state: next });
    setLoading(false);
    setSyncing(false);
    void saveRemoteProducerState(next).then(() => {
      if (currentBusiness.current === businessId) setSyncError('');
    }).catch((error: unknown) => {
      if (currentBusiness.current === businessId) setSyncError(error instanceof Error ? error.message : 'Não foi possível guardar no Supabase.');
    });
  }, [businessId]);

  return { store: snapshot.id === businessId ? snapshot.state : null, setStore, persist,
    loading: snapshot.id !== businessId || loading, syncing, refresh, syncError };
}
