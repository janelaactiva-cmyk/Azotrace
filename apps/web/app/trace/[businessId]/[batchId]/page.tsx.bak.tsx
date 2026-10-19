'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import { supabase } from '~/lib/supabase';

import type { PublicTraceSnapshot } from '../../../dashboard/_lib/publication';
import { SaveWebsiteTemplateSchema } from '../../../dashboard/administracao/negocios/template-website/_lib/schema';
import { renderWebsiteTemplateDocument } from '../../../dashboard/administracao/negocios/template-website/_lib/templates/render-template';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function traceSection(snapshot: PublicTraceSnapshot) {
  const c = snapshot.config;
  const accent = snapshot.business.accentColor || '#47B37D';
  const rows = snapshot.records.flatMap((record) =>
    record.values.map((value) => `
      <div class="azt-trace-row">
        <span>${escapeHtml(value.label)}</span>
        <strong>${escapeHtml(value.value)}${value.unit ? ` ${escapeHtml(value.unit)}` : ''}</strong>
      </div>`),
  ).join('');

  const timeline = c.showTimeline ? snapshot.records.map((record) => `
    <article class="azt-trace-event">
      <div class="azt-trace-dot"></div>
      <div>
        <strong>${escapeHtml(record.stage)}</strong>
        <small>${escapeHtml(formatDate(record.createdAt))}</small>
        ${record.units.length ? `<p>${record.units.map((unit) => escapeHtml(unit.name || unit.code)).join(', ')}</p>` : ''}
      </div>
    </article>`).join('') : '';

  const quality = c.showQuality ? snapshot.quality.map((item) => `
    <div class="azt-trace-row">
      <span>${escapeHtml(item.parameter)}</span>
      <strong>${escapeHtml(item.value)}${item.unit ? ` ${escapeHtml(item.unit)}` : ''}</strong>
    </div>`).join('') : '';

  const origin = c.showOriginUnits && snapshot.originUnits.length
    ? `<div class="azt-trace-card"><h3>Origem</h3><div class="azt-trace-chips">${snapshot.originUnits.map((unit) => `<span>${escapeHtml(unit.name || unit.code)}</span>`).join('')}</div></div>`
    : '';

  return `
  <section id="azotrace-rastreabilidade" class="azt-trace" style="--azt-accent:${escapeHtml(accent)}">
    <div class="azt-trace-wrap">
      <div class="azt-trace-head">
        <div>
          <span class="azt-trace-kicker">Rastreabilidade Azotrace</span>
          <h2>${escapeHtml(c.headline || 'Conheça a origem deste produto')}</h2>
          <p>${escapeHtml(c.intro || '')}</p>
        </div>
        ${snapshot.business.logoUrl ? `<img src="${escapeHtml(snapshot.business.logoUrl)}" alt="${escapeHtml(snapshot.business.name || 'Produtor')}" />` : ''}
      </div>

      <div class="azt-trace-grid">
        <div class="azt-trace-card">
          <h3>Produto e lote</h3>
          ${c.showBusinessName ? `<div class="azt-trace-row"><span>Produtor</span><strong>${escapeHtml(snapshot.business.name || '—')}</strong></div>` : ''}
          ${c.showBusinessLocation ? `<div class="azt-trace-row"><span>Localização</span><strong>${escapeHtml(snapshot.business.location || '—')}</strong></div>` : ''}
          ${c.showProductName ? `<div class="azt-trace-row"><span>Produto</span><strong>${escapeHtml(snapshot.product.name || '—')}</strong></div>` : ''}
          ${c.showBatchCode ? `<div class="azt-trace-row"><span>Lote</span><strong>${escapeHtml(snapshot.batch.code || '—')}</strong></div>` : ''}
          ${c.showBatchStartDate ? `<div class="azt-trace-row"><span>Início</span><strong>${escapeHtml(formatDate(snapshot.batch.startDate))}</strong></div>` : ''}
        </div>
        ${origin}
        ${rows ? `<div class="azt-trace-card"><h3>Dados de produção</h3>${rows}</div>` : ''}
        ${quality ? `<div class="azt-trace-card"><h3>Qualidade</h3>${quality}</div>` : ''}
      </div>

      ${timeline ? `<div class="azt-trace-card azt-trace-timeline"><h3>Histórico de produção</h3>${timeline}</div>` : ''}
    </div>
  </section>
  <style>
    .azt-trace{padding:64px 20px;background:#f6f8f7;color:#17232d;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .azt-trace *{box-sizing:border-box}
    .azt-trace-wrap{max-width:1120px;margin:0 auto}
    .azt-trace-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:28px}
    .azt-trace-head img{width:76px;height:76px;object-fit:contain;border-radius:16px;background:#fff;border:1px solid #dde5e1;padding:8px}
    .azt-trace-kicker{display:block;color:var(--azt-accent);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .azt-trace h2{font-size:clamp(28px,5vw,44px);line-height:1.08;margin:0 0 10px;color:#17232d}
    .azt-trace h3{font-size:17px;margin:0 0 16px;color:#17232d}
    .azt-trace p,.azt-trace span,.azt-trace small,.azt-trace strong{font-size:12px}
    .azt-trace-head p{font-size:15px;line-height:1.6;color:#61706a;max-width:720px;margin:0}
    .azt-trace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .azt-trace-card{background:#fff;border:1px solid #dde5e1;border-radius:16px;padding:20px;box-shadow:0 10px 28px rgba(23,35,45,.05)}
    .azt-trace-row{display:flex;justify-content:space-between;gap:18px;padding:10px 0;border-top:1px solid #edf1ef}
    .azt-trace-row:first-of-type{border-top:0}.azt-trace-row span{color:#708078}.azt-trace-row strong{text-align:right;color:#25352e}
    .azt-trace-chips{display:flex;flex-wrap:wrap;gap:8px}.azt-trace-chips span{padding:7px 10px;border-radius:999px;background:color-mix(in srgb,var(--azt-accent) 12%,white);color:#314139;border:1px solid color-mix(in srgb,var(--azt-accent) 25%,white)}
    .azt-trace-timeline{margin-top:16px}.azt-trace-event{display:grid;grid-template-columns:16px 1fr;gap:12px;padding:11px 0}.azt-trace-dot{width:10px;height:10px;border-radius:50%;background:var(--azt-accent);margin-top:5px}.azt-trace-event strong,.azt-trace-event small{display:block}.azt-trace-event small{color:#78867f;margin-top:2px}.azt-trace-event p{margin:5px 0 0;color:#61706a}
    @media(max-width:760px){.azt-trace{padding:40px 14px}.azt-trace-grid{grid-template-columns:1fr}.azt-trace-head{flex-direction:column}.azt-trace-row{align-items:flex-start}.azt-trace-row strong{max-width:60%}}
  </style>`;
}

function fallbackDocument(snapshot: PublicTraceSnapshot) {
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(snapshot.product.name || 'Rastreabilidade')}</title></head><body style="margin:0">${traceSection(snapshot)}</body></html>`;
}

function mergeIntoWebsite(documentHtml: string, snapshot: PublicTraceSnapshot) {
  const section = traceSection(snapshot);
  const base = '<base href="/" />';
  let html = documentHtml.includes('<head>') ? documentHtml.replace('<head>', `<head>${base}`) : documentHtml;
  if (html.includes('</body>')) return html.replace('</body>', `${section}</body>`);
  return `${html}${section}`;
}

export default function PublicTracePage() {
  const params = useParams<{ businessId: string; batchId: string }>();
  const businessId = decodeURIComponent(String(params?.businessId ?? ''));
  const batchId = decodeURIComponent(String(params?.batchId ?? ''));
  const [documentHtml, setDocumentHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError('');
      try {
        const [traceResult, websiteResult] = await Promise.all([
          (supabase as any)
            .from('public_trace_pages')
            .select('snapshot')
            .eq('business_id', businessId)
            .eq('batch_id', batchId)
            .eq('status', 'published')
            .maybeSingle(),
          (supabase as any)
            .from('business_websites')
            .select('template_id, asset_base_url, content, status')
            .eq('business_id', businessId)
            .eq('status', 'published')
            .maybeSingle(),
        ]);

        if (traceResult.error) throw traceResult.error;
        if (!traceResult.data?.snapshot) throw new Error('Esta página de rastreabilidade ainda não foi publicada.');

        const snapshot = traceResult.data.snapshot as PublicTraceSnapshot;
        let html = fallbackDocument(snapshot);

        if (!websiteResult.error && websiteResult.data) {
          const parsed = SaveWebsiteTemplateSchema.safeParse({
            businessId,
            templateId: websiteResult.data.template_id,
            assetBaseUrl: websiteResult.data.asset_base_url ?? '',
            content: websiteResult.data.content,
            status: websiteResult.data.status,
          });
          if (parsed.success) {
            const websiteHtml = renderWebsiteTemplateDocument({
              templateId: parsed.data.templateId,
              content: parsed.data.content,
              assetBaseUrl: parsed.data.assetBaseUrl,
            });
            html = mergeIntoWebsite(websiteHtml, snapshot);
          }
        }

        if (!cancelled) setDocumentHtml(html);
      } catch (cause) {
        console.error(cause);
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a rastreabilidade.');
      }
    }

    if (businessId && batchId) void load();
    return () => { cancelled = true; };
  }, [businessId, batchId]);

  const srcDoc = useMemo(() => documentHtml, [documentHtml]);

  if (error) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui,sans-serif', background: '#f4f6f5' }}>
        <section style={{ maxWidth: 620, width: '100%', background: '#fff', border: '1px solid #dde5e1', borderRadius: 18, padding: 28 }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 24 }}>Página indisponível</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#64736c' }}>{error}</p>
        </section>
      </main>
    );
  }

  if (!srcDoc) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontSize: 14, fontFamily: 'system-ui,sans-serif' }}>A carregar rastreabilidade…</div>;
  }

  return (
    <iframe
      title="Rastreabilidade do produto"
      srcDoc={srcDoc}
      style={{ width: '100%', minHeight: '100vh', border: 0, display: 'block', background: '#fff' }}
    />
  );
}
