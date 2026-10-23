'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTheme } from '~/lib/theme-context';
import { uiMessagePt } from '~/lib/ui-messages-pt';
import { companyChangeValue, companyFieldLabels, companyValues, validateCompanyInput } from '~/lib/company-details';
import type { CompanyChange, CompanyDetailsSnapshot, CompanyDetailsValues, CompanyField } from '~/lib/company-details';
import { acknowledgeCompanyChanges, COMPANY_DETAILS_EVENT, CompanyRequestError, loadCompanyDetails, saveCompanyDetails } from '~/lib/company-details-request';
import styles from './company-details.module.css';

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-PT', { timeZone: 'Atlantic/Azores', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const editableFields = ['name', 'legal_name', 'nif', 'address', 'city', 'postal_code', 'phone', 'contact_name', 'contact_email', 'website'] as const;
const maxLengths = { name: 200, legal_name: 250, nif: 9, address: 500, city: 120, postal_code: 20, phone: 30, contact_name: 200, contact_email: 254, website: 500 };

export default function CompanyDetailsPanel({ companyId, onSaved, historyOnly = false, showHistory = false }: {
  companyId: string; onSaved?: () => void; historyOnly?: boolean; showHistory?: boolean;
}) {
  const { theme } = useTheme();
  const [data, setData] = useState<CompanyDetailsSnapshot | null>(null);
  const [draft, setDraft] = useState<CompanyDetailsValues | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [more, setMore] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [reason, setReason] = useState('');
  const [conflict, setConflict] = useState(false), [acknowledging, setAcknowledging] = useState(false);
  const current = useRef(''), controller = useRef<AbortController | null>(null), editRef = useRef(false), busy = useRef(false);
  const generation = useRef(0);
  const unreadChanges = data?.pendingChanges ?? data?.changes.filter(change => change.unread) ?? [];
  const refresh = useCallback(async (force = false) => {
    if (!companyId || editRef.current && !force) return;
    const id = ++generation.current;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    try {
      const result = await loadCompanyDetails(companyId, request.signal);
      if (request.signal.aborted || current.current !== companyId || id !== generation.current) return;
      setData(result); setError(''); setConflict(false);
      if (force) { setDraft(null); setEditing(false); editRef.current = false; }
    } catch (cause) {
      if (!request.signal.aborted && current.current === companyId && id === generation.current) setError(uiMessagePt(cause, 'Não foi possível carregar a ficha.'));
    } finally { if (!request.signal.aborted && current.current === companyId && id === generation.current) setLoading(false); }
  }, [companyId]);

  useEffect(() => {
    current.current = companyId; editRef.current = false;
    setData(null); setDraft(null); setEditing(false); setLoading(true); setError(''); setNotice(''); setConflict(false);
    void refresh();
    const sync = () => { if (document.visibilityState !== 'hidden') void refresh(); };
    const timer = window.setInterval(sync, 30000);
    window.addEventListener('focus', sync);
    return () => { current.current = ''; generation.current++; controller.current?.abort(); window.clearInterval(timer); window.removeEventListener('focus', sync); };
  }, [companyId, refresh]);

  const dirty = Boolean(editing && data && draft && JSON.stringify(companyValues(draft, data.canSetStatus)) !== JSON.stringify(companyValues(data.company, data.canSetStatus)));
  useEffect(() => {
    if (!dirty) return;
    const beforeLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeLeave);
    return () => window.removeEventListener('beforeunload', beforeLeave);
  }, [dirty]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !draft || busy.current) return;
    const id = companyId;
    try {
      const input = validateCompanyInput({ companyId: id, version: data.company.details_version, values: companyValues(draft, data.canSetStatus), reason }, data.canSetStatus);
      busy.current = true; setSaving(true); setError(''); setNotice('');
      const result = await saveCompanyDetails(input);
      if (current.current !== id) return;
      setNotice(result.changed ? 'Dados guardados. A ficha da empresa foi atualizada.' : 'Não existem alterações para guardar.');
      await refresh(true);
      window.dispatchEvent(new Event(COMPANY_DETAILS_EVENT));
      onSaved?.();
    } catch (cause) {
      if (current.current === id) { setError(uiMessagePt(cause, 'Não foi possível guardar os dados.')); setConflict(cause instanceof CompanyRequestError && cause.status === 409); }
    } finally { busy.current = false; if (current.current === id) setSaving(false); }
  }
  async function readNotifications() {
    if (!data || acknowledging) return;
    const id = companyId;
    setAcknowledging(true);
    try {
      await acknowledgeCompanyChanges(id, unreadChanges.map(change => change.id));
      if (current.current !== id) return;
      setData(previous => previous ? { ...previous, pendingChanges: [], changes: previous.changes.map(change => ({ ...change, unread: false })) } : previous);
      window.dispatchEvent(new Event(COMPANY_DETAILS_EVENT));
      await refresh();
    } catch (cause) { if (current.current === id) setError(uiMessagePt(cause, 'Não foi possível marcar os avisos como lidos.')); }
    finally { if (current.current === id) setAcknowledging(false); }
  }
  async function loadMore() {
    if (!data?.hasMore || more) return;
    const id = companyId;
    setMore(true);
    try {
      const result = await loadCompanyDetails(id, undefined, data.changes[data.changes.length - 1]?.version);
      if (current.current === id) setData(previous => previous ? { ...previous, hasMore: result.hasMore, changes: [...new Map([...previous.changes, ...result.changes].map(change => [change.id, change])).values()] } : previous);
    } catch (cause) { if (current.current === id) setError(uiMessagePt(cause, 'Não foi possível carregar o histórico.')); }
    finally { if (current.current === id) setMore(false); }
  }

  return <div className={styles.root} data-theme={theme}>
    {error ? <div className={styles.error} role="alert">{error}{conflict ? <button type="button" className={styles.button} disabled={saving} onClick={() => void refresh(true)}>Recarregar e descartar alterações</button> : <button type="button" className={styles.button} onClick={() => void refresh()}>Tentar novamente</button>}</div> : null}
    {notice ? <p className={styles.success} role="status">{notice}</p> : null}
    {loading ? <p role="status">A carregar a ficha da empresa…</p> : null}
    {data && !data.canSetStatus && unreadChanges.length ? <aside className={styles.notice} aria-label="Alterações nos dados da empresa"><strong>A equipa Azotrace atualizou os dados da tua empresa.</strong><p>Consulta os campos atualizados no histórico abaixo.</p>{unreadChanges.filter(change => !data.changes.some(row => row.id === change.id)).map(change => <ChangeDetails key={change.id} change={change}/>)}<button type="button" className={styles.button} disabled={acknowledging} onClick={() => void readNotifications()}>{acknowledging ? 'A marcar…' : 'Marcar alterações como lidas'}</button></aside> : null}
    {data && !historyOnly ? <section className={styles.panel} aria-label="Dados da empresa">
      <header className={styles.heading}><h2>Dados da empresa</h2>{!editing ? <button type="button" className={styles.button} disabled={saving} onClick={() => { controller.current?.abort(); editRef.current = true; setEditing(true); setDraft({ ...data.company }); setReason(''); setNotice(''); setError(''); }}>Editar dados</button> : null}</header>
      {editing && draft ? <form onSubmit={event => void save(event)}>
        <fieldset className={styles.fieldset} disabled={saving}>
          <div className={styles.formGrid}>{editableFields.map(field => <label className={field === 'address' ? styles.full : ''} key={field} htmlFor={`company-field-${field}`}>{companyFieldLabels[field]}{field === 'name' ? ' *' : ''}<input id={`company-field-${field}`} name={field} value={draft[field]} required={field === 'name'} maxLength={maxLengths[field]} type={field === 'contact_email' ? 'email' : field === 'website' ? 'url' : field === 'phone' ? 'tel' : 'text'} inputMode={field === 'nif' ? 'numeric' : undefined} onChange={event => setDraft(previous => previous ? { ...previous, [field]: event.target.value } : previous)}/></label>)}</div>
          <p className={styles.caption}>O email acima é um contacto da empresa. O email e a password usados para entrar na conta são geridos nos acessos.</p>
          {data.canSetStatus ? <div className={styles.formGrid} style={{ marginTop: 20 }}><label htmlFor="company-state">Estado da empresa<select id="company-state" value={draft.active ? 'active' : 'suspended'} onChange={event => setDraft(previous => previous ? { ...previous, active: event.target.value === 'active' } : previous)}><option value="active">Ativa</option><option value="suspended">Suspensa</option></select></label>{!draft.active ? <label htmlFor="company-suspension">Motivo da suspensão *<textarea id="company-suspension" value={draft.suspension_reason} required maxLength={1000} onChange={event => setDraft(previous => previous ? { ...previous, suspension_reason: event.target.value } : previous)}/></label> : null}</div> : null}
          <label className={styles.reason} htmlFor="company-change-reason">Motivo da alteração (opcional)<textarea id="company-change-reason" value={reason} maxLength={1000} onChange={event => setReason(event.target.value)}/></label>
          {data.canSetStatus && !draft.active && data.company.active ? <p className={styles.notice}>Ao suspender a empresa, os seus utilizadores deixam de conseguir aceder à aplicação. A suspensão não cancela a subscrição.</p> : null}
          <div className={styles.actions}><button className={`${styles.button} ${styles.primary}`} type="submit" disabled={!dirty || conflict}>{saving ? 'A guardar…' : 'Guardar alterações'}</button><button className={styles.button} type="button" onClick={() => { editRef.current = false; setEditing(false); setDraft(null); setError(''); setConflict(false); void refresh(); }}>Cancelar</button><span className={styles.caption}>{dirty ? 'Alterações por guardar' : 'Sem alterações'}</span></div>
        </fieldset>
      </form> : <><dl className={styles.fields}>{editableFields.map(field => <div key={field}><dt>{companyFieldLabels[field]}</dt><dd>{data.company[field] || 'Não registado'}</dd></div>)}<div><dt>Estado da empresa</dt><dd>{data.company.active ? 'Ativa' : 'Suspensa'}</dd></div>{data.company.suspension_reason ? <div><dt>Motivo da suspensão</dt><dd>{data.company.suspension_reason}</dd></div> : null}</dl><p className={styles.caption}>Última atualização: {formatDate(data.company.updated_at)}. Os dados de pagamentos anteriores mantêm o respetivo histórico.</p></>}
    </section> : null}
    {data && (historyOnly || showHistory) ? <section className={styles.panel} aria-label="Histórico de alterações da empresa"><h2>Alterações à ficha da empresa</h2><p className={styles.caption}>Quem alterou os dados, quando e os valores anteriores e atuais.</p>{data.changes.map(change => <ChangeDetails key={change.id} change={change}/>)}{!data.changes.length ? <p className={styles.caption}>Ainda não existem alterações registadas à ficha.</p> : null}{data.hasMore ? <button type="button" className={styles.button} disabled={more} onClick={() => void loadMore()}>{more ? 'A carregar…' : 'Ver alterações anteriores'}</button> : null}</section> : null}
  </div>;
}

function ChangeDetails({ change }: { change: CompanyChange }) {
  return <details className={styles.change} open={change.unread}><summary><strong>{change.actor_name}</strong> · {change.actor_role === 'superadmin' ? 'Equipa Azotrace' : 'Admin da empresa'}<span>{formatDate(change.created_at)}{change.unread ? ' · Nova alteração' : ''}</span></summary><div className={styles.scroll}><table><thead><tr><th>Campo</th><th>Anterior</th><th>Atual</th></tr></thead><tbody>{change.changed_fields.map((field: CompanyField) => <tr key={field}><th scope="row">{companyFieldLabels[field] || field}</th><td>{companyChangeValue(change.before_data[field])}</td><td>{companyChangeValue(change.after_data[field])}</td></tr>)}</tbody></table></div>{change.reason ? <p className={styles.caption}>Motivo: {change.reason}</p> : null}</details>;
}
