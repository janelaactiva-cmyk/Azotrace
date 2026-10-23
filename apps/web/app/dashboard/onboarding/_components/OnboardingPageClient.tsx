'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';


import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { targetUserId } from '../../_lib/online-state';

import ProducerOnboarding from './ProducerOnboarding';

export default function OnboardingPageClient() {
  const searchParams = useSearchParams();
  const forceNew = searchParams.get('new') === '1';
  const [allowed, setAllowed] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setAllowed(false); setError('');
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Inicia sessão para continuar.');
      const headers: Record<string, string> = { Authorization: `Bearer ${data.session.access_token}` };
      const target = targetUserId(); if (target) headers['x-azotrace-user-id'] = target;
      const response = await fetch('/api/azotrace/onboarding-access', { headers, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.allowed) throw new Error(result.error || 'O pagamento ainda não foi confirmado.');
      if (!cancelled) setAllowed(true);
    }
    void check().catch(cause => { if (!cancelled) setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível verificar o pagamento.')); });
    return () => { cancelled = true; };
  }, [attempt]);
  if (error) return <section role="alert" style={{ padding: 24 }}><h1>Pagamento necessário</h1><p>{error}</p><button onClick={() => setAttempt(value => value + 1)}>Verificar novamente</button><p><a href="/dashboard/subscricoes">Consultar pagamentos e subscrições</a></p></section>;
  if (!allowed) return <p role="status" style={{ padding: 24 }}>A confirmar o pagamento antes de abrir o onboarding…</p>;

  return <ProducerOnboarding forceNew={forceNew} />;
}
