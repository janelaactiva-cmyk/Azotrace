import {
  WebsiteTemplateContentSchema,
  type WebsiteTemplateContent,
  type WebsiteTemplateId,
} from '../schema';
import { WEBSITE_TEMPLATE_REGISTRY } from './registry';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || current === undefined) return '';

    if (Array.isArray(current)) {
      const index = Number(key);
      return Number.isFinite(index) ? current[index] : '';
    }

    if (typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }

    return '';
  }, source);
}

function normalizeAssetPath(assetBaseUrl: string, value: unknown): string {
  const raw = String(value ?? '').trim();

  if (!raw) return '';
  if (/^(?:https?:|data:|blob:|\/)/i.test(raw)) return raw;

  const root = assetBaseUrl.replace(/\/$/, '');
  const clean = raw.replace(/^\.\//, '').replace(/^\.\.\//, '');

  return root ? `${root}/${clean}` : clean;
}


function fixedGraphDataUrl(kind: 'humidity' | 'temperature'): string {
  const isHumidity = kind === 'humidity';
  const title = isHumidity ? 'Humidade da estufa' : 'Temperatura da estufa';
  const unit = isHumidity ? '%' : '°C';
  const stroke = isHumidity ? '#2f80ed' : '#e67e22';
  const fill = isHumidity ? '#e9f3ff' : '#fff2e7';
  const points = isHumidity
    ? '40,164 92,150 144,157 196,126 248,136 300,104 352,112 404,84 456,96 508,68 560,79 612,55'
    : '40,142 92,130 144,135 196,114 248,123 300,91 352,100 404,75 456,82 508,61 560,70 612,48';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="260" viewBox="0 0 680 260">
    <rect width="680" height="260" rx="14" fill="#ffffff"/>
    <text x="34" y="38" fill="#253043" font-family="Arial, sans-serif" font-size="18" font-weight="700">${title}</text>
    <text x="646" y="38" text-anchor="end" fill="#6b7280" font-family="Arial, sans-serif" font-size="12">zona fixa</text>
    <g stroke="#e7ebef" stroke-width="1">
      <line x1="40" y1="62" x2="640" y2="62"/><line x1="40" y1="102" x2="640" y2="102"/>
      <line x1="40" y1="142" x2="640" y2="142"/><line x1="40" y1="182" x2="640" y2="182"/>
      <line x1="40" y1="222" x2="640" y2="222"/>
    </g>
    <polygon points="40,222 ${points} 612,222" fill="${fill}" opacity="0.9"/>
    <polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
    <g fill="${stroke}">${points.split(' ').map((p) => { const [x,y] = p.split(','); return `<circle cx="${x}" cy="${y}" r="4"/>`; }).join('')}</g>
    <text x="40" y="246" fill="#88919d" font-family="Arial, sans-serif" font-size="12">08:00</text>
    <text x="310" y="246" fill="#88919d" font-family="Arial, sans-serif" font-size="12">12:00</text>
    <text x="608" y="246" text-anchor="end" fill="#88919d" font-family="Arial, sans-serif" font-size="12">18:00</text>
    <text x="640" y="222" text-anchor="end" fill="${stroke}" font-family="Arial, sans-serif" font-size="12" font-weight="700">${unit}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function resolveTemplateAsset(
  templateId: WebsiteTemplateId,
  parsed: WebsiteTemplateContent,
  assetBaseUrl: string,
  path: string,
): string {
  // Os gráficos são uma zona fixa dos templates: não dependem do formulário.
  if (path === 'features.images.0') return fixedGraphDataUrl('humidity');
  if (path === 'features.images.1') return fixedGraphDataUrl('temperature');

  return normalizeAssetPath(assetBaseUrl, getPath(parsed, path));
}

function buildFixedChartsSection(): string {
  return `
    <section class="azotrace-fixed-charts" aria-label="Gráficos de produção">
      <div class="container">
        <div class="azotrace-fixed-charts__heading">
          <h2>Gráficos de produção</h2>
          <p>Indicadores visuais fixos do template.</p>
        </div>
        <div class="azotrace-fixed-charts__grid">
          <img src="${fixedGraphDataUrl('humidity')}" alt="Gráfico fixo de humidade" />
          <img src="${fixedGraphDataUrl('temperature')}" alt="Gráfico fixo de temperatura" />
        </div>
      </div>
    </section>
    <style>
      .azotrace-fixed-charts { padding: 72px 0; background: #fff; }
      .azotrace-fixed-charts__heading { text-align: center; margin-bottom: 28px; }
      .azotrace-fixed-charts__heading h2 { margin: 0 0 8px; font-size: 32px; }
      .azotrace-fixed-charts__heading p { margin: 0; opacity: .68; }
      .azotrace-fixed-charts__grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 24px; }
      .azotrace-fixed-charts__grid img { display: block; width: 100%; height: auto; border-radius: 14px; box-shadow: 0 8px 30px rgba(15,23,42,.08); }
      @media (max-width: 768px) { .azotrace-fixed-charts__grid { grid-template-columns: 1fr; } }
    </style>`;
}

function buildThemeCss(
  templateId: WebsiteTemplateId,
  content: WebsiteTemplateContent,
): string {
  const t = content.theme;

  if (templateId === 'template-1') {
    return `:root {
      --primary-color: ${t.primaryColor};
      --secondary-color: ${t.secondaryColor};
      --section-bg-color: ${t.surfaceColor};
      --custom-btn-bg-color: ${t.accentColor};
      --custom-btn-bg-hover-color: ${t.primaryColor};
      --dark-color: ${t.headingColor};
      --p-color: ${t.textColor};
      --link-hover-color: ${t.accentColor};
    }`;
  }

  return `:root {
    --background-color: ${t.backgroundColor};
    --default-color: ${t.textColor};
    --heading-color: ${t.headingColor};
    --accent-color: ${t.accentColor};
    --surface-color: ${t.surfaceColor};
    --contrast-color: #ffffff;
    --nav-hover-color: ${t.accentColor};
    --nav-dropdown-hover-color: ${t.accentColor};
  }`;
}

export function renderWebsiteTemplateDocument(args: {
  templateId: WebsiteTemplateId;
  content: WebsiteTemplateContent;
  assetBaseUrl?: string;
}): string {
  const parsed = WebsiteTemplateContentSchema.parse(args.content);
  const source = WEBSITE_TEMPLATE_REGISTRY[args.templateId];
  const assetBaseUrl = args.assetBaseUrl ?? '';

  let css = source.css.replace(
    /\{\{asset:([^}]+)\}\}/g,
    (_, path: string) =>
      escapeHtml(resolveTemplateAsset(args.templateId, parsed, assetBaseUrl, path)),
  );

  let html = source.html;

  html = html.replace(/\{\{text:([^}]+)\}\}/g, (_, path: string) =>
    escapeHtml(getPath(parsed, path)),
  );

  html = html.replace(/\{\{asset:([^}]+)\}\}/g, (_, path: string) =>
    escapeHtml(resolveTemplateAsset(args.templateId, parsed, assetBaseUrl, path)),
  );

  html = html.replace('{{raw:templateCss}}', css);
  html = html.replace(
    '{{raw:themeCss}}',
    buildThemeCss(args.templateId, parsed),
  );

  if (args.templateId === 'template-3') {
    const aboutEnd = '</section><!-- /About Section -->';
    html = html.replace(aboutEnd, `${aboutEnd}${buildFixedChartsSection()}`);
  }

  return html;
}
