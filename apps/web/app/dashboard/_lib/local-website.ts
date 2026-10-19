import {
  SaveWebsiteTemplateSchema,
  type SaveWebsiteTemplateInput,
  type WebsiteTemplateContent,
  type WebsiteTemplateId,
} from '../administracao/negocios/template-website/_lib/schema';

export type LocalWebsiteRecord = {
  businessId: string;
  templateId: WebsiteTemplateId;
  assetBaseUrl: string;
  content: WebsiteTemplateContent;
  status: 'draft' | 'published';
  updatedAt: string;
};

const PREFIX = 'azotrace:website-local:';
export const LOCAL_WEBSITE_UPDATED_EVENT = 'azotrace:website-local-updated';

export function localWebsiteStorageKey(businessId: string) {
  return `${PREFIX}${businessId}`;
}

export function loadLocalWebsite(businessId: string): LocalWebsiteRecord | null {
  if (typeof window === 'undefined' || !businessId) return null;
  const raw = window.localStorage.getItem(localWebsiteStorageKey(businessId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const validated = SaveWebsiteTemplateSchema.safeParse(parsed);
    if (!validated.success) return null;
    return {
      ...validated.data,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveLocalWebsite(value: SaveWebsiteTemplateInput): LocalWebsiteRecord {
  if (typeof window === 'undefined') throw new Error('O Website só pode ser guardado no browser.');
  const parsed = SaveWebsiteTemplateSchema.parse(value);
  const record: LocalWebsiteRecord = {
    ...parsed,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(localWebsiteStorageKey(parsed.businessId), JSON.stringify(record));
  } catch (error) {
    throw new Error('Não foi possível guardar o Website no browser. As imagens podem estar demasiado grandes para o armazenamento local.');
  }
  window.dispatchEvent(new CustomEvent(LOCAL_WEBSITE_UPDATED_EVENT, { detail: { businessId: parsed.businessId } }));
  return record;
}

export function getLocalWebsiteStatus(businessId: string): 'published' | 'draft' | 'missing' {
  const website = loadLocalWebsite(businessId);
  if (!website) return 'missing';
  return website.status === 'published' ? 'published' : 'draft';
}
