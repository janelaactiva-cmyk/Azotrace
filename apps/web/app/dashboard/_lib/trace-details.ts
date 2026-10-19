function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fmtDate(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function valueText(value: unknown, unit?: unknown) {
  const base = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value ?? '');
  return `${escapeHtml(base)}${unit ? ` ${escapeHtml(unit)}` : ''}`;
}

export function renderTraceDetails(snapshot: any) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(String(snapshot?.business?.accentColor || ''))
    ? snapshot.business.accentColor
    : '#47B37D';
  const product = snapshot?.product || {};
  const batch = snapshot?.batch || {};
  const business = snapshot?.business || {};
  const originUnits = Array.isArray(snapshot?.originUnits) ? snapshot.originUnits : [];
  const records = Array.isArray(snapshot?.records) ? snapshot.records : [];
  const quality = Array.isArray(snapshot?.quality) ? snapshot.quality : [];

  const unitCards = originUnits.length
    ? originUnits.map((unit: any) => `<span class="azt-chip">${escapeHtml(unit.code || unit.name)}${unit.code && unit.name ? ` · ${escapeHtml(unit.name)}` : ''}</span>`).join('')
    : '<span class="azt-muted">Origem não publicada.</span>';

  const timeline = records.length
    ? records.map((record: any) => {
        const values = Array.isArray(record.values) ? record.values : [];
        return `<article class="azt-event">
          <div class="azt-dot"></div>
          <div class="azt-event-body">
            <div class="azt-event-head"><strong>${escapeHtml(record.stage || 'Registo de produção')}</strong><time>${fmtDate(record.createdAt)}</time></div>
            ${Array.isArray(record.units) && record.units.length ? `<p class="azt-muted">${record.units.map((u: any) => escapeHtml(u.code || u.name)).join(' · ')}</p>` : ''}
            ${values.length ? `<dl class="azt-values">${values.map((item: any) => `<div><dt>${escapeHtml(item.label || item.key)}</dt><dd>${valueText(item.value, item.unit)}</dd></div>`).join('')}</dl>` : ''}
          </div>
        </article>`;
      }).join('')
    : '<p class="azt-muted">O produtor não publicou a cronologia deste lote.</p>';

  const qualityHtml = quality.length
    ? `<div class="azt-quality">${quality.map((item: any) => `<div class="azt-quality-row"><span>${escapeHtml(item.parameter)}</span><strong>${valueText(item.value, item.unit)}</strong><small>${escapeHtml(item.status || '')}</small></div>`).join('')}</div>`
    : '';

  return `
<section id="azotrace-rastreabilidade" class="azt-trace" style="--azt-accent:${accent}">
  <style>
    .azt-trace{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;color:#172033;background:#f7f9fb;padding:56px 20px;line-height:1.5}
    .azt-wrap{max-width:1100px;margin:0 auto}.azt-kicker{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--azt-accent);margin:0 0 8px}.azt-title{font-size:clamp(28px,5vw,46px);line-height:1.08;margin:0 0 10px;color:#111827}.azt-sub{font-size:15px;color:#667085;margin:0 0 28px}.azt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:22px}.azt-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;box-shadow:0 8px 30px rgba(15,23,42,.05)}.azt-card small{display:block;font-size:12px;color:#667085;margin-bottom:5px}.azt-card strong{font-size:16px;color:#111827}.azt-section{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px;margin-top:16px}.azt-section h2{font-size:20px;margin:0 0 14px}.azt-chips{display:flex;flex-wrap:wrap;gap:8px}.azt-chip{display:inline-flex;padding:7px 10px;border-radius:999px;background:color-mix(in srgb,var(--azt-accent) 12%,white);border:1px solid color-mix(in srgb,var(--azt-accent) 28%,white);font-size:13px;font-weight:700}.azt-muted{font-size:13px;color:#667085;margin:5px 0}.azt-event{display:grid;grid-template-columns:18px 1fr;gap:10px;position:relative;padding-bottom:18px}.azt-event:not(:last-child)::before{content:"";position:absolute;left:7px;top:15px;bottom:-2px;width:2px;background:#e5e7eb}.azt-dot{width:14px;height:14px;border-radius:50%;margin-top:5px;background:var(--azt-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--azt-accent) 15%,white)}.azt-event-head{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}.azt-event-head strong{font-size:15px}.azt-event-head time{font-size:12px;color:#667085}.azt-values{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:10px 0 0}.azt-values div{background:#f8fafc;border-radius:9px;padding:9px 10px}.azt-values dt{font-size:12px;color:#667085}.azt-values dd{font-size:13px;font-weight:700;margin:2px 0 0}.azt-quality{display:grid;gap:8px}.azt-quality-row{display:grid;grid-template-columns:minmax(140px,1fr) auto auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #eef2f6}.azt-quality-row:last-child{border-bottom:0}.azt-quality-row span,.azt-quality-row strong,.azt-quality-row small{font-size:13px}.azt-quality-row small{color:#667085}.azt-footer{font-size:12px;color:#667085;text-align:center;margin-top:20px}
    @media(max-width:640px){.azt-trace{padding:38px 14px}.azt-section{padding:16px}.azt-quality-row{grid-template-columns:1fr auto}.azt-quality-row small{grid-column:1/-1}}
  </style>
  <div class="azt-wrap">
    <p class="azt-kicker">Rastreabilidade Azotrace</p>
    <h1 class="azt-title">${escapeHtml(product.name || batch.code || 'Origem do produto')}</h1>
    <p class="azt-sub">${escapeHtml(product.description || 'Informação de produção publicada pelo produtor.')}</p>
    <div class="azt-grid">
      ${business.name ? `<div class="azt-card"><small>Produtor</small><strong>${escapeHtml(business.name)}</strong></div>` : ''}
      ${business.location ? `<div class="azt-card"><small>Origem</small><strong>${escapeHtml(business.location)}</strong></div>` : ''}
      ${batch.code ? `<div class="azt-card"><small>Lote</small><strong>${escapeHtml(batch.code)}</strong></div>` : ''}
      ${batch.startDate ? `<div class="azt-card"><small>Início do ciclo</small><strong>${fmtDate(batch.startDate)}</strong></div>` : ''}
    </div>
    <div class="azt-section"><h2>Unidade de produção</h2><div class="azt-chips">${unitCards}</div></div>
    <div class="azt-section"><h2>Histórico de produção</h2>${timeline}</div>
    ${qualityHtml ? `<div class="azt-section"><h2>Qualidade</h2>${qualityHtml}</div>` : ''}
    <p class="azt-footer">Informação publicada em ${fmtDate(snapshot?.generatedAt)} · Azotrace</p>
  </div>
</section>`;
}

