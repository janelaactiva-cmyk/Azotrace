'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { loadOnlineContext, resetOnlineSession } from '~/app/dashboard/_lib/online-billing';
import MfaSettings from './MfaSettings';

type Step = 'form' | 'existing' | 'confirm_email' | 'mfa' | 'finish';
function registrationError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  if (/weak_password|password.*(?:weak|requirements)|usa pelo menos oito caracteres/i.test(message))
    return 'A password não está de acordo com as regras de criação de password.';
  return uiMessagePt(message || 'Não foi possível criar a conta.');
}
export default function AccountRegistration() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [busy, setBusy] = useState(true), [error, setError] = useState('');
  const [productKey, setProductKey] = useState('');
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  useEffect(() => {
    let cancelled = false;
    setProductKey(sessionStorage.getItem('validated_product_key') || '');
    async function initialize() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          const identity = await supabase.auth.getUser();
          if (identity.error || !identity.data.user) {
            if (identity.error?.status === 401 || identity.error?.status === 403 || !identity.data.user && !identity.error) {
              await supabase.auth.signOut({ scope: 'local' });
              resetOnlineSession();
            }
            throw new Error('A sessão anterior já não é válida. Inicia sessão novamente ou cria uma conta após o pagamento.');
          }
          if (!cancelled) { setCurrentEmail(identity.data.user.email || ''); setStep('existing'); }
        }
      } catch (cause) { if (!cancelled) setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível verificar a sessão. Tenta novamente.')); }
      finally { if (!cancelled) setBusy(false); }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (step !== 'mfa') return;
    router.prefetch('/dashboard');
    router.prefetch('/dashboard/onboarding');
  }, [step, router]);
  async function finish() {
    setStep('finish'); setBusy(true); setError('');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw new Error('Inicia sessão após confirmar o email.');
      const response = await fetch('/api/azotrace/setup-account', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: '{}' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível preparar a conta.');
      sessionStorage.removeItem('validated_email');
      sessionStorage.removeItem('validated_product_key');
      resetOnlineSession();
      // Lê a conta em paralelo com o carregamento da próxima página.
      void loadOnlineContext({ reuse: true }).catch(() => undefined);
      router.replace(result.next === '/dashboard/onboarding' ? '/dashboard/onboarding' : '/dashboard');
    } catch (cause) { setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível preparar a conta.')); }
    finally { setBusy(false); }
  }
  async function register(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirmation) { setError("As passwords não coincidem."); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/register-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productKey, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível criar a conta.');
      setCurrentEmail(result.email);
      setPassword(''); setConfirmation('');
      if (!result.session) { setStep('confirm_email'); return; }
      const { error } = await supabase.auth.setSession(result.session);
      if (error) throw error;
      setStep('mfa');
    } catch (cause) { setError(registrationError(cause)); }
    finally { setBusy(false); }
  }
  async function continueAfterEmail() {
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user?.email_confirmed_at) throw new Error('Confirma o email e inicia sessão para continuar.');
      setStep('mfa');
    } catch (cause) { setError(uiMessagePt(cause instanceof Error ? cause.message : 'Inicia sessão para continuar.')); }
    finally { setBusy(false); }
  }
  async function changeAccount() {
    setBusy(true); setError('');
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) setError('Não foi possível terminar a sessão. Tenta novamente.');
    else { resetOnlineSession(); setCurrentEmail(''); setStep('form'); }
    setBusy(false);
  }
  const input = { width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' as const };
  const button = { width: '100%', padding: 13, color: 'white', background: '#2563eb', border: 0, borderRadius: 8, cursor: 'pointer' };
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f3f4f6', padding: 20, color: '#172033' }}><section style={{ width: '100%', maxWidth: 480, padding: 32, borderRadius: 16, background: 'white', boxSizing: 'border-box' }}>
    <div style={{ textAlign: 'center' }}><img src="/assets/images/logo.png" alt="Azotrace" style={{ width: 180, height: 64, objectFit: 'contain' }} /></div>
    
    {step !== 'form' && error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> : null}
    {step === 'existing' ? <><p>Sessão iniciada com <strong>{currentEmail}</strong>.</p><button disabled={busy} style={button} onClick={() => setStep('mfa')}>Continuar com esta conta</button><button disabled={busy} style={{ ...button, marginTop: 12, background: '#475569' }} onClick={() => void changeAccount()}>Usar outra conta</button></> : null}
    {step === 'form' ? <form onSubmit={register} style={{ display: 'grid', gap: 16 }}>
      <p>A criação da conta fica disponível após a criação da password.</p>
      <label>Chave de licença<input required maxLength={100} value={productKey} onChange={event => setProductKey(event.target.value)} disabled={busy} style={input} /></label>
      <label>password<input type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={password} onChange={event => setPassword(event.target.value)} style={input} /></label>
      <label>Confirmar password<input type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} style={input} /></label>
      <p style={{ fontSize: 10, lineHeight: 1.5, margin: 0 }}>A password deve conter pelo menos 8 caracteres, incluindo uma maiúscula, uma minúscula, um número e um símbolo.</p>{error ? <p role="alert" style={{ color: '#b91c1c', margin: 0, fontSize: 14, lineHeight: 1.5 }}>{error}</p> : null}<button disabled={busy} style={button}>{busy ? 'A confirmar pagamento e criar conta…' : 'Criar conta'}</button>
      <a href="/landing#pricing">Efetuar o pagamento</a>
    </form> : null}
    {step === 'confirm_email' ? <><p>Confirma o email enviado para <strong>{currentEmail}</strong> e inicia sessão para continuar.</p><Link href="/login?next=%2Fcheckout%2Fcreate-account">Iniciar sessão após confirmar o email</Link><button disabled={busy} style={{ ...button, marginTop: 16 }} onClick={() => void continueAfterEmail()}>Já confirmei e iniciei sessão</button></> : null}
    {step === 'mfa' ? <MfaSettings onContinue={finish} /> : null}
    {step === 'finish' ? <><p>{busy ? 'A verificar o pagamento e preparar a empresa…' : 'A configuração ainda não ficou concluída.'}</p><button disabled={busy} style={button} onClick={() => void finish()}>Tentar concluir a configuração</button><p><Link href="/checkout/success">Verificar a chave de pagamento</Link></p><p><Link href="/login?next=%2Fcheckout%2Fcreate-account">Voltar a iniciar sessão</Link></p></> : null}
  </section></main>;
}





