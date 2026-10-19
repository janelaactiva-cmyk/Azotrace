import type { PublicTraceSnapshot } from './publication';
export type ProductionSeries = { key: string; stage: string; label: string; unit: string; origin: string; points: Array<{ date: string; value: number }> };
const esc = (v: unknown) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const number = (v: number) => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 6 }).format(v);
const date = (v: string) => new Date(v).toLocaleString('pt-PT');
export function productionSeries(snapshot?: PublicTraceSnapshot | null): ProductionSeries[] {
  if (!snapshot || !snapshot.config.showTimeline) return [];
  const allowed = new Set(snapshot.config.fieldKeys);
  const series = new Map<string, ProductionSeries>();
  for (const record of snapshot.records) {
    if (!Number.isFinite(Date.parse(record.createdAt))) continue;
    for (const field of record.values) {
      if (!allowed.has(field.key)) continue;
      let value: number;
      if (typeof field.value === 'number') value = field.value;
      else if (['number','decimal','integer'].includes(field.fieldType) && typeof field.value === 'string' && /^[+-]?\d+(?:[.,]\d+)?$/.test(field.value.trim())) value = Number(field.value.trim().replace(',','.'));
      else continue;
      if (!Number.isFinite(value)) continue;
      const origin = record.units.map(u => u.code || u.name).sort().join(' · ');
      const key = JSON.stringify([record.stageId || record.stage, field.key, field.unit || '', origin]);
      if (!series.has(key)) series.set(key, { key, stage: record.stage, label: field.label, unit: field.unit || '', origin, points: [] });
      series.get(key)!.points.push({ date: record.createdAt, value });
    }
  }
  return [...series.values()].map(s => ({ ...s, points: s.points.sort((a,b) => Date.parse(a.date)-Date.parse(b.date)) }));
}
export function renderProductionCharts(snapshot?: PublicTraceSnapshot | null, sectionId = 'production-charts'): string {
  const series = productionSeries(snapshot);
  const cards = series.map(s => {
    const values = s.points.map(p=>p.value), min=Math.min(...values), max=Math.max(...values);
    const pad = (max-min || Math.abs(max) || 1)*0.1, low=min-pad, high=max+pad;
    const start=Date.parse(s.points[0]!.date), end=Date.parse(s.points[s.points.length-1]!.date);
    const points=s.points.map(p=>({ ...p, x:end===start?310:70+(Date.parse(p.date)-start)/(end-start)*480, y:190-(p.value-low)/(high-low)*140 }));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 250" role="img" aria-label="${esc(s.stage+' — '+s.label)}"><title>${esc(s.stage+' — '+s.label+' '+s.unit)}</title>${[0,1,2,3,4].map(i=>{const y=50+i*35;return `<line x1="70" y1="${y}" x2="550" y2="${y}" stroke="#dbe2ea"/><text x="62" y="${y+4}" text-anchor="end" font-size="14" fill="#475569">${number(high-(high-low)*i/4)}</text>`;}).join('')}${points.length>1?`<polyline points="${points.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#2563eb" stroke-width="2.5"/>`:''}${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#2563eb"><title>${esc(date(p.date))}: ${number(p.value)} ${esc(s.unit)}</title></circle>`).join('')}<text x="70" y="220" font-size="14" fill="#475569">${esc(date(s.points[0]!.date))}</text>${end!==start?`<text x="550" y="239" text-anchor="end" font-size="14" fill="#475569">${esc(date(s.points[s.points.length-1]!.date))}</text>`:''}</svg>`;
    return `<article class="azp-card"><h3>${esc(s.stage)} · ${esc(s.label)}${s.unit?' ('+esc(s.unit)+')':''}</h3>${s.origin?`<p>${esc(s.origin)}</p>`:''}${svg}<details><summary>Ver ${points.length} ${points.length===1?'medição':'medições'}</summary><table><thead><tr><th>Data do registo</th><th>${esc(s.label)} ${esc(s.unit)}</th></tr></thead><tbody>${s.points.map(p=>`<tr><td>${esc(date(p.date))}</td><td>${number(p.value)}</td></tr>`).join('')}</tbody></table></details></article>`;
  }).join('');
  return `<section id="${esc(sectionId)}" class="azp-charts" aria-label="Gráficos de produção"><style>.azp-charts{scroll-margin-top:100px;padding:48px 20px;background:#f8fafc;color:#172033;font-family:system-ui,sans-serif}.azp-wrap{max-width:1160px;margin:auto}.azp-charts h2,.azp-charts h3{font-family:system-ui,sans-serif}.azp-charts h2{font-size:28px;margin:0 0 12px}.azp-charts p{color:#64748b}.azp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:20px}.azp-card{min-width:0;background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px}.azp-card h3{font-size:17px;margin:0}.azp-card svg{width:100%;height:auto}.azp-card details{overflow:auto}.azp-card summary{cursor:pointer}.azp-card table{width:100%;font-size:13px;border-collapse:collapse}.azp-card th,.azp-card td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0}</style><div class="azp-wrap"><h2>Gráficos de produção${snapshot?.batch.code?' · '+esc(snapshot.batch.code):''}</h2><p>${snapshot?'Medições públicas das etapas deste lote, registadas durante a produção.':'Os gráficos serão preenchidos com os dados públicos do lote na publicação e no QR Code.'}</p>${cards?`<div class="azp-grid">${cards}</div>`:'<p>Sem medições numéricas publicadas para apresentar.</p>'}</div></section>`;
}
