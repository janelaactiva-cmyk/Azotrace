import type { FieldDefinition } from './catalog';

export type LocalBusiness = {
  id: string;
  name: string;
  kind: string;
  location: string;
  logoUrl?: string;
  accentColor: string;
};

export type LocalBusinessSummary = LocalBusiness & {
  completed: boolean;
  productTypeName?: string;
  unitLabel?: string;
  unitsCount: number;
  batchesCount: number;
  recordsCount: number;
};

export type LocalProductType = {
  id: string;
  name: string;
  presetId: string;
  unitLabel: string;
  unitPrefix: string;
};

export type LocalProductionUnit = {
  id: string;
  productTypeId: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
};

export type LocalProductionStage = {
  id: string;
  productTypeId: string;
  name: string;
  position: number;
};

export type LocalProduct = {
  id: string;
  productTypeId: string;
  name: string;
  sku?: string;
  description?: string;
  imageUrl?: string;
};

export type LocalBatch = {
  id: string;
  productId: string;
  code: string;
  startDate: string;
  status: 'active' | 'finished';
  unitIds: string[];
};

export type LocalQualityRecord = {
  id: string;
  productId: string;
  batchId: string;
  parameter: string;
  value: string;
  unit?: string;
  status: 'approved' | 'rejected' | 'pending';
  notes?: string;
  createdAt: string;
};

export type LocalImportHistory = {
  id: string;
  fileName: string;
  recordCount: number;
  status: 'completed' | 'partial' | 'failed';
  createdAt: string;
};

export type LocalQrCode = {
  id: string;
  productId: string;
  batchId: string;
  format: 'product' | 'box' | 'small' | 'a4';
  publicUrl: string;
  createdAt: string;
};

export type LocalProductionRecord = {
  id: string;
  productId: string;
  batchId: string;
  stageId?: string;
  productionUnitIds: string[];
  data: Record<string, unknown>;
  createdAt: string;
};

/**
 * Controla o que sai do backoffice para a página pública aberta pelo QR.
 * Os campos dinâmicos continuam a existir em `fields`; aqui guardamos apenas
 * as chaves que o produtor decidiu efetivamente publicar no website.
 */
export type LocalPublicSiteConfig = {
  headline: string;
  intro: string;
  showBusinessName: boolean;
  showBusinessLocation: boolean;
  showProductName: boolean;
  showProductDescription: boolean;
  showBatchCode: boolean;
  showBatchStartDate: boolean;
  showOriginUnits: boolean;
  showTimeline: boolean;
  showQuality: boolean;
  fieldKeys: string[];
};

export type LocalPublicationState = {
  batchId: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  updatedAt: string;
};

export type ProducerLocalState = {
  version: 4;
  business: LocalBusiness;
  onboardingStep: number;
  completed: boolean;
  productType?: LocalProductType;
  fields: FieldDefinition[];
  units: LocalProductionUnit[];
  stages: LocalProductionStage[];
  products: LocalProduct[];
  batches: LocalBatch[];
  records: LocalProductionRecord[];
  qualityRecords: LocalQualityRecord[];
  imports: LocalImportHistory[];
  qrCodes: LocalQrCode[];
  publicSite: LocalPublicSiteConfig;
  publications: LocalPublicationState[];
};

const CURRENT_BUSINESS_KEY = 'azotrace:producer-local:current-business';
const BUSINESS_REGISTRY_KEY = 'azotrace:producer-local:businesses';
const STATE_PREFIX = 'azotrace:producer-local:state:';
export const BUSINESS_CHANGED_EVENT = 'azotrace:producer-business-changed';
export const BUSINESSES_UPDATED_EVENT = 'azotrace:producer-businesses-updated';

export const DEFAULT_BUSINESS_COLORS = [
  '#47B37D',
  '#D99A24',
  '#7C3AED',
  '#DC5A5A',
  '#3182CE',
  '#0F9D8A',
  '#C056A1',
];

export function defaultPublicSiteConfig(fields: FieldDefinition[] = []): LocalPublicSiteConfig {
  return {
    headline: 'Conheça a origem deste produto',
    intro: 'Consulte os dados de rastreabilidade selecionados pelo produtor para este lote.',
    showBusinessName: true,
    showBusinessLocation: true,
    showProductName: true,
    showProductDescription: true,
    showBatchCode: true,
    showBatchStartDate: true,
    showOriginUnits: true,
    showTimeline: true,
    showQuality: true,
    fieldKeys: fields.filter((field) => field.public).map((field) => field.key),
  };
}

export function makeLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getCurrentLocalBusinessId() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(CURRENT_BUSINESS_KEY) ?? '';
}

export function setCurrentLocalBusinessId(businessId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CURRENT_BUSINESS_KEY, businessId);
  window.dispatchEvent(new CustomEvent(BUSINESS_CHANGED_EVENT, { detail: { businessId } }));
}

function stateKey(businessId: string) {
  return `${STATE_PREFIX}${businessId}`;
}

export function normalizeProducerState(parsed: any): ProducerLocalState | null {
  if (!parsed?.business?.id) return null;

  const fields = parsed.fields ?? [];
  const fallbackPublicSite = defaultPublicSiteConfig(fields);
  const publicSite = {
    ...fallbackPublicSite,
    ...(parsed.publicSite ?? {}),
    fieldKeys: Array.isArray(parsed.publicSite?.fieldKeys)
      ? parsed.publicSite.fieldKeys
      : fallbackPublicSite.fieldKeys,
  };

  return {
    ...parsed,
    version: 4,
    business: {
      ...parsed.business,
      accentColor: parsed.business.accentColor || DEFAULT_BUSINESS_COLORS[0],
    },
    fields,
    units: parsed.units ?? [],
    stages: parsed.stages ?? [],
    products: parsed.products ?? [],
    batches: parsed.batches ?? [],
    records: parsed.records ?? [],
    qualityRecords: parsed.qualityRecords ?? [],
    imports: parsed.imports ?? [],
    qrCodes: parsed.qrCodes ?? [],
    publicSite,
    publications: parsed.publications ?? [],
  } as ProducerLocalState;
}

export function loadProducerState(preferredBusinessId?: string | null): ProducerLocalState | null {
  if (typeof window === 'undefined') return null;
  const businessId = preferredBusinessId || getCurrentLocalBusinessId();
  if (!businessId) return null;
  const raw = window.localStorage.getItem(stateKey(businessId));
  if (!raw) return null;
  try {
    return normalizeProducerState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function summaryFromState(state: ProducerLocalState): LocalBusinessSummary {
  return {
    ...state.business,
    completed: state.completed,
    productTypeName: state.productType?.name,
    unitLabel: state.productType?.unitLabel,
    unitsCount: state.units.length,
    batchesCount: state.batches.length,
    recordsCount: state.records.length,
  };
}

export function listLocalBusinesses(): LocalBusinessSummary[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(BUSINESS_REGISTRY_KEY);
  if (raw) {
    try {
      const ids = JSON.parse(raw) as string[];
      return ids
        .map((id) => loadProducerState(id))
        .filter((state): state is ProducerLocalState => Boolean(state))
        .map(summaryFromState);
    } catch {
      // migração automática abaixo
    }
  }

  const current = loadProducerState(getCurrentLocalBusinessId());
  if (!current) return [];
  window.localStorage.setItem(BUSINESS_REGISTRY_KEY, JSON.stringify([current.business.id]));
  return [summaryFromState(current)];
}

function updateRegistry(businessId: string) {
  if (typeof window === 'undefined') return;
  let ids: string[] = [];
  try {
    ids = JSON.parse(window.localStorage.getItem(BUSINESS_REGISTRY_KEY) || '[]');
  } catch {
    ids = [];
  }
  if (!ids.includes(businessId)) ids.push(businessId);
  window.localStorage.setItem(BUSINESS_REGISTRY_KEY, JSON.stringify(ids));
}

export function cacheProducerState(
  state: ProducerLocalState,
  options: { makeCurrent?: boolean; emit?: boolean } = {},
) {
  if (typeof window === 'undefined') return;
  const normalized: ProducerLocalState = {
    ...state,
    version: 4,
    business: {
      ...state.business,
      accentColor: state.business.accentColor || DEFAULT_BUSINESS_COLORS[0],
    },
    publicSite: state.publicSite ?? defaultPublicSiteConfig(state.fields),
    publications: state.publications ?? [],
  };
  window.localStorage.setItem(stateKey(normalized.business.id), JSON.stringify(normalized));
  updateRegistry(normalized.business.id);
  if (options.makeCurrent) {
    setCurrentLocalBusinessId(normalized.business.id);
  }
  if (options.emit !== false) {
    window.dispatchEvent(new CustomEvent(BUSINESSES_UPDATED_EVENT, { detail: { businessId: normalized.business.id } }));
  }
}

export function saveProducerState(state: ProducerLocalState) {
  cacheProducerState(state, { makeCurrent: true });
}

export function createEmptyProducerState(input?: Partial<LocalBusiness>): ProducerLocalState {
  const id = input?.id || makeLocalId('business');
  const existingCount = typeof window !== 'undefined' ? listLocalBusinesses().length : 0;
  return {
    version: 4,
    business: {
      id,
      name: input?.name ?? '',
      kind: input?.kind ?? 'Produção',
      location: input?.location ?? '',
      logoUrl: input?.logoUrl ?? '',
      accentColor: input?.accentColor ?? DEFAULT_BUSINESS_COLORS[existingCount % DEFAULT_BUSINESS_COLORS.length]!,
    },
    onboardingStep: 0,
    completed: false,
    fields: [],
    units: [],
    stages: [],
    products: [],
    batches: [],
    records: [],
    qualityRecords: [],
    imports: [],
    qrCodes: [],
    publicSite: defaultPublicSiteConfig(),
    publications: [],
  };
}

export function getActiveProducerState(preferredBusinessId?: string | null) {
  const preferred = preferredBusinessId ? loadProducerState(preferredBusinessId) : null;
  if (preferred) return preferred;
  const current = loadProducerState();
  if (current) return current;
  const first = listLocalBusinesses()[0];
  return first ? loadProducerState(first.id) : null;
}

export function deleteLocalBusiness(businessId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(stateKey(businessId));
  const ids = listLocalBusinesses().map((business) => business.id).filter((id) => id !== businessId);
  window.localStorage.setItem(BUSINESS_REGISTRY_KEY, JSON.stringify(ids));
  if (getCurrentLocalBusinessId() === businessId) {
    if (ids[0]) setCurrentLocalBusinessId(ids[0]);
    else window.localStorage.removeItem(CURRENT_BUSINESS_KEY);
  }
  window.dispatchEvent(new CustomEvent(BUSINESSES_UPDATED_EVENT));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export async function imageFileToLocalDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return readFileAsDataUrl(file);
  const original = await readFileAsDataUrl(file);
  try {
    const image = new Image();
    image.src = original;
    await image.decode();
    const maxDimension = 1280;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return original;
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.76);
  } catch {
    return original;
  }
}
