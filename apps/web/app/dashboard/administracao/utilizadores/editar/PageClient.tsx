'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';


import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { getLocalCompany } from '../../../_lib/local-companies';
import {
  assignablePermissions,
  canManageUser,
  getLocalUser,
  roleLabel,
  upsertLocalUser,
  type LocalPermission,
  type LocalUserRole,
} from '../../../_lib/local-users';
import { getSupabaseManagedUser, updateSupabaseManagedUser } from '../../../_lib/supabase-users';
import { onlineBusinesses } from '../../../_lib/online-state';
import type { LocalAppUser } from '../../../_lib/local-users';
import { useLocalUser } from '../../../_lib/use-local-user';
import { listLocalBusinesses } from '../../../onboarding/_lib/local-store';

export default function PageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const actor = useLocalUser();
  const businesses = onlineBusinesses;
  const [existingUser, setExistingUser] = useState<LocalAppUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [active, setActive] = useState(true);
  const [role, setRole] = useState<LocalUserRole>('custom');
  const [companyId, setCompanyId] = useState('');
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<LocalPermission[]>([]);
  const allowedPermissions = assignablePermissions(actor);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
    try {
    const user = id ? await getSupabaseManagedUser(id) : null;
    if (cancelled) return;
    setExistingUser(user);
    if (!user || !canManageUser(actor, user)) {
      setError('Utilizador não encontrado ou não editável com a sessão atual.');
      setLoaded(true);
      return;
    }
    setName(user.name);
    setEmail(user.email);
    setActive(user.active);
    setRole(user.role);
    setCompanyId(user.companyId ?? '');
    setBusinessIds(user.businessIds);
    setPermissions(user.permissions.filter((permission) => allowedPermissions.some((item) => item.id === permission)));
    setLoaded(true);
    } catch (cause) { if (!cancelled) { setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível ler a conta.')); setLoaded(true); } }
    }; void load(); return () => { cancelled = true; };
  }, [id, actor.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const existing = existingUser;
    if (!existing || !canManageUser(actor, existing)) return setError('Utilizador não encontrado ou sem permissão para editar.');
    if (!name.trim()) return setError('Indique o nome do utilizador.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Indique um endereço de email válido.');
    if (role !== 'admin' && !businessIds.length) return setError('Selecione pelo menos um negócio.');
    if (!permissions.length) return setError('Selecione pelo menos uma permissão.');

    setSaving(true);
    try {
    await updateSupabaseManagedUser({
      ...existing,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      active,
      role,
      companyId,
      businessIds: role === 'admin' ? [] : businessIds,
      permissions,

    });
    router.push('/dashboard/administracao/utilizadores');
    } catch (cause) { setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível guardar.')); } finally { setSaving(false); }
  };

  if (!loaded) return <p style={{ fontSize: 14 }}>A carregar utilizador…</p>;
  const company = companyId ? getLocalCompany(companyId) : null;
  const visibleBusinesses = businesses.filter((business) => business.companyId === companyId);

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 20, maxWidth: 960 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 24 }}>Editar utilizador</h1>
        <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
          {role === 'admin' ? 'O Super Admin define as permissões deste Admin.' : 'Altere os negócios e permissões disponíveis para este utilizador.'}
        </p>
      </header>
      {error ? <div style={errorBox}>{error}</div> : null}

      <section style={card}>
        <div style={grid2}>
          <label style={label}>Nome<input value={name} onChange={(event) => setName(event.target.value)} style={input} /></label>
          <label style={label}>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={input} /></label>
        </div>
        <div style={{ marginTop: 12, fontSize: 13 }}><strong>Perfil:</strong> {roleLabel(role)}</div>
        <div style={{ marginTop: 4, fontSize: 13 }}><strong>Empresa:</strong> {company?.name ?? '—'}</div>
        <label style={{ ...checkRow, marginTop: 14 }}><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span><strong>Utilizador ativo</strong><br /><small style={smallHelp}>Se estiver desativado, não poderá aceder à aplicação online.</small></span></label>
      </section>

      {role !== 'admin' ? (
        <section style={card}>
          <h2 style={title}>Negócios permitidos</h2>
          <div style={checkGrid}>{visibleBusinesses.map((business) => <label key={business.id} style={checkRow}><input type="checkbox" checked={businessIds.includes(business.id)} onChange={(event) => setBusinessIds((current) => event.target.checked ? [...new Set([...current, business.id])] : current.filter((item) => item !== business.id))} /><span><strong>{business.name}</strong></span></label>)}</div>
        </section>
      ) : (
        <section style={card}><h2 style={title}>Negócios da empresa</h2><p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Como Admin, este utilizador pode aceder a todos os negócios pertencentes à sua empresa.</p></section>
      )}

      <section style={card}>
        <h2 style={title}>Permissões</h2>
        {[...new Set(allowedPermissions.map((permission) => permission.group))].map((group) => (
          <div key={group} style={{ marginTop: 14 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{group}</h3>
            <div style={checkGrid}>{allowedPermissions.filter((permission) => permission.group === group).map((permission) => <label key={permission.id} style={checkRow}><input type="checkbox" checked={permissions.includes(permission.id)} onChange={() => setPermissions((current) => current.includes(permission.id) ? current.filter((item) => item !== permission.id) : [...current, permission.id])} /><span><strong>{permission.label}</strong><br /><small style={smallHelp}>{permission.description}</small></span></label>)}</div>
          </div>
        ))}
        <p style={{ margin: '12px 0 0', fontSize: 12, color: '#6b7280' }}>O Chatbot é exclusivo do Super Admin e nunca pode ser atribuído.</p>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => router.back()} style={secondary}>Cancelar</button>
        <button type="submit" disabled={saving} style={primary}>Guardar alterações</button>
      </div>
    </form>
  );
}

const card: React.CSSProperties = { padding: 20, borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb', borderRadius: 12, background: '#fff' };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 };
const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 };
const input: React.CSSProperties = { padding: '10px 11px', borderWidth: 1, borderStyle: 'solid', borderColor: '#d1d5db', borderRadius: 8, fontSize: 14 };
const title: React.CSSProperties = { margin: '0 0 12px', fontSize: 17 };
const checkGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 10 };
const checkRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: 11, borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb', borderRadius: 8, fontSize: 13 };
const smallHelp: React.CSSProperties = { fontSize: 12, color: '#6b7280' };
const primary: React.CSSProperties = { padding: '10px 16px', borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent', borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 };
const secondary: React.CSSProperties = { ...primary, background: '#fff', color: '#111827', borderWidth: 1, borderColor: '#d1d5db' };
const errorBox: React.CSSProperties = { padding: 12, borderRadius: 8, background: '#fee2e2', color: '#b91c1c', fontSize: 13 };
