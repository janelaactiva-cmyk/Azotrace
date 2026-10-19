import { NextRequest, NextResponse } from 'next/server';

import { verifiedOnlineUser } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifiedOnlineUser(request);
    if (user.role !== 'superadmin') return jsonError('Área reservada ao Super Admin.', 403);
    const admin = getSupabaseAdminClient();

    const [companiesResult, workspacesResult, subscriptionsResult, profilesResult, membersResult] = await Promise.all([
      admin
        .from('azotrace_companies')
        .select('id, name, owner_admin_user_id, active'),
      admin
        .from('producer_workspaces')
        .select('business_id, company_id, business_name, business_kind, completed, updated_at')
        .order('updated_at', { ascending: false }),
      admin
        .from('subscriptions')
        .select('id, company_id, plan_name, status, started_at, expires_at, created_at')
        .order('started_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).order('id', { ascending: false }),
      admin
        .from('profiles')
        .select('id, email, name, active'),
      admin
        .from('azotrace_company_members')
        .select('company_id, user_id, role, app_role, active'),
    ]);

    const firstError = [companiesResult.error, workspacesResult.error, subscriptionsResult.error, profilesResult.error, membersResult.error]
      .find(Boolean);
    if (firstError) return jsonError(firstError.message, 500);

    const companies = companiesResult.data || [];
    const workspaces = workspacesResult.data || [];
    const subscriptions = (subscriptionsResult.data || []).map((row: any) => ({ ...row, status: row.status === 'active' ? (!row.expires_at || !row.started_at ? 'unknown' : new Date(row.expires_at).getTime() <= Date.now() ? 'expired' : new Date(row.started_at).getTime() > Date.now() ? 'scheduled' : 'active') : row.status }));
    const profiles = profilesResult.data || [];
    const members = membersResult.data || [];

    const profileById = new Map(profiles.map((row: any) => [String(row.id), row]));

    const newestSubscriptionByCompanyId = new Map<string, any>();
    for (const subscription of subscriptions as any[]) {
      if (!subscription.company_id) continue;
      const companyId = String(subscription.company_id);
      if (!newestSubscriptionByCompanyId.has(companyId)) newestSubscriptionByCompanyId.set(companyId, subscription);
    }

    const clients = companies.map((company: any) => {
      const owner = company.owner_admin_user_id ? profileById.get(String(company.owner_admin_user_id)) : null;
      const fallbackAdminMembership = members.find((member: any) =>
        String(member.company_id) === String(company.id) && member.role === 'admin' && member.active !== false,
      );
      const adminProfile = owner || (fallbackAdminMembership ? profileById.get(String(fallbackAdminMembership.user_id)) : null);
      const subscription = newestSubscriptionByCompanyId.get(String(company.id)) || null;
      const businessRows = workspaces.filter((row: any) => String(row.company_id) === String(company.id));
      const companyMembers = members.filter((row: any) => String(row.company_id) === String(company.id) && row.active !== false);

      return {
        id: String(company.id),
        name: String(company.name || 'Cliente'),
        active: company.active !== false,
        admin: adminProfile
          ? {
              id: String(adminProfile.id),
              name: String(adminProfile.name || adminProfile.email || 'Admin'),
              email: String(adminProfile.email || ''),
              active: adminProfile.active !== false,
            }
          : null,
        subscription: subscription
          ? {
              id: String(subscription.id),
              plan: String(subscription.plan_name || 'Plano por identificar'),
              status: String(subscription.status || 'inactive'),
              startedAt: subscription.started_at || null,
              expiresAt: subscription.expires_at || null,
            }
          : null,
        businesses: businessRows.map((row: any) => ({
          id: String(row.business_id),
          name: String(row.business_name || 'Negócio'),
          kind: String(row.business_kind || 'Produção'),
          completed: row.completed === true,
          updatedAt: row.updated_at || null,
        })),
        membersCount: companyMembers.length,
      };
    });

    return NextResponse.json({
      clients,
      totals: {
        clients: clients.length,
        unassignedSubscriptions: subscriptions.filter((row: any) => !row.company_id).length,
        activeSubscriptions: clients.filter((client: any) => client.active && client.subscription?.status === 'active').length,
        businesses: workspaces.length,
        users: members.filter((member: any) => member.active !== false).length,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: any) {
    return jsonError(error?.message || 'Não foi possível carregar a visão global.', 500);
  }
}
