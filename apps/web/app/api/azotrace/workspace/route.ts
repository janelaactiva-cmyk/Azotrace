import { NextResponse } from 'next/server';
import { verifiedOnlineUser } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { requireOnboardingPayment } from '~/lib/confirmed-payment';
export async function POST(request: Request) {
  try {
    const user = await verifiedOnlineUser(request);
    if (user.role !== 'admin' || !user.companyId || !user.permissions.includes('business.manage')) return NextResponse.json({ error: 'Só o Admin pode guardar a configuração do negócio.' }, { status: 403 });
    await requireOnboardingPayment(user.companyId);
    const { state } = await request.json();
    const business = state?.business;
    if (!business || typeof business.id !== 'string' || !business.id || business.companyId !== user.companyId || typeof business.name !== 'string' || typeof business.kind !== 'string') return NextResponse.json({ error: 'Negócio inválido ou de outra empresa.' }, { status: 400 });
    const admin = getSupabaseAdminClient();
    const existing = await admin.from('producer_workspaces').select('company_id').eq('business_id', business.id).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data && existing.data.company_id !== user.companyId) return NextResponse.json({ error: 'O negócio pertence a outra empresa.' }, { status: 403 });
    const row = { business_id: business.id, company_id: user.companyId, owner_user_id: user.id, business_name: business.name, business_kind: business.kind, accent_color: business.accentColor || '#47B37D', completed: state.completed === true, state, updated_at: new Date().toISOString() };
    const result = existing.data ? await admin.from('producer_workspaces').update(row).eq('business_id', business.id).eq('company_id', user.companyId) : await admin.from('producer_workspaces').insert(row);
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível guardar o negócio.' }, { status: 400 }); }
}
