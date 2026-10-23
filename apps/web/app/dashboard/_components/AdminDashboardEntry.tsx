'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { useBusiness } from '~/lib/business-context';
import { loadOnlineContext } from '../_lib/online-billing';
import { firstAccessDestination } from '../_lib/first-access';
import { useLocalUser } from '../_lib/use-local-user';
import { ProducerDashboard } from './ProducerDashboard';
import { FirstAccessMfa } from './FirstAccessMfa';

export function AdminDashboardEntry() {
  const router = useRouter();
  const user = useLocalUser();
  const { selectedBusinessId, setSelectedBusiness, clearSelectedBusiness } = useBusiness();
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [needsMfa, setNeedsMfa] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setReady(false); setError('');
    async function enter() {
      try {
        const context = await loadOnlineContext({ reuse: true });
        if (cancelled) return;
        const destination = firstAccessDestination(context, selectedBusinessId);
        if (destination.path === '/dashboard/onboarding') {
          const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (assurance.error) throw new Error('Não foi possível validar o MFA. Tenta novamente.');
          if (cancelled) return;
          if (assurance.data?.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2') {
            setNeedsMfa(true);
            return;
          }
          if (destination.business) {
            const business = destination.business;
            setSelectedBusiness(business.id, business.kind, business.name);
          } else clearSelectedBusiness();
          router.replace(destination.path);
        } else setReady(true);
      } catch (cause) {
        if (!cancelled) setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível verificar a configuração da conta.'));
      }
    }
    void enter();
    return () => { cancelled = true; };
  }, [user.id, user.companyId, attempt]);
  if (needsMfa) return <FirstAccessMfa onVerified={() => { setNeedsMfa(false); setAttempt(value => value + 1); }} />;
  if (error) return <div role="alert"><p>{error}</p><button onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>;
  if (!ready) return <p role="status">A verificar a configuração da conta…</p>;
  return <ProducerDashboard />;
}
