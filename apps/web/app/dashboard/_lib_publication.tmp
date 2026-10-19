import type { ProducerLocalState } from '../onboarding/_lib/local-store';

export type PublicTraceValue = {
  key: string;
  label: string;
  value: unknown;
  unit?: string;
  fieldType: string;
};

export type PublicTraceRecord = {
  id: string;
  createdAt: string;
  stage: string;
  units: Array<{ code: string; name: string }>;
  values: PublicTraceValue[];
};

export type PublicTraceSnapshot = {
  version: 1;
  generatedAt: string;
  business: {
    id: string;
    name?: string;
    location?: string;
    logoUrl?: string;
    accentColor: string;
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
    status: string;
  };
  originUnits: Array<{ id: string; code: string; name: string }>;
  records: PublicTraceRecord[];
  quality: Array<{
    id: string;
    parameter: string;
    value: string;
    unit?: string;
    status: string;
    createdAt: string;
  }>;
  config: ProducerLocalState['publicSite'];
};

function isSerializablePublicValue(value: unknown) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  return false;
}

export function buildPublicationSnapshot(
  store: ProducerLocalState,
  batchId: string,
): PublicTraceSnapshot {
  const batch = store.batches.find((item) => item.id === batchId);
  if (!batch) throw new Error('O lote selecionado já não existe.');

  const product = store.products.find((item) => item.id === batch.productId);
  if (!product) throw new Error('O produto associado ao lote não existe.');

  const config = store.publicSite;
  const allowedFieldKeys = new Set(config.fieldKeys);
  const fieldMap = new Map(store.fields.map((field) => [field.key, field]));
  const unitMap = new Map(store.units.map((unit) => [unit.id, unit]));
  const stageMap = new Map(store.stages.map((stage) => [stage.id, stage]));

  const records = store.records
    .filter((record) => record.batchId === batch.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((record) => ({
      id: record.id,
      createdAt: record.createdAt,
      stage: stageMap.get(record.stageId ?? '')?.name ?? 'Registo de produção',
      units: record.productionUnitIds
        .map((unitId) => unitMap.get(unitId))
        .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit))
        .map((unit) => ({ code: unit.code, name: unit.name })),
      values: Object.entries(record.data)
        .filter(([key, value]) => allowedFieldKeys.has(key) && isSerializablePublicValue(value))
        .map(([key, value]) => {
          const field = fieldMap.get(key);
          return {
            key,
            label: field?.label ?? key,
            value,
            unit: field?.unit,
            fieldType: field?.fieldType ?? typeof value,
          };
        }),
    }));

  const originUnits = config.showOriginUnits
    ? batch.unitIds
        .map((unitId) => unitMap.get(unitId))
        .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit))
        .map((unit) => ({ id: unit.id, code: unit.code, name: unit.name }))
    : [];

  const quality = config.showQuality
    ? store.qualityRecords
        .filter((record) => record.batchId === batch.id)
        .map((record) => ({
          id: record.id,
          parameter: record.parameter,
          value: record.value,
          unit: record.unit,
          status: record.status,
          createdAt: record.createdAt,
        }))
    : [];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    business: {
      id: store.business.id,
      name: config.showBusinessName ? store.business.name : undefined,
      location: config.showBusinessLocation ? store.business.location : undefined,
      logoUrl: store.business.logoUrl,
      accentColor: store.business.accentColor,
    },
    product: {
      id: product.id,
      name: config.showProductName ? product.name : undefined,
      description: config.showProductDescription ? product.description : undefined,
      imageUrl: product.imageUrl,
    },
    batch: {
      id: batch.id,
      code: config.showBatchCode ? batch.code : undefined,
      startDate: config.showBatchStartDate ? batch.startDate : undefined,
      status: batch.status,
    },
    originUnits,
    records: config.showTimeline ? records : [],
    quality,
    config,
  };
}

export function publicTracePath(businessId: string, batchId: string) {
  return `/trace/${encodeURIComponent(businessId)}/${encodeURIComponent(batchId)}`;
}

export function publicTraceUrl(origin: string, businessId: string, batchId: string) {
  return `${origin.replace(/\/$/, '')}${publicTracePath(businessId, batchId)}`;
}

const LOCAL_PUBLIC_TRACE_PREFIX = 'azotrace:public-trace:';

export function localPublicTraceStorageKey(businessId: string, batchId: string) {
  return `${LOCAL_PUBLIC_TRACE_PREFIX}${businessId}:${batchId}`;
}

export function saveLocalPublicationSnapshot(snapshot: PublicTraceSnapshot) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    localPublicTraceStorageKey(snapshot.business.id, snapshot.batch.id),
    JSON.stringify(snapshot),
  );
}

export function loadLocalPublicationSnapshot(
  businessId: string,
  batchId: string,
): PublicTraceSnapshot | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(localPublicTraceStorageKey(businessId, batchId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PublicTraceSnapshot;
    if (parsed?.version !== 1 || parsed.business?.id !== businessId || parsed.batch?.id !== batchId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function removeLocalPublicationSnapshot(businessId: string, batchId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(localPublicTraceStorageKey(businessId, batchId));
}

