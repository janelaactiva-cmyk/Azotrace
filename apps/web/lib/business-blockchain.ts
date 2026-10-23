import type { LocalAppUser } from '~/app/dashboard/_lib/local-users';
import type { ProducerLocalState } from '~/app/dashboard/onboarding/_lib/local-store';

export type ChainBusiness = { id: string; companyId: string; name: string; kind: string; updatedAt: string };
export type ChainOption = { id: string; name: string; kind?: string; companyId?: string };
export type BusinessEvent = { id: string; at: string; type: string; label: string; data: Record<string, unknown> };
export type BusinessChain = {
  business: ChainBusiness; companyName: string; network: 'not_configured';
  batches: { id: string; code: string; product: string; unit: string; status: string; events: number }[];
  selectedBatchId: string; events: BusinessEvent[]; totalEvents: number; offset: number; hasMore: boolean;
};
export function canReadBusinessChain(user: LocalAppUser, business: { id: string; companyId: string }) {
  if (!user.active) return false;
  if (user.role === 'superadmin') return true;
  return user.companyId === business.companyId && user.permissions.includes('blockchain.view') &&
    (user.role === 'admin' || user.businessIds.includes(business.id));
}
export function projectBusinessChain(business: ChainBusiness, companyName: string, raw: unknown, batchId = '', offset = 0): BusinessChain {
  const state = raw as Partial<ProducerLocalState> | null;
  const products = new Map((state?.products || []).map(item => [item.id, item.name]));
  const units = new Map((state?.units || []).map(item => [item.id, `${item.code} · ${item.name}`]));
  const stages = new Map((state?.stages || []).map(item => [item.id, item.name]));
  const fields = new Map((state?.fields || []).map(item => [item.key, `${item.label}${item.unit ? ` (${item.unit})` : ''}`]));
  const batches = state?.batches || [], records = state?.records || [], quality = state?.qualityRecords || [];
  const counts = new Map<string, number>();
  for (const row of [...records, ...quality]) counts.set(row.batchId, (counts.get(row.batchId) || 0) + 1);
  const selected = batchId ? batches.find(item => item.id === batchId) : batches[0];
  if (batchId && !selected) throw new Error('Lote não encontrado neste negócio.');
  const events: BusinessEvent[] = [];
  if (selected) {
    if (selected.startDate) events.push({ id: `lot:${selected.id}`, at: selected.startDate, type: 'lot', label: 'Início do lote', data: { Lote: selected.code } });
    for (const row of records) {
      if (row.batchId !== selected.id) continue;
      events.push({ id: `record:${row.id}`, at: row.recordedAt || row.createdAt, type: 'record', label: stages.get(row.stageId || '') || 'Registo de dados',
        data: Object.fromEntries(Object.entries(row.data || {}).map(([key, value]) => [fields.get(key) || key, value])) });
    }
    for (const row of quality) {
      if (row.batchId !== selected.id) continue;
      const statuses: Record<string, string> = { approved: 'Aprovado', rejected: 'Rejeitado', pending: 'Pendente' };
      events.push({ id: `quality:${row.id}`, at: row.createdAt, type: 'quality', label: 'Controlo de qualidade',
        data: { Parâmetro: row.parameter, Valor: `${row.value}${row.unit ? ` ${row.unit}` : ''}`, Estado: statuses[row.status] || row.status, ...(row.notes ? { Observações: row.notes } : {}) } });
    }
  }
  const timestamp = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  events.sort((a, b) => timestamp(a.at) - timestamp(b.at) || a.id.localeCompare(b.id));
  return { business, companyName, network: 'not_configured', batches: batches.map(item => ({ id: item.id, code: item.code, product: products.get(item.productId) || 'Produto não disponível', unit: units.get(item.productionUnitId || item.unitIds?.[0] || '') || 'Unidade não disponível', status: item.status === 'finished' ? 'Concluído' : 'Ativo', events: (counts.get(item.id) || 0) + (item.startDate ? 1 : 0) })),
    selectedBatchId: selected?.id || '', events: events.slice(offset, offset + 50), totalEvents: events.length, offset, hasMore: offset + 50 < events.length };
}
