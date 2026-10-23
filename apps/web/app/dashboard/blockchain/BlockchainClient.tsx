'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useBusiness } from '~/lib/business-context';
import { useTheme } from '~/lib/theme-context';
import { supabase } from '~/lib/supabase';
import { useLocalUser } from '../_lib/use-local-user';
import { targetUserId } from '../_lib/online-state';
import type { BusinessChain, ChainOption } from '~/lib/business-blockchain';
import styles from './blockchain.module.css';
import dynamic from 'next/dynamic';

const DeliveryManagement = dynamic(() => import('~/components/DeliveryManagement'), { loading: () => <p role="status">A carregar as entregas…</p> });
const ShipmentReceipts = dynamic(() => import('~/components/ShipmentReceipts'), { loading: () => <p role="status">A carregar as receções…</p> });

async function request<T>(query: string, signal: AbortSignal): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Inicia sessão novamente.');
  const target = targetUserId();
  const response = await fetch(`/api/azotrace/business-blockchain?${query}`, { signal, cache: 'no-store', headers: { Authorization: `Bearer ${data.session.access_token}`, ...(target ? { 'x-azotrace-user-id': target } : {}) } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível carregar os dados.');
  return result;
}
function Options({ label, query, value, fallback, onChange, revision }: { label: string; query: string; value: string; fallback?: string; onChange: (item: ChainOption) => void; revision: number }) {
  const id = useId();
  const [items, setItems] = useState<ChainOption[]>([]), [more, setMore] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const active = useRef<AbortController | null>(null), change = useRef(onChange), selected = useRef(value);
  change.current = onChange; selected.current = value;
  const load = useCallback(async (offset: number) => {
    active.current?.abort(); const controller = new AbortController(); active.current = controller; setBusy(true); setError('');
    try {
      const result = await request<{ items: ChainOption[]; hasMore: boolean }>(`${query}&offset=${offset}`, controller.signal);
      if (controller.signal.aborted) return;
      setItems(previous => offset ? [...previous, ...result.items] : result.items); setMore(result.hasMore);
      if (!selected.current && result.items[0]) change.current(result.items[0]);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a lista.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }, [query]);
  useEffect(() => { setItems([]); setMore(false); void load(0); return () => active.current?.abort(); }, [load, revision]);
  return <div className={styles.field}><label htmlFor={id}>{label}</label><select id={id} value={value} disabled={busy && !items.length} onChange={event => { const item = items.find(row => row.id === event.target.value); if (item) onChange(item); }}>
    {!value && <option value="">{busy ? 'A carregar…' : 'Sem opções disponíveis'}</option>}
    {value && !items.some(item => item.id === value) && <option value={value}>{fallback || 'Selecionado'}</option>}
    {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select>{error && <span role="alert">{error}<button type="button" onClick={() => void load(0)}>Tentar novamente</button></span>}{more && <button type="button" disabled={busy} onClick={() => void load(items.length)}>Carregar mais</button>}</div>;
}
const date = (value: string) => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeZone: 'Atlantic/Azores' }).format(new Date(value)) : 'Data não registada';
const content = (value: unknown): string => typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—');

export default function BlockchainClient({ monitorOnly = false }: { monitorOnly?: boolean } = {}) {
  const { theme } = useTheme(), user = useLocalUser();
  const { selectedBusinessId, selectedBusinessName, setSelectedBusiness } = useBusiness();
  const [companyId, setCompanyId] = useState(''), [selected, setSelected] = useState<ChainOption | null>(null), [batchId, setBatchId] = useState(''), [offset, setOffset] = useState(0), [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<BusinessChain | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const superadmin = user.role === 'superadmin';
  const businessId = superadmin ? selected?.id || '' : selectedBusinessId || selected?.id || '';
  const scope = `${user.id}:${user.companyId || ''}:${targetUserId() || ''}`;
  useEffect(() => { setCompanyId(superadmin ? '' : user.companyId || ''); setSelected(null); setBatchId(''); setOffset(0); setSnapshot(null); }, [scope, superadmin]);
  useEffect(() => { setBatchId(''); setOffset(0); setSnapshot(null); }, [businessId]);
  useEffect(() => {
    setSnapshot(null); setError('');
    if (!businessId || !user.active || monitorOnly && !superadmin) { setBusy(false); return; }
    const controller = new AbortController(); setBusy(true);
    const query = new URLSearchParams({ businessId, batchId, offset: String(offset) });
    void request<BusinessChain>(query.toString(), controller.signal).then(result => { if (!controller.signal.aborted) setSnapshot(result); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível consultar o negócio.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [businessId, batchId, offset, revision, scope, user.active, monitorOnly, superadmin]);
  const visible = snapshot?.business.id === businessId ? snapshot : null;
  if (monitorOnly && !superadmin) return <p role="alert">Esta área está reservada ao superadmin.</p>;
  const choose = (item: ChainOption) => { setSelected(item); setBatchId(''); setOffset(0); if (!superadmin) setSelectedBusiness(item.id, item.kind || '', item.name); };
  return <div className={styles.root} data-theme={theme}>
    <header className={styles.header}><div><h1>Rastreabilidade e entregas</h1><p>{superadmin ? 'Consulta os registos reais de cada empresa, negócio e lote.' : 'Acompanha os registos reais dos lotes do negócio ativo.'}</p></div><button type="button" onClick={() => setRevision(value => value + 1)}>Atualizar</button></header>
    <section className={styles.panel}><div className={styles.selectors}>
      {superadmin && <Options key={`company:${scope}`} label="Empresa" query="mode=companies" value={companyId} onChange={item => { setCompanyId(item.id); setSelected(null); setBatchId(''); setOffset(0); }} revision={revision}/>}
      {(superadmin ? companyId : user.companyId) && <Options key={`${scope}:${superadmin ? companyId : user.companyId}`} label="Negócio" query={`mode=businesses&companyId=${encodeURIComponent(superadmin ? companyId : user.companyId!)}`} value={businessId} fallback={visible?.business.name || selectedBusinessName || undefined} onChange={choose} revision={revision}/>}
      {visible && <div className={styles.field}><label>Lote<select value={visible.selectedBatchId} onChange={event => { setBatchId(event.target.value); setOffset(0); }}>{!visible.batches.length && <option value="">Sem lotes registados</option>}{visible.batches.map(batch => <option key={batch.id} value={batch.id}>{batch.code} · {batch.product}</option>)}</select></label></div>}
    </div></section>
    {error && <div className={styles.error} role="alert">{error}<button type="button" onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div>}
    {busy && <p role="status">A consultar os dados do negócio…</p>}
    {!busy && !visible && !error && <section className={styles.panel}><h2>Seleciona um negócio</h2><p>O histórico é apresentado separadamente para cada negócio e lote. Não existem dados de demonstração nesta página.</p></section>}
    {visible && <>
      <section className={styles.summary}><div><span>Empresa</span><strong>{visible.companyName}</strong></div><div><span>Negócio</span><strong>{visible.business.name}</strong></div><div><span>Lotes registados</span><strong>{visible.batches.length}</strong></div><div><span>Última atualização guardada</span><strong>{date(visible.business.updatedAt)}</strong></div></section>
      {visible.selectedBatchId && <><DeliveryManagement key={`${scope}:${businessId}:${visible.selectedBatchId}`} businessId={businessId} batchId={visible.selectedBatchId} canWrite={!superadmin && !targetUserId() && user.permissions.includes('production.write')} canManage={!superadmin && !targetUserId() && user.role === 'admin'} /><details className={styles.panel}><summary>Receções do fluxo anterior</summary><ShipmentReceipts key={`legacy:${scope}:${businessId}:${visible.selectedBatchId}`} businessId={businessId} batchId={visible.selectedBatchId} canWrite={false} /></details></>}
      <section className={styles.panel}><h2>Lotes deste negócio</h2><div className={styles.table}><table><thead><tr><th>Lote</th><th>Produto</th><th>Unidade</th><th>Estado</th><th>Eventos</th></tr></thead><tbody>{visible.batches.map(batch => <tr key={batch.id} aria-selected={batch.id === visible.selectedBatchId}><td><button type="button" className={styles.link} onClick={() => { setBatchId(batch.id); setOffset(0); }}>{batch.code}</button></td><td>{batch.product}</td><td>{batch.unit}</td><td>{batch.status}</td><td>{batch.events}</td></tr>)}{!visible.batches.length && <tr><td colSpan={5}>Este negócio ainda não tem lotes guardados.</td></tr>}</tbody></table></div></section>
      <section className={styles.panel}><h2>Histórico do lote {visible.batches.find(batch => batch.id === visible.selectedBatchId)?.code || ''}</h2><p>{visible.totalEvents} eventos guardados · origem: dados do Azotrace</p><ol className={styles.timeline}>{visible.events.map(event => <li key={event.id}><time>{date(event.at)}</time><div><h3>{event.label}</h3><dl>{Object.entries(event.data).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{content(value)}</dd></div>)}</dl></div></li>)}</ol>{!visible.events.length && <p>Sem eventos guardados para este lote.</p>}
      <nav className={styles.pager} aria-label="Histórico do lote"><button disabled={!offset || busy} onClick={() => setOffset(value => Math.max(0, value - 50))}>Anterior</button><span>{visible.totalEvents ? `${offset + 1}–${Math.min(offset + 50, visible.totalEvents)} de ${visible.totalEvents}` : '0 eventos'}</span><button disabled={!visible.hasMore || busy} onClick={() => setOffset(value => value + 50)}>Seguinte</button></nav></section>
    </>}
  </div>;
}
