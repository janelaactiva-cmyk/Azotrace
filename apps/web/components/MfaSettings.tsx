'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '~/lib/supabase';

function mfaError(cause: unknown, fallback: string) {
  const detail = cause && typeof cause === 'object' ? cause : {};
  const code = 'code' in detail ? String(detail.code) : '';
  const message = 'message' in detail ? String(detail.message) : '';
  if (['session_not_found', 'user_not_found', 'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt'].includes(code) || /session.*missing|session.*expired|invalid.*jwt|user.*not.*found/i.test(message)) return 'A sessão expirou ou a conta já não existe. Volta a iniciar sessão para continuar.';
  if (code === 'mfa_totp_enroll_not_enabled') return 'A ativação de MFA está indisponível neste serviço. Podes continuar sem MFA e ativá-lo mais tarde.';
  return fallback;
}

export default function MfaSettings({ onContinue }: { onContinue?: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [factorId, setFactorId] = useState(''), [enabled, setEnabled] = useState(false), [assured, setAssured] = useState(false);
  const [qrCode, setQrCode] = useState(''), [code, setCode] = useState(''), [showChallenge, setShowChallenge] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    const factor = data.totp.find(item => item.status === 'verified');
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) throw assurance.error;
    setEnabled(!!factor); setFactorId(factor?.id || '');
    setAssured(assurance.data.currentLevel === 'aal2');
    setShowChallenge(!!factor && assurance.data.currentLevel !== 'aal2');
  }
  useEffect(() => {
    let active = true;
    refresh().catch(cause => { if (active) setError(mfaError(cause, 'Não foi possível consultar o MFA. Podes tentar novamente ou continuar; a sessão será validada no servidor.')); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  async function enroll() {
    setBusy(true); setError(''); setNotice('');
    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      if (factors.data.totp.some(factor => factor.status === 'verified')) { await refresh(); return; }
      for (const factor of factors.data.all.filter(item => item.factor_type === 'totp' && item.status === 'unverified')) {
        const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removed.error) throw removed.error;
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Azotrace' });
      if (error) throw error;
      setFactorId(data.id); setQrCode(data.totp.qr_code); setShowChallenge(true); setCode('');
    } catch (cause) { setError(mfaError(cause, 'Não foi possível iniciar a ativação. Podes tentar novamente ou ativar o MFA mais tarde.')); }
    finally { setBusy(false); }
  }
  async function cancelEnrollment() {
    setBusy(true); setError('');
    try {
      if (qrCode && factorId && !enabled) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        if (error) throw error;
      }
      setQrCode(''); setCode(''); setShowChallenge(false); await refresh();
    } catch { setError('Não foi possível cancelar a ativação. Tenta novamente.'); }
    finally { setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (error) throw error;
      setQrCode(''); setCode(''); await refresh(); setNotice('MFA confirmado e ativo nesta conta.');
    } catch { setError('Código inválido ou expirado. Verifica a aplicação de autenticação e tenta novamente.'); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setConfirmDisable(false); await refresh(); setNotice('MFA desativado. Podes voltar a ativá-lo aqui.');
    } catch { setError('Não foi possível desativar o MFA. Confirma o código e tenta novamente.'); }
    finally { setBusy(false); }
  }
  async function continueRegistration() {
    if (busy || (enabled && !assured) || !onContinue) return;
    setBusy(true); setError('');
    try {
      // Uma inscrição incompleta não ativa MFA. O servidor volta a validar os fatores e o pagamento.
      await onContinue();
    } catch (cause) {
      setError(mfaError(cause, 'Não foi possível continuar. Tenta novamente.'));
    } finally { setBusy(false); }
  }
  const button = { padding: '11px 16px', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer', marginRight: 10, marginTop: 12 };
  const canContinue = !busy && (!enabled || assured);
  return <section aria-labelledby="mfa-heading" style={{ padding: '16px 0' }}>
    <h2 id="mfa-heading" style={{ fontSize: 21 }}>Autenticação de dois fatores (MFA)</h2>
    <p>{enabled ? 'MFA ativo. A conta requer um código da aplicação de autenticação ao iniciar sessão.' : 'A ativação é opcional. Podes fazê-la agora ou mais tarde no menu Configurações.'}</p>
    {error ? <div role="alert"><p style={{ color: '#b91c1c' }}>{error}</p><Link href={onContinue ? '/login?next=%2Fcheckout%2Fcreate-account' : '/login?next=%2Fdashboard%2Fconfiguracoes'}>Voltar a iniciar sessão</Link></div> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {busy ? <p role="status">A verificar…</p> : null}
    {!enabled && !showChallenge ? <button type="button" style={button} disabled={busy} onClick={() => void enroll()}>Ativar MFA agora</button> : null}
    {qrCode ? <><p>Lê o QR code com a tua aplicação de autenticação.</p><img alt="QR code para ativar MFA" width={190} height={190} src={qrCode.startsWith('data:') ? qrCode : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`} /></> : null}
    {showChallenge ? <form onSubmit={verify}><label>Código da aplicação de autenticação<input required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} style={{ display: 'block', padding: 10, marginTop: 8, border: '1px solid #cbd5e1', borderRadius: 8 }} /></label><button style={button} disabled={busy}>{qrCode ? 'Confirmar ativação' : 'Confirmar código'}</button>{qrCode ? <button type="button" style={button} disabled={busy} onClick={() => void cancelEnrollment()}>Cancelar ativação</button> : null}</form> : null}
    {enabled && assured && !onContinue ? <><button style={button} disabled={busy} onClick={() => setConfirmDisable(true)}>Desativar MFA</button>{confirmDisable ? <div><p>Confirmas que queres desativar o MFA desta conta?</p><button style={button} disabled={busy} onClick={() => void disable()}>Confirmar desativação</button><button style={button} disabled={busy} onClick={() => setConfirmDisable(false)}>Cancelar</button></div> : null}</> : null}
    {onContinue ? <button type="button" style={{ ...button, background: '#2563eb', color: 'white' }} disabled={!canContinue} onClick={() => void continueRegistration()}>{enabled ? 'Continuar para o onboarding' : 'Ativar mais tarde e continuar'}</button> : null}
  </section>;
}
