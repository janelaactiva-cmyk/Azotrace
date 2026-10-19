'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '~/lib/supabase';
import { resetOnlineSession } from '../_lib/online-billing';

export function FirstAccessMfa({ onVerified }: { onVerified: () => void }) {
  const [factorId, setFactorId] = useState(''), [code, setCode] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function loadFactor() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      const factor = data?.totp.find(row => row.status === 'verified');
      if (error || !factor) setError('Não foi possível carregar o fator MFA. Inicia sessão novamente.');
      else setFactorId(factor.id);
    }
    void loadFactor();
    return () => { cancelled = true; };
  }, []);
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy || !factorId) return;
    if (!/^\d{6}$/.test(code.trim())) { setError('Introduz o código de seis dígitos da aplicação de autenticação.'); return; }
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (error) throw error;
      resetOnlineSession();
      onVerified();
    } catch { setError('Não foi possível confirmar o código MFA. Verifica o código e tenta novamente.'); }
    finally { setBusy(false); }
  }
  return <section style={{ maxWidth: 440, padding: 28, margin: '24px auto', border: '1px solid #9ca3af', borderRadius: 14 }}>
    <h1 style={{ fontSize: 23 }}>Confirmar MFA</h1>
    <p>Confirma a tua identidade para continuar a configuração inicial da conta.</p>
    {error ? <p role="alert">{error}</p> : null}
    <form onSubmit={verify} style={{ display: 'grid', gap: 14 }}>
      <label style={{ display: 'grid', gap: 8 }}>Código da aplicação de autenticação
        <input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value)} style={{ padding: 12, fontSize: 20, letterSpacing: 4, border: '1px solid #9ca3af', borderRadius: 8, background: 'transparent', color: 'inherit' }} />
      </label>
      <button disabled={busy || !factorId} style={{ padding: 12, background: '#2563eb', color: 'white', border: 0, borderRadius: 8, cursor: 'pointer' }}>{busy ? 'A confirmar…' : 'Confirmar e continuar'}</button>
    </form>
  </section>;
}
