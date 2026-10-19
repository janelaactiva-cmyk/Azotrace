import type { FieldDefinition } from './catalog';
import { DEFAULT_COMPANY_ID } from '../../_lib/local-companies';

export type LocalBusiness = {
  id: string;
  companyId: string;
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
  /** Cada lote pertence a uma única unidade: Estufa, Colmeia, Pipa, etc. */
  productionUnitId: string;
  /** Compatibilidade temporária com páginas antigas. Contém sempre 0 ou 1 elemento. */
  unitIds: string[];
  /** Número sequencial do ciclo desta unidade. */
  cycleNumber?: number;
  /** Lotes são criados automaticamente para a unidade. */
  autoCreated?: boolean;
  /** Data de encerramento do ciclo, quando terminado. */
  closedAt?: string;
  /** Lote/ciclo anterior da mesma unidade. */
  previousBatchId?: string;
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
  productionUnitId?: string;
  /** Compatibilidade com versões anteriores. Nos novos registos tem no máximo 1 elemento. */
  productionUnitIds: string[];
  recordedAt?: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
};

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
  version: 7;
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

type BatchMigration = {
  batches: LocalBatch[];
  records: LocalProductionRecord[];
  batchFirstId: Map<string, string>;
};

function migrateBatches(parsed: any, units: LocalProductionUnit[]): BatchMigration {
  const rawBatches = Array.isArray(parsed.batches) ? parsed.batches : [];
  const rawRecords = Array.isArray(parsed.records) ? parsed.records : [];
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const destination = new Map<string, Map<string, string>>();
  const firstId = new Map<string, string>();
  const batches: LocalBatch[] = [];

  for (const rawBatch of rawBatches) {
    const legacyIds = Array.isArray(rawBatch.unitIds) ? rawBatch.unitIds.filter(Boolean) : [];
    const ids = [...new Set([rawBatch.productionUnitId, ...legacyIds].filter(Boolean))] as string[];
    const targets = ids.length ? ids : [''];
    const perUnit = new Map<string, string>();

    targets.forEach((unitId, index) => {
      const id = index === 0 ? String(rawBatch.id) : `${rawBatch.id}__${unitId || index + 1}`;
      const unit = unitById.get(unitId);
      const code = index === 0
        ? String(rawBatch.code ?? '')
        : `${String(rawBatch.code ?? 'LOTE')}-${unit?.code ?? String(index + 1).padStart(2, '0')}`;
      const batch: LocalBatch = {
        id,
        productId: String(rawBatch.productId ?? ''),
        code,
        startDate: String(rawBatch.startDate ?? new Date().toISOString().slice(0, 10)),
        status: rawBatch.status === 'finished' ? 'finished' : 'active',
        productionUnitId: unitId,
        unitIds: unitId ? [unitId] : [],
        cycleNumber: Number(rawBatch.cycleNumber || index + 1),
        autoCreated: Boolean(rawBatch.autoCreated),
        closedAt: rawBatch.closedAt || undefined,
        previousBatchId: rawBatch.previousBatchId || undefined,
      };
      batches.push(batch);
      if (unitId) perUnit.set(unitId, id);
      if (index === 0) firstId.set(String(rawBatch.id), id);
    });

    destination.set(String(rawBatch.id), perUnit);
  }

  const records: LocalProductionRecord[] = rawRecords.map((record: any) => {
    const legacyIds = Array.isArray(record.productionUnitIds) ? record.productionUnitIds.filter(Boolean) : [];
    const rawUnitId = record.productionUnitId || legacyIds[0] || '';
    const mappedBatchId = destination.get(String(record.batchId))?.get(String(rawUnitId))
      ?? firstId.get(String(record.batchId))
      ?? String(record.batchId ?? '');
    const mappedBatch = batches.find((batch) => batch.id === mappedBatchId);
    const productionUnitId = rawUnitId || mappedBatch?.productionUnitId || undefined;

    return {
      ...record,
      id: String(record.id),
      productId: String(record.productId),
      batchId: mappedBatchId,
      stageId: record.stageId || undefined,
      productionUnitId,
      productionUnitIds: productionUnitId ? [productionUnitId] : [],
      recordedAt: record.recordedAt || record.createdAt || new Date().toISOString(),
      data: record.data ?? {},
      createdAt: record.createdAt || new Date().toISOString(),
    };
  });

  return { batches, records, batchFirstId: firstId };
}

export function normalizeProducerState(parsed: any): ProducerLocalState | null {
  if (!parsed?.business?.id) return null;

  const fields = parsed.fields ?? [];
  const units: LocalProductionUnit[] = parsed.units ?? [];
  const migration = migrateBatches(parsed, units);
  const fallbackPublicSite = defaultPublicSiteConfig(fields);
  const publicSite = {
    ...fallbackPublicSite,
    ...(parsed.publicSite ?? {}),
    fieldKeys: Array.isArray(parsed.publicSite?.fieldKeys)
      ? parsed.publicSite.fieldKeys
      : fallbackPublicSite.fieldKeys,
  };
  const mapBatchId = (batchId: string) => migration.batchFirstId.get(String(batchId)) ?? String(batchId);

  const normalized: ProducerLocalState = {
    ...parsed,
    version: 7,
    business: {
      ...parsed.business,
      companyId: parsed.business.companyId || DEFAULT_COMPANY_ID,
      accentColor: parsed.business.accentColor || DEFAULT_BUSINESS_COLORS[0],
    },
    fields,
    units,
    stages: parsed.stages ?? [],
    products: parsed.products ?? [],
    batches: migration.batches,
    records: migration.records,
    qualityRecords: (parsed.qualityRecords ?? []).map((record: any) => ({ ...record, batchId: mapBatchId(record.batchId) })),
    imports: parsed.imports ?? [],
    qrCodes: (parsed.qrCodes ?? []).map((qr: any) => ({ ...qr, batchId: mapBatchId(qr.batchId) })),
    publicSite,
    publications: (parsed.publications ?? []).map((publication: any) => ({ ...publication, batchId: mapBatchId(publication.batchId) })),
  } as ProducerLocalState;

  return ensureActiveBatchForEveryUnit(normalized);
}

export function loadProducerState(preferredBusinessId?: string | null): ProducerLocalState | null {
  if (typeof window === 'undefined') return null;
  const businessId = preferredBusinessId || getCurrentLocalBusinessId();
  if (!businessId) return null;
  const raw = window.localStorage.getItem(stateKey(businessId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeProducerState(parsed);
    if (normalized) {
      const serialized = JSON.stringify(normalized);
      if (parsed.version !== 7 || serialized !== raw) {
        window.localStorage.setItem(stateKey(businessId), serialized);
      }
    }
    return normalized;
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
  const baseNormalized: ProducerLocalState = {
    ...state,
    version: 7,
    business: {
      ...state.business,
      companyId: state.business.companyId || DEFAULT_COMPANY_ID,
      accentColor: state.business.accentColor || DEFAULT_BUSINESS_COLORS[0] || '#47B37D',
    },
    batches: state.batches.map((batch) => ({
      ...batch,
      productionUnitId: batch.productionUnitId || batch.unitIds?.[0] || '',
      unitIds: (batch.productionUnitId || batch.unitIds?.[0]) ? [batch.productionUnitId || batch.unitIds[0]!] : [],
      cycleNumber: Number(batch.cycleNumber || 1),
      autoCreated: batch.autoCreated !== false,
    })),
    records: state.records.map((record) => {
      const batch = state.batches.find((item) => item.id === record.batchId);
      const productionUnitId = record.productionUnitId || record.productionUnitIds?.[0] || batch?.productionUnitId || undefined;
      return {
        ...record,
        productionUnitId,
        productionUnitIds: productionUnitId ? [productionUnitId] : [],
      };
    }),
    publicSite: state.publicSite ?? defaultPublicSiteConfig(state.fields),
    publications: state.publications ?? [],
  };
  const normalized = ensureActiveBatchForEveryUnit(baseNormalized);
  window.localStorage.setItem(stateKey(normalized.business.id), JSON.stringify(normalized));
  updateRegistry(normalized.business.id);
  if (options.makeCurrent) setCurrentLocalBusinessId(normalized.business.id);
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
    version: 7,
    business: {
      id,
      companyId: input?.companyId || DEFAULT_COMPANY_ID,
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


function codePrefix(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
}

export function nextCycleNumberForUnit(state: ProducerLocalState, productionUnitId: string) {
  return Math.max(
    0,
    ...state.batches
      .filter((batch) => batch.productionUnitId === productionUnitId)
      .map((batch) => Number(batch.cycleNumber || 0)),
  ) + 1;
}

export function automaticBatchCode(
  state: ProducerLocalState,
  productionUnitId: string,
  productId: string,
  cycleNumber?: number,
) {
  const product = state.products.find((item) => item.id === productId);
  const unit = state.units.find((item) => item.id === productionUnitId);
  const cycle = cycleNumber ?? nextCycleNumberForUnit(state, productionUnitId);
  const productPrefix = codePrefix(product?.sku || product?.name || state.productType?.name || 'LOT').slice(0, 12) || 'LOT';
  const unitPrefix = codePrefix(unit?.code || unit?.name || 'UND').slice(0, 16) || 'UND';
  const year = new Date().getFullYear();
  return `${productPrefix}-${unitPrefix}-${year}-C${String(cycle).padStart(3, '0')}`;
}

export function createAutomaticBatchForUnit(
  state: ProducerLocalState,
  productionUnitId: string,
  options: { productId?: string; startDate?: string; forceNew?: boolean; previousBatchId?: string } = {},
): { state: ProducerLocalState; batch?: LocalBatch } {
  const productId = options.productId || state.products[0]?.id || '';
  if (!productId || !productionUnitId) return { state };

  if (!options.forceNew) {
    const existing = state.batches.find(
      (batch) => batch.productionUnitId === productionUnitId && batch.productId === productId && batch.status === 'active',
    );
    if (existing) return { state, batch: existing };
  }

  const cycleNumber = nextCycleNumberForUnit(state, productionUnitId);
  const batch: LocalBatch = {
    id: makeLocalId('batch'),
    productId,
    code: automaticBatchCode(state, productionUnitId, productId, cycleNumber),
    startDate: options.startDate || new Date().toISOString().slice(0, 10),
    status: 'active',
    productionUnitId,
    unitIds: [productionUnitId],
    cycleNumber,
    autoCreated: true,
    previousBatchId: options.previousBatchId,
  };

  return { state: { ...state, batches: [batch, ...state.batches] }, batch };
}

export function ensureActiveBatchForEveryUnit(state: ProducerLocalState): ProducerLocalState {
  if (!state.products[0]) return state;
  let next = state;
  for (const unit of state.units.filter((item) => item.status === 'active')) {
    next = createAutomaticBatchForUnit(next, unit.id).state;
  }
  return next;
}

export function finishBatchAndStartNextCycle(
  state: ProducerLocalState,
  batchId: string,
  startDate = new Date().toISOString().slice(0, 10),
): { state: ProducerLocalState; nextBatch?: LocalBatch } {
  const current = state.batches.find((batch) => batch.id === batchId);
  if (!current) return { state };
  const closedAt = new Date().toISOString();
  const closedState: ProducerLocalState = {
    ...state,
    batches: state.batches.map((batch) => batch.id === batchId ? { ...batch, status: 'finished' as const, closedAt } : batch),
  };
  const unit = closedState.units.find((item) => item.id === current.productionUnitId);
  if (!unit || unit.status !== 'active') return { state: closedState };
  const created = createAutomaticBatchForUnit(closedState, current.productionUnitId, {
    productId: current.productId,
    startDate,
    forceNew: true,
    previousBatchId: current.id,
  });
  return { state: created.state, nextBatch: created.batch };
}

export function addProductionUnitWithAutomaticBatch(
  state: ProducerLocalState,
  unit: LocalProductionUnit,
): { state: ProducerLocalState; batch?: LocalBatch } {
  const withUnit: ProducerLocalState = { ...state, units: [...state.units, unit] };
  return createAutomaticBatchForUnit(withUnit, unit.id);
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
