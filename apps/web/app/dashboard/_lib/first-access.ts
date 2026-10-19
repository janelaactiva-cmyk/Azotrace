import type { OnlineContext } from './online-state';

export function firstAccessDestination(context: OnlineContext, preferredBusinessId?: string | null) {
  const { user } = context;
  if (!user.active || user.role !== 'admin' || !user.companyId || !user.permissions.includes('business.manage')) {
    return { path: '/dashboard' as const, business: undefined };
  }
  const businesses = context.businesses.filter(business => business.companyId === user.companyId);
  if (businesses.some(business => business.state?.completed === true)) {
    return { path: '/dashboard' as const, business: undefined };
  }
  const business = businesses.find(business => business.id === preferredBusinessId) || businesses[0];
  return { path: '/dashboard/onboarding' as const, business };
}
