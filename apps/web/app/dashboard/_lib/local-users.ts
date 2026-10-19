'use client';
import { onlineUser, onlineUsers, onlineBusinesses, emptyOnlineUser, ONLINE_TARGET_KEY, targetUserId, invalidateOnlineContext } from './online-state';

import { DEFAULT_COMPANY_ID, getLocalCompany } from './local-companies';

export type LocalPermission =
  | 'dashboard.view'
  | 'production.read'
  | 'production.write'
  | 'products.manage'
  | 'lots.manage'
  | 'traceability.manage'
  | 'reports.view'
  | 'blockchain.view'
  | 'business.manage'
  | 'users.manage'
  | 'rgpd.manage'
  | 'security.view'
  | 'billing.manage'
  | 'chatbot.manage';

export type LocalUserRole =
  | 'superadmin'
  | 'admin'
  | 'manager'
  | 'operator'
  | 'quality'
  | 'traceability'
  | 'viewer'
  | 'custom';

export type LocalAppUser = {
  id: string;
  name: string;
  email: string;
  role: LocalUserRole;
  active: boolean;
  companyId?: string;
  businessIds: string[];
  permissions: LocalPermission[];
  createdAt: string;
  updatedAt: string;
};

const USERS_KEY = 'azotrace:local-users:v2';
const LEGACY_USERS_KEY = 'azotrace:local-users:v1';
const SESSION_KEY = 'azotrace:local-user-session:v1';
const STATE_PREFIX = 'azotrace:producer-local:state:';

export const LOCAL_USERS_EVENT = 'azotrace:local-users-changed';
export const LOCAL_SESSION_EVENT = 'azotrace:local-user-session-changed';

export const PERMISSIONS: Array<{
  id: LocalPermission;
  label: string;
  description: string;
  group: string;
  superAdminOnly?: boolean;
}> = [
  { id: 'dashboard.view', label: 'Ver Dashboard', description: 'Consultar resumo e indicadores.', group: 'Geral' },
  { id: 'production.read', label: 'Consultar produção', description: 'Ver registos, etapas e unidades.', group: 'Produção' },
  { id: 'production.write', label: 'Inserir dados de produção', description: 'Criar e alterar registos de produção.', group: 'Produção' },
  { id: 'products.manage', label: 'Gerir produtos', description: 'Criar produtos, tipos e campos.', group: 'Produção' },
  { id: 'lots.manage', label: 'Gerir lotes', description: 'Criar, alterar e finalizar lotes.', group: 'Produção' },
  { id: 'traceability.manage', label: 'Publicação e QR', description: 'Escolher dados públicos, publicar e gerar QR.', group: 'Rastreabilidade' },
  { id: 'reports.view', label: 'Report / BI', description: 'Consultar relatórios e indicadores.', group: 'Geral' },
  { id: 'blockchain.view', label: 'Blockchain', description: 'Consultar validações e histórico blockchain.', group: 'Rastreabilidade' },
  { id: 'business.manage', label: 'Gerir negócio', description: 'Alterar configuração dos negócios da empresa.', group: 'Administração' },
  { id: 'users.manage', label: 'Gerir utilizadores', description: 'Criar e editar utilizadores permitidos.', group: 'Administração' },
  { id: 'rgpd.manage', label: 'RGPD / Privacidade', description: 'Aceder às ferramentas de privacidade.', group: 'Administração' },
  { id: 'security.view', label: 'Segurança', description: 'Consultar logs e auditoria.', group: 'Administração' },
  { id: 'billing.manage', label: 'Pagamentos e subscrições', description: 'Consultar e gerir subscrição.', group: 'Administração' },
  { id: 'chatbot.manage', label: 'Chatbot do sistema', description: 'Área reservada ao proprietário do Azotrace.', group: 'Sistema', superAdminOnly: true },
];

const ADMIN_PERMISSIONS = PERMISSIONS.filter((permission) => !permission.superAdminOnly).map((permission) => permission.id);

export const ROLE_PRESETS: Record<Exclude<LocalUserRole, 'superadmin' | 'custom'>, LocalPermission[]> = {
  admin: ADMIN_PERMISSIONS,
  manager: ADMIN_PERMISSIONS.filter((permission) => !['business.manage', 'billing.manage', 'users.manage', 'rgpd.manage', 'security.view'].includes(permission)),
  operator: ['dashboard.view', 'production.read', 'production.write', 'lots.manage'],
  quality: ['dashboard.view', 'production.read', 'production.write', 'lots.manage', 'reports.view'],
  traceability: ['dashboard.view', 'production.read', 'traceability.manage', 'reports.view', 'blockchain.view'],
  viewer: ['dashboard.view', 'production.read', 'reports.view'],
};

function superAdminUser(): LocalAppUser {
  const now = new Date().toISOString();
  return {
    id: 'local-owner',
    name: 'Super Admin Azotrace',
    email: 'superadmin@azotrace.local',
    role: 'superadmin',
    active: true,
    businessIds: ['*'],
    permissions: PERMISSIONS.map((permission) => permission.id),
    createdAt: now,
    updatedAt: now,
  };
}

export function getHydrationLocalUser(): LocalAppUser { return emptyOnlineUser; }

function defaultAdminUser(): LocalAppUser {
  const now = new Date().toISOString();
  return {
    id: 'local-admin',
    name: 'Administrador da Empresa',
    email: 'admin@azotrace.local',
    role: 'admin',
    active: true,
    companyId: DEFAULT_COMPANY_ID,
    businessIds: [],
    permissions: [...ROLE_PRESETS.admin],
    createdAt: now,
    updatedAt: now,
  };
}

export function roleLabel(role: LocalUserRole) {
  return ({
    superadmin: 'Super Admin',
    admin: 'Admin',
    manager: 'Gestor',
    operator: 'Operador de produção',
    quality: 'Qualidade',
    traceability: 'Rastreabilidade',
    viewer: 'Só consulta',
    custom: 'Personalizado',
  } as const)[role];
}

function readStoredUsers(): LocalAppUser[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(USERS_KEY) ?? localStorage.getItem(LEGACY_USERS_KEY) ?? '[]';
  try {
    const parsed = JSON.parse(raw) as any[];
    return parsed.map((user) => {
      const role: LocalUserRole = user.role === 'owner' ? 'admin' : user.role;
      const storedPermissions: LocalPermission[] = Array.isArray(user.permissions)
        ? user.permissions.filter((permission: LocalPermission) => permission !== 'chatbot.manage')
        : [];

      // Compatibilidade com utilizadores criados antes do sistema de permissões.
      // Uma função predefinida recebe o respetivo conjunto essencial quando a
      // lista guardada está vazia. Perfis personalizados continuam explícitos.
      const permissions = storedPermissions.length > 0 || role === 'custom' || role === 'superadmin'
        ? storedPermissions
        : [...ROLE_PRESETS[role as Exclude<LocalUserRole, 'superadmin' | 'custom'>]];

      return {
        ...user,
        role,
        companyId: user.companyId ?? DEFAULT_COMPANY_ID,
        businessIds: Array.isArray(user.businessIds) ? user.businessIds.filter((id: string) => id !== '*') : [],
        permissions,
      } as LocalAppUser;
    });
  } catch {
    return [];
  }
}

export function makeLocalUserId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `user-${crypto.randomUUID()}`;
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listLocalUsers(): LocalAppUser[] { return onlineUsers; }

export function saveLocalUsers(_users: LocalAppUser[]) { throw new Error('Use a gestão de utilizadores Supabase.'); }

export function getLocalUser(id: string | null | undefined) {
  if (!id) return null;
  return listLocalUsers().find((user) => user.id === id) ?? null;
}

export function upsertLocalUser(user: LocalAppUser) {
  if (user.id === 'local-owner') return;
  const users = listLocalUsers();
  const index = users.findIndex((item) => item.id === user.id);
  if (index >= 0) users[index] = user;
  else users.push(user);
  saveLocalUsers(users);
}

export function deleteLocalUser(id: string) {
  if (id === 'local-owner') return;
  saveLocalUsers(listLocalUsers().filter((user) => user.id !== id));
  if (getCurrentLocalUser()?.id === id) setCurrentLocalUser('local-owner');
}


export function getLocalUserSessionOverrideId() { return targetUserId(); }

export function getCurrentLocalUser(): LocalAppUser { return onlineUser; }

export function setCurrentLocalUser(id: string) {
 if (typeof window === 'undefined') return;
 if (id === 'local-owner') window.sessionStorage.removeItem(ONLINE_TARGET_KEY);
 else { if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Utilizador sem conta Supabase.'); window.sessionStorage.setItem(ONLINE_TARGET_KEY,id); }
 invalidateOnlineContext(); window.dispatchEvent(new Event(LOCAL_SESSION_EVENT));
}

export function clearCurrentLocalUserSession() {
 if (typeof window === 'undefined') return;
 window.sessionStorage.removeItem(ONLINE_TARGET_KEY); window.localStorage.removeItem(SESSION_KEY);
 invalidateOnlineContext(); window.dispatchEvent(new Event(LOCAL_SESSION_EVENT));
}

function businessCompanyId(businessId: string): string | null { return onlineBusinesses.find((business) => business.id === businessId)?.companyId || null; }

export function userCanAccessBusiness(user: LocalAppUser, businessId?: string | null) {
  if (!user.active) return false;

  // O Super Admin é administrador da plataforma, não é automaticamente membro
  // operacional dos negócios dos clientes. Para trabalhar dentro de um cliente,
  // deve entrar no contexto desse Admin ("Entrar como")/ser membro Admin da empresa.
  if (user.role === 'superadmin') return false;
  if (!businessId) return true;

  const targetBusinessId = String(businessId);
  const companyId = businessCompanyId(targetBusinessId);
  // Também a empresa de demonstração tem um âmbito próprio. Negócios antigos
  // sem empresa pertencem à empresa local predefinida, nunca a todos os Admins.
  if (!companyId) return false;
  const targetCompanyId = companyId;
  if (!user.companyId || user.companyId !== targetCompanyId) return false;
  if (user.role === 'admin') {
    return true;
  }

  // As restantes funções são sempre limitadas aos negócios explicitamente
  // atribuídos. Quando existe companyId fiável, validamos também a empresa.
  if (!user.businessIds.includes(targetBusinessId)) return false;
  return true;
}

export function hasPermission(user: LocalAppUser, permission: LocalPermission, businessId?: string | null) {
  if (!user.active) return false;

  // O Super Admin trabalha ao nível da plataforma: visão global, clientes,
  // utilizadores, subscrições e Chatbot. Não herda permissões operacionais dos
  // negócios dos clientes. Para operar num cliente, entra no contexto do Admin.
  if (user.role === 'superadmin') {
    return ['dashboard.view', 'users.manage', 'billing.manage', 'chatbot.manage', 'rgpd.manage', 'security.view'].includes(permission);
  }

  if (permission === 'chatbot.manage') return false;

  // A subscrição pertence à conta Admin do cliente e nunca aos utilizadores.
  if (permission === 'billing.manage' && user.role !== 'admin') return false;
  // A faturação pertence à empresa, independentemente do negócio selecionado.
  if (permission === 'billing.manage') {
    return Boolean(user.companyId && getLocalCompany(user.companyId)?.active);
  }

  // Criar/configurar negócios e gerir utilizadores da empresa são funções de Admin.
  // Gestores e restantes perfis trabalham apenas nos negócios que lhes forem atribuídos.
  if (permission === 'business.manage' && user.role !== 'admin') return false;
  if (permission === 'users.manage' && user.role !== 'admin') return false;

  if (['users.manage', 'rgpd.manage', 'security.view'].includes(permission)) {
    return Boolean(user.companyId && getLocalCompany(user.companyId)?.active && user.permissions.includes(permission));
  }

  if (!userCanAccessBusiness(user, businessId)) return false;
  return user.permissions.includes(permission);
}

export function permissionForPath(pathname: string): LocalPermission {
  if (pathname.startsWith('/dashboard/chatbot') || pathname.startsWith('/dashboard/AdminChatBot')) return 'chatbot.manage';
  if (pathname.startsWith('/dashboard/administracao/utilizadores')) return 'users.manage';
  if (pathname.startsWith('/dashboard/administracao/perfis') || pathname.startsWith('/dashboard/administracao/configuracoes') || pathname.startsWith('/dashboard/administracao/empresa')) return 'users.manage';
  if (pathname.startsWith('/dashboard/administracao/categorias') || pathname.startsWith('/dashboard/administracao/subcategorias') || pathname.startsWith('/dashboard/administracao/campos')) return 'products.manage';
  if (pathname.startsWith('/dashboard/administracao/qrcodes')) return 'traceability.manage';
  if (pathname.startsWith('/dashboard/administracao/rgpd')) return 'rgpd.manage';
  if (pathname.startsWith('/dashboard/administracao/logs')) return 'security.view';
  if (pathname.startsWith('/dashboard/onboarding')) return 'business.manage';
  if (pathname.startsWith('/dashboard/administracao/negocios')) return 'business.manage';
  if (pathname.startsWith('/dashboard/subscricoes')) return 'billing.manage';
  if (pathname.startsWith('/dashboard/publicacao') || pathname.startsWith('/dashboard/qrcodes') || pathname.startsWith('/dashboard/website')) return 'traceability.manage';
  if (pathname.startsWith('/dashboard/analytics')) return 'reports.view';
  if (pathname.startsWith('/dashboard/blockchain')) return 'blockchain.view';
  if (pathname.startsWith('/dashboard/produtos')) return 'products.manage';
  if (pathname.startsWith('/dashboard/lotes')) return 'lots.manage';
  if (pathname.startsWith('/dashboard/producao/inserir-dados')) return 'production.write';
  if (/^\/dashboard\/producao\/registos\/[^/]+/.test(pathname)) return 'production.write';
  if (pathname.startsWith('/dashboard/producao')) return 'production.read';
  return 'dashboard.view';
}

export function canAccessPath(user: LocalAppUser, pathname: string, businessId?: string | null) {
  if (['/dashboard/configuracoes', '/dashboard/administracao/configuracoes', '/dashboard/super-admin/configuracoes'].includes(pathname)) return user.active;
  const permission = permissionForPath(pathname);
  // O Dashboard raiz pode abrir mesmo quando a sessão acabou de mudar de empresa/utilizador;
  // o seletor de negócio corrige de seguida o contexto para um negócio permitido.
  if (pathname === '/dashboard') {
    if (!user.active) return false;
    return user.role === 'superadmin' || user.permissions.includes(permission);
  }
  return hasPermission(user, permission, businessId);
}

export function canCreateRole(actor: LocalAppUser, role: LocalUserRole) {
  if (actor.role === 'superadmin') return role !== 'superadmin';
  return !['superadmin', 'admin'].includes(role);
}

export function canManageUser(actor: LocalAppUser, target: LocalAppUser) {
  if (target.role === 'superadmin') return false;
  if (actor.role === 'superadmin') return true;
  if (actor.role !== 'admin' || !actor.companyId) return false;
  if (target.role === 'admin') return false;
  return target.companyId === actor.companyId;
}

export function assignablePermissions(actor: LocalAppUser) {
  // billing.manage não é uma permissão delegável: pertence apenas a Super Admin/Admin.
  if (actor.role === 'superadmin') {
    return PERMISSIONS.filter((permission) => !permission.superAdminOnly && permission.id !== 'billing.manage');
  }
  return PERMISSIONS.filter(
    (permission) =>
      !permission.superAdminOnly &&
      permission.id !== 'billing.manage' &&
      actor.permissions.includes(permission.id),
  );
}
