import { portugueseNifError } from './portuguese-nif';

export const companyFieldLabels = {
  name: 'Nome da empresa', legal_name: 'Nome legal', nif: 'NIF', address: 'Morada',
  city: 'Localidade', postal_code: 'Código postal', phone: 'Telefone',
  contact_email: 'Email de contacto', contact_name: 'Responsável de contacto', website: 'Website',
  active: 'Estado da empresa', suspension_reason: 'Motivo da suspensão',
} as const;
export type CompanyField = keyof typeof companyFieldLabels;
export type CompanyDetailsValues = Record<Exclude<CompanyField, 'active'>, string> & { active: boolean };
export type CompanyDetails = CompanyDetailsValues & {
  id: string; details_version: number; updated_at: string;
};
export type CompanyChange = {
  id: string; version: number; actor_name: string; actor_role: 'superadmin' | 'admin';
  before_data: Partial<CompanyDetailsValues>; after_data: Partial<CompanyDetailsValues>;
  changed_fields: CompanyField[]; reason: string; created_at: string; unread: boolean;
};
export type CompanyDetailsSnapshot = { company: CompanyDetails; changes: CompanyChange[]; pendingChanges?: CompanyChange[]; canSetStatus: boolean; hasMore: boolean };
export type CompanyDetailsInput = { companyId: string; version: number; values: Partial<CompanyDetailsValues>; reason: string };
export class CompanyDetailsError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}
const limits: Record<Exclude<CompanyField, 'active'>, number> = {
  name: 200, legal_name: 250, nif: 9, address: 500, city: 120, postal_code: 20,
  phone: 30, contact_email: 254, contact_name: 200, website: 500, suspension_reason: 1000,
};

export function validateCompanyInput(input: unknown, superadmin: boolean): CompanyDetailsInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CompanyDetailsError('O pedido é inválido.');
  const body = input as Record<string, unknown>;
  if (typeof body.companyId !== 'string' || !body.companyId.trim() || body.companyId.length > 200) throw new CompanyDetailsError('Seleciona uma empresa válida.');
  if (!Number.isSafeInteger(body.version) || Number(body.version) < 0) throw new CompanyDetailsError('A versão da ficha é inválida. Recarrega os dados.');
  if (!body.values || typeof body.values !== 'object' || Array.isArray(body.values)) throw new CompanyDetailsError('Os dados da empresa são inválidos.');
  const values: Partial<CompanyDetailsValues> = {};
  for (const [key, value] of Object.entries(body.values)) {
    if (!(key in companyFieldLabels) || !Object.hasOwn(companyFieldLabels, key)) throw new CompanyDetailsError('O pedido contém campos que não podem ser alterados.');
    if (!superadmin && (key === 'active' || key === 'suspension_reason')) throw new CompanyDetailsError('Só o Super Admin pode alterar o estado da empresa.', 403);
    if (key === 'active') {
      if (typeof value !== 'boolean') throw new CompanyDetailsError('O estado da empresa é inválido.');
      values.active = value;
    } else {
      if (typeof value !== 'string' || value.length > limits[key as Exclude<CompanyField, 'active'>]) throw new CompanyDetailsError(`O campo ${companyFieldLabels[key as CompanyField]} é inválido ou demasiado longo.`);
      values[key as Exclude<CompanyField, 'active'>] = value.trim();
    }
  }
  if (!Object.keys(values).length) throw new CompanyDetailsError('Não há dados para guardar.');
  if (values.name !== undefined && !values.name) throw new CompanyDetailsError('Indica o nome da empresa.');
  if (values.nif) { const error = portugueseNifError(values.nif); if (error) throw new CompanyDetailsError(error); }
  if (values.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email)) throw new CompanyDetailsError('Indica um email de contacto válido.');
  if (values.phone && !/^\+?[\d\s()-]{6,30}$/.test(values.phone)) throw new CompanyDetailsError('Indica um telefone válido, com indicativo quando necessário.');
  if (values.website) {
    try { const url = new URL(values.website); if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error(); }
    catch { throw new CompanyDetailsError('Indica o website completo, começando por https://.'); }
  }
  if (values.active === false && !values.suspension_reason) throw new CompanyDetailsError('Indica o motivo da suspensão.');
  if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 1000)) throw new CompanyDetailsError('O motivo da alteração é demasiado longo.');
  return { companyId: body.companyId.trim(), version: Number(body.version), values, reason: typeof body.reason === 'string' ? body.reason.trim() : '' };
}

export function companyValues(company: CompanyDetailsValues, canSetStatus: boolean): Partial<CompanyDetailsValues> {
  const values: Partial<CompanyDetailsValues> = {};
  for (const key of Object.keys(companyFieldLabels) as CompanyField[]) {
    if (!canSetStatus && (key === 'active' || key === 'suspension_reason')) continue;
    if (key === 'active') values.active = company.active;
    else values[key] = company[key] || '';
  }
  return values;
}

export function companyChangeValue(value: unknown) {
  return typeof value === 'boolean' ? value ? 'Ativa' : 'Suspensa' : typeof value === 'string' && value ? value : 'Não registado';
}
