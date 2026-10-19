'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams } from 'next/navigation';

type TraceValue = {
  key: string;
  label: string;
  value: unknown;
  unit?: string;
  fieldType?: string;
};

type TraceRecord = {
  id: string;
  createdAt: string;
  stage: string;
  units: Array<{ code: string; name: string }>;
  values: TraceValue[];
};

type TraceSnapshot = {
  version: 1;
  generatedAt: string;
  business: {
    id: string;
    name?: string;
    location?: string;
    logoUrl?: string;
    accentColor?: string;
  };
  product: {
    id: string;
    name?: string;
    description?: string;
    imageUrl?: string;
  };
  batch: {
    id: string;
    code?: string;
    startDate?: string;
    status?: string;
  };
  originUnits?: Array<{ id: string; code: string; name: string }>;
  records?: TraceRecord[];
  quality?: Array<{
    id: string;
    parameter: string;
    value: string;
    unit?: string;
    status: string;
    createdAt: string;
  }>;
};

type WebsiteContent = {
  seo?: { title?: string; description?: string };
  navigation?: Record<string, string>;
  hero?: { title?: string; subtitle?: string; image?: string };
  history?: { title?: string; subtitle?: string; heading?: string; text?: string; image?: string };
  production?: {
    title?: string;
    subtitle?: string;
    items?: Array<{ title?: string; description?: string; image?: string }>;
  };
  gallery?: { title?: string; subtitle?: string; images?: string[] };
  contact?: {
    addressLine1?: string;
    addressLine2?: string;
    phone?: string;
    email?: string;
    hoursWeek?: string;
    hoursSunday?: string;
  };
  footer?: { brand?: string; copyright?: string };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    headingColor?: string;
    surfaceColor?: string;
    accentColor?: string;
  };
};

type WebsiteState = {
  templateId?: string;
  content?: WebsiteContent;
  assetBaseUrl?: string;
  status?: 'draft' | 'published';
};

function textValue(value: unknown) {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  if (value == null) return '';
  return String(value);
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) return '';
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

function resolveAsset(value: string | undefined, base: string | undefined) {
  if (!value) return '';
  if (/^(data:|blob:|https?:\/\/|\/)/i.test(value)) return value;
  if (!base) return `/${value.replace(/^\/+/, '')}`;
  return `${base.replace(/\/$/, '')}/${value.replace(/^\/+/, '')}`;
}

export default function PublicTracePage() {
  const params = useParams<{ businessId: string; batchId: string }>();
  const businessId = Array.isArray(params?.businessId) ? params.businessId[0] : params?.businessId;
  const batchId = Array.isArray(params?.batchId) ? params.batchId[0] : params?.batchId;

  const [snapshot, setSnapshot] = useState<TraceSnapshot | null>(null);
  const [website, setWebsite] = useState<WebsiteState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId || !batchId) return;

    try {
      const traceRaw = window.localStorage.getItem(
        `azotrace:public-trace:${businessId}:${batchId}`,
      );
      const websiteRaw = window.localStorage.getItem(
        `azotrace:business-website:${businessId}`,
      );

      if (traceRaw) {
        const parsed = JSON.parse(traceRaw) as TraceSnapshot;
        if (
          parsed?.version === 1 &&
          parsed.business?.id === businessId &&
          parsed.batch?.id === batchId
        ) {
          setSnapshot(parsed);
        }
      }

      if (websiteRaw) {
        const parsed = JSON.parse(websiteRaw) as WebsiteState;
        if (parsed?.status === 'published') setWebsite(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar rastreabilidade local:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId, batchId]);

  const content = website?.content;
  const theme = content?.theme;
  const accent =
    theme?.primaryColor || snapshot?.business.accentColor || '#2f855a';
  const secondary = theme?.secondaryColor || '#17324d';
  const background = theme?.backgroundColor || '#f7f9fb';
  const surface = theme?.surfaceColor || '#ffffff';
  const text = theme?.textColor || '#53606d';
  const heading = theme?.headingColor || '#172331';
  const heroImage = resolveAsset(
    content?.hero?.image || snapshot?.product.imageUrl,
    website?.assetBaseUrl,
  );

  const title =
    content?.hero?.title || snapshot?.product.name || snapshot?.business.name || 'Rastreabilidade';
  const subtitle =
    content?.hero?.subtitle || snapshot?.product.description || 'Origem e percurso do produto';

  const records = snapshot?.records ?? [];
  const origins = snapshot?.originUnits ?? [];
  const quality = snapshot?.quality ?? [];

  const navItems = useMemo(() => {
    const nav = content?.navigation;
    return [
      ['trace', nav?.features || 'Rastreabilidade'],
      content?.history?.text ? ['history', nav?.history || 'História'] : null,
      content?.production?.items?.length ? ['production', nav?.production || 'Produção'] : null,
      content?.gallery?.images?.length ? ['gallery', nav?.gallery || 'Galeria'] : null,
      content?.contact ? ['contact', nav?.contact || 'Contacto'] : null,
    ].filter(Boolean) as Array<[string, string]>;
  }, [content]);

  if (loading) {
    return (
      <main className="trace-center">
        <div className="trace-loader" />
        <p>A carregar rastreabilidade…</p>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="trace-center">
        <div className="trace-empty">
          <div className="trace-mark">A</div>
          <h1>Página ainda não publicada neste browser</h1>
          <p>
            Este projeto está em modo local, sem base de dados. Publica primeiro este lote em
            <strong> Rastreabilidade → Publicação e QR</strong> no mesmo browser.
          </p>
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main
      className="site"
      style={
        {
          '--accent': accent,
          '--secondary': secondary,
          '--background': background,
          '--surface': surface,
          '--text': text,
          '--heading': heading,
        } as CSSProperties
      }
    >
      <header className="topbar">
        <a className="brand" href="#top">
          {snapshot.business.logoUrl ? (
            <img src={snapshot.business.logoUrl} alt="" />
          ) : (
            <span className="brand-mark">A</span>
          )}
          <span>{snapshot.business.name || content?.footer?.brand || 'Azotrace'}</span>
        </a>
        <nav>
          {navItems.map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
        </nav>
      </header>

      <section
        id="top"
        className={`hero ${heroImage ? 'hero-image' : ''}`}
        style={heroImage ? { backgroundImage: `linear-gradient(90deg, rgba(8,24,39,.76), rgba(8,24,39,.22)), url(${JSON.stringify(heroImage).slice(1, -1)})` } : undefined}
      >
        <div className="hero-content">
          <span className="eyebrow">Produto com rastreabilidade Azotrace</span>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
          {snapshot.batch.code ? (
            <a className="hero-button" href="#trace">Ver lote {snapshot.batch.code}</a>
          ) : null}
        </div>
      </section>

      <section id="trace" className="section trace-section">
        <div className="section-heading">
          <span className="eyebrow">Rastreabilidade</span>
          <h2>Conheça a origem deste produto</h2>
          <p>Informação selecionada e publicada pelo produtor para este lote.</p>
        </div>

        <div className="summary-grid">
          {snapshot.product.name ? (
            <article className="summary-card"><small>Produto</small><strong>{snapshot.product.name}</strong></article>
          ) : null}
          {snapshot.batch.code ? (
            <article className="summary-card"><small>Lote</small><strong>{snapshot.batch.code}</strong></article>
          ) : null}
          {snapshot.batch.startDate ? (
            <article className="summary-card"><small>Data do lote</small><strong>{formatDate(snapshot.batch.startDate)}</strong></article>
          ) : null}
          {snapshot.business.location ? (
            <article className="summary-card"><small>Origem</small><strong>{snapshot.business.location}</strong></article>
          ) : null}
        </div>

        {snapshot.product.description ? (
          <div className="panel intro-panel">
            <h3>Sobre o produto</h3>
            <p>{snapshot.product.description}</p>
          </div>
        ) : null}

        {origins.length ? (
          <div className="panel">
            <div className="panel-title"><span className="icon">⌂</span><div><h3>Unidades de origem</h3><p>Origem associada a este lote.</p></div></div>
            <div className="chips">
              {origins.map((unit) => (
                <span className="chip" key={unit.id}>{unit.name}{unit.code ? ` · ${unit.code}` : ''}</span>
              ))}
            </div>
          </div>
        ) : null}

        {records.length ? (
          <div className="panel">
            <div className="panel-title"><span className="icon">✓</span><div><h3>Histórico de produção</h3><p>Etapas publicadas pelo produtor.</p></div></div>
            <div className="timeline">
              {records.map((record, index) => (
                <article className="timeline-item" key={record.id}>
                  <span className="timeline-dot">{index + 1}</span>
                  <div className="timeline-body">
                    <div className="timeline-head">
                      <h4>{record.stage}</h4>
                      <time>{formatDateTime(record.createdAt)}</time>
                    </div>
                    {record.units?.length ? (
                      <p className="units">{record.units.map((unit) => unit.name || unit.code).join(' · ')}</p>
                    ) : null}
                    {record.values?.length ? (
                      <dl className="values-grid">
                        {record.values.map((item) => (
                          <div key={`${record.id}-${item.key}`}>
                            <dt>{item.label}</dt>
                            <dd>{textValue(item.value)}{item.unit ? ` ${item.unit}` : ''}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {quality.length ? (
          <div className="panel">
            <div className="panel-title"><span className="icon">★</span><div><h3>Controlo de qualidade</h3><p>Resultados escolhidos para publicação.</p></div></div>
            <div className="quality-grid">
              {quality.map((item) => (
                <article className="quality-card" key={item.id}>
                  <small>{item.parameter}</small>
                  <strong>{item.value}{item.unit ? ` ${item.unit}` : ''}</strong>
                  <span>{item.status}</span>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {content?.history?.text ? (
        <section id="history" className="section alternate">
          <div className="two-column">
            <div>
              <span className="eyebrow">{content.history.subtitle || 'A nossa história'}</span>
              <h2>{content.history.heading || content.history.title || 'História'}</h2>
              <p>{content.history.text}</p>
            </div>
            {content.history.image ? (
              <img className="section-image" src={resolveAsset(content.history.image, website?.assetBaseUrl)} alt="" />
            ) : null}
          </div>
        </section>
      ) : null}

      {content?.production?.items?.length ? (
        <section id="production" className="section">
          <div className="section-heading">
            <span className="eyebrow">{content.production.subtitle || 'Como produzimos'}</span>
            <h2>{content.production.title || 'Produção'}</h2>
          </div>
          <div className="production-grid">
            {content.production.items.map((item, index) => (
              <article className="production-card" key={`${item.title}-${index}`}>
                {item.image ? <img src={resolveAsset(item.image, website?.assetBaseUrl)} alt="" /> : null}
                <div><h3>{item.title}</h3><p>{item.description}</p></div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {content?.gallery?.images?.length ? (
        <section id="gallery" className="section alternate">
          <div className="section-heading">
            <span className="eyebrow">{content.gallery.subtitle || 'Galeria'}</span>
            <h2>{content.gallery.title || 'Galeria'}</h2>
          </div>
          <div className="gallery-grid">
            {content.gallery.images.map((image, index) => (
              <img key={`${image}-${index}`} src={resolveAsset(image, website?.assetBaseUrl)} alt="" />
            ))}
          </div>
        </section>
      ) : null}

      {content?.contact ? (
        <section id="contact" className="section contact-section">
          <div>
            <span className="eyebrow">Contacto</span>
            <h2>Fale com o produtor</h2>
          </div>
          <div className="contact-grid">
            {(content.contact.addressLine1 || content.contact.addressLine2) ? (
              <div><small>Morada</small><strong>{[content.contact.addressLine1, content.contact.addressLine2].filter(Boolean).join(', ')}</strong></div>
            ) : null}
            {content.contact.phone ? <div><small>Telefone</small><strong>{content.contact.phone}</strong></div> : null}
            {content.contact.email ? <div><small>Email</small><strong>{content.contact.email}</strong></div> : null}
          </div>
        </section>
      ) : null}

      <footer>
        <strong>{content?.footer?.brand || snapshot.business.name || 'Azotrace'}</strong>
        <span>{content?.footer?.copyright || `Rastreabilidade publicada em ${formatDate(snapshot.generatedAt)}`}</span>
      </footer>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  :global(*){box-sizing:border-box} :global(html){scroll-behavior:smooth} :global(body){margin:0}
  .site{min-height:100vh;background:var(--background);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px clamp(18px,4vw,64px);background:rgba(255,255,255,.94);backdrop-filter:blur(16px);border-bottom:1px solid rgba(15,23,42,.08)}
  .brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--heading);font-weight:800}.brand img{width:38px;height:38px;object-fit:contain;border-radius:9px}.brand-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:var(--accent);color:#fff}
  nav{display:flex;gap:20px;flex-wrap:wrap}nav a{font-size:14px;text-decoration:none;color:var(--text);font-weight:600}nav a:hover{color:var(--accent)}
  .hero{min-height:440px;display:flex;align-items:center;padding:72px clamp(20px,7vw,110px);background:linear-gradient(135deg,var(--secondary),var(--accent));color:#fff;background-position:center;background-size:cover}.hero-content{max-width:720px}.hero h1{font-size:clamp(38px,6vw,72px);line-height:1.02;margin:12px 0 18px;color:#fff}.hero p{max-width:650px;font-size:clamp(17px,2vw,22px);line-height:1.65;margin:0 0 28px;color:rgba(255,255,255,.9)}
  .eyebrow{display:inline-block;text-transform:uppercase;letter-spacing:.13em;font-size:12px;font-weight:800;color:var(--accent)}.hero .eyebrow{color:#fff}.hero-button{display:inline-flex;padding:13px 18px;border-radius:12px;background:#fff;color:var(--secondary);font-weight:800;text-decoration:none}
  .section{padding:70px clamp(18px,6vw,92px);max-width:1400px;margin:0 auto}.alternate{max-width:none;background:color-mix(in srgb,var(--surface) 88%,var(--accent) 12%)}.section-heading{max-width:760px;margin-bottom:30px}.section-heading h2,.two-column h2,.contact-section h2{font-size:clamp(29px,4vw,46px);line-height:1.12;margin:8px 0 12px;color:var(--heading)}.section-heading p,.two-column p{font-size:17px;line-height:1.75}
  .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}.summary-card,.panel,.quality-card,.production-card{background:var(--surface);border:1px solid rgba(15,23,42,.08);box-shadow:0 14px 40px rgba(15,23,42,.06)}.summary-card{padding:20px;border-radius:16px;border-top:4px solid var(--accent)}.summary-card small,.quality-card small,.contact-grid small{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--text);margin-bottom:7px}.summary-card strong{display:block;color:var(--heading);font-size:18px}
  .panel{padding:24px;border-radius:18px;margin-top:16px}.panel h3{margin:0 0 5px;color:var(--heading)}.panel p{margin:0;line-height:1.7}.panel-title{display:flex;align-items:flex-start;gap:12px;margin-bottom:18px}.icon{display:grid;place-items:center;width:38px;height:38px;flex:0 0 auto;border-radius:11px;background:color-mix(in srgb,var(--accent) 14%,white);color:var(--accent);font-weight:900}.chips{display:flex;flex-wrap:wrap;gap:9px}.chip{padding:9px 12px;border-radius:999px;background:color-mix(in srgb,var(--accent) 10%,white);color:var(--heading);font-size:14px;font-weight:650;border:1px solid color-mix(in srgb,var(--accent) 24%,white)}
  .timeline{display:grid;gap:0}.timeline-item{position:relative;display:grid;grid-template-columns:42px 1fr;gap:14px;padding-bottom:24px}.timeline-item:not(:last-child):before{content:"";position:absolute;left:20px;top:38px;bottom:0;width:2px;background:color-mix(in srgb,var(--accent) 25%,white)}.timeline-dot{z-index:1;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--accent);color:#fff;font-weight:800}.timeline-body{padding:4px 0}.timeline-head{display:flex;justify-content:space-between;gap:15px}.timeline-head h4{margin:0;color:var(--heading);font-size:17px}.timeline-head time{font-size:13px;color:var(--text)}.units{font-size:13px;margin:5px 0 12px!important}.values-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:0}.values-grid div{padding:11px;border-radius:11px;background:rgba(15,23,42,.035)}.values-grid dt{font-size:12px;color:var(--text);margin-bottom:4px}.values-grid dd{margin:0;font-weight:750;color:var(--heading)}
  .quality-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.quality-card{padding:17px;border-radius:14px}.quality-card strong{display:block;font-size:20px;color:var(--heading);margin-bottom:6px}.quality-card span{font-size:12px;color:var(--accent);font-weight:700}
  .two-column{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:center;max-width:1220px;margin:auto}.section-image{width:100%;max-height:430px;object-fit:cover;border-radius:22px;box-shadow:0 18px 50px rgba(15,23,42,.12)}
  .production-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.production-card{border-radius:18px;overflow:hidden}.production-card img{width:100%;height:190px;object-fit:cover}.production-card div{padding:18px}.production-card h3{margin:0 0 8px;color:var(--heading)}.production-card p{line-height:1.6;margin:0}
  .gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.gallery-grid img{width:100%;height:260px;object-fit:cover;border-radius:16px}
  .contact-section{display:grid;grid-template-columns:.8fr 1.2fr;gap:40px}.contact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.contact-grid div{padding:17px;border-radius:14px;background:var(--surface);border:1px solid rgba(15,23,42,.08)}.contact-grid strong{display:block;color:var(--heading)}
  footer{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:25px clamp(18px,6vw,92px);background:var(--secondary);color:#fff}footer span{opacity:.75;font-size:13px}
  .trace-center{min-height:100vh;display:grid;place-items:center;align-content:center;gap:15px;padding:30px;background:#f6f8fa;color:#475569;font-family:Inter,system-ui,sans-serif;text-align:center}.trace-loader{width:38px;height:38px;border:4px solid #dbe4ea;border-top-color:#2f855a;border-radius:50%;animation:spin .8s linear infinite}.trace-empty{max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;box-shadow:0 18px 60px rgba(15,23,42,.08)}.trace-empty h1{color:#172331;font-size:24px}.trace-empty p{line-height:1.7}.trace-mark{display:grid;place-items:center;width:48px;height:48px;margin:auto;border-radius:14px;background:#2f855a;color:#fff;font-weight:900;font-size:22px}@keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:900px){nav{display:none}.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.values-grid,.quality-grid,.production-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.two-column,.contact-section{grid-template-columns:1fr}.hero{min-height:370px}.section{padding:50px 18px}}
  @media(max-width:600px){.summary-grid,.values-grid,.quality-grid,.production-grid,.gallery-grid,.contact-grid{grid-template-columns:1fr}.topbar{padding:12px 16px}.hero{padding:58px 18px}.timeline-head{display:block}.timeline-head time{display:block;margin-top:5px}.gallery-grid img{height:220px}footer{display:block}footer span{display:block;margin-top:8px}}
`;
