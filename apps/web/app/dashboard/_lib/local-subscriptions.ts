'use client';

import { getLocalCompany, listLocalCompanies } from './local-companies';
import { getCurrentLocalUser, hasPermission, listLocalUsers } from './local-users';

export const LOCAL_SUBSCRIPTIONS_EVENT = 'azotrace:local-subscriptions-changed';
export const LOCAL_SUBSCRIPTIONS_KEY = 'azotrace:local-subscriptions:v1';
export const LOCAL_PLANS = ['Base', 'Essential', 'Pro'] as const;
export type LocalPlan = typeof LOCAL_PLANS[number];
export const LOCAL_PLAN_PRICES: Record<LocalPlan, number> = { Base: 239.88, Essential: 371.88, Pro: 851.88 };
export type LocalSubscriptionStatus = 'active' | 'inactive' | 'canceled';
export type LocalSubscription = {
  id: string;
  companyId: string;
  plan: LocalPlan;
  status: LocalSubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  billingName: string;
  billingEmail: string;
  nif: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  history: Array<{ id: string; date: string; action: string; oldPlan: LocalPlan | null; newPlan: LocalPlan }>;
};
export type LocalSubscriptionInput = Pick<LocalSubscription,
  'companyId' | 'plan' | 'status' | 'startedAt' | 'expiresAt' | 'billingName' | 'billingEmail' | 'nif' | 'address'>;

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function validSubscriptionDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function annualExpiry(start: string) {
  if (!validSubscriptionDate(start)) throw new Error('Data de início inválida.');
  const date = new Date(`${start}T00:00:00Z`);
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  // 29 de fevereiro renova no último dia de fevereiro do ano seguinte.
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

function readSubscriptions(): LocalSubscription[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(LOCAL_SUBSCRIPTIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.subscriptions)) throw new Error();
    const ids = new Set<string>();
    const companies = new Set<string>();
    for (const row of parsed.subscriptions) {
      if (!row || typeof row.id !== 'string' || !row.id || typeof row.companyId !== 'string' || !row.companyId
        || ids.has(row.id) || companies.has(row.companyId)
        || !LOCAL_PLANS.includes(row.plan) || !['active', 'inactive', 'canceled'].includes(row.status)
        || !validSubscriptionDate(row.startedAt) || !validSubscriptionDate(row.expiresAt)
        || row.expiresAt <= row.startedAt || !Array.isArray(row.history)
        || !['billingName', 'billingEmail', 'nif', 'address', 'createdAt', 'updatedAt'].every((key) => typeof row[key] === 'string')
        || !row.history.every((entry: LocalSubscription['history'][number]) => entry
          && typeof entry.id === 'string' && typeof entry.date === 'string' && typeof entry.action === 'string'
          && (entry.oldPlan === null || LOCAL_PLANS.includes(entry.oldPlan)) && LOCAL_PLANS.includes(entry.newPlan))) throw new Error();
      ids.add(row.id);
      companies.add(row.companyId);
    }
    return parsed.subscriptions;
  } catch {
    throw new Error('Os dados locais das subscrições não puderam ser lidos. Não foram substituídos.');
  }
}

function writeSubscriptions(rows: LocalSubscription[]) {
  if (typeof window === 'undefined') throw new Error('Esta operação só está disponível no browser.');
  // Uma só gravação conserva subscrição e histórico juntos. Falhas de armazenamento são visíveis.
  localStorage.setItem(LOCAL_SUBSCRIPTIONS_KEY, JSON.stringify({ version: 1, subscriptions: rows }));
  window.dispatchEvent(new CustomEvent(LOCAL_SUBSCRIPTIONS_EVENT));
}

export function canUseLocalBilling() {
  const user = getCurrentLocalUser();
  if (!hasPermission(user, 'billing.manage')) return false;
  return user.role === 'superadmin' || Boolean(user.companyId && getLocalCompany(user.companyId)?.active);
}

function requireBilling() {
  if (!canUseLocalBilling()) throw new Error('Sem acesso a pagamentos e subscrições.');
  return getCurrentLocalUser();
}

export function listLocalSubscriptions(): LocalSubscription[] {
  const user = getCurrentLocalUser();
  if (!canUseLocalBilling()) return [];
  const rows = readSubscriptions();
  return user.role === 'superadmin' ? rows : rows.filter((row) => row.companyId === user.companyId);
}

export function subscriptionStatus(subscription: LocalSubscription, today = localDate()) {
  if (subscription.status === 'active' && subscription.expiresAt < today) return 'expired';
  if (subscription.status === 'active' && subscription.startedAt > today) return 'scheduled';
  return subscription.status;
}

export function calculateLocalPlanChange(subscription: LocalSubscription, target: LocalPlan, today = localDate()) {
  if (!LOCAL_PLANS.includes(target) || !validSubscriptionDate(today)) throw new Error('Plano ou data inválidos.');
  const day = (date: string) => new Date(`${date}T00:00:00Z`).getTime() / 86400000;
  const totalDays = Math.max(1, day(subscription.expiresAt) - day(subscription.startedAt));
  const remainingDays = Math.max(0, Math.min(totalDays, day(subscription.expiresAt) - day(today)));
  const credit = LOCAL_PLAN_PRICES[subscription.plan] * remainingDays / totalDays;
  const targetCost = LOCAL_PLAN_PRICES[target] * remainingDays / totalDays;
  const difference = Math.round((targetCost - credit) * 100) / 100;
  const direction = target === subscription.plan ? 'same'
    : LOCAL_PLAN_PRICES[target] > LOCAL_PLAN_PRICES[subscription.plan] ? 'upgrade' : 'downgrade';
  return { direction, totalDays, remainingDays, credit, targetCost, payable: Math.max(0, difference), balance: Math.max(0, -difference) };
}

function validateInput(input: LocalSubscriptionInput): LocalSubscriptionInput {
  const company = getLocalCompany(input.companyId);
  if (!company || !company.active) throw new Error('Selecione uma empresa ativa.');
  if (!listLocalUsers().some((user) => user.active && user.role === 'admin' && user.companyId === company.id)) {
    throw new Error('A empresa tem de ter um Admin ativo associado.');
  }
  if (!LOCAL_PLANS.includes(input.plan)) throw new Error('Plano inválido.');
  if (!['active', 'inactive', 'canceled'].includes(input.status)) throw new Error('Estado inválido.');
  if (!validSubscriptionDate(input.startedAt) || !validSubscriptionDate(input.expiresAt)
    || input.expiresAt <= input.startedAt) throw new Error('A renovação deve ser posterior à data de início.');
  if (input.billingEmail && !/^\S+@\S+\.\S+$/.test(input.billingEmail.trim())) throw new Error('Email de faturação inválido.');
  return { ...input, billingName: input.billingName.trim(), billingEmail: input.billingEmail.trim().toLowerCase(),
    nif: input.nif.trim(), address: input.address.trim() };
}

export function createLocalSubscription(input: LocalSubscriptionInput) {
  const user = requireBilling();
  if (user.role !== 'superadmin') throw new Error('Só o Super Admin pode registar subscrições de clientes.');
  const validated = validateInput(input);
  const rows = readSubscriptions();
  if (rows.some((row) => row.companyId === input.companyId)) throw new Error('Esta empresa já tem uma subscrição. Edite o registo existente.');
  const now = new Date().toISOString();
  const row: LocalSubscription = { ...validated, id: `subscription-${makeId()}`, createdAt: now, updatedAt: now,
    history: [{ id: makeId(), date: now, action: 'Subscrição registada', oldPlan: null, newPlan: validated.plan }] };
  writeSubscriptions([...rows, row]);
  return row;
}

export function updateLocalSubscription(id: string, input: Omit<LocalSubscriptionInput, 'companyId'>) {
  const user = requireBilling();
  if (user.role !== 'superadmin') throw new Error('Só o Super Admin pode editar os dados e a validade da subscrição.');
  const rows = readSubscriptions();
  const previous = rows.find((row) => row.id === id);
  if (!previous) throw new Error('A subscrição não existe.');
  const validated = validateInput({ ...input, companyId: previous.companyId });
  const now = new Date().toISOString();
  const updated: LocalSubscription = { ...previous, ...validated, updatedAt: now,
    history: [{ id: makeId(), date: now, action: 'Dados da subscrição atualizados', oldPlan: previous.plan, newPlan: validated.plan }, ...previous.history] };
  writeSubscriptions(rows.map((row) => row.id === id ? updated : row));
  return updated;
}

export function changeLocalSubscriptionPlan(id: string, plan: LocalPlan, expectedPlan?: LocalPlan) {
  const user = requireBilling();
  if (!LOCAL_PLANS.includes(plan)) throw new Error('Plano inválido.');
  const rows = readSubscriptions();
  const previous = rows.find((row) => row.id === id);
  if (!previous) throw new Error('A subscrição não existe.');
  if (user.role !== 'superadmin' && previous.companyId !== user.companyId) throw new Error('Não pode alterar subscrições de outra empresa.');
  if (expectedPlan && expectedPlan !== previous.plan) throw new Error('O plano foi alterado entretanto. Reveja a subscrição.');
  if (plan === previous.plan) return previous;
  const now = new Date().toISOString();
  const updated: LocalSubscription = { ...previous, plan, updatedAt: now,
    history: [{ id: makeId(), date: now, action: LOCAL_PLAN_PRICES[plan] > LOCAL_PLAN_PRICES[previous.plan] ? 'Upgrade em modo local' : 'Downgrade em modo local', oldPlan: previous.plan, newPlan: plan }, ...previous.history] };
  writeSubscriptions(rows.map((row) => row.id === id ? updated : row));
  return updated;
}

export function getLocalBillingOverview() {
  const actor = requireBilling();
  if (actor.role !== 'superadmin') throw new Error('Visão global reservada ao Super Admin.');
  const companies = listLocalCompanies();
  const users = listLocalUsers();
  const subscriptions = readSubscriptions();
  return companies.map((company) => {
    const admins = users.filter((user) => user.role === 'admin' && user.companyId === company.id && user.active);
    const owner = admins.find((user) => user.id === company.ownerAdminUserId) || admins[0] || null;
    return { company, admin: owner, subscription: subscriptions.find((row) => row.companyId === company.id) || null,
      membersCount: users.filter((user) => user.role !== 'superadmin' && user.companyId === company.id && user.active).length };
  });
}
