'use client';

import { supabase } from '~/lib/supabase';

import { targetUserId } from './online-state';
import type { LocalAppUser, LocalPermission, LocalUserRole } from './local-users';

export type SupabaseCompany = {
  id: string;
  name: string;
  ownerAdminUserId?: string;
  active: boolean;
};

export type SupabaseBusinessOption = {
  id: string;
  companyId: string;
  name: string;
  kind: string;
};

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error('A sessão terminou. Inicia sessão novamente.');
  return token;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(targetUserId() ? { 'x-azotrace-user-id': targetUserId()! } : {}),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'O pedido ao servidor falhou.');
  return payload as T;
}

export async function getCurrentSupabaseAppUser(): Promise<LocalAppUser> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('A sessão terminou. Inicia sessão novamente.');
  const payload = await request<{ user: LocalAppUser | null }>(`/api/azotrace/users?id=${encodeURIComponent(data.user.id)}`);
  if (!payload.user) throw new Error('O utilizador autenticado ainda não tem perfil Azotrace.');
  return payload.user;
}

export async function listSupabaseUsers() {
  const payload = await request<{ users: LocalAppUser[] }>('/api/azotrace/users');
  return payload.users || [];
}

export async function getSupabaseManagedUser(id: string) {
  const payload = await request<{ user: LocalAppUser | null }>(`/api/azotrace/users?id=${encodeURIComponent(id)}`);
  return payload.user;
}

export async function createSupabaseManagedUser(input: {
  name: string;
  email: string;
  password: string;
  role: LocalUserRole;
  companyId?: string;
  newCompanyName?: string;
  businessIds: string[];
  permissions: LocalPermission[];
}) {
  const payload = await request<{ user: LocalAppUser }>('/api/azotrace/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.user;
}

export async function updateSupabaseManagedUser(input: {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: LocalUserRole;
  active: boolean;
  companyId?: string;
  businessIds: string[];
  permissions: LocalPermission[];
}) {
  const payload = await request<{ user: LocalAppUser }>('/api/azotrace/users', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.user;
}

export async function deleteSupabaseManagedUser(id: string) {
  await request<{ ok: boolean }>(`/api/azotrace/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function listSupabaseCompanies(): Promise<SupabaseCompany[]> {
  const { data, error } = await (supabase as any)
    .from('azotrace_companies')
    .select('id, name, owner_admin_user_id, active')
    .order('name');
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    ownerAdminUserId: row.owner_admin_user_id || undefined,
    active: row.active !== false,
  }));
}

export async function listSupabaseBusinessOptions(): Promise<SupabaseBusinessOption[]> {
  const { data, error } = await (supabase as any)
    .from('producer_workspaces')
    .select('business_id, company_id, business_name, business_kind')
    .order('business_name');
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => ({
    id: String(row.business_id),
    companyId: String(row.company_id),
    name: String(row.business_name || 'Negócio'),
    kind: String(row.business_kind || 'Produção'),
  }));
}
