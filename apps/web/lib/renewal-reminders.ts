import { createHash } from 'node:crypto';
import { subscriptionDateLabel } from './subscription-dates';

export type RenewalReminder = { id: string; token: string; email: string; customer_name: string; expires_at: string; first_attempt_at: string; reminder_days?: 15 | 10 | 5 };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function isRenewalSiteUrl(value: string | undefined, localTest = false) {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' || localTest && url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  } catch { return false; }
}

export function renewalEmail(reminder: RenewalReminder, siteUrl: string, localTest = false) {
  const url = new URL('/dashboard/subscricoes', siteUrl);
  if (!isRenewalSiteUrl(siteUrl,localTest)) throw new Error('Use HTTPS ou localhost para o teste local.');
  const date = subscriptionDateLabel(reminder.expires_at);
  const stage = reminder.reminder_days || 15;
  return {
    subject: `Azotrace — aviso de renovação (${stage} dias)`,
    text: `Olá ${reminder.customer_name || 'cliente'},\n\nAviso dos ${stage} dias antes da renovação. A sua subscrição Azotrace termina em ${date} (hora dos Açores). Renove antes desta data para manter o acesso.\n\nConsulte a sua subscrição: ${url.href}\n\nSe já tratou da renovação, ignore este aviso.\nEquipa Azotrace`,
    html: `<p>Olá ${escapeHtml(reminder.customer_name || 'cliente')},</p><p>Aviso dos <strong>${stage} dias</strong> antes da renovação.</p><p>A sua subscrição Azotrace termina em <strong>${escapeHtml(date)}</strong> (hora dos Açores). Renove antes desta data para manter o acesso.</p><p><a href="${escapeHtml(url.href)}">Consultar a subscrição</a></p><p>Se já tratou da renovação, ignore este aviso.</p><p>Equipa Azotrace</p>`,
  };
}

export async function sendRenewalReminder(reminder: RenewalReminder, config: { apiKey: string; from: string; siteUrl: string; test?: boolean }, send = fetch) {
  const message = renewalEmail(reminder, config.siteUrl, config.test === true);
  const response = await send('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'azotrace-renewal-' + createHash('sha256').update(reminder.id).digest('hex') },
    body: JSON.stringify({ from: config.from, to: reminder.email, ...message, subject: (config.test ? '[TESTE] ' : '') + message.subject }),
    signal: AbortSignal.timeout(15000),
  });
  const result: { id?: string } = await response.json();
  if (!response.ok || !result.id) throw new Error(`O serviço de email rejeitou o aviso (HTTP ${response.status}).`);
  return result.id;
}

