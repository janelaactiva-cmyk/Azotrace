// Schedule this command hourly on the hosting server. Environment variables
// must be supplied by the host; never place CRON_SECRET in a public URL.
const site = process.env.NEXT_PUBLIC_SITE_URL;
const secret = process.env.CRON_SECRET;
if (!site || !secret) throw new Error('Configure NEXT_PUBLIC_SITE_URL e CRON_SECRET no servidor.');
const url = new URL('/api/cron/verificar-expiracoes', site);
if (url.protocol !== 'https:') throw new Error('Use o endereço público HTTPS.');
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(120000),
});
console.log(`Verificação de renovações: HTTP ${response.status}`);
if (!response.ok) process.exitCode = 1;
