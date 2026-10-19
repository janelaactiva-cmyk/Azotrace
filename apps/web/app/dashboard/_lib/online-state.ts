'use client';
import { cacheProducerState, normalizeProducerState } from '../onboarding/_lib/local-store';
import type { ProducerLocalState } from '../onboarding/_lib/local-store';
import type { LocalAppUser } from './local-users';
import type { LocalCompany } from './local-companies';
export type OnlineBusiness = { id: string; companyId: string; name: string; kind: string; productTypeName?: string; state?: ProducerLocalState; accentColor?: string };
export const ONLINE_CONTEXT_EVENT = 'azotrace:online-context';
export const ONLINE_TARGET_KEY = 'azotrace:online-target-user';
export const emptyOnlineUser: LocalAppUser = { id: '', name: '', email: '', role: 'viewer', active: false, companyId: undefined, permissions: [], businessIds: [], createdAt: '', updatedAt: '' };
export let onlineUser: LocalAppUser = emptyOnlineUser;
export let onlineCompanies: LocalCompany[] = [];
export let onlineUsers: LocalAppUser[] = [];
export let onlineBusinesses: OnlineBusiness[] = [];
export let onlineError = '';
export let onlineCanImpersonate = false;
export type OnlineContext = { user: LocalAppUser; companies: LocalCompany[]; businesses: OnlineBusiness[]; canImpersonate: boolean };
export function setOnlineContext(context: OnlineContext) {
  onlineCanImpersonate = context.canImpersonate;
  onlineUser = context.user; onlineCompanies = context.companies; onlineBusinesses = context.businesses;
  onlineUsers = [context.user]; onlineError = '';
  for (const business of context.businesses) {
    if (!business.state || context.user.role === 'superadmin') continue;
    const state = normalizeProducerState(business.state);
    if (state) cacheProducerState({ ...state, business: { ...state.business, id: business.id, companyId: business.companyId, name: business.name, kind: business.kind, accentColor: business.accentColor || state.business.accentColor } }, { makeCurrent: false, emit: false });
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ONLINE_CONTEXT_EVENT));
}
export function setOnlineUsers(users: LocalAppUser[]) { onlineUsers = users; }
export function invalidateOnlineContext(error = '') {
  onlineCanImpersonate = false;
  onlineUser = emptyOnlineUser; onlineCompanies = []; onlineUsers = []; onlineBusinesses = []; onlineError = error;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ONLINE_CONTEXT_EVENT));
}
export function targetUserId() {
  return typeof window !== 'undefined' ? window.sessionStorage.getItem(ONLINE_TARGET_KEY) : null;
}
