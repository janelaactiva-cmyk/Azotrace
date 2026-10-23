'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';


import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Building2, RefreshCw, Search } from 'lucide-react';
import { useTheme } from '~/lib/theme-context';
import { useLocalUser } from '../../_lib/use-local-user';
import { companyBillingHref, filterCompanies, type CompanyState } from '~/lib/company-directory';
import { loadCompanyDirectory, type CompanyDirectorySnapshot } from '~/lib/company-directory-request';
import styles from './companies.module.css';
import CompanyDetailsPanel from '~/components/CompanyDetailsPanel';

const tabs = [ ['overview', 'Visão geral'], ['businesses', 'Negócios'], ['users', 'Utilizadores'], ['history', 'Histórico'] ] as const;
type Tab = typeof tabs[number][0];
const date = (value?: string) => {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('pt-PT', { timeZone: 'Atlantic/Azores', dateStyle: 'medium' }).format(new Date(value));
};
const roleNames: Record<string, string> = { admin: 'Admin', manager: 'Gestor', operator: 'Operador', quality: 'Qualidade', traceability: 'Rastreabilidade', viewer: 'Consulta', custom: 'Personalizado' };

export default function CompaniesPage() {
  const user = useLocalUser();
  const { theme } = useTheme();
  const [data, setData] = useState<CompanyDirectorySnapshot | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
  const [companyId, setCompanyId] = useState(''), [tab, setTab] = useState<Tab>('overview');
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0), mounted = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const allowed = user.active && user.role === 'superadmin';

  const refresh = useCallback(async () => {
    if (!allowed) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const current = ++generation.current;
    setLoading(true); setError('');
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const snapshot = await loadCompanyDirectory(controller.signal);
      if (mounted.current && current === generation.current) setData(snapshot);
    } catch (cause) {
      if (mounted.current && current === generation.current) {
        setData(null);
        setError(uiMessagePt(controller.signal.aborted ? 'O pedido demorou demasiado. Tenta novamente.' : cause instanceof Error ? cause.message : 'Não foi possível carregar as empresas.'));
      }
    } finally {
      window.clearTimeout(timeout);
      if (mounted.current && current === generation.current) setLoading(false);
    }
  }, [allowed, user.id]);

  useEffect(() => {
    mounted.current = true;
    if (allowed) void refresh();
    const focus = () => { if (allowed) void refresh(); };
    window.addEventListener('focus', focus);
    return () => { mounted.current = false; generation.current++; request.current?.abort(); window.removeEventListener('focus', focus); };
  }, [allowed, refresh]);
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setCompanyId(params.get('empresa') || '');
      const requested = params.get('separador');
      setTab(tabs.some(([id]) => id === requested) ? requested as Tab : 'overview');
    };
    sync(); window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => { if (companyId && data) heading.current?.focus(); }, [companyId, !!data]);

  function navigate(id: string, nextTab: Tab = 'overview') {
    const url = new URL(window.location.href);
    if (id) { url.searchParams.set('empresa', id); url.searchParams.set('separador', nextTab); }
    else { url.searchParams.delete('empresa'); url.searchParams.delete('separador'); }
    window.history.pushState(null, '', url.pathname + url.search + url.hash);
    setCompanyId(id); setTab(nextTab);
  }
  function changeTab(next: Tab, focus = false) {
    navigate(companyId, next);
    if (focus) window.requestAnimationFrame(() => document.getElementById('company-tab-' + next)?.focus());
  }
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex(([id]) => id === tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    changeTab(tabs[next]![0], true);
  }

  if (!user.id) return <p role="status">A validar a sessão…</p>;
  if (!allowed) return <p role="alert">Esta área é exclusiva do Super Admin.</p>;
  const companies = data?.companies || [];
  const company = companies.find(row => row.id === companyId);
  const rows = filterCompanies(companies, query, filter);
  return <div className={styles.root} data-theme={theme}>
    <div className={styles.top}>
      <div>{companyId ? <button type="button" className={styles.back} onClick={() => navigate('')}><ArrowLeft size={16} aria-hidden="true"/> Todas as empresas</button> : null}
        <h1 ref={heading} tabIndex={-1}>{companyId ? company?.name || 'Ficha da empresa' : 'Empresas clientes'}</h1>
        <p className={styles.muted}>{companyId ? 'Dados da empresa, negócios e utilizadores associados.' : 'Empresas, negócios e acessos à plataforma.'}</p>
      </div>
      <button type="button" className={styles.button} disabled={loading} onClick={() => void refresh()}><RefreshCw size={15} aria-hidden="true"/>{loading ? 'A atualizar…' : 'Atualizar'}</button>
    </div>
    {error ? <div className={styles.error} role="alert">{error}</div> : null}
    {loading ? <p role="status" className={styles.muted}>A carregar os dados das empresas…</p> : null}
    {data && !companyId ? <>
      <section className={styles.stats} aria-label="Resumo das empresas">
        {([['Total de empresas', companies.length], ['Empresas ativas', companies.filter(c => c.state === 'Ativa').length], ['Empresas suspensas', companies.filter(c => c.state === 'Suspensa').length], ['Onboarding por concluir', companies.filter(c => c.state === 'Em onboarding').length]] as const).map(([label, value]) => <div className={styles.stat} key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </section>
      <section className={styles.panel} aria-labelledby="company-list-title">
        <h2 id="company-list-title">Diretório de empresas</h2>
        <div className={styles.tools}>
          <label className={styles.search} htmlFor="company-search">Pesquisar empresa<div className={styles.searchInput}><Search size={16} aria-hidden="true"/><input id="company-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, NIF ou email"/></div></label>
          <label htmlFor="company-filter">Estado da empresa<select id="company-filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos os estados</option>{['Ativa', 'Suspensa', 'Em onboarding'].map(state => <option key={state}>{state}</option>)}</select></label>
        </div>
        <p className={styles.caption} aria-live="polite">{rows.length} {rows.length === 1 ? 'empresa' : 'empresas'}{query || filter !== 'all' ? ` de ${companies.length}` : ''}</p>
        <div className={styles.scroll}><table><thead><tr><th>Empresa</th><th>Responsável</th><th className={styles.number}>Negócios</th><th className={styles.number}>Utilizadores</th><th>Estado</th><th><span className={styles.srOnly}>Ações</span></th></tr></thead><tbody>
          {rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong><small>NIF · {(row.nif ?? row.billing?.nif) || 'Não registado'}</small></td><td>{row.contactName || row.owner?.name || 'Responsável por definir'}<small>{row.contactEmail || row.owner?.email || '—'}</small></td><td className={styles.number}>{row.businesses.length}</td><td className={styles.number}>{row.users.length}</td><td><StateBadge state={row.state}/></td><td><button type="button" className={styles.button} aria-label={`Ver empresa ${row.name}`} onClick={() => navigate(row.id)}>Ver empresa</button></td></tr>)}
          {!rows.length ? <tr><td colSpan={6} className={styles.empty}><Building2 size={24} aria-hidden="true"/><p>{companies.length ? 'Nenhuma empresa corresponde aos filtros.' : 'Ainda não existem empresas registadas.'}</p></td></tr> : null}
        </tbody></table></div>
        <p className={styles.caption}>Ativa: empresa habilitada com pelo menos um negócio configurado. Em onboarding: ainda sem um negócio configurado. O estado da subscrição é consultado nos pagamentos.</p>
      </section>
    </> : null}
    {data && companyId && !company ? <div className={styles.panel}><h2>Empresa não encontrada</h2><p>O registo pode ter sido removido. Volta à lista ou atualiza os dados.</p></div> : null}
    {data && company ? <>
      <div className={styles.detailMeta}><StateBadge state={company.state}/><span className={styles.caption}>Cliente desde {date(company.createdAt)}</span></div>
      <div className={styles.tabs} role="tablist" aria-label="Ficha da empresa">{tabs.map(([id, label]) => <button key={id} type="button" id={'company-tab-' + id} role="tab" aria-selected={tab === id} aria-controls="company-detail-panel" tabIndex={tab === id ? 0 : -1} onClick={() => changeTab(id)} onKeyDown={onTabKey}>{label}{id === 'businesses' ? ` (${company.businesses.length})` : id === 'users' ? ` (${company.users.length})` : ''}</button>)}</div>
      <section id="company-detail-panel" role="tabpanel" aria-labelledby={'company-tab-' + tab}>
        {tab === 'overview' ? <div className={styles.detailGrid}>
          <CompanyDetailsPanel key={company.id} companyId={company.id} onSaved={() => void refresh()}/>
          <div className={`${styles.panel} ${styles.summary}`}><h2>Na plataforma</h2><div><strong>{company.businesses.length}</strong><span>negócios associados</span></div><div><strong>{company.users.length}</strong><span>utilizadores associados</span></div><p className={styles.muted}>Último plano registado<br/><b>{company.billing?.plan || 'Sem subscrição associada'}</b></p><Link className={`${styles.button} ${styles.primary}`} href={companyBillingHref(company)}>Ver pagamentos e subscrição <ArrowUpRight size={16} aria-hidden="true"/></Link></div>
        </div> : null}
        {tab === 'businesses' ? <div className={styles.panel}><h2>Negócios da empresa</h2><div className={styles.scroll}><table><thead><tr><th>Negócio</th><th>Atividade</th><th>Configuração</th><th>Criado em</th></tr></thead><tbody>{company.businesses.map(business => <tr key={business.id}><td>{business.name}</td><td>{business.kind || '—'}</td><td>{business.completed ? 'Concluída' : 'Por concluir'}</td><td>{date(business.createdAt)}</td></tr>)}{!company.businesses.length ? <tr><td colSpan={4} className={styles.empty}>O cliente ainda não configurou o primeiro negócio.</td></tr> : null}</tbody></table></div></div> : null}
        {tab === 'users' ? <div className={styles.panel}><h2>Utilizadores e acessos</h2><div className={styles.scroll}><table><thead><tr><th>Utilizador</th><th>Papel</th><th>Acesso</th><th>Associado em</th></tr></thead><tbody>{company.users.map(member => <tr key={member.id}><td>{member.name}<small>{member.email || 'Email indisponível'}</small></td><td>{roleNames[member.role] || member.role}{member.owner ? ' · proprietário' : ''}</td><td>{member.active ? 'Ativo' : 'Inativo'}</td><td>{date(member.joinedAt)}</td></tr>)}{!company.users.length ? <tr><td colSpan={4} className={styles.empty}>Sem utilizadores associados a esta empresa.</td></tr> : null}</tbody></table></div><p className={styles.caption}>O acesso é apresentado como ativo quando a empresa, a associação e o perfil estão ativos.</p></div> : null}
        {tab === 'history' ? <><CompanyDetailsPanel key={'history-' + company.id} companyId={company.id} historyOnly/><div className={styles.panel}><h2>Outros marcos da empresa</h2><p className={styles.caption}>O histórico de pagamentos e alterações de plano está em Pagamentos e subscrições.</p><ol className={styles.timeline}>{company.events.map(event => <li key={event.id}><time dateTime={event.date}>{date(event.date)}</time><span>{event.label}</span></li>)}</ol>{!company.events.length ? <p className={styles.empty}>Sem datas de atividade disponíveis.</p> : null}</div></> : null}
      </section>
    </> : null}
    {data ? <p className={styles.caption}>Dados atualizados em {date(data.refreshedAt)} · Os totais incluem os registos associados ativos e inativos.</p> : null}
  </div>;
}

function StateBadge({ state }: { state: CompanyState }) {
  return <span className={`${styles.badge} ${state === 'Ativa' ? styles.active : state === 'Suspensa' ? styles.suspended : styles.onboarding}`}>{state}</span>;
}
