export const SUBSCRIPTION_TIME_ZONE = 'Atlantic/Azores';
const DAY = 86_400_000;
const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: SUBSCRIPTION_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Compare calendar dates, rather than 24-hour periods (which vary at DST). */
export function subscriptionCalendarDay(value: number | string) {
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return NaN;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return timestamp / DAY;
  const parts = calendar.formatToParts(timestamp);
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  return Date.UTC(part('year'), part('month') - 1, part('day')) / DAY;
}

export function renewalDays(expiresAt: string | null, now = Date.now()) {
  if (!expiresAt || !Number.isFinite(now)) return null;
  const end = subscriptionCalendarDay(expiresAt);
  return Number.isFinite(end) ? Math.max(0, end - subscriptionCalendarDay(now)) : null;
}

export function subscriptionDateLabel(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  return new Date(value).toLocaleDateString('pt-PT', { timeZone: SUBSCRIPTION_TIME_ZONE });
}
