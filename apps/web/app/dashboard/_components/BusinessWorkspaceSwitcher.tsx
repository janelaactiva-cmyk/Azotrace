'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useBusiness } from '~/lib/business-context';

import {
  BUSINESS_CHANGED_EVENT,
  BUSINESSES_UPDATED_EVENT,
  getCurrentLocalBusinessId,
  listLocalBusinesses,
  setCurrentLocalBusinessId,
  type LocalBusinessSummary,
} from '../onboarding/_lib/local-store';
import { listRemoteProducerStates, migrateLocalBusinessesToSupabase, summaryFromRemoteState } from '../onboarding/_lib/supabase-store';
import styles from './business-workspace-switcher.module.css';

export function BusinessWorkspaceSwitcher() {
  const { selectedBusinessId, setSelectedBusiness } = useBusiness();
  const [businesses, setBusinesses] = useState<LocalBusinessSummary[]>([]);
  const [currentId, setCurrentId] = useState('');

  const refresh = useCallback(async () => {
    const applyList = (list: LocalBusinessSummary[]) => {
      const storedCurrent = getCurrentLocalBusinessId();
      const selected = selectedBusinessId ? String(selectedBusinessId) : '';
      const nextCurrent = list.some((item) => item.id === selected)
        ? selected
        : list.some((item) => item.id === storedCurrent)
          ? storedCurrent
          : list[0]?.id ?? '';

      setBusinesses(list);
      setCurrentId(nextCurrent);

      const active = list.find((item) => item.id === nextCurrent);
      if (active) {
        document.documentElement.style.setProperty('--azotrace-business-accent', active.accentColor);
        document.documentElement.dataset.azotraceBusiness = active.id;
        if (selected !== active.id) {
          setSelectedBusiness(active.id as any, active.kind, active.name);
        }
      } else {
        document.documentElement.style.removeProperty('--azotrace-business-accent');
        delete document.documentElement.dataset.azotraceBusiness;
      }
    };

    const local = listLocalBusinesses();
    applyList(local);

    try {
      await migrateLocalBusinessesToSupabase();
      const remoteStates = await listRemoteProducerStates();
      const remote = remoteStates.map(summaryFromRemoteState);
      if (remote.length) applyList(remote);
    } catch (error) {
      console.warn('Não foi possível atualizar a lista de negócios pelo Supabase:', error);
    }
  }, [selectedBusinessId, setSelectedBusiness]);

  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    window.addEventListener('storage', listener);
    window.addEventListener(BUSINESS_CHANGED_EVENT, listener as EventListener);
    window.addEventListener(BUSINESSES_UPDATED_EVENT, listener as EventListener);
    return () => {
      window.removeEventListener('storage', listener);
      window.removeEventListener(BUSINESS_CHANGED_EVENT, listener as EventListener);
      window.removeEventListener(BUSINESSES_UPDATED_EVENT, listener as EventListener);
    };
  }, [refresh]);

  const current = useMemo(
    () => businesses.find((business) => business.id === currentId) ?? businesses[0],
    [businesses, currentId],
  );

  const switchBusiness = (businessId: string) => {
    const next = businesses.find((business) => business.id === businessId);
    if (!next) return;
    setCurrentLocalBusinessId(next.id);
    setSelectedBusiness(next.id as any, next.kind, next.name);
    setCurrentId(next.id);
    document.documentElement.style.setProperty('--azotrace-business-accent', next.accentColor);
    window.location.assign('/dashboard');
  };

  if (!businesses.length) {
    return (
      <div className={styles.emptyBar}>
        <div>
          <strong>Nenhum negócio configurado</strong>
          <span>Cria o primeiro espaço de produção.</span>
        </div>
        <Link href="/dashboard/onboarding?new=1" className={styles.addButton}>+ Criar negócio</Link>
      </div>
    );
  }

  return (
      <section className={styles.bar} style={{ ['--accent' as any]: current?.accentColor ?? '#47B37D' }}>
        <div className={styles.identity}>
          <span className={styles.dot} />
          <div>
            <span className={styles.kicker}>Negócio ativo</span>
            <strong>{current?.name || 'Negócio'}</strong>
            <small>{current?.productTypeName || current?.kind || 'Em configuração'}</small>
          </div>
        </div>

        <div className={styles.controls}>
          <label className={styles.selectWrap}>
            <span>Trocar negócio</span>
            <select value={current?.id ?? ''} onChange={(event) => switchBusiness(event.target.value)}>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name || business.productTypeName || 'Negócio sem nome'}
                </option>
              ))}
            </select>
          </label>
          <Link href="/dashboard/onboarding?new=1" className={styles.addButton}>+ Adicionar negócio</Link>
          <Link href="/dashboard/onboarding" className={styles.manageButton}>Configurar negócio</Link>
        </div>
      </section>
  );
}
