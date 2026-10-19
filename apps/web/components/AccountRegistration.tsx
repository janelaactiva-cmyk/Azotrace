'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { resetOnlineSession } from '~/app/dashboard/_lib/online-billing';
import MfaSettings from './MfaSettings';

type Step = 'form' | 'existing' | 'confirm_email' | 'mfa' | 'finish';
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
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível verificar a sessão. Tenta novamente.'); }
      finally { if (!cancelled) setBusy(false); }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);
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
      resetOnlineSession(); router.replace('/dashboard');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível preparar a conta.'); }
    finally { setBusy(false); }
  }
  async function register(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirmation) { setError('As palavras-passe não coincidem.'); return; }
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar a conta.'); }
    finally { setBusy(false); }
  }
  async function continueAfterEmail() {
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user?.email_confirmed_at) throw new Error('Confirma o email e inicia sessão para continuar.');
      setStep('mfa');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Inicia sessão para continuar.'); }
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
    <h1 style={{ fontSize: 25 }}>Criar e configurar a conta</h1>
    {error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> : null}
    {step === 'existing' ? <><p>Sessão iniciada com <strong>{currentEmail}</strong>.</p><button disabled={busy} style={button} onClick={() => setStep('mfa')}>Continuar com esta conta</button><button disabled={busy} style={{ ...button, marginTop: 12, background: '#475569' }} onClick={() => void changeAccount()}>Usar outra conta</button></> : null}
    {step === 'form' ? <form onSubmit={register} style={{ display: 'grid', gap: 16 }}>
      <p>A criação da conta fica disponível após a confirmação do pagamento. Utiliza a chave recebida por email; a conta será criada com o email da compra.</p>
      <label>Chave de licença<input required maxLength={100} value={productKey} onChange={event => setProductKey(event.target.value)} disabled={busy} style={input} /></label>
      <label>Palavra-passe<input type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={password} onChange={event => setPassword(event.target.value)} style={input} /></label>
      <label>Confirmar palavra-passe<input type="password" autoComplete="new-password" minLength={8} required disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} style={input} /></label>
      <small>Usa maiúscula, minúscula, número e símbolo.</small><button disabled={busy} style={button}>{busy ? 'A confirmar pagamento e criar conta…' : 'Criar conta'}</button>
      <Link href="/checkout">Ainda não efetuei o pagamento</Link><Link href="/login">Já tenho conta</Link>
    </form> : null}
    {step === 'confirm_email' ? <><p>Confirma o email enviado para <strong>{currentEmail}</strong> e inicia sessão para continuar.</p><Link href="/login?next=%2Fcheckout%2Fcreate-account">Iniciar sessão após confirmar o email</Link><button disabled={busy} style={{ ...button, marginTop: 16 }} onClick={() => void continueAfterEmail()}>Já confirmei e iniciei sessão</button></> : null}
    {step === 'mfa' ? <MfaSettings onContinue={finish} /> : null}
    {step === 'finish' ? <><p>{busy ? 'A verificar o pagamento e preparar a empresa…' : 'A configuração ainda não ficou concluída.'}</p><button disabled={busy} style={button} onClick={() => void finish()}>Tentar concluir a configuração</button><p><Link href="/checkout/success">Verificar a chave de pagamento</Link></p><p><Link href="/login?next=%2Fcheckout%2Fcreate-account">Voltar a iniciar sessão</Link></p></> : null}
  </section></main>;
}
