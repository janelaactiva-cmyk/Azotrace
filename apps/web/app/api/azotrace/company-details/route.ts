import { verifiedOnlineSession } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { CompanyDetailsError, companyFieldLabels, validateCompanyInput } from '~/lib/company-details';
import type { CompanyChange, CompanyDetails, CompanyDetailsInput } from '~/lib/company-details';

const columns = 'id,details_version,updated_at,' + Object.keys(companyFieldLabels).join(',');
const changeColumns = 'id,version,actor_id,actor_name,actor_role,before_data,after_data,changed_fields,reason,created_at';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function context(request: Request, requested?: string | null, writing = false) {
  let session;
  try { session = await verifiedOnlineSession(request); }
  catch { throw new CompanyDetailsError('Inicia sessão e confirma o MFA, se estiver ativo.', 401); }
  const { user, target } = session;
  if (!user.active || !['admin', 'superadmin'].includes(user.role)) throw new CompanyDetailsError('Só o admin da empresa e o Super Admin podem consultar esta ficha.', 403);
  if (writing && target) throw new CompanyDetailsError('Sai do modo de consulta de outra conta antes de guardar alterações.', 403);
  const companyId = requested || user.companyId;
  if (!companyId || companyId.length > 200) throw new CompanyDetailsError('Seleciona uma empresa válida.');
  if (user.role !== 'superadmin' && companyId !== user.companyId) throw new CompanyDetailsError('Só podes aceder aos dados da tua empresa.', 403);
  return { user, companyId, db: getSupabaseAdminClient() };
}
function fail(cause: unknown) {
  return cause instanceof CompanyDetailsError ? reply({ error: cause.message }, cause.status)
    : reply({ error: 'Não foi possível consultar ou guardar os dados da empresa. Tenta novamente.' }, 503);
}
async function body(request: Request) {
  const text = await request.text();
  if (text.length > 24000) throw new CompanyDetailsError('O pedido é demasiado longo.', 413);
  try { return JSON.parse(text) as unknown; } catch { throw new CompanyDetailsError('O pedido é inválido.'); }
}
function errorFromDb(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '40001') throw new CompanyDetailsError('A ficha foi alterada entretanto. Recarrega os dados antes de guardar.', 409);
  if (error.code === '42501') throw new CompanyDetailsError('Não tens permissão para alterar esta empresa.', 403);
  if (error.code === 'P0002') throw new CompanyDetailsError('Empresa não encontrada.', 404);
  if (error.code === '22023') throw new CompanyDetailsError('Confirma os campos e o motivo da suspensão.');
  if (['42703', '42P01', 'PGRST202', 'PGRST204', 'PGRST205'].includes(error.code || '')) throw new CompanyDetailsError('A atualização dos dados de empresas ainda não está disponível. Contacta a equipa Azotrace.', 503);
  throw new Error('Falha no armazenamento.');
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { user, companyId, db } = await context(request, url.searchParams.get('companyId'));
    const company = await db.from('azotrace_companies').select(columns).eq('id', companyId).maybeSingle();
    errorFromDb(company.error);
    if (!company.data) throw new CompanyDetailsError('Empresa não encontrada.', 404);
    const current = company.data as unknown as CompanyDetails;
    if (!current.active && user.role !== 'superadmin') throw new CompanyDetailsError('A empresa está suspensa.', 403);
    const notifications = url.searchParams.get('notifications') === '1';
    const pending = user.role === 'admin' ? await db.rpc('az_pending_company_changes', { p_company_id: companyId, p_user_id: user.id }) : { data: [], error: null };
    errorFromDb(pending.error);
    const pendingChanges = (pending.data || []).map(({ actor_id: _actor, company_id: _company, ...row }: Record<string, unknown>) => ({ ...row, unread: true })) as CompanyChange[];
    if (notifications) return reply({ notifications: pendingChanges.map(({ id, changed_fields, created_at }) => ({ id, changed_fields, created_at })) });
    let query = db.from('azotrace_company_changes').select(changeColumns).eq('company_id', companyId).order('version', { ascending: false }).limit(21);
    const before = url.searchParams.get('beforeVersion');
    if (before !== null) {
      if (!/^[1-9]\d{0,8}$/.test(before)) throw new CompanyDetailsError('A página de histórico é inválida.');
      query = query.lt('version', Number(before));
    }
    const changes = await query;
    errorFromDb(changes.error);
    const rows = changes.data || [];
    const receipts = rows.length ? await db.from('azotrace_company_change_receipts').select('change_id').eq('user_id', user.id).in('change_id', rows.map(row => row.id)) : { data: [], error: null };
    errorFromDb(receipts.error);
    const seen = new Set((receipts.data || []).map(row => row.change_id));
    const mapped = rows.slice(0, 20).map(({ actor_id, ...row }) => ({ ...row, unread: row.actor_role === 'superadmin' && actor_id !== user.id && !seen.has(row.id) })) as CompanyChange[];
    return reply({ company: current, changes: mapped, pendingChanges, hasMore: rows.length > 20, canSetStatus: user.role === 'superadmin' });
  } catch (cause) { return fail(cause); }
}

export async function PUT(request: Request) {
  try {
    // Authorize before parsing user-supplied editable fields.
    const raw = await body(request);
    const requested = raw && typeof raw === 'object' && 'companyId' in raw ? (raw as { companyId: unknown }).companyId : null;
    if (typeof requested !== 'string') throw new CompanyDetailsError('Seleciona uma empresa válida.');
    const { user, companyId, db } = await context(request, requested, true);
    const input: CompanyDetailsInput = validateCompanyInput(raw, user.role === 'superadmin');
    const result = await db.rpc('az_update_company_details', { p_company_id: companyId, p_actor_id: user.id, p_version: input.version, p_values: input.values, p_reason: input.reason });
    errorFromDb(result.error);
    return reply({ changed: Boolean(result.data?.changed), version: result.data?.company?.details_version });
  } catch (cause) { return fail(cause); }
}

export async function POST(request: Request) {
  try {
    const raw = await body(request) as { companyId?: unknown; changeIds?: unknown } | null;
    if (!raw || typeof raw.companyId !== 'string' || !Array.isArray(raw.changeIds) || !raw.changeIds.length || raw.changeIds.length > 20 || !raw.changeIds.every(id => typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(id))) throw new CompanyDetailsError('Seleciona os avisos a marcar como lidos.');
    const { user, companyId, db } = await context(request, raw.companyId, true);
    const company = await db.from('azotrace_companies').select('id,active').eq('id', companyId).maybeSingle();
    errorFromDb(company.error);
    if (!company.data || !company.data.active && user.role !== 'superadmin') throw new CompanyDetailsError('A empresa não está disponível.', 403);
    const changes = await db.from('azotrace_company_changes').select('id').eq('company_id', companyId).in('id', raw.changeIds);
    errorFromDb(changes.error);
    if (changes.data?.length !== raw.changeIds.length) throw new CompanyDetailsError('Alguns avisos não pertencem a esta empresa.', 403);
    const result = await db.from('azotrace_company_change_receipts').upsert(raw.changeIds.map(change_id => ({ change_id, user_id: user.id })), { onConflict: 'change_id,user_id', ignoreDuplicates: true });
    errorFromDb(result.error);
    return reply({ acknowledged: true });
  } catch (cause) { return fail(cause); }
}
