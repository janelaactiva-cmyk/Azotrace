import { NextResponse } from 'next/server';
import { verifiedOnlineUser } from '../_lib/online-auth';
import { mergeWorkspace, WorkspaceConflict } from '../_lib/workspace-patch';
import { sameJson } from '../../../dashboard/_lib/workspace-merge';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
export async function POST(request: Request) {
  try {
    const user = await verifiedOnlineUser(request);
    const { state, base } = await request.json();
    const id = state?.business?.id;
    if (!user.active || !user.companyId || !id || base?.business?.id !== id || (user.role !== 'admin' && !user.businessIds.includes(id))) {
      return NextResponse.json({ error: 'Sem acesso ao negócio.' }, { status: 403 });
    }
    const admin = getSupabaseAdminClient();
    const { data: row, error } = await admin.from('producer_workspaces').select('state, company_id, updated_at').eq('business_id', id).eq('company_id', user.companyId).maybeSingle();
    if (error) throw error;
    if (!row) return NextResponse.json({ error: 'Negócio não encontrado.' }, { status: 404 });
    if (state.business.companyId !== user.companyId) throw new Error('Empresa inválida.');
    const merged = mergeWorkspace(row.state, base, state, user.permissions);
    if (sameJson(merged, row.state)) return NextResponse.json({ state: merged }, { headers: { 'Cache-Control': 'no-store' } });
    const updatedAt = new Date(Math.max(Date.now(), Date.parse(row.updated_at) + 1)).toISOString();
    const saved = await admin.from('producer_workspaces').update({ state: merged, business_name: merged.business.name, business_kind: merged.business.kind, accent_color: merged.business.accentColor, completed: merged.completed, updated_at: updatedAt }).eq('business_id', id).eq('company_id', user.companyId).eq('updated_at', row.updated_at).select('business_id');
    if (saved.error) throw saved.error;
    if (!saved.data?.length) return NextResponse.json({ code: 'WORKSPACE_CHANGED', error: 'Outro utilizador guardou alterações. Tenta guardar novamente.' }, { status: 409 });
    return NextResponse.json({ state: merged }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    return NextResponse.json({ code: cause instanceof WorkspaceConflict ? 'WORKSPACE_CONFLICT' : 'INVALID_REQUEST', error: cause instanceof Error ? cause.message : 'Não foi possível guardar.' }, { status: cause instanceof WorkspaceConflict ? 409 : 400 });
  }
}
