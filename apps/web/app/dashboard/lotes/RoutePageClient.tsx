'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../_components/TraceabilityShell';
import styles from '../_components/traceability.module.css';
import { useProducerWorkspace } from '../_lib/use-producer-workspace';
import { formatDate, productName, productionUnitName, statusPt } from '../_lib/producer-utils';
import { finishBatchAndStartNextCycle } from '../onboarding/_lib/local-store';

export default function LotesPage() {
  const { store, persist, loading } = useProducerWorkspace();
  const [filter, setFilter] = useState<'all' | 'active' | 'finished'>('active');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const rows = useMemo(() => {
    const source = store?.batches ?? [];
    return source
      .filter((batch) => filter === 'all' || batch.status === filter)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return (b.startDate || '').localeCompare(a.startDate || '');
      });
  }, [store, filter]);

  if (loading) return <TraceabilityShell eyebrow="Lotes" title="Lotes"><div className={styles.cardPad}>A carregar…</div></TraceabilityShell>;
  if (!store?.completed) return <TraceabilityShell eyebrow="Lotes" title="Lotes"><EmptyWorkspace /></TraceabilityShell>;

  const unitLabel = store.productType?.unitLabel || 'Unidade';

  function finishCycle(batchId: string) {
    if (!store) return;

    setError('');
    setMessage('');
    const batch = store.batches.find((item) => item.id === batchId);
    if (!batch || batch.status !== 'active') return;
    const result = finishBatchAndStartNextCycle(store, batchId);
    persist(result.state);
    setMessage(result.nextBatch
      ? `Ciclo ${batch.code} finalizado. O novo lote ${result.nextBatch.code} foi criado automaticamente para ${productionUnitName(store, batch.productionUnitId)}.`
      : `Ciclo ${batch.code} finalizado.`);
  }

  return (
    <TraceabilityShell
      eyebrow="Lotes"
      title="Lotes por unidade"
      description={`As ${unitLabel.toLowerCase()}s são reutilizáveis. Cada unidade ativa tem um lote atual. Ao finalizar um lote, o Azotrace cria automaticamente o ciclo seguinte para a mesma unidade.`}
      actions={<Link className={styles.primary} href="/dashboard/producao/unidades">Gerir {unitLabel.toLowerCase()}s</Link>}
    >
      {message ? <div className={styles.success} style={{ marginBottom: 14 }}>{message}</div> : null}
      {error ? <div className={styles.error} style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className={styles.card}>
        <div className={styles.tabs}>
          <button onClick={() => setFilter('active')} className={`${styles.tab} ${filter === 'active' ? styles.tabActive : ''}`}>Ativos</button>
          <button onClick={() => setFilter('finished')} className={`${styles.tab} ${filter === 'finished' ? styles.tabActive : ''}`}>Finalizados</button>
          <button onClick={() => setFilter('all')} className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`}>Todos</button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>{unitLabel}</th><th>Lote / ciclo</th><th>Produto</th><th>Ciclo nº</th><th>Estado</th><th>Início</th><th>Registos</th><th>Ações</th></tr></thead>
            <tbody>
              {rows.map((batch) => (
                <tr key={batch.id}>
                  <td><strong>{productionUnitName(store, batch.productionUnitId)}</strong></td>
                  <td><Link className={styles.link} href={`/dashboard/lotes/${batch.id}`}>{batch.code}</Link></td>
                  <td>{productName(store, batch.productId)}</td>
                  <td>{batch.cycleNumber || 1}</td>
                  <td><span className={`${styles.badge} ${batch.status === 'active' ? styles.badgeGood : ''}`}>{statusPt(batch.status)}</span></td>
                  <td>{formatDate(batch.startDate)}</td>
                  <td>{store.records.filter((record) => record.batchId === batch.id).length}</td>
                  <td>
                    <div className={styles.actions}>
                      {batch.status === 'active' ? <button className={styles.smallButton} type="button" onClick={() => finishCycle(batch.id)}>Finalizar ciclo</button> : null}
                      <Link className={styles.smallButton} href={`/dashboard/lotes/${batch.id}`}>Abrir</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={8}>Sem lotes neste estado.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </TraceabilityShell>
  );
}
