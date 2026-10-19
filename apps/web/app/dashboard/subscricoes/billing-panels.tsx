import type { CSSProperties } from 'react';
import type { OnlineSubscription } from '../_lib/online-billing';
import { customerHistory, historyKindLabels, subscriptionDaysLabel, subscriptionTiming, type HistoryKind } from '../_lib/billing-details';

const cell: CSSProperties = { padding: '12px 10px', borderBottom: '1px solid #9ca3af55', verticalAlign: 'top', textAlign: 'left' };
const dateTime = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : 'Data não registada';
const money = (cents: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export function SubscriptionValidity({ subscription, now }: { subscription: OnlineSubscription; now: number }) {
  const timing = subscriptionTiming(subscription, now);
  return <section aria-label="Contagem de dias da subscrição">
    <h3>Tempo de subscrição</h3>
    <p style={{ fontSize: 24, fontWeight: 700, margin: '8px 0' }}>{subscriptionDaysLabel(subscription, now)}</p>
    {timing ? <>
      <p>{timing.elapsedDays} dias decorridos de {timing.totalDays} dias de validade.</p>
      <progress aria-label="Percentagem de validade decorrida" value={timing.progress} max={100} style={{ width: '100%', maxWidth: 420, height: 12 }} />
      {!timing.expired && !timing.scheduled && timing.remainingDays <= 15 && subscription.status === 'active' ? <p role="status">A subscrição aproxima-se do fim. Verifique a renovação antes da data de validade.</p> : null}
    </> : <p>Complete ou confirme as datas de início e validade para apresentar a contagem.</p>}
  </section>;
}

export function CustomerHistory({ entries, filter, onFilter }: { entries: ReturnType<typeof customerHistory>; filter: HistoryKind | 'all'; onFilter: (value: HistoryKind | 'all') => void }) {
  const shown = entries.filter(entry => filter === 'all' || entry.kind === filter);
  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <div><h2>Histórico do cliente</h2><p>{entries.filter(entry => entry.kind === 'upgrade').length} upgrades · {entries.filter(entry => entry.kind === 'downgrade').length} downgrades</p></div>
      <label>Mostrar no histórico <select aria-label="Filtrar histórico do cliente" value={filter} onChange={event => {
        const value = event.target.value;
        if (value === 'all' || value in historyKindLabels) onFilter(value as HistoryKind | 'all');
      }} style={{ padding: 10, border: '1px solid #9ca3af', borderRadius: 8, color: 'inherit', background: 'inherit' }}>
        <option value="all">Todas as alterações</option>{Object.entries(historyKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
    </div>
    {!entries.some(entry => entry.kind !== 'start') ? <p>Sem alterações registadas. A data de início é apresentada quando está disponível.</p> : null}
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['Data e hora', 'Operação', 'Plano anterior', 'Plano seguinte', 'Valor confirmado'].map(label => <th key={label} scope="col" style={cell}>{label}</th>)}</tr></thead>
      <tbody>{shown.map(entry => <tr key={entry.key}>
        <td style={cell}>{dateTime(entry.date)}</td><td style={cell}><strong>{historyKindLabels[entry.kind]}</strong>{entry.action !== historyKindLabels[entry.kind] ? <div style={{ fontSize: 13, marginTop: 4 }}>{entry.action}</div> : null}</td>
        <td style={cell}>{entry.oldPlan || '—'}</td><td style={cell}>{entry.newPlan || 'Não registado'}</td><td style={cell}>{typeof entry.amountCents === 'number' && Number.isFinite(entry.amountCents) ? money(entry.amountCents) : '—'}</td>
      </tr>)}{!shown.length ? <tr><td style={cell} colSpan={5}>Não existem registos para este filtro.</td></tr> : null}</tbody>
    </table></div>
  </>;
}
