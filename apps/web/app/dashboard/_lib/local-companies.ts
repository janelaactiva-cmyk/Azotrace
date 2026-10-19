import { onlineCompanies } from './online-state';
export type LocalCompany = {
  id: string;
  name: string;
  ownerAdminUserId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const COMPANIES_KEY = 'azotrace:local-companies:v1';
export const DEFAULT_COMPANY_ID = 'company-local-default';
export const LOCAL_COMPANIES_EVENT = 'azotrace:local-companies-changed';

function defaultCompany(): LocalCompany {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_COMPANY_ID,
    name: 'Empresa de Demonstração',
    ownerAdminUserId: 'local-admin',
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function makeLocalCompanyId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `company-${crypto.randomUUID()}`;
  }
  return `company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listLocalCompanies(): LocalCompany[] { return onlineCompanies; }

export function saveLocalCompanies(_companies: LocalCompany[]) { throw new Error('Use a gestão de empresas Supabase.'); }

export function getLocalCompany(id?: string | null) {
  if (!id) return null;
  return listLocalCompanies().find((company) => company.id === id) ?? null;
}

export function upsertLocalCompany(company: LocalCompany) {
  const companies = listLocalCompanies();
  const index = companies.findIndex((item) => item.id === company.id);
  if (index >= 0) companies[index] = company;
  else companies.push(company);
  saveLocalCompanies(companies);
}

export function createLocalCompany(name: string, ownerAdminUserId?: string): LocalCompany {
  const now = new Date().toISOString();
  const company: LocalCompany = {
    id: makeLocalCompanyId(),
    name: name.trim() || 'Nova empresa',
    ownerAdminUserId,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  upsertLocalCompany(company);
  return company;
}

export function assignCompanyOwner(companyId: string, ownerAdminUserId: string) {
  const company = getLocalCompany(companyId);
  if (!company) return;
  upsertLocalCompany({
    ...company,
    ownerAdminUserId,
    updatedAt: new Date().toISOString(),
  });
}
