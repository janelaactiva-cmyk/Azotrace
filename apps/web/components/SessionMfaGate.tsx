'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '~/lib/supabase';
import { FirstAccessMfa } from '~/app/dashboard/_components/FirstAccessMfa';

export default function SessionMfaGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'challenge' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState('loading');
    async function check() {
      const { data: session, error } = await supabase.auth.getSession();
      if (error || !session.session) { if (!cancelled) setState('error'); return; }
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      if (assurance.error) setState('error');
      else setState(assurance.data.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2' ? 'challenge' : 'ready');
    }
    void check().catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => setAttempt(value => value + 1));
    return () => data.subscription.unsubscribe();
  }, []);
  if (state === 'loading') return <p role="status" style={{ padding: 24 }}>A verificar a segurança da sessão…</p>;
  if (state === 'challenge') return <FirstAccessMfa onVerified={() => setAttempt(value => value + 1)} />;
  if (state === 'error') return <div role="alert" style={{ padding: 24 }}><p>Não foi possível validar a sessão.</p><button onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button><p><a href="/login">Iniciar sessão</a></p></div>;
  return children;
}
