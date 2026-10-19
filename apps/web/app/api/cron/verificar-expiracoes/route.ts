import { randomUUID, timingSafeEqual } from 'node:crypto';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { isRenewalSiteUrl, renewalEmail, sendRenewalReminder, type RenewalReminder } from '~/lib/renewal-reminders';
import { subscriptionCalendarDay } from '~/lib/subscription-dates';

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'O agendamento de renovações não está configurado.' }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`), received = Buffer.from(request.headers.get('authorization') || '');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  return null;
}

export async function GET(request: Request) {
  const rejected = authorize(request); if (rejected) return rejected;
  const apiKey = process.env.RESEND_API_KEY, siteUrl = process.env.RENEWAL_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !siteUrl || !siteUrl.startsWith('https://')) return Response.json({ error: 'Configure o serviço de email e o endereço público HTTPS.' }, { status: 503 });
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.rpc('az_claim_renewal_reminders');
    if (error) throw new Error('Confirme a migração de renovações.');
    let sent = 0, failed = 0;
    for (const reminder of (data || []) as RenewalReminder[]) {
      try {
        const emailId = await sendRenewalReminder(reminder, { apiKey, siteUrl, from: process.env.RENEWAL_EMAIL_FROM || 'Azotrace <no-reply@azotrace.com>' });
        const saved = await admin.rpc('az_finish_renewal_reminder', { reminder_id: reminder.id, claim_token: reminder.token, provider_id: emailId });
        if (saved.error || saved.data !== true) throw new Error('Não foi possível confirmar o registo do envio.');
        sent++;
      } catch {
        failed++;
        await admin.rpc('az_finish_renewal_reminder', { reminder_id: reminder.id, claim_token: reminder.token, provider_id: null });
      }
    }
    return Response.json({ success: failed === 0, sent, failed }, { status: failed ? 502 : 200 });
  } catch {
    return Response.json({ error: 'Não foi possível verificar as renovações. Confirme a configuração e a migração no Supabase.' }, { status: 503 });
  }
}

/** Explicit test: never reads customer subscriptions or changes their reminder history. */
export async function POST(request: Request) {
  const rejected = authorize(request); if (rejected) return rejected;
  const recipient = process.env.RENEWAL_TEST_EMAIL?.trim();
  const siteUrl = process.env.RENEWAL_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !siteUrl || !isRenewalSiteUrl(siteUrl,true)) return Response.json({ error: 'Configure RENEWAL_TEST_EMAIL e RENEWAL_SITE_URL (HTTPS ou localhost) no servidor.' }, { status: 503 });
  const input = await request.json().catch(() => null);
  if (!input || ![15,10,5].includes(input.days) || (input.send !== undefined && typeof input.send !== 'boolean')) return Response.json({ error: 'Escolha 15, 10 ou 5 dias.' }, { status: 400 });
  // Noon UTC keeps the chosen calendar date stable across Azores DST changes.
  const end = new Date((subscriptionCalendarDay(Date.now())+input.days)*86400000+12*3600000);
  const reminder: RenewalReminder = { id: `test-${randomUUID()}`, token: '', email: recipient, customer_name: 'Teste Azotrace', expires_at: end.toISOString(), first_attempt_at: new Date().toISOString(), reminder_days: input.days };
  if (input.send !== true) return Response.json({ preview: true, days: input.days, to: recipient, ...renewalEmail(reminder,siteUrl,true) });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Response.json({ error: 'Configure RESEND_API_KEY.' }, { status: 503 });
  try {
    const id = await sendRenewalReminder(reminder,{ apiKey, siteUrl, from: process.env.RENEWAL_EMAIL_FROM || 'Azotrace <no-reply@azotrace.com>', test: true });
    return Response.json({ success: true, test: true, days: input.days, to: recipient, emailId: id });
  } catch {
    return Response.json({ error: 'O Resend não aceitou o email de teste. Confirme a chave e o remetente verificado.' }, { status: 502 });
  }
}
