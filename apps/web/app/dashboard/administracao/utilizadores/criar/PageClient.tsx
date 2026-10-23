'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';


import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { assignCompanyOwner, createLocalCompany, listLocalCompanies } from '../../../_lib/local-companies';
import {
  assignablePermissions,
  canCreateRole,
  makeLocalUserId,
  ROLE_PRESETS,
  roleLabel,
  upsertLocalUser,
  type LocalPermission,
  type LocalUserRole,
} from '../../../_lib/local-users';
import { createSupabaseManagedUser } from '../../../_lib/supabase-users';
import { onlineBusinesses } from '../../../_lib/online-state';
import { useLocalUser } from '../../../_lib/use-local-user';
import { listLocalBusinesses } from '../../../onboarding/_lib/local-store';

const STAFF_ROLES: LocalUserRole[] = ['manager', 'operator', 'quality', 'traceability', 'viewer', 'custom'];

export default function PageClient() {
  const router = useRouter();
  const actor = useLocalUser();
  const companies = useMemo(() => listLocalCompanies(), []);
  const allBusinesses = onlineBusinesses;
  const availableRoles = actor.role === 'superadmin' ? (['admin', ...STAFF_ROLES] as LocalUserRole[]) : STAFF_ROLES;
  const firstRole = actor.role === 'superadmin' ? 'admin' : 'operator';
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<LocalUserRole>(firstRole);
  const [companyId, setCompanyId] = useState(actor.companyId ?? companies[0]?.id ?? '');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [createCompany, setCreateCompany] = useState(actor.role === 'superadmin' && firstRole === 'admin');
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<LocalPermission[]>(
    [...(ROLE_PRESETS[firstRole as keyof typeof ROLE_PRESETS] ?? [])],
  );

  const allowedPermissions = assignablePermissions(actor);
  const visibleBusinesses = allBusinesses.filter((business) => {
    const targetCompanyId = createCompany ? '' : companyId;
    return !targetCompanyId || business.companyId === targetCompanyId;
  });

  const applyRole = (nextRole: LocalUserRole) => {
    if (!canCreateRole(actor, nextRole)) return;
    setRole(nextRole);
    if (nextRole !== 'custom') {
      const preset = ROLE_PRESETS[nextRole as keyof typeof ROLE_PRESETS] ?? [];
      setPermissions(preset.filter((permission) => allowedPermissions.some((item) => item.id === permission)));
    }
    if (nextRole === 'admin') {
      setBusinessIds([]);
      setCreateCompany(true);
    }
  };

  const togglePermission = (id: LocalPermission) => {
    setRole((current) => current === 'admin' ? 'admin' : 'custom');
    setPermissions((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return; setError('');
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Indique nome e email válidos.');
    if (password.length < 8) return setError("A password temporária deve ter pelo menos 8 caracteres.");
    if (!canCreateRole(actor, role)) return setError('Sem permissão para este perfil.');
    if (createCompany && !newCompanyName.trim()) return setError('Indique o nome da empresa.');
    setSaving(true);
    try {
      await createSupabaseManagedUser({ name: name.trim(), email: email.trim().toLowerCase(), password, role,
        companyId: createCompany ? undefined : actor.companyId || companyId,
        newCompanyName: createCompany ? newCompanyName.trim() : undefined,
        businessIds: role === 'admin' ? [] : businessIds, permissions });
      router.push('/dashboard/administracao/utilizadores');
    } catch (cause) { setError(uiMessagePt(cause instanceof Error ? cause.message : 'Não foi possível criar a conta.')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 20, maxWidth: 980 }}>
      <label style={{ display: 'grid', gap: 8 }}>password temporária<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <header>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{actor.role === 'superadmin' ? 'Criar Admin ou utilizador' : 'Criar utilizador'}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>
          {actor.role === 'superadmin'
            ? 'O Super Admin cria os Admins, associa-os a uma empresa e define as permissões disponíveis.'
            : 'Crie membros da sua empresa e atribua apenas os acessos necessários.'}
        </p>
      </header>

      {error ? <div style={errorBox}>{error}</div> : null}

      <section style={card}>
        <h2 style={sectionTitle}>1. Dados do utilizador</h2>
        <div style={grid2}>
          <label style={label}>Nome *<input value={name} onChange={(event) => setName(event.target.value)} style={input} /></label>
          <label style={label}>Email *<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={input} /></label>
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>2. Perfil</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {availableRoles.map((id) => (
            <button key={id} type="button" onClick={() => applyRole(id)} style={{ ...choiceButton, ...(role === id ? choiceButtonActive : {}) }}>
              {roleLabel(id)}
            </button>
          ))}
        </div>
        {role === 'admin' ? <p style={help}>O Admin é o responsável por uma empresa e pode gerir um ou mais negócios dessa empresa. O Chatbot não pode ser atribuído a Admins.</p> : null}
      </section>

      {actor.role === 'superadmin' ? (
        <section style={card}>
          <h2 style={sectionTitle}>3. Empresa</h2>
          {role === 'admin' ? (
            <label style={checkRow}>
              <input type="checkbox" checked={createCompany} onChange={(event) => setCreateCompany(event.target.checked)} />
              <span><strong>Criar nova empresa para este Admin</strong><br /><small style={smallHelp}>O Admin ficará como proprietário da empresa.</small></span>
            </label>
          ) : null}

          {createCompany ? (
            <label style={{ ...label, marginTop: 12 }}>Nome da nova empresa *<input value={newCompanyName} onChange={(event) => setNewCompanyName(event.target.value)} style={input} placeholder="Empresa do Produtor" /></label>
          ) : (
            <label style={{ ...label, marginTop: 12 }}>Empresa *
              <select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setBusinessIds([]); }} style={input}>
                <option value="">Selecionar empresa</option>
                {companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}
              </select>
            </label>
          )}
        </section>
      ) : null}

      {role !== 'admin' ? (
        <section style={card}>
          <h2 style={sectionTitle}>{actor.role === 'superadmin' ? '4' : '3'}. Negócios permitidos</h2>
          {!visibleBusinesses.length ? <p style={help}>Ainda não existem negócios disponíveis para esta empresa.</p> : (
            <div style={checkGrid}>
              {visibleBusinesses.map((business) => (
                <label key={business.id} style={checkRow}>
                  <input type="checkbox" checked={businessIds.includes(business.id)} onChange={(event) => setBusinessIds((current) => event.target.checked ? [...new Set([...current, business.id])] : current.filter((id) => id !== business.id))} />
                  <span><strong>{business.name}</strong><br /><small style={smallHelp}>{business.productTypeName || business.kind}</small></span>
                </label>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section style={card}>
        <h2 style={sectionTitle}>{actor.role === 'superadmin' ? (role === 'admin' ? '4' : '5') : '4'}. Permissões</h2>
        {[...new Set(allowedPermissions.map((permission) => permission.group))].map((group) => (
          <div key={group} style={{ marginTop: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{group}</h3>
            <div style={checkGrid}>
              {allowedPermissions.filter((permission) => permission.group === group).map((permission) => (
                <label key={permission.id} style={checkRow}>
                  <input type="checkbox" checked={permissions.includes(permission.id)} onChange={() => togglePermission(permission.id)} />
                  <span><strong>{permission.label}</strong><br /><small style={smallHelp}>{permission.description}</small></span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <p style={help}>O Chatbot é exclusivo do Super Admin e não aparece nesta lista.</p>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={() => router.back()} style={secondaryButton}>Cancelar</button>
        <button type="submit" disabled={saving} style={primaryButton}>{saving ? "A guardar…" : "Guardar utilizador no Supabase"}</button>
      </div>
    </form>
  );
}

const card: React.CSSProperties = { padding: 20, borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb', borderRadius: 12, background: '#fff' };
const sectionTitle: React.CSSProperties = { margin: '0 0 14px', fontSize: 17, fontWeight: 800 };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 };
const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 700 };
const input: React.CSSProperties = { width: '100%', padding: '10px 11px', borderWidth: 1, borderStyle: 'solid', borderColor: '#d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const help: React.CSSProperties = { margin: '10px 0 0', color: '#6b7280', fontSize: 12 };
const smallHelp: React.CSSProperties = { fontSize: 12, color: '#6b7280' };
const choiceButton: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, borderWidth: 1, borderStyle: 'solid', borderColor: '#d1d5db', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
const choiceButtonActive: React.CSSProperties = { background: '#eff6ff', borderColor: '#2563eb', color: '#1d4ed8' };
const checkGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 10 };
const checkRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: 11, borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' };
const primaryButton: React.CSSProperties = { padding: '10px 16px', borderWidth: 0, borderStyle: 'solid', borderColor: 'transparent', borderRadius: 8, background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 };
const secondaryButton: React.CSSProperties = { ...primaryButton, background: '#fff', color: '#111827', borderWidth: 1, borderColor: '#d1d5db' };
const errorBox: React.CSSProperties = { padding: 12, borderRadius: 8, background: '#fee2e2', color: '#b91c1c', fontSize: 13 };
