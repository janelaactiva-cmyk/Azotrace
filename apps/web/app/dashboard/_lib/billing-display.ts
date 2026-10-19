import { LOCAL_PLAN_PRICES, type LocalPlan } from './local-subscriptions';
import type { OnlineSubscription } from './online-billing';
import { subscriptionTiming } from './billing-details';
export const billedPrice = (plan: LocalPlan) => Math.round(LOCAL_PLAN_PRICES[plan] * 116) / 100;
export function billingStatus(row: OnlineSubscription, now = Date.now()) {
  if (row.status !== 'active') return row.status || 'unknown';
  const timing = subscriptionTiming(row, now);
  if (!timing) return 'unknown';
  if (timing.expired) return 'expired';
  if (timing.scheduled) return 'scheduled';
  return 'active';
}
export function upgradeEstimate(row: OnlineSubscription, plan: LocalPlan, now = Date.now()) {
  if (!row.plan || !row.startedAt || !row.expiresAt || billingStatus(row, now) !== 'active') return null;
  const start = new Date(row.startedAt).getTime(), end = new Date(row.expiresAt).getTime();
  if (end <= start) return null;
  return Math.round((LOCAL_PLAN_PRICES[plan] - LOCAL_PLAN_PRICES[row.plan]) * 116 * (end-now)/(end-start))/100;
}
