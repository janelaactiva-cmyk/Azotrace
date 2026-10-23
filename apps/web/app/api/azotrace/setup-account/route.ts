import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { requireConfirmedPayment } from '~/lib/confirmed-payment';

const permissions = ['dashboard.view', 'production.read', 'production.write', 'products.manage', 'lots.manage', 'traceability.manage', 'reports.view', 'blockchain.view', 'business.manage', 'users.manage', 'rgpd.manage', 'security.view', 'billing.manage'];

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return Response.json({ error: 'Inicia sessão para configurar a conta.' }, { status: 401, headers });
    const admin = getSupabaseAdminClient();
    const { data: identity, error: identityError } = await admin.auth.getUser(token);
    if (identityError || !identity.user) return Response.json({ error: 'Sessão inválida ou expirada.' }, { status: 401, headers });
    const user = identity.user;
    if (user.factors?.some(factor => factor.status === 'verified')) {
      const { data: claims, error: claimsError } = await admin.auth.getClaims(token);
      if (claimsError || claims?.claims?.aal !== 'aal2') return Response.json({ error: 'Confirma o código do MFA já ativo nesta conta.' }, { status: 403, headers });
    }
    const [profileResult, membershipResult] = await Promise.all([
      admin.from('profiles').select('id,name,active,platform_role').eq('id', user.id).single(),
      admin.from('azotrace_company_members').select('company_id,active,role').eq('user_id', user.id),
    ]);
    const { data: profile, error: profileError } = profileResult;
    if (profileError || !profile) throw new Error('Não foi possível carregar o perfil da conta.');
    if (!profile.active) return Response.json({ error: 'A conta está inativa. Contacta o administrador.' }, { status: 403, headers });
    if (profile.platform_role === 'superadmin') return Response.json({ ready: true }, { headers });
    const { data: memberships, error: membershipError } = membershipResult;
    if (membershipError) throw new Error('Não foi possível verificar a empresa da conta.');
    const activeMembership = memberships?.find(row => row.active);
    if (activeMembership) {
      if (activeMembership.role === 'admin') await requireConfirmedPayment({ companyId: activeMembership.company_id, email: user.email });
      return Response.json({ ready: true }, { headers });
    }
    if (memberships?.length) return Response.json({ error: 'A associação da conta à empresa está inativa. Contacta o administrador.' }, { status: 403, headers });

    if (!user.email || !user.email_confirmed_at) return Response.json({ error: 'Confirma o email da conta.' }, { status: 403, headers });
    const license = await requireConfirmedPayment({ email: user.email });
    const companyId = `company-${user.id}`;
    if (license.company_id && license.company_id !== companyId) return Response.json({ error: 'O pagamento está associado a outra empresa.' }, { status: 403, headers });
    const name = `${profile.name || user.email?.split('@')[0] || 'Nova empresa'}`.slice(0, 180);
    const { error: companyError } = await admin.from('azotrace_companies').upsert({ id: companyId, name, active: true, owner_admin_user_id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
    if (companyError) throw new Error('Não foi possível preparar a empresa. Tenta novamente.');
    const { data: company, error: ownerError } = await admin.from('azotrace_companies').select('owner_admin_user_id,active').eq('id', companyId).single();
    if (ownerError || company?.owner_admin_user_id !== user.id || !company.active) return Response.json({ error: 'Não foi possível validar a empresa desta conta.' }, { status: 409, headers });
    const { error: licenseError } = await admin.from('subscriptions').update({ company_id: companyId }).eq('id', license.id);
    if (licenseError) throw new Error('Não foi possível associar o pagamento à empresa.');
    const { error: permissionsError } = await admin.from('azotrace_user_permissions').upsert(permissions.map(permission => ({ user_id: user.id, company_id: companyId, permission })), { onConflict: 'company_id,user_id,permission', ignoreDuplicates: true });
    if (permissionsError) throw new Error('Não foi possível preparar as permissões da conta. Tenta novamente.');
    const { error: memberError } = await admin.from('azotrace_company_members').upsert({ user_id: user.id, company_id: companyId, role: 'admin', app_role: 'admin', active: true }, { onConflict: 'company_id,user_id', ignoreDuplicates: true });
    if (memberError) throw new Error('Não foi possível associar a conta à empresa. Tenta novamente.');
    return Response.json({ ready: true, next: '/dashboard/onboarding' }, { headers });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Não foi possível preparar a conta.' }, { status: 503, headers });
  }
}
