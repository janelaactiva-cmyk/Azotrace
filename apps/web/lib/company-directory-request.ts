import { supabase } from '~/lib/supabase';
import { withAuthTimeout } from '~/lib/auth-navigation';
import type { DirectoryCompany } from './company-directory';

export type CompanyDirectorySnapshot = { companies: DirectoryCompany[]; refreshedAt: string };
export async function loadCompanyDirectory(signal: AbortSignal): Promise<CompanyDirectorySnapshot> {
  const { data, error } = await withAuthTimeout(supabase.auth.getSession(), 'A sessão demorou a responder. Tenta novamente.');
  if (signal.aborted) throw new Error('Pedido cancelado.');
  if (error || !data.session) throw new Error('Inicia sessão para consultar as empresas.');
  const response = await fetch('/api/azotrace/company-directory', {
    cache: 'no-store', signal,
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Não foi possível carregar as empresas.');
  if (!result || !Array.isArray(result.companies)) throw new Error('A resposta das empresas é inválida.');
  return result;
}
