import { supabase } from '~/lib/supabase';
import { withAuthTimeout } from '~/lib/auth-navigation';
import { targetUserId } from '~/app/dashboard/_lib/online-state';
import type { CompanyDetailsInput, CompanyDetailsSnapshot, CompanyField } from './company-details';

export const COMPANY_DETAILS_EVENT = 'azotrace:company-details-updated';
export type CompanyNotification = { id: string; changed_fields: CompanyField[]; created_at: string };
export class CompanyRequestError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
async function request<T>(query: URLSearchParams, signal?: AbortSignal, method = 'GET', input?: unknown): Promise<T> {
  const { data, error } = await withAuthTimeout(supabase.auth.getSession(), 'A sessão demorou a responder. Tenta novamente.');
  if (signal?.aborted) throw new CompanyRequestError('Pedido cancelado.', 499);
  if (error || !data.session) throw new CompanyRequestError('Inicia sessão novamente para consultar os dados da empresa.', 401);
  const headers: Record<string, string> = { Authorization: `Bearer ${data.session.access_token}` };
  const target = targetUserId(); if (target) headers['x-azotrace-user-id'] = target;
  if (input !== undefined) headers['Content-Type'] = 'application/json';
  const options: RequestInit = { method, cache: 'no-store', signal, headers };
  if (input !== undefined) options.body = JSON.stringify(input);
  const response = await withAuthTimeout(fetch('/api/azotrace/company-details?' + query.toString(), options), 'O pedido demorou demasiado. Tenta novamente.');
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new CompanyRequestError(result?.error || 'Não foi possível carregar ou guardar os dados da empresa.', response.status);
  return result as T;
}
export function loadCompanyDetails(companyId: string, signal?: AbortSignal, beforeVersion?: number) {
  const query = new URLSearchParams({ companyId });
  if (beforeVersion) query.set('beforeVersion', String(beforeVersion));
  return request<CompanyDetailsSnapshot>(query, signal);
}
export function saveCompanyDetails(input: CompanyDetailsInput, signal?: AbortSignal) {
  return request<{ changed: boolean; version: number }>(new URLSearchParams(), signal, 'PUT', input);
}
export function acknowledgeCompanyChanges(companyId: string, changeIds: string[], signal?: AbortSignal) {
  return request<{ acknowledged: boolean }>(new URLSearchParams(), signal, 'POST', { companyId, changeIds });
}
export function loadCompanyNotifications(companyId: string, signal?: AbortSignal) {
  return request<{ notifications: CompanyNotification[] }>(new URLSearchParams({ companyId, notifications: '1' }), signal);
}
