'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CreditCard, Database, Mail, Clock, RefreshCw } from 'lucide-react';
import { settingsRequest } from './settings-request';
import styles from './settings.module.css';
type Services = { stripe: boolean; resend: boolean; supabase: boolean; cron: boolean; test_email: string; sender: string };
type EmailResult = { preview?: boolean; text?: string; subject?: string; to?: string; emailId?: string };

export default function ServiceSettings({ emails = false }: { emails?: boolean }) {
 const [services, setServices] = useState<Services | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0), [days, setDays] = useState(15), [result, setResult] = useState<EmailResult | null>(null);
 const pending = useRef(false);
 useEffect(() => { let active = true; setError(''); setServices(null); setResult(null); void settingsRequest<Services>('GET', undefined, true).then(value => { if (active) setServices(value); }).catch(cause => { if (active) setError(uiMessagePt(cause.message)); }); return () => { active = false; }; }, [attempt]);
 async function testEmail(send: boolean) { if (pending.current) return; pending.current = true; setBusy(true); setError(''); setResult(null); try { setResult(await settingsRequest<EmailResult>('POST', { days, send })); } catch (cause) { setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível testar o email.')); } finally { pending.current = false; setBusy(false); } }
 return <div>
  <div className={styles.blockHeading}><div><h2>{emails ? 'Avisos de renovação' : 'Serviços da plataforma'}</h2><p>{emails ? 'Acompanha a configuração do envio e testa os avisos.' : 'Acede aos painéis dos serviços ligados à Azotrace.'}</p></div><button type="button" className={styles.secondary} disabled={busy} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={15} aria-hidden="true"/>Atualizar</button></div>
  {error ? <p role="alert" className={styles.error}>{error}</p> : null}
  {!services && !error ? <p role="status">A consultar configuração…</p> : null}
  {services ? emails ? <>
   <div className={styles.reminders} aria-label="Avisos previstos">{[15, 10, 5].map(day => <div key={day}><strong>{day}</strong><span>dias antes de terminar</span></div>)}</div>
   <p className={styles.hint}>O envio automático depende do agendamento no servidor. A presença de uma chave não confirma a entrega dos emails.</p>
   <dl className={styles.facts}><div><dt>Serviço de envio</dt><dd><Status configured={services.resend}/></dd></div><div><dt>Remetente dos testes e avisos</dt><dd>{services.sender}</dd></div><div><dt>Proteção do agendamento</dt><dd><Status configured={services.cron}/></dd></div><div><dt>Clientes e renovações</dt><dd><Link href="/dashboard/subscricoes">Consultar pagamentos e subscrições →</Link></dd></div></dl>
   <div className={styles.divider}/><div className={styles.blockHeading}><h2>Testar um aviso</h2></div><p>Destinatário de teste: <strong>{services.test_email || 'Não configurado'}</strong></p><p className={styles.hint}>O teste usa apenas este destinatário e não altera as subscrições dos clientes.</p>
   <label className={styles.testSelect}>Aviso a testar<select aria-label="Aviso de renovação a testar" value={days} disabled={busy} onChange={event => { setDays(Number(event.target.value)); setResult(null); }}>{[15, 10, 5].map(day => <option key={day} value={day}>{day} dias</option>)}</select></label>
   <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy || !services.test_email || !services.cron} onClick={() => void testEmail(false)}>Pré-visualizar sem enviar</button><button type="button" className={styles.primary} disabled={busy || !services.test_email || !services.cron || !services.resend} onClick={() => void testEmail(true)}>{busy ? 'A processar…' : 'Enviar email de teste'}</button></div>
   {result?.preview ? <section className={styles.emailPreview} aria-label="Pré-visualização do aviso"><h3>{result.subject}</h3><p>Para: {result.to}</p><p className={styles.emailBody}>{result.text}</p></section> : result?.emailId ? <p role="status" className={styles.success}>Email de teste aceite pelo Resend. Para: {result.to}. Identificador: {result.emailId}.</p> : null}
  </> : <>
   <div className={styles.serviceList}>{[
    { name: 'Stripe', description: 'Pagamentos, clientes e subscrições.', configured: services.stripe, href: 'https://dashboard.stripe.com/', icon: CreditCard },
    { name: 'Resend', description: 'Envio de emails e registos de entrega.', configured: services.resend, href: 'https://resend.com/emails', icon: Mail },
    { name: 'Supabase', description: 'Base de dados e autenticação.', configured: services.supabase, href: 'https://supabase.com/dashboard', icon: Database },
    { name: 'Proteção do agendamento', description: 'Autorização das verificações automáticas.', configured: services.cron, href: null, icon: Clock },
   ].map(({ name, description, configured, href, icon: Icon }) => <div className={styles.serviceRow} key={name}><span className={styles.icon}><Icon size={21} aria-hidden="true"/></span><div className={styles.serviceInfo}><h3>{name}</h3><p>{description}</p><Status configured={configured}/></div>{href ? <a className={styles.secondary} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir painel de ${name} (novo separador)`}>Abrir painel <ArrowUpRight size={16} aria-hidden="true"/></a> : <span className={styles.hint}>Gerido no alojamento da aplicação</span>}</div>)}</div>
   <p className={styles.hint}>Os estados indicam a presença das credenciais no servidor. As chaves privadas não são apresentadas. Se alterares uma chave num serviço, atualiza-a também no alojamento da Azotrace.</p>
  </> : null}
 </div>;
}
function Status({ configured }: { configured: boolean }) { return <span className={`${styles.status} ${configured ? styles.configured : styles.missing}`}>{configured ? 'Configurado' : 'Configuração em falta'}</span>; }
