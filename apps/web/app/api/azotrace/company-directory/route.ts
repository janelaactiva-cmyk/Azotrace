import { verifiedOnlineUser } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { buildCompanyDirectory, type CompanyRow, type CompanyMemberRow, type CompanyProfileRow, type CompanyBusinessRow, type CompanyBillingRow } from '~/lib/company-directory';

// Read every page: Supabase's default row limit must not silently truncate counts.
async function allRows<T>(query: (start: number, end: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<T[]> {
  const result: T[] = [];
  const size = 500;
  for (let start = 0; ; start += size) {
    const { data, error } = await query(start, start + size - 1);
    if (error || !data) throw new Error('Não foi possível consultar os registos.');
    result.push(...data as T[]);
    if (data.length < size) return result;
  }
}

export async function GET(request: Request) {
  try {
    const user = await verifiedOnlineUser(request);
    if (!user.active || user.role !== 'superadmin') return Response.json({ error: 'Esta área é exclusiva do Super Admin.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Inicia sessão e confirma o MFA, se estiver ativo.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }
  try {
    const admin = getSupabaseAdminClient();
    const [companies, members, businesses, subscriptions] = await Promise.all([
      allRows<CompanyRow>((start, end) => admin.from('azotrace_companies').select('id,name,active,owner_admin_user_id,created_at,updated_at,nif,legal_name,contact_name,contact_email').order('id').range(start, end)),
      allRows<CompanyMemberRow>((start, end) => admin.from('azotrace_company_members').select('company_id,user_id,role,app_role,active,created_at,updated_at').order('company_id').order('user_id').range(start, end)),
      allRows<CompanyBusinessRow>((start, end) => admin.from('producer_workspaces').select('company_id,business_id,business_name,business_kind,completed,created_at,updated_at').order('business_id').range(start, end)),
      allRows<CompanyBillingRow>((start, end) => admin.from('subscriptions').select('id,company_id,plan_name,nome_empresa,nome,email,nif_empresa,nif,morada,created_at').not('company_id', 'is', null).order('id').range(start, end)),
    ]);
    const ids = [...new Set([...members.map(row => row.user_id), ...companies.map(row => row.owner_admin_user_id).filter((id): id is string => Boolean(id))])];
    const profiles: CompanyProfileRow[] = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const group = ids.slice(offset, offset + 100);
      profiles.push(...await allRows<CompanyProfileRow>((start, end) => admin.from('profiles').select('id,name,email,active').in('id', group).order('id').range(start, end)));
    }
    return Response.json({ companies: buildCompanyDirectory({ companies, members, profiles, businesses, subscriptions }), refreshedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Não foi possível carregar as empresas. Confirma a ligação ao Supabase e as tabelas da plataforma e tenta novamente.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
