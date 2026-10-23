export type CompanyPrivacy = { company_id: string; draft_content: string; published_content: string | null; version: number; updated_at: string | null; published_at: string | null };
export type PrivacyCompany = { id: string; name: string; active: boolean };
export function validatePrivacyInput(input: unknown) {
 if (!input || typeof input !== 'object') throw new Error('Dados inválidos.');
 const value = input as Record<string, unknown>;
 if (typeof value.companyId !== 'string' || !value.companyId || value.companyId.length > 200) throw new Error('Seleciona uma empresa.');
 if (typeof value.content !== 'string' || value.content.length > 100000) throw new Error('O texto deve ter até 100 000 caracteres.');
 if (!Number.isSafeInteger(value.version) || Number(value.version) < 0 || Number(value.version) >= Number.MAX_SAFE_INTEGER) throw new Error('Versão inválida. Recarrega o documento.');
 if (!['save', 'publish'].includes(String(value.action))) throw new Error('Operação inválida.');
 if (value.action === 'publish' && !value.content.trim()) throw new Error('Escreve a política antes de publicar.');
 return { companyId: value.companyId, content: value.content, version: value.version as number, action: value.action as 'save' | 'publish' };
}
export function companyPrivacyUrl(companyId: string) { return '/privacy/empresa/' + encodeURIComponent(companyId); }

export const PLATFORM_PRIVACY_ID = 'azotrace-platform';
