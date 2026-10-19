'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../../_components/TraceabilityShell';
import styles from '../../_components/traceability.module.css';
import { useProducerWorkspace } from '../../_lib/use-producer-workspace';
import { formatDate, productName, productionUnitName, stageName, statusPt } from '../../_lib/producer-utils';
import { finishBatchAndStartNextCycle } from '../../onboarding/_lib/local-store';

export default function LoteDetalhePage() {
  const params = useParams<{ id: string }>();
  const { store, persist, loading } = useProducerWorkspace();
  const [message, setMessage] = useState('');

  const batch = store?.batches.find((item) => item.id === params.id);

  if (loading) return <TraceabilityShell eyebrow="Lotes" title="Detalhe"><div className={styles.cardPad}>A carregar…</div></TraceabilityShell>;
  if (!store?.completed) return <TraceabilityShell eyebrow="Lotes" title="Detalhe"><EmptyWorkspace /></TraceabilityShell>;
  if (!batch) {
    return <TraceabilityShell eyebrow="Lotes" title="Lote não encontrado"><section className={styles.empty}><Link className={styles.primary} href="/dashboard/lotes">Voltar aos lotes</Link></section></TraceabilityShell>;
  }

  const records = store.records
    .filter((record) => record.batchId === batch.id)
    .sort((a, b) => (a.recordedAt || a.createdAt).localeCompare(b.recordedAt || b.createdAt));
  const quality = store.qualityRecords.filter((item) => item.batchId === batch.id);
  const payload = `${typeof window !== 'undefined' ? window.location.origin : ''}/trace/${store.business.id}/${batch.id}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  const unitLabel = store.productType?.unitLabel ?? 'Unidade';
  const previous = batch.previousBatchId ? store.batches.find((item) => item.id === batch.previousBatchId) : undefined;
  const next = store.batches.find((item) => item.previousBatchId === batch.id);

  function finishCycle() {
    if (!store || !batch) return;

    if (batch.status !== 'active') return;
    const result = finishBatchAndStartNextCycle(store, batch.id);
    persist(result.state);
    setMessage(result.nextBatch
      ? `Ciclo finalizado. O lote seguinte ${result.nextBatch.code} foi criado automaticamente para a mesma ${unitLabel.toLowerCase()}.`
      : 'Ciclo finalizado.');
  }

  return (
    <TraceabilityShell
      eyebrow={`Lotes · ${batch.code}`}
      title={batch.code}
      description={`${productName(store, batch.productId)} · ${statusPt(batch.status)}`}
      actions={<><Link className={styles.secondary} href="/dashboard/publicacao">Publicação e QR</Link>{batch.status === 'active' ? <button className={styles.primary} type="button" onClick={finishCycle}>Finalizar ciclo</button> : null}</>}
    >
      {message ? <div className={styles.success} style={{ marginBottom: 14 }}>{message}</div> : null}

      <section className={styles.grid4}>
        <div className={styles.stat}><span>Produto</span><strong style={{ fontSize: 16 }}>{productName(store, batch.productId)}</strong><small>Produto associado</small></div>
        <div className={styles.stat}><span>{unitLabel}</span><strong style={{ fontSize: 16 }}>{productionUnitName(store, batch.productionUnitId)}</strong><small>Unidade permanente</small></div>
        <div className={styles.stat}><span>Ciclo</span><strong style={{ fontSize: 16 }}>#{batch.cycleNumber || 1}</strong><small>Início {formatDate(batch.startDate)}</small></div>
        <div className={styles.stat}><span>Registos</span><strong>{records.length}</strong><small>{quality.length} controlo(s) de qualidade</small></div>
      </section>

      <div className={styles.split} style={{ marginTop: 16 }}>
        <section className={styles.card}>
          <div className={styles.sectionTitle} style={{ padding: '0 16px' }}>
            <div><h2>Timeline do ciclo</h2><p>Todos estes registos pertencem à mesma {unitLabel.toLowerCase()} e a este ciclo específico.</p></div>
            {batch.status === 'active' ? <Link className={styles.smallButton} href="/dashboard/producao/inserir-dados">+ Novo registo</Link> : null}
          </div>
          <div className={styles.timeline}>
            {records.length ? records.map((record) => (
              <div className={styles.timelineItem} key={record.id}>
                <strong>{formatDate(record.recordedAt || record.createdAt, true)} · {stageName(store, record.stageId)}</strong>
                <span>{productionUnitName(store, batch.productionUnitId)} · {Object.entries(record.data).slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`).join(' · ') || 'Sem dados adicionais'}</span>
                <div className={styles.actions} style={{ marginTop: 7 }}><Link className={styles.smallButton} href={`/dashboard/producao/registos/${record.id}`}>Editar registo</Link></div>
              </div>
            )) : <div className={styles.cardPad}>Sem registos neste ciclo.</div>}
          </div>
        </section>

        <aside className={styles.card}>
          <div className={styles.cardPad}>
            <div className={styles.qrBox}><img src={qr} alt={`QR ${batch.code}`} /></div>
            <div className={styles.sectionTitle}><div><h2>Histórico da {unitLabel.toLowerCase()}</h2><p>A unidade é reutilizada; os lotes/ciclos é que mudam ao longo do tempo.</p></div></div>
            <div className={styles.listRow}><span className={styles.colorDot} /><div className={styles.listMain}><strong>{productionUnitName(store, batch.productionUnitId)}</strong><span>Ciclo atual: {batch.code}</span></div></div>
            {previous ? <div className={styles.listRow}><span className={styles.colorDot} /><div className={styles.listMain}><strong>Ciclo anterior</strong><Link className={styles.link} href={`/dashboard/lotes/${previous.id}`}>{previous.code}</Link></div></div> : null}
            {next ? <div className={styles.listRow}><span className={styles.colorDot} /><div className={styles.listMain}><strong>Ciclo seguinte</strong><Link className={styles.link} href={`/dashboard/lotes/${next.id}`}>{next.code}</Link></div></div> : null}
          </div>
        </aside>
      </div>
    </TraceabilityShell>
  );
}
