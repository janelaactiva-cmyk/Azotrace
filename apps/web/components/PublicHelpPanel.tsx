'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import styles from './PublicHelpPanel.module.css';

export default function PublicHelpPanel({ onBack }: { onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const pending = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/public/help', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar o pedido.');
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error && !['TimeoutError', 'AbortError', 'TypeError'].includes(reason.name)
        ? reason.message : 'Não foi possível confirmar o envio. Verifique a ligação e tente novamente.');
    } finally { pending.current = false; setBusy(false); }
  }
  return <div className={styles.root}>
    <button type="button" onClick={onBack}>← Perguntas e respostas</button>
    <h2>Formulário de ajuda</h2>
    {sent ? <div role="status"><p>O seu pedido de ajuda foi enviado. A equipa responderá para o email que indicou.</p>
      <button type="button" onClick={() => setSent(false)}>Enviar outro pedido</button></div> : <>
      <p>Precisa de esclarecer uma dúvida? Envie uma mensagem à equipa, sem iniciar sessão.</p>
      <form onSubmit={submit}>
        <label>Nome *<input name="name" autoComplete="name" required minLength={2} maxLength={100} disabled={busy}/></label>
        <label>Email *<input name="email" type="email" autoComplete="email" required maxLength={180} disabled={busy}/></label>
        <label>Assunto *<input name="subject" required minLength={3} maxLength={180} disabled={busy}/></label>
        <label>Mensagem *<textarea name="message" required minLength={3} maxLength={6000} rows={4} disabled={busy}/></label>
        <div className={styles.honeypot} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
        <p className={styles.note}>Usamos os dados para responder ao seu pedido. Não inclua palavras-passe ou dados de pagamento. <Link href="/privacy">Política de Privacidade</Link></p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'A enviar…' : 'Enviar pedido de ajuda'}</button>
      </form>
    </>}
  </div>;
}
