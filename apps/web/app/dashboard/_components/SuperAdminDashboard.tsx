'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Building2, CreditCard, Users, Warehouse } from 'lucide-react';

import { supabase } from '~/lib/supabase';
import { ONLINE_BILLING_EVENT } from '../_lib/online-billing';
import { targetUserId } from '../_lib/online-state';
import { LOCAL_USERS_EVENT, LOCAL_SESSION_EVENT } from '../_lib/local-users';
import { LOCAL_COMPANIES_EVENT } from '../_lib/local-companies';
import { getLocalBillingOverview, LOCAL_SUBSCRIPTIONS_EVENT, subscriptionStatus } from '../_lib/local-subscriptions';
import { listLocalBusinesses, BUSINESSES_UPDATED_EVENT } from '../onboarding/_lib/local-store';

type OverviewClient = {
  id: string;
  name: string;
  active: boolean;
  admin: { id: string; name: string; email: string; active: boolean } | null;
  subscription: { id: string; plan: string; status: string; startedAt: string | null; expiresAt: string | null } | null;
  businesses: Array<{ id: string; name: string; kind: string; completed: boolean; updatedAt: string | null }>;
  membersCount: number;
};

type OverviewPayload = {
  clients: OverviewClient[];
  totals: { clients: number; activeSubscriptions: number; businesses: number; users: number };
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatStatus(value: string) {
  return ({ active: 'Ativa', inactive: 'Inativa', canceled: 'Cancelada', expired: 'Expirada', scheduled: 'Agendada' } as Record<string, string>)[value] || value;
}

export function SuperAdminDashboard() {
  const [payload, setPayload] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) throw new Error('Inicia sessão novamente.');
        const response = await fetch('/api/azotrace/overview', { cache: 'no-store', headers: { Authorization: 'Bearer ' + session.session.access_token, ...(targetUserId() ? { 'x-azotrace-user-id': targetUserId()! } : {}) } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Não foi possível carregar a visão global.');
        if (!cancelled) setPayload(body);
      } catch (cause) {
        if (!cancelled) { setPayload(null); setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a visão global.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const refresh = () => { void load(); };
    const events = ['storage', LOCAL_USERS_EVENT, LOCAL_SESSION_EVENT, LOCAL_COMPANIES_EVENT, ONLINE_BILLING_EVENT, BUSINESSES_UPDATED_EVENT];
    events.forEach((event) => window.addEventListener(event, refresh));
    return () => { cancelled = true; events.forEach((event) => window.removeEventListener(event, refresh)); };
  }, []);

  const clients = payload?.clients ?? [];
  const totals = payload?.totals ?? { clients: 0, activeSubscriptions: 0, businesses: 0, users: 0 };
  const withoutSubscription = useMemo(() => clients.filter((client) => !client.subscription).length, [clients]);

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <span style={{ color: '#6d28d9', fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Super Admin</span>
          <h1 style={{ margin: '6px 0 4px', fontSize: 28, fontWeight: 800 }}>Visão geral da plataforma</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            Clientes Admin, subscrições e negócios guardados no Supabase. A operação de cada negócio pertence ao Admin e aos membros desse cliente.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/dashboard/administracao/utilizadores" style={secondaryButton}>Gerir Admins e utilizadores</Link>
          <Link href="/dashboard/subscricoes" style={primaryButton}>Ver subscrições</Link>
        </div>
      </header>

      {error ? (
        <div role="alert" style={{ padding: 14, border: '1px solid #fecaca', borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
        <Stat icon={Building2} label="Clientes Admin" value={loading ? '—' : totals.clients} detail="Empresas registadas" />
        <Stat icon={CreditCard} label="Subscrições ativas" value={loading ? '—' : totals.activeSubscriptions} detail={loading ? 'A carregar…' : `${withoutSubscription} cliente(s) sem subscrição associada`} />
        <Stat icon={Warehouse} label="Negócios" value={loading ? '—' : totals.businesses} detail="Em todos os clientes" />
        <Stat icon={Users} label="Membros" value={loading ? '—' : totals.users} detail="Admins e utilizadores dos clientes" />
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', color: '#111827', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Clientes e negócios</h2>
          <p style={{ margin: '5px 0 0', color: '#6b7280', fontSize: 12 }}>Visão global apenas para gestão da plataforma; não cria negócios em nome do cliente.</p>
        </div>

        {loading ? (
          <div style={{ padding: 30, color: '#6b7280', fontSize: 13 }}>A carregar clientes…</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: 30, color: '#6b7280', fontSize: 13 }}>Ainda não existem clientes Admin registados.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  {['Cliente', 'Admin', 'Subscrição', 'Negócios', 'Membros', 'Renovação'].map((label) => (
                    <th key={label} style={th}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={td}><strong>{client.name}</strong><div style={muted}>{client.active ? 'Ativo' : 'Inativo'}</div></td>
                    <td style={td}>{client.admin ? <><strong>{client.admin.name}</strong><div style={muted}>{client.admin.email}</div></> : <span style={muted}>Sem Admin associado</span>}</td>
                    <td style={td}>{client.subscription ? <><span style={badge(client.subscription.status === 'active')}>{client.subscription.plan}</span><div style={muted}>{formatStatus(client.subscription.status)}</div></> : <span style={warningBadge}>Sem subscrição</span>}</td>
                    <td style={td}><strong>{client.businesses.length}</strong>{client.businesses.length ? <div style={muted}>{client.businesses.slice(0, 2).map((business) => business.name).join(' · ')}{client.businesses.length > 2 ? ` +${client.businesses.length - 2}` : ''}</div> : <div style={muted}>Nenhum negócio</div>}</td>
                    <td style={td}>{client.membersCount}</td>
                    <td style={td}>{formatDate(client.subscription?.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail }: { icon: typeof Building2; label: string; value: string | number; detail: string }) {
  return (
    <article style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', color: '#111827', display: 'grid', gridTemplateColumns: '38px 1fr', gap: 10, alignItems: 'center' }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center', background: '#f3f4f6', color: '#374151' }}><Icon size={18} strokeWidth={1.8} /></div>
      <div><div style={{ color: '#6b7280', fontSize: 12 }}>{label}</div><strong style={{ display: 'block', fontSize: 24, marginTop: 2 }}>{value}</strong></div>
      <small style={{ gridColumn: '1 / -1', color: '#9ca3af', fontSize: 11 }}>{detail}</small>
    </article>
  );
}

const primaryButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '9px 13px', borderRadius: 8, background: '#2563eb', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700 };
const secondaryButton: React.CSSProperties = { ...primaryButton, background: '#fff', color: '#111827', border: '1px solid #d1d5db' };
const th: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.04em' };
const td: React.CSSProperties = { padding: '13px 14px', verticalAlign: 'top', fontSize: 13 };
const muted: React.CSSProperties = { marginTop: 3, color: '#6b7280', fontSize: 11 };
const warningBadge: React.CSSProperties = { display: 'inline-block', padding: '4px 7px', borderRadius: 999, background: '#fff7ed', color: '#9a3412', fontSize: 11, fontWeight: 700 };
const badge = (active: boolean): React.CSSProperties => ({ display: 'inline-block', padding: '4px 7px', borderRadius: 999, background: active ? '#dcfce7' : '#f3f4f6', color: active ? '#166534' : '#4b5563', fontSize: 11, fontWeight: 700 });
