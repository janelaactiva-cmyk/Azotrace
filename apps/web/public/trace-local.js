(() => {
  const ids = window.__AZOTRACE_TRACE_IDS__ || {};
  const businessId = String(ids.businessId || '');
  const batchId = String(ids.batchId || '');
  const root = document.getElementById('azotrace-trace-root');
  if (!root) return;

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const date = (value) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('pt-PT');
  };

  const read = (key) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const snapshot = read(`azotrace:public-trace:${businessId}:${batchId}`);
  const website = read(`azotrace:business-website:${businessId}`);

  const styles = `
    *{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f8f7;color:#17221d}
    .hero{min-height:42vh;display:grid;place-items:center;padding:64px 20px;background:linear-gradient(135deg,var(--accent,#47B37D),#17372a);color:white;background-size:cover;background-position:center;position:relative}
    .hero:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,25,18,.72),rgba(8,25,18,.28))}.hero-inner{position:relative;z-index:1;width:min(1080px,100%)}
    .hero .kicker{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;opacity:.9}.hero h1{font-size:clamp(34px,6vw,70px);line-height:1.02;margin:10px 0 14px;max-width:850px}.hero p{font-size:clamp(16px,2vw,21px);line-height:1.65;max-width:760px;margin:0;opacity:.92}
    .wrap{width:min(1080px,calc(100% - 32px));margin:0 auto}.section{padding:56px 0}.section h2{font-size:clamp(28px,4vw,44px);margin:0 0 10px}.lead{color:#647169;line-height:1.7;max-width:780px}
    .institutional{background:#fff}.institutional-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}.panel{border:1px solid #e2e8e4;border-radius:18px;background:#fff;padding:22px}.panel h3{margin:0 0 10px;font-size:20px}.panel p{color:#68756e;line-height:1.7;margin:0}.production-list{display:grid;gap:10px}.production-item{padding:14px;border-radius:12px;background:#f8faf9;border:1px solid #edf1ee}.production-item strong{display:block;margin-bottom:4px}.production-item span{color:#6e7b74;font-size:14px;line-height:1.5}
    .trace{--trace:var(--accent,#47B37D);background:#f7faf9}.trace-head{margin-bottom:26px}.trace-head .kicker{color:var(--trace);font-weight:800;text-transform:uppercase;letter-spacing:.12em;font-size:12px}.trace-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:26px 0}.trace-card{background:#fff;border:1px solid #e1e9e4;border-radius:16px;padding:18px}.trace-card span,.value span,.quality span{display:block;color:#718078;font-size:12px;margin-bottom:5px}.trace-card strong{font-size:18px}
    .subsection{margin-top:30px}.subsection h3{font-size:22px;margin:0 0 14px}.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{background:#fff;border:1px solid #dfe7e2;padding:8px 12px;border-radius:999px}.records{display:grid;gap:12px}.record{background:#fff;border:1px solid #e1e9e4;border-radius:16px;padding:18px}.record-head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #edf1ee;padding-bottom:10px;margin-bottom:10px}.record-head time{color:#7a8780;font-size:13px}.values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.value{padding:10px;border-radius:10px;background:#f8faf9}.quality-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.quality{background:#fff;border:1px solid #e1e9e4;border-radius:14px;padding:16px}.quality small{display:block;color:var(--trace);margin-top:5px}.local{margin-top:30px;padding:12px 14px;border-radius:10px;background:#fff7dd;color:#735c12;font-size:12px}.missing{min-height:100vh;display:grid;place-items:center;padding:24px}.missing-box{max-width:600px;background:#fff;border:1px solid #e3e8e5;border-radius:18px;padding:28px}.missing-box h1{margin-top:0}.missing-box p{line-height:1.65;color:#5f6b64}.footer{padding:28px 20px;background:#14241c;color:#dce7e1;text-align:center;font-size:13px}
    @media(max-width:760px){.institutional-grid,.trace-grid,.quality-grid,.values{grid-template-columns:1fr}.hero{min-height:36vh}.section{padding:40px 0}}
  `;

  document.head.insertAdjacentHTML('beforeend', `<style>${styles}</style>`);

  if (!snapshot) {
    root.innerHTML = `
      <main class="missing"><div class="missing-box">
        <h1>Página do lote não disponível neste browser</h1>
        <p>Esta versão está em modo local e não utiliza base de dados. Publica primeiro este lote em <strong>Rastreabilidade → Publicação e QR</strong> no mesmo browser.</p>
        <p>Um QR aberto noutro telemóvel só poderá mostrar estes dados quando ligares um armazenamento partilhado/backend.</p>
      </div></main>`;
    return;
  }

  const publishedWebsite = website && website.status === 'published' ? website : null;
  const content = publishedWebsite?.content || {};
  const theme = content.theme || {};
  const accent = theme.accentColor || theme.primaryColor || snapshot.business?.accentColor || '#47B37D';
  document.documentElement.style.setProperty('--accent', accent);

  const hero = content.hero || {};
  const heroImage = hero.image || hero.slides?.[0]?.image || snapshot.product?.imageUrl || '';
  const heroTitle = hero.title || hero.slides?.[0]?.title || snapshot.product?.name || snapshot.config?.headline || 'Rastreabilidade do produto';
  const heroSubtitle = hero.subtitle || hero.slides?.[0]?.subtitle || snapshot.config?.intro || '';
  const heroStyle = heroImage
    ? ` style="background-image:linear-gradient(90deg,rgba(8,25,18,.35),rgba(8,25,18,.1)),url('${esc(heroImage)}')"`
    : '';

  const history = content.history || {};
  const production = content.production || {};
  const productionItems = Array.isArray(production.items) ? production.items : [];
  const institutional = publishedWebsite
    ? `<section class="section institutional"><div class="wrap"><div class="institutional-grid">
        <article class="panel"><h3>${esc(history.title || history.heading || 'A nossa história')}</h3><p>${esc(history.text || snapshot.product?.description || '')}</p></article>
        <article class="panel"><h3>${esc(production.title || 'Como produzimos')}</h3><div class="production-list">${productionItems.slice(0, 6).map((item) => `<div class="production-item"><strong>${esc(item.title)}</strong><span>${esc(item.description)}</span></div>`).join('') || '<p>Consulte abaixo os dados reais deste lote.</p>'}</div></article>
      </div></div></section>`
    : '';

  const origins = (snapshot.originUnits || [])
    .map((unit) => `<span class="chip">${esc(unit.name || unit.code)}</span>`)
    .join('');
  const records = (snapshot.records || [])
    .map((record) => {
      const values = (record.values || [])
        .map((item) => `<div class="value"><span>${esc(item.label)}</span><strong>${esc(item.value)}${item.unit ? ` ${esc(item.unit)}` : ''}</strong></div>`)
        .join('');
      return `<article class="record"><div class="record-head"><strong>${esc(record.stage)}</strong><time>${esc(date(record.createdAt))}</time></div>${values ? `<div class="values">${values}</div>` : ''}</article>`;
    })
    .join('');
  const quality = (snapshot.quality || [])
    .map((item) => `<div class="quality"><span>${esc(item.parameter)}</span><strong>${esc(item.value)}${item.unit ? ` ${esc(item.unit)}` : ''}</strong><small>${esc(item.status)}</small></div>`)
    .join('');
  const brand = content.footer?.brand || snapshot.business?.name || 'Azotrace';

  root.innerHTML = `
    <header class="hero"${heroStyle}><div class="hero-inner"><div class="kicker">${esc(snapshot.business?.name || 'Azotrace')}</div><h1>${esc(heroTitle)}</h1><p>${esc(heroSubtitle)}</p></div></header>
    ${institutional}
    <section class="section trace"><div class="wrap">
      <div class="trace-head"><div class="kicker">Rastreabilidade Azotrace</div><h2>${esc(snapshot.config?.headline || 'Dados deste lote')}</h2><p class="lead">${esc(snapshot.config?.intro || '')}</p></div>
      <div class="trace-grid">
        ${snapshot.business?.name ? `<div class="trace-card"><span>Produtor</span><strong>${esc(snapshot.business.name)}</strong></div>` : ''}
        ${snapshot.product?.name ? `<div class="trace-card"><span>Produto</span><strong>${esc(snapshot.product.name)}</strong></div>` : ''}
        ${snapshot.batch?.code ? `<div class="trace-card"><span>Lote</span><strong>${esc(snapshot.batch.code)}</strong></div>` : ''}
        ${snapshot.business?.location ? `<div class="trace-card"><span>Origem</span><strong>${esc(snapshot.business.location)}</strong></div>` : ''}
        ${snapshot.batch?.startDate ? `<div class="trace-card"><span>Início do lote</span><strong>${esc(date(snapshot.batch.startDate))}</strong></div>` : ''}
      </div>
      ${snapshot.product?.description ? `<div class="subsection"><h3>Produto</h3><p class="lead">${esc(snapshot.product.description)}</p></div>` : ''}
      ${origins ? `<div class="subsection"><h3>Unidades de origem</h3><div class="chips">${origins}</div></div>` : ''}
      ${records ? `<div class="subsection"><h3>Histórico de produção</h3><div class="records">${records}</div></div>` : ''}
      ${quality ? `<div class="subsection"><h3>Controlo de qualidade</h3><div class="quality-grid">${quality}</div></div>` : ''}
      <div class="local">Demonstração em modo local: estes dados existem apenas neste browser enquanto não houver base de dados.</div>
    </div></section>
    <footer class="footer">${esc(brand)} · Rastreabilidade com Azotrace</footer>`;
})();
