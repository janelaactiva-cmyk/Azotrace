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
      escapeHtml(normalizeAssetPath(assetBaseUrl, getPath(parsed, path))),
  );

  let html = source.html;

  html = html.replace(/\{\{text:([^}]+)\}\}/g, (_, path: string) =>
    escapeHtml(getPath(parsed, path)),
  );

  html = html.replace(/\{\{asset:([^}]+)\}\}/g, (_, path: string) =>
    escapeHtml(normalizeAssetPath(assetBaseUrl, getPath(parsed, path))),
  );

  html = html.replace('{{raw:templateCss}}', css);
  html = html.replace(
    '{{raw:themeCss}}',
    buildThemeCss(args.templateId, parsed),
  );

  return html;
}
