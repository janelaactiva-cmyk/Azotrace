import { NextRequest, NextResponse } from 'next/server';

import { verifiedOnlineUser } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';

const ALLOWED_PERMISSIONS = new Set([
  'dashboard.view',
  'production.read',
  'production.write',
  'products.manage',
  'lots.manage',
  'traceability.manage',
  'reports.view',
  'blockchain.view',
  'business.manage',
  'users.manage',
  'rgpd.manage',
  'security.view',
  'billing.manage',
]);

const STAFF_ROLES = new Set(['manager', 'operator', 'quality', 'traceability', 'viewer', 'custom']);

type Actor = {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'staff';
  companyId?: string;
  permissions: string[];
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

async function actorFromRequest(request: NextRequest): Promise<Actor> {
  const user = await verifiedOnlineUser(request);
  return { id: user.id, email: user.email, role: user.role === 'superadmin' ? 'superadmin' : user.role === 'admin' ? 'admin' : 'staff', companyId: user.companyId, permissions: user.permissions };
}

async function checked(query: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await query; if (error) throw new Error(error.message);
}

function sanitizePermissions(values: unknown, actor: Actor) {
  const requested = Array.isArray(values) ? values.map(String) : [];
  const allowed = requested.filter((permission) => ALLOWED_PERMISSIONS.has(permission) && permission !== 'billing.manage');
  if (actor.role === 'superadmin') return [...new Set(allowed)];
  return [...new Set(allowed.filter((permission) => actor.permissions.includes(permission)))];
}

async function validateBusinesses(admin: ReturnType<typeof getSupabaseAdminClient>, companyId: string, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await admin
    .from('producer_workspaces')
    .select('business_id')
    .eq('company_id', companyId)
    .in('business_id', ids);
  if (error) throw new Error(error.message);
  const valid = new Set((data || []).map((row: any) => String(row.business_id)));
  return ids.filter((id) => valid.has(id));
}

async function userView(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string) {
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, name, platform_role, active, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return null;

  if (profile.platform_role === 'superadmin') {
    return {
      id: profile.id,
      name: profile.name || 'Super Admin Azotrace',
      email: profile.email || '',
      role: 'superadmin',
      active: profile.active !== false,
      companyId: undefined,
      businessIds: ['*'],
      permissions: [...ALLOWED_PERMISSIONS, 'chatbot.manage'],
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  const { data: membership } = await admin
    .from('azotrace_company_members')
    .select('company_id, role, app_role, active, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false }).limit(1)
    .maybeSingle();

  const companyId = membership?.company_id ? String(membership.company_id) : undefined;
  const role = membership?.role === 'admin' ? 'admin' : String(membership?.app_role || 'viewer');

  const [{ data: permissions }, { data: businessMemberships }] = await Promise.all([
    companyId
      ? admin.from('azotrace_user_permissions').select('permission').eq('user_id', userId).eq('company_id', companyId)
      : Promise.resolve({ data: [] } as any),
    admin.from('azotrace_business_access').select('business_id').eq('user_id', userId),
  ]);

  return {
    id: profile.id,
    name: profile.name || profile.email || 'Utilizador',
    email: profile.email || '',
    role,
    active: profile.active === true && Boolean(membership?.active),
    companyId,
    businessIds: (businessMemberships || []).map((row: any) => String(row.business_id)),
    permissions: (permissions || []).map((row: any) => String(row.permission)),
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

async function canManageTarget(admin: ReturnType<typeof getSupabaseAdminClient>, actor: Actor, targetUserId: string) {
  const target = await userView(admin, targetUserId);
  if (!target) return { ok: false, target: null };
  if (target.role === 'superadmin') return { ok: false, target };
  if (actor.role === 'superadmin') return { ok: true, target };
  return {
    ok: actor.role === 'admin' && target.role !== 'admin' && target.companyId === actor.companyId,
    target,
  };
}

export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    const admin = getSupabaseAdminClient();
    const requestedId = request.nextUrl.searchParams.get('id');

    if (requestedId) {
      const managed = await canManageTarget(admin, actor, requestedId);
      if (!managed.ok && requestedId !== actor.id) return jsonError('Sem permissão para consultar este utilizador.', 403);
      return NextResponse.json({ user: managed.target || (await userView(admin, requestedId)) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (actor.role !== 'superadmin' && (actor.role !== 'admin' || !actor.permissions.includes('users.manage'))) {
      return jsonError('Sem permissão para gerir utilizadores.', 403);
    }

    let ids: string[] = [];
    if (actor.role === 'superadmin') {
      const { data, error } = await admin.from('profiles').select('id').order('created_at', { ascending: true });
      if (error) return jsonError(error.message, 500);
      ids = (data || []).map((row: any) => String(row.id));
    } else {
      if (!actor.companyId) return NextResponse.json({ users: [] });
      const { data, error } = await admin
        .from('azotrace_company_members')
        .select('user_id')
        .eq('company_id', actor.companyId);
      if (error) return jsonError(error.message, 500);
      ids = (data || []).map((row: any) => String(row.user_id));
    }

    const users = (await Promise.all(ids.map((id) => userView(admin, id)))).filter(Boolean);
    return NextResponse.json({ users }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: any) {
    return jsonError(error?.message || 'Não foi possível consultar os utilizadores.', 401);
  }
}

export async function POST(request: NextRequest) {
  let createdUserId = '';
  let createdCompanyId = '';
  try {
    const actor = await actorFromRequest(request);
    if (actor.role !== 'superadmin' && (actor.role !== 'admin' || !actor.permissions.includes('users.manage'))) {
      return jsonError('Sem permissão para criar utilizadores.', 403);
    }
    const admin = getSupabaseAdminClient();
    const body = await request.json();

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = String(body.role || 'viewer');
    const newCompanyName = String(body.newCompanyName || '').trim();
    let companyId = String(body.companyId || actor.companyId || '').trim();
    const businessIds = Array.isArray(body.businessIds) ? body.businessIds.map(String) : [];
    const permissions = sanitizePermissions(body.permissions, actor);

    if (!name) return jsonError('Indique o nome do utilizador.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return jsonError('Indique um endereço de email válido.');
    if (password.length < 8) return jsonError("A password temporária deve ter pelo menos 8 caracteres.");
    if (role === 'superadmin') return jsonError('Não é possível criar outro Super Admin por esta área.', 403);
    if (role === 'admin' && actor.role !== 'superadmin') return jsonError('Só o Super Admin pode criar Admins.', 403);
    if (role !== 'admin' && !STAFF_ROLES.has(role)) return jsonError('Perfil inválido.');
    if (!permissions.length) return jsonError('Selecione pelo menos uma permissão.');

    if (actor.role === 'admin') {
      companyId = actor.companyId || '';
    }

    const { data: authCreated, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { azotrace_provisioned_by: 'admin' },
    });
    if (authError || !authCreated.user) return jsonError(authError?.message || 'Não foi possível criar a conta no Supabase.');
    createdUserId = authCreated.user.id;

    if (actor.role === 'superadmin' && role === 'admin' && newCompanyName) {
      createdCompanyId = `company-${crypto.randomUUID()}`;
      const { error } = await admin.from('azotrace_companies').insert({
        id: createdCompanyId,
        name: newCompanyName,
        owner_admin_user_id: createdUserId,
        active: true,
      });
      if (error) throw new Error(error.message);
      companyId = createdCompanyId;
    }

    if (!companyId) throw new Error('Selecione ou crie a empresa deste utilizador.');

    const { data: company, error: companyError } = await admin
      .from('azotrace_companies')
      .select('id, active')
      .eq('id', companyId)
      .maybeSingle();
    if (companyError || !company || company.active !== true) throw new Error('A empresa selecionada não existe.');
    if (actor.role !== 'superadmin' && companyId !== actor.companyId) throw new Error('Não pode criar utilizadores noutra empresa.');

    await checked(admin.from('profiles').upsert({
      id: createdUserId,
      email,
      name,
      platform_role: 'user',
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }));

    const membershipRole = role === 'admin' ? 'admin' : 'user';
    const { error: membershipError } = await admin.from('azotrace_company_members').upsert({
      company_id: companyId,
      user_id: createdUserId,
      role: membershipRole,
      app_role: role,
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,user_id' });
    if (membershipError) throw new Error(membershipError.message);

    await checked(admin.from('azotrace_user_permissions').delete().eq('user_id', createdUserId).eq('company_id', companyId));
    if (permissions.length) {
      const { error } = await admin.from('azotrace_user_permissions').insert(
        permissions.map((permission) => ({ user_id: createdUserId, company_id: companyId, permission })),
      );
      if (error) throw new Error(error.message);
    }

    if (role === 'admin') {
      await checked(admin.from('azotrace_companies').update({ owner_admin_user_id: createdUserId }).eq('id', companyId));
      await checked(admin.from('azotrace_business_access').delete().eq('user_id', createdUserId));
    } else {
      const validBusinessIds = await validateBusinesses(admin, companyId, businessIds);
      if (!validBusinessIds.length) throw new Error('Selecione pelo menos um negócio válido para este utilizador.');
      await checked(admin.from('azotrace_business_access').delete().eq('user_id', createdUserId));
      const { error } = await admin.from('azotrace_business_access').insert(
        validBusinessIds.map((businessId) => ({ business_id: businessId, user_id: createdUserId })),
      );
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ user: await userView(admin, createdUserId) }, { status: 201 });
  } catch (error: any) {
    const admin = getSupabaseAdminClient();
    if (createdUserId) {
      try { await admin.auth.admin.deleteUser(createdUserId); } catch {}
    }
    if (createdCompanyId) {
      try { await admin.from('azotrace_companies').delete().eq('id', createdCompanyId); } catch {}
    }
    return jsonError(error?.message || 'Não foi possível criar o utilizador.', 400);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor.role !== 'superadmin' && (actor.role !== 'admin' || !actor.permissions.includes('users.manage'))) {
      return jsonError('Sem permissão para editar utilizadores.', 403);
    }
    const admin = getSupabaseAdminClient();
    const body = await request.json();
    const userId = String(body.id || '');
    const managed = await canManageTarget(admin, actor, userId);
    if (!managed.ok || !managed.target) return jsonError('Sem permissão para editar este utilizador.', 403);

    const target = managed.target;
    const role = String(body.role || target.role);
    if (role === 'superadmin') return jsonError('O perfil Super Admin não pode ser atribuído aqui.', 403);
    if (role === 'admin' && actor.role !== 'superadmin') return jsonError('Só o Super Admin pode atribuir o perfil Admin.', 403);

    const companyId = actor.role === 'superadmin'
      ? String(body.companyId || target.companyId || '')
      : String(actor.companyId || '');
    if (!companyId) return jsonError('Empresa inválida.');

    const name = String(body.name || target.name || '').trim();
    const email = String(body.email || target.email || '').trim().toLowerCase();
    const active = body.active !== false;
    const permissions = sanitizePermissions(body.permissions, actor);
    const businessIds = Array.isArray(body.businessIds) ? body.businessIds.map(String) : [];
    const password = String(body.password || '');

    if (!permissions.length) return jsonError('Selecione pelo menos uma permissão.');

    const authUpdates: Record<string, unknown> = { email, user_metadata: { name } };
    if (password) {
      if (password.length < 8) return jsonError("A nova password deve ter pelo menos 8 caracteres.");
      authUpdates.password = password;
    }
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdates as any);
    if (authError) return jsonError(authError.message);

    await checked(admin.from('profiles').update({ name, email, active, updated_at: new Date().toISOString() }).eq('id', userId));

    if (target.companyId && target.companyId !== companyId) {
      await checked(admin.from('azotrace_company_members').delete().eq('user_id', userId));
      await checked(admin.from('azotrace_user_permissions').delete().eq('user_id', userId));
      await checked(admin.from('azotrace_business_access').delete().eq('user_id', userId));
    }

    await checked(admin.from('azotrace_company_members').upsert({
      company_id: companyId,
      user_id: userId,
      role: role === 'admin' ? 'admin' : 'user',
      app_role: role,
      active,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,user_id' }));

    await checked(admin.from('azotrace_user_permissions').delete().eq('user_id', userId).eq('company_id', companyId));
    await checked(admin.from('azotrace_user_permissions').insert(
      permissions.map((permission) => ({ user_id: userId, company_id: companyId, permission })),
    ));

    await checked(admin.from('azotrace_business_access').delete().eq('user_id', userId));
    if (role === 'admin') {
      await checked(admin.from('azotrace_companies').update({ owner_admin_user_id: userId }).eq('id', companyId));
    } else {
      const validBusinessIds = await validateBusinesses(admin, companyId, businessIds);
      if (validBusinessIds.length) {
        await checked(admin.from('azotrace_business_access').insert(
          validBusinessIds.map((businessId) => ({ business_id: businessId, user_id: userId })),
        ));
      }
    }

    return NextResponse.json({ user: await userView(admin, userId) });
  } catch (error: any) {
    return jsonError(error?.message || 'Não foi possível atualizar o utilizador.', 400);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor.role !== 'superadmin' && (actor.role !== 'admin' || !actor.permissions.includes('users.manage'))) {
      return jsonError('Sem permissão para eliminar utilizadores.', 403);
    }
    const admin = getSupabaseAdminClient();
    const userId = request.nextUrl.searchParams.get('id') || '';
    const managed = await canManageTarget(admin, actor, userId);
    if (!managed.ok || !managed.target) return jsonError('Sem permissão para eliminar este utilizador.', 403);

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return jsonError(error.message);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return jsonError(error?.message || 'Não foi possível eliminar o utilizador.', 400);
  }
}
