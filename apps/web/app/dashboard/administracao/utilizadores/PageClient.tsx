'use client';
import { confirmMessage } from '~/lib/app-messages';
import { uiMessagePt } from '~/lib/ui-messages-pt';


import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getLocalCompany, listLocalCompanies } from '../../_lib/local-companies';
import {
  canManageUser,
  deleteLocalUser,
  getCurrentLocalUser,
  listLocalUsers,
  roleLabel,
  setCurrentLocalUser,
  type LocalAppUser,
  LOCAL_SESSION_EVENT,
  LOCAL_USERS_EVENT,
} from '../../_lib/local-users';
import { listSupabaseUsers, deleteSupabaseManagedUser } from '../../_lib/supabase-users';
import { setOnlineUsers, onlineBusinesses, ONLINE_CONTEXT_EVENT } from '../../_lib/online-state';
import { useLocalUser } from '../../_lib/use-local-user';
import { listLocalBusinesses, setCurrentLocalBusinessId } from '../../onboarding/_lib/local-store';

export default function PageClient() {
  const router = useRouter();
  const actor = useLocalUser();
  const [users, setUsers] = useState<LocalAppUser[]>([]);
  const [currentId, setCurrentId] = useState('local-owner');
  const businesses = onlineBusinesses;
  const companies = useMemo(() => listLocalCompanies(), []);

  const [error, setError] = useState('');
  const refresh = async () => {
    try {
    const all = await listSupabaseUsers();
    setOnlineUsers(all);
    setUsers(actor.role === 'superadmin' ? all : all.filter((user) => user.companyId === actor.companyId && user.role !== 'superadmin'));
    setCurrentId(actor.id); setError('');
    } catch (cause) { setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível carregar utilizadores.')); }
  };

  useEffect(() => {
    refresh();
    window.addEventListener(LOCAL_USERS_EVENT, refresh as EventListener);
    window.addEventListener(LOCAL_SESSION_EVENT, refresh as EventListener);
    return () => {
      window.removeEventListener(LOCAL_USERS_EVENT, refresh as EventListener);
      window.removeEventListener(LOCAL_SESSION_EVENT, refresh as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor.id, actor.companyId, actor.role]);

  const remove = async (user: LocalAppUser) => {
    if (!canManageUser(actor, user)) return;
    if (!(await confirmMessage(`Eliminar o utilizador ${user.name || user.email}?`))) return;
    try { await deleteSupabaseManagedUser(user.id); await refresh(); } catch (cause) { setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível eliminar.')); }
  };

  const impersonate = (user: LocalAppUser) => {
    if (actor.role !== 'superadmin') return;
    const allowed = businesses.filter((business) => {
      if (user.role === 'superadmin') return true;
      if (user.role === 'admin') return business.companyId === user.companyId;
      return business.companyId === user.companyId && user.businessIds.includes(business.id);
    });
    if (allowed[0]) setCurrentLocalBusinessId(allowed[0].id);
    setCurrentLocalUser(user.id);
    window.location.href = '/dashboard';
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Utilizadores</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
            {actor.role === 'superadmin'
              ? 'O Super Admin cria Admins, associa empresas e define permissões.'
              : 'Gira os utilizadores da sua empresa e limite o acesso por negócio e por área.'}
          </p>
        </div>
        <button onClick={() => router.push('/dashboard/administracao/utilizadores/criar')} style={primaryButton}>
          {actor.role === 'superadmin' ? '+ Criar Admin / utilizador' : '+ Criar utilizador'}
        </button>
      </header>

      <div style={{ padding: 14, borderWidth: 1, borderStyle: 'solid', borderColor: '#fde68a', background: '#fffbeb', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
        Modo Supabase: Super Admin = proprietário do Azotrace. Admin = proprietário de uma empresa. O Chatbot existe apenas na sessão Super Admin.
      </div>

      {error ? <p role="alert">{error}</p> : null}
      <div style={{ borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb', borderRadius: 12, overflowX: 'auto', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 940 }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>{['Utilizador', 'Perfil', 'Empresa', 'Negócios', 'Permissões', 'Estado', 'Ações'].map((label) => <th key={label} style={th}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const company = user.companyId ? getLocalCompany(user.companyId) : null;
              const companyBusinesses = businesses.filter((business) => business.companyId === user.companyId);
              const businessText = user.role === 'superadmin'
                ? 'Todos'
                : user.role === 'admin'
                  ? `${companyBusinesses.length} negócio(s)`
                  : user.businessIds.map((id) => businesses.find((business) => business.id === id)?.name ?? id).join(', ') || 'Nenhum';
              const editable = canManageUser(actor, user);
              return (
                <tr key={user.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{user.email}</div>
                    {currentId === user.id ? <span style={activeBadge}>Sessão atual</span> : null}
                  </td>
                  <td style={td}><span style={badge}>{roleLabel(user.role)}</span></td>
                  <td style={td}>{user.role === 'superadmin' ? 'Azotrace' : company?.name ?? '—'}</td>
                  <td style={td}>{businessText}</td>
                  <td style={td}>{user.role === 'superadmin' ? 'Todas' : `${user.permissions.length} atribuídas`}</td>
                  <td style={td}>{user.active ? <span style={okBadge}>Ativo</span> : <span style={offBadge}>Inativo</span>}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {user.active && currentId !== user.id && actor.role === 'superadmin' ? <button onClick={() => impersonate(user)} style={smallButton}>Entrar como</button> : null}
                      {editable ? <button onClick={() => router.push(`/dashboard/administracao/utilizadores/editar?id=${encodeURIComponent(user.id)}`)} style={smallButton}>Editar</button> : null}
                      {editable && !['local-owner', 'local-admin'].includes(user.id) ? <button onClick={() => remove(user)} style={dangerButton}>Eliminar</button> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: 12, textAlign: 'left', fontSize: 12, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.03em' };
const td: React.CSSProperties = { padding: 12, fontSize: 13, verticalAlign: 'top' };
const primaryButton: React.CSSProperties = { padding: '10px 16px', background: '#2563eb', color: '#fff', borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 };
const smallButton: React.CSSProperties = { padding: '7px 10px', background: '#fff', color: '#1f2937', borderWidth: 1, borderStyle: 'solid', borderColor: '#d1d5db', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const dangerButton: React.CSSProperties = { ...smallButton, color: '#b91c1c', borderColor: '#fecaca' };
const badge: React.CSSProperties = { display: 'inline-block', padding: '4px 8px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontSize: 12, fontWeight: 700 };
const activeBadge: React.CSSProperties = { ...badge, marginTop: 6, background: '#dbeafe', color: '#1d4ed8' };
const okBadge: React.CSSProperties = { ...badge, background: '#dcfce7', color: '#166534' };
const offBadge: React.CSSProperties = { ...badge, background: '#f3f4f6', color: '#6b7280' };
