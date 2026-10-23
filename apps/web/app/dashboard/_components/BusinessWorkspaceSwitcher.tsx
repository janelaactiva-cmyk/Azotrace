'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useBusiness } from '~/lib/business-context';

import { hasPermission, userCanAccessBusiness } from '../_lib/local-users';
import { useLocalUser } from '../_lib/use-local-user';
import {
  BUSINESS_CHANGED_EVENT,
  BUSINESSES_UPDATED_EVENT,
  getCurrentLocalBusinessId,
  listLocalBusinesses,
  setCurrentLocalBusinessId,
  type LocalBusinessSummary,
} from '../onboarding/_lib/local-store';
import styles from './business-workspace-switcher.module.css';

export function BusinessWorkspaceSwitcher() {
  const router = useRouter();
  const { selectedBusinessId, setSelectedBusiness } = useBusiness();
  const user = useLocalUser();
  const [businesses, setBusinesses] = useState<LocalBusinessSummary[]>([]);
  const [currentId, setCurrentId] = useState('');

  const refresh = useCallback(() => {
    const list = listLocalBusinesses().filter((business) => userCanAccessBusiness(user, business.id));
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
      if (selected !== active.id) setSelectedBusiness(active.id as any, active.kind, active.name);
    } else {
      document.documentElement.style.removeProperty('--azotrace-business-accent');
      delete document.documentElement.dataset.azotraceBusiness;
    }
  }, [selectedBusinessId, setSelectedBusiness, user]);

  useEffect(() => {
    refresh();
    const listener = () => refresh();
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

  const canManageBusiness = hasPermission(user, 'business.manage', current?.id ?? null);
  const canCreateBusiness = user.role !== 'superadmin' && Boolean(user.companyId) && hasPermission(user, 'business.manage');

  const switchBusiness = (businessId: string) => {
    const next = businesses.find((business) => business.id === businessId);
    if (!next) return;
    setCurrentLocalBusinessId(next.id);
    setSelectedBusiness(next.id as any, next.kind, next.name);
    setCurrentId(next.id);
    document.documentElement.style.setProperty('--azotrace-business-accent', next.accentColor);
    router.push('/dashboard');
  };

  if (!businesses.length) {
    return (
      <div className={styles.emptyBar}>
        <div>
          <strong>Nenhum negócio disponível</strong>
          <span>{user.role === 'superadmin' ? 'Cria primeiro um Admin e a respetiva empresa em Utilizadores.' : 'Crie o primeiro negócio da sua empresa.'}</span>
        </div>
        {user.role === 'superadmin' ? <Link href="/dashboard/administracao/utilizadores/criar" className={styles.addButton}>+ Criar Admin</Link> : null}
        {canCreateBusiness ? <Link href="/dashboard/onboarding?new=1" className={styles.addButton}>+ Criar negócio</Link> : null}
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
        {canCreateBusiness ? <Link href="/dashboard/onboarding?new=1" className={styles.addButton}>+ Adicionar negócio</Link> : null}
        {canManageBusiness ? <Link href="/dashboard/onboarding" className={styles.manageButton}>Configurar negócio</Link> : null}
      </div>
    </section>
  );
}
