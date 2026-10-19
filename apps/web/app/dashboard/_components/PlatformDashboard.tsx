'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, CalendarClock, RefreshCw, TrendingUp, UserPlus, Wallet } from 'lucide-react';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme-context';
import { LOCAL_SESSION_EVENT } from '../_lib/local-users';
import { PLATFORM_TIME_ZONE, type PlatformClient, type PlatformSnapshot } from '../_lib/platform-summary';
import styles from './platform-dashboard.module.css';

const money = (cents: number | null) => cents === null ? '—' : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const date = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('pt-PT', { timeZone: PLATFORM_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '—';
const statuses: Record<string, string> = { active: 'Ativa', expired: 'Expirada', canceled: 'Cancelada', inactive: 'Inativa', none: 'Sem subscrição' };

export function PlatformDashboard() {
  const { theme } = useTheme();
  const [data, setData] = useState<PlatformSnapshot | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [search, setSearch] = useState('');
  const generation = useRef(0), controller = useRef<AbortController | null>(null);
  async function refresh(clear = false) {
    const current = ++generation.current;
    controller.current?.abort();
    const requestController = new AbortController(); controller.current = requestController;
    if (clear) setData(null);
    setLoading(true);
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session.session) throw new Error('Inicia sessão para aceder à gestão da plataforma.');
      const response = await fetch('/api/azotrace/platform-dashboard', { headers: { Authorization: `Bearer ${session.session.access_token}` }, cache: 'no-store', signal: requestController.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar os indicadores.');
      if (current === generation.current) { setData(result); setError(''); }
    } catch (cause) {
      if (current === generation.current) { setData(null); setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o dashboard.'); }
    } finally { if (current === generation.current) setLoading(false); }
  }
  useEffect(() => {
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    const session = () => void refresh(true);
    const timer = window.setInterval(update, 120000);
    window.addEventListener(LOCAL_SESSION_EVENT, session);
    return () => { generation.current++; controller.current?.abort(); window.clearInterval(timer); window.removeEventListener(LOCAL_SESSION_EVENT, session); };
  }, []);
  const clients = data?.clients.filter(row => `${row.name} ${row.plan}`.toLocaleLowerCase('pt-PT').includes(search.toLocaleLowerCase('pt-PT'))) || [];
  const maximum = Math.max(1, ...(data?.revenue.monthly.map(row => row.cents) || []));
  const period = data ? new Intl.DateTimeFormat('pt-PT', { timeZone: PLATFORM_TIME_ZONE, month: 'long', year: 'numeric' }).format(new Date(data.updatedAt)) : 'este mês';
  return <div className={styles.page} data-theme={theme}>
    <header className={styles.header}><div><span className={styles.eyebrow}>GESTÃO AZOTRACE</span><h1>Gestão da plataforma</h1><p>Clientes, pagamentos e renovações num só lugar.</p></div><button className={styles.refresh} disabled={loading} onClick={() => void refresh()}><RefreshCw size={16} />{loading ? 'A atualizar…' : 'Atualizar'}</button></header>
    {error ? <div className={styles.alert} role="alert">{error}<button onClick={() => void refresh()}>Tentar novamente</button></div> : null}
    {!data && loading ? <p role="status">A carregar os indicadores da plataforma…</p> : null}
    {data ? <>
      <section className={styles.metrics} aria-label="Indicadores da plataforma">
        <Metric icon={<Building2 size={20} />} label="Clientes" value={String(data.totals.clients)} detail={`${data.totals.activeClients} com subscrição ativa`} />
        <Metric icon={<UserPlus size={20} />} label="Novos clientes" value={String(data.totals.newClients)} detail={`Registados em ${period}`} />
        <Metric icon={<Wallet size={20} />} label="Recebido este mês" value={`${data.revenue.partial ? '≥ ' : ''}${money(data.revenue.monthCents)}`} detail="Pagamentos confirmados · IVA incluído" />
        <Metric icon={<CalendarClock size={20} />} label="Próximas renovações" value={String(data.totals.renewals)} detail="Nos próximos 30 dias" />
      </section>
      <nav className={styles.actions} aria-label="Gestão da plataforma"><Link href="/dashboard/subscricoes">Pagamentos e subscrições <ArrowRight size={16} /></Link><Link href="/dashboard/subscricoes/planos">Gerir planos e preços <ArrowRight size={16} /></Link><Link href="/dashboard/administracao/utilizadores">Gerir clientes e acessos <ArrowRight size={16} /></Link>{process.env.NODE_ENV === 'development' ? <Link href="/checkout/create-account?teste=1">Testar criação de conta <ArrowRight size={16} /></Link> : null}</nav>
      <div className={styles.columns}>
        <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Pagamentos da plataforma</h2><p>{data.year} · valores brutos em euros</p></div><TrendingUp size={20} /></div><strong className={styles.yearTotal}>{money(data.revenue.yearCents)}</strong><p className={styles.muted}>Recebido no ano{data.revenue.partial ? ' · consulta parcial' : ''}</p>
          {data.revenue.testMode ? <p className={styles.alert} role="status">Stripe em modo de teste: estes valores são de teste.</p> : null}
          {data.revenue.warning ? <p className={styles.alert} role="status">{data.revenue.warning}</p> : null}
          {data.revenue.monthCents !== null ? <div className={styles.bars}>{data.revenue.monthly.map(row => <div className={styles.barRow} key={row.month}><span>{new Intl.DateTimeFormat('pt-PT', { month: 'short', timeZone: PLATFORM_TIME_ZONE }).format(new Date(`${row.month}-15T12:00:00Z`))}</span><div className={styles.track}><div style={{ width: `${row.cents / maximum * 100}%` }} /></div><strong>{money(row.cents)}</strong></div>)}</div> : null}
          <p className={styles.note}>Pagamentos Azotrace confirmados no Stripe, agrupados pela data do checkout. Incluem IVA e não descontam reembolsos. A emissão de faturas é acompanhada no sistema de faturação.</p>
        </section>
        <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Agenda de renovações</h2><p>Subscrições a terminar nos próximos 30 dias</p></div><CalendarClock size={20} /></div>
          {data.renewals.length ? <div className={styles.list}>{data.renewals.map(row => <ClientRow key={row.id} client={row} detail={`Validade até ${date(row.renewsAt)}`} />)}</div> : <p className={styles.empty}>Sem renovações previstas nos próximos 30 dias.</p>}
          <div className={styles.footnote}><span>{data.totals.expired} cliente(s) com subscrição expirada</span>{data.totals.unassociated ? <Link href="/dashboard/subscricoes">{data.totals.unassociated} compra(s) por associar →</Link> : null}</div>
        </section>
      </div>
      <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Novos clientes</h2><p>Empresas registadas em {period}</p></div><UserPlus size={20} /></div>{data.newClients.length ? <div className={styles.newClients}>{data.newClients.map(row => <ClientRow key={row.id} client={row} detail={`Registo em ${date(row.createdAt)}`} />)}</div> : <p className={styles.empty}>Ainda não foram registados novos clientes este mês.</p>}</section>
      <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Clientes da plataforma</h2><p>Plano, estado e próxima data de validade</p></div><label className={styles.search}>Pesquisar cliente<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome ou plano" /></label></div>
        {clients.length ? <div className={styles.tableWrap}><table><thead><tr><th>Cliente</th><th>Plano</th><th>Subscrição</th><th>Validade</th><th>Registo</th></tr></thead><tbody>{clients.map(row => <tr key={row.id}><td><strong>{row.name}</strong>{!row.active ? <small>Empresa inativa</small> : null}</td><td>{row.plan}</td><td><span className={styles.status} data-status={row.status}>{statuses[row.status] || row.status}</span></td><td>{date(row.renewsAt)}</td><td>{date(row.createdAt)}</td></tr>)}</tbody></table></div> : <p className={styles.empty}>{data.clients.length ? 'Nenhum cliente corresponde à pesquisa.' : 'Ainda não existem empresas clientes registadas.'}</p>}
      </section><p className={styles.updated}>Última atualização: {new Intl.DateTimeFormat('pt-PT', { timeZone: PLATFORM_TIME_ZONE, dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.updatedAt))}</p>
    </> : null}
  </div>;
}
function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <article className={styles.metric}><div className={styles.metricLabel}>{label}<span>{icon}</span></div><strong>{value}</strong><small>{detail}</small></article>;
}
function ClientRow({ client, detail }: { client: PlatformClient; detail: string }) {
  return <div className={styles.clientRow}><span className={styles.avatar}>{client.name.slice(0, 1).toUpperCase()}</span><div><strong>{client.name}</strong><small>{detail}</small></div><span className={styles.plan}>{client.plan}</span></div>;
}
