// Preview by default. --enviar explicitly sends one email to RENEWAL_TEST_EMAIL.
const days = Number(process.argv.find(arg=>arg.startsWith('--dias='))?.split('=')[1] || 15);
if (![15,10,5].includes(days)) throw new Error('Usa --dias=15, --dias=10 ou --dias=5.');
const base = process.env.RENEWAL_CHECK_URL || process.env.NEXT_PUBLIC_SITE_URL;
if (!base || !process.env.CRON_SECRET) throw new Error('Configure RENEWAL_CHECK_URL e CRON_SECRET.');
const url = new URL('/api/cron/verificar-expiracoes',base);
if (url.protocol!=='https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new Error('Use HTTPS no servidor ou HTTP apenas em localhost.');
const response = await fetch(url,{
 method:'POST',headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`,'Content-Type':'application/json'},
 body:JSON.stringify({days,send:process.argv.includes('--enviar')}),signal:AbortSignal.timeout(30000),
});
const result = await response.json();
if (!response.ok) { console.error(result.error || `HTTP ${response.status}`);process.exitCode=1; }
else if(result.preview) console.log(`SIMULAÇÃO — nenhum email enviado\nPara: ${result.to}\nAssunto: ${result.subject}\n\n${result.text}`);
else console.log(`Email de TESTE dos ${result.days} dias aceite pelo Resend.\nPara: ${result.to}\nID para verificar no Resend: ${result.emailId}`);
