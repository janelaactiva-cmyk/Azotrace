
import type { ProducerLocalState } from '../onboarding/_lib/local-store';

export function formatDate(value?: string, withTime = false) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-PT', withTime ? {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  } : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function slugKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'campo';
}

export function productName(store: ProducerLocalState, id: string) {
  return store.products.find((item) => item.id === id)?.name ?? 'Produto';
}
export function batchCode(store: ProducerLocalState, id: string) {
  return store.batches.find((item) => item.id === id)?.code ?? 'Sem lote';
}
export function stageName(store: ProducerLocalState, id?: string) {
  return store.stages.find((item) => item.id === id)?.name ?? 'Sem etapa';
}
export function statusPt(status: string) {
  return ({ active:'Ativo', finished:'Finalizado', approved:'Aprovado', rejected:'Rejeitado', pending:'Pendente', completed:'Concluído', partial:'Parcial', failed:'Falhou' } as Record<string,string>)[status] ?? status;
}
export function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
export function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
