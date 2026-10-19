import type { BillingHistoryEntry, OnlineSubscription } from './online-billing';
import { subscriptionCalendarDay } from '~/lib/subscription-dates';


type Dates = Pick<OnlineSubscription, 'startedAt' | 'expiresAt'>;
export function subscriptionTiming(row: Dates, now = Date.now()) {
  const start = row.startedAt ? Date.parse(row.startedAt) : NaN;
  const end = row.expiresAt ? Date.parse(row.expiresAt) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(now) || end <= start) return null;
  const elapsed = Math.max(0, Math.min(end - start, now - start));
  const firstDay = subscriptionCalendarDay(row.startedAt!);
  const lastDay = subscriptionCalendarDay(row.expiresAt!);
  const today = subscriptionCalendarDay(now);
  return {
    start, end,
    totalDays: Math.max(0, lastDay - firstDay),
    elapsedDays: Math.max(0, Math.min(lastDay - firstDay, today - firstDay)),
    remainingDays: Math.max(0, lastDay - Math.max(firstDay, today)),
    startsInDays: Math.max(0, firstDay - today),
    scheduled: start > now,
    expiredDays: Math.max(0, today - lastDay),
    expired: now >= end,
    progress: Math.round(elapsed / (end - start) * 100),
  };
}
export function subscriptionDaysLabel(row: Dates, now = Date.now()) {
  const timing = subscriptionTiming(row, now);
  if (!timing) return 'Datas por verificar';
  if (timing.scheduled) return timing.startsInDays ? `Começa em ${timing.startsInDays} dia${timing.startsInDays === 1 ? '' : 's'}` : 'Começa hoje';
  if (timing.expired) return timing.expiredDays ? `Expirou há ${timing.expiredDays} dia${timing.expiredDays === 1 ? '' : 's'}` : 'Expirou hoje';
  if (!timing.remainingDays) return 'Termina hoje';
  return `${timing.remainingDays} dia${timing.remainingDays === 1 ? '' : 's'} restante${timing.remainingDays === 1 ? '' : 's'}`;
}

export type HistoryKind = 'upgrade' | 'downgrade' | 'association' | 'update' | 'start' | 'other';
export const historyKindLabels: Record<HistoryKind, string> = { upgrade: 'Upgrade', downgrade: 'Downgrade', association: 'Associação à empresa', update: 'Alteração de dados', start: 'Início da subscrição', other: 'Outra alteração' };
export function historyKind(entry: BillingHistoryEntry): HistoryKind {
  const action = entry.action.toLowerCase();
  if (action.includes('downgrade')) return 'downgrade';
  if (action.includes('upgrade')) return 'upgrade';
  if (/associ/.test(action)) return 'association';
  if (/atualiz|alter.*dados|update/.test(action)) return 'update';
  if (/regist|cria|início/.test(action)) return 'start';
  return 'other';
}
export function customerSubscriptions(selected: OnlineSubscription, rows: OnlineSubscription[]) {
  return rows.filter(row => selected.companyId ? row.companyId === selected.companyId : row.id === selected.id);
}
export function customerHistory(selected: OnlineSubscription, rows: OnlineSubscription[]) {
  return customerSubscriptions(selected, rows).flatMap(subscription => {
    const entries = [...(subscription.history || [])];
    if (subscription.startedAt && !entries.some(entry => historyKind(entry) === 'start')) entries.push({
      id: `start-${subscription.id}`, date: subscription.startedAt,
      action: 'Início da subscrição', oldPlan: null,
      newPlan: [...entries].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).find(entry => entry.oldPlan)?.oldPlan || 'Não registado',
    });
    return entries.map(entry => ({ ...entry, kind: historyKind(entry), key: `${subscription.id}:${entry.id}`, subscriptionId: subscription.id }));
  }).sort((a, b) => {
    const time = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : -Infinity;
    return time(b.date) - time(a.date);
  });
}

export function proportionalPlanChange(row: OnlineSubscription, targetPlan: string, plans: ReadonlyArray<{ id: string; annualCents: number }>, now = Date.now()) {
  const timing = subscriptionTiming(row, now);
  if (!timing || timing.expired || timing.scheduled || row.status !== 'active' || !row.plan) return null;
  const current = plans.find(plan => plan.id === row.plan), target = plans.find(plan => plan.id === targetPlan);
  if (!current || !target) return null;
  const fraction = Math.max(0, Math.min(1, (timing.end - now) / (timing.end - timing.start)));
  const currentCreditCents = Math.round(current.annualCents * 1.16 * fraction);
  const targetCostCents = Math.round(target.annualCents * 1.16 * fraction);
  const delta = Math.round((target.annualCents - current.annualCents) * 1.16 * fraction);
  return { ...timing, currentCreditCents, targetCostCents, payableCents: Math.max(0, delta), downgrade: target.annualCents < current.annualCents };
}
