import { verifiedOnlineSession } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { canReadBusinessChain, projectBusinessChain } from '~/lib/business-blockchain';

const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request: Request) {
  let session;
  try { session = await verifiedOnlineSession(request); }
  catch { return reply({ error: 'Inicia sessão e confirma o MFA, se estiver ativo.' }, 401); }
  const user = session.user;
  if (!user.active || user.role !== 'superadmin' && !user.permissions.includes('blockchain.view')) return reply({ error: 'Não tens acesso à rastreabilidade deste negócio.' }, 403);
  const url = new URL(request.url), mode = url.searchParams.get('mode'), companyId = url.searchParams.get('companyId') || user.companyId || '';
  const rawOffset = url.searchParams.get('offset') || '0';
  if (!/^\d{1,7}$/.test(rawOffset)) return reply({ error: 'Página inválida.' }, 400);
  const offset = Number(rawOffset);
  try {
    const db = getSupabaseAdminClient();
    if (mode === 'companies') {
      let query = db.from('azotrace_companies').select('id,name').order('name').order('id').range(offset, offset + 100);
      if (user.role !== 'superadmin') {
        if (!user.companyId) return reply({ items: [], hasMore: false });
        query = query.eq('id', user.companyId).eq('active', true);
      }
      const result = await query;
      if (result.error) throw result.error;
      return reply({ items: (result.data || []).slice(0, 100), hasMore: (result.data || []).length > 100 });
    }
    if (mode === 'businesses') {
      if (!companyId || user.role !== 'superadmin' && companyId !== user.companyId) return reply({ error: 'Não tens acesso a esta empresa.' }, 403);
      let query = db.from('producer_workspaces').select('business_id,business_name,business_kind,company_id').eq('company_id', companyId).order('business_name').order('business_id').range(offset, offset + 100);
      if (user.role !== 'superadmin' && user.role !== 'admin') query = query.in('business_id', user.businessIds.length ? user.businessIds : ['__none__']);
      const result = await query;
      if (result.error) throw result.error;
      return reply({ items: (result.data || []).slice(0, 100).map(row => ({ id: row.business_id, name: row.business_name, kind: row.business_kind, companyId: row.company_id })), hasMore: (result.data || []).length > 100 });
    }
    const businessId = url.searchParams.get('businessId');
    if (!businessId || businessId.length > 200) return reply({ error: 'Seleciona um negócio.' }, 400);
    // Scope is checked before fetching production content with the server client.
    const summary = await db.from('producer_workspaces').select('business_id,company_id,business_name,business_kind,updated_at').eq('business_id', businessId).maybeSingle();
    if (summary.error) throw summary.error;
    if (!summary.data) return reply({ error: 'Negócio não encontrado.' }, 404);
    const business = { id: summary.data.business_id, companyId: summary.data.company_id, name: summary.data.business_name, kind: summary.data.business_kind, updatedAt: summary.data.updated_at };
    if (!canReadBusinessChain(user, business)) return reply({ error: 'Não tens acesso a este negócio.' }, 403);
    const company = await db.from('azotrace_companies').select('id,name,active').eq('id', business.companyId).maybeSingle();
    if (company.error) throw company.error;
    if (!company.data || user.role !== 'superadmin' && !company.data.active) return reply({ error: 'A empresa não está disponível.' }, 403);
    const workspace = await db.from('producer_workspaces').select('state').eq('business_id', business.id).eq('company_id', business.companyId).maybeSingle();
    if (workspace.error) throw workspace.error;
    if (!workspace.data) return reply({ error: 'Os dados deste negócio já não estão disponíveis.' }, 404);
    const batchId = url.searchParams.get('batchId') || '';
    if (batchId.length > 200) return reply({ error: 'Lote inválido.' }, 400);
    try { return reply(projectBusinessChain(business, company.data.name, workspace.data.state, batchId, offset)); }
    catch { return reply({ error: 'Não foi possível consultar este lote do negócio.' }, 404); }
  } catch { return reply({ error: 'Não foi possível carregar os dados reais do negócio. Tenta novamente.' }, 503); }
}
