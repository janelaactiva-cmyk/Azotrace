import { Resend } from 'resend';

// Best-effort local throttle; no personal data or message contents are persisted.
const requests = new Map<string, { count: number; expires: number }>();
function allowed(request: Request) {
  const now = Date.now();
  for (const [key, value] of requests) if (value.expires <= now) requests.delete(key);
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const entry = requests.get(key) || { count: 0, expires: now + 10 * 60 * 1000 };
  if (entry.count >= 5 || (!requests.has(key) && requests.size >= 10000)) return false;
  entry.count++;
  requests.set(key, entry);
  return true;
}
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Pedido não permitido.' }, 403);
  if (!allowed(request)) return reply({ error: 'Foram enviados vários pedidos. Aguarde alguns minutos antes de tentar novamente.' }, 429);
  if (Number(request.headers.get('content-length') || 0) > 30000) return reply({ error: 'A mensagem é demasiado longa.' }, 413);
  let data: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 30000) return reply({ error: 'A mensagem é demasiado longa.' }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    data = parsed as Record<string, unknown>;
  } catch { return reply({ error: 'Verifique os dados do formulário.' }, 400); }
  if (data.website) return reply({ error: 'Pedido não permitido.' }, 400);
  const field = (key: string) => typeof data[key] === 'string' ? data[key].trim() : '';
  const name = field('name'), email = field('email'), subject = field('subject'), message = field('message');
  if (name.length < 2 || name.length > 100 || subject.length < 3 || subject.length > 180 || message.length < 3 || message.length > 6000 || email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(name + email + subject)) {
    return reply({ error: 'Preencha o nome, um email válido, o assunto e a mensagem.' }, 400);
  }
  if (!process.env.RESEND_API_KEY) return reply({ error: 'O envio de pedidos de ajuda está temporariamente indisponível. Tente novamente mais tarde.' }, 503);
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.HELP_FROM || 'Azotrace <no-reply@azotrace.com>',
      to: process.env.HELP_TO_EMAIL || 'geral@azotrace.pt',
      replyTo: email,
      subject: 'Pedido de ajuda — ' + subject,
      text: 'Nome: ' + name + '\nEmail: ' + email + '\n\n' + message,
    });
    if (result.error || !result.data?.id) throw new Error();
    return reply({ sent: true });
  } catch { return reply({ error: 'Não foi possível confirmar o envio do pedido. Tente novamente mais tarde.' }, 502); }
}
