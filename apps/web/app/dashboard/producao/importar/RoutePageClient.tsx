'use client';

import { useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../../_components/TraceabilityShell';
import styles from '../../_components/traceability.module.css';
import { useProducerWorkspace } from '../../_lib/use-producer-workspace';
import { formatDate, statusPt } from '../../_lib/producer-utils';
import { makeLocalId } from '../../onboarding/_lib/local-store';

function parseLine(line: string, separator: string) {
  return line.split(separator).map((value) => value.trim().replace(/^"|"$/g, ''));
}

function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ImportarPage() {
  const { store, persist, loading } = useProducerWorkspace();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <TraceabilityShell eyebrow="Produção" title="Importar"><div className={styles.cardPad}>A carregar…</div></TraceabilityShell>;
  if (!store?.completed) return <TraceabilityShell eyebrow="Produção" title="Importar"><EmptyWorkspace /></TraceabilityShell>;

  function template() {
    if (!store) return;

    const fields = store.fields.map((field) => field.key).join(';');
    downloadText(
      'modelo-producao.csv',
      `produto;lote;etapa;${fields}\n${store.products[0]?.name || 'Produto'};${store.batches[0]?.code || 'LOTE-001'};${store.stages[0]?.name || 'Produção'};`,
    );
  }

  async function onFile(file?: File) {
    if (!store) return;

    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const text = await file.text();
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('O CSV não contém linhas de dados.');
      const separator = lines[0]!.includes(';') ? ';' : ',';
      const headers = parseLine(lines[0]!, separator).map((header) => header.toLowerCase());
      let created = 0;
      const newRecords = [...store.records];

      for (const line of lines.slice(1)) {
        const values = parseLine(line, separator);
        const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
        const product = store.products.find((item) => item.name.toLowerCase() === String(row.produto || '').toLowerCase() || item.sku?.toLowerCase() === String(row.produto || '').toLowerCase());
        const batch = store.batches.find((item) => item.code.toLowerCase() === String(row.lote || '').toLowerCase() && (!product || item.productId === product.id));
        if (!product || !batch) continue;
        const stage = store.stages.find((item) => item.name.toLowerCase() === String(row.etapa || '').toLowerCase());
        const data: Record<string, unknown> = {};
        for (const field of store.fields) {
          if (row[field.key] != null && row[field.key] !== '') data[field.key] = row[field.key];
        }
        const unitId = batch.productionUnitId || undefined;
        newRecords.unshift({
          id: makeLocalId('record'),
          productId: product.id,
          batchId: batch.id,
          stageId: stage?.id,
          productionUnitId: unitId,
          productionUnitIds: unitId ? [unitId] : [],
          data,
          recordedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        created += 1;
      }

      const history = {
        id: makeLocalId('import'),
        fileName: file.name,
        recordCount: created,
        status: (created === lines.length - 1 ? 'completed' : created ? 'partial' : 'failed') as 'completed' | 'partial' | 'failed',
        createdAt: new Date().toISOString(),
      };
      persist({ ...store, records: newRecords, imports: [history, ...store.imports] });
      setMessage(`${created} registo(s) importado(s). A unidade de produção foi obtida automaticamente a partir de cada lote.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Erro ao importar o ficheiro.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <TraceabilityShell eyebrow="Produção · Importação" title="Importar dados" description="Importe vários registos. Cada lote determina automaticamente a estufa, colmeia, pipa ou outra unidade associada." actions={<button className={styles.secondary} onClick={template}>Descarregar modelo CSV</button>}>
      <section className={styles.card}>
        <div className={styles.cardPad}>
          {message ? <div className={styles.notice} style={{ marginBottom: 12 }}>{message}</div> : null}
          <label className={styles.dropzone}>
            <strong>{busy ? 'A importar…' : 'Arraste o ficheiro aqui ou selecione no computador'}</strong>
            <span className={styles.muted}>Formato suportado: CSV</span>
            <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => void onFile(event.target.files?.[0])} />
          </label>
        </div>
        <div className={styles.sectionTitle} style={{ padding: '0 14px' }}><div><h2>Histórico de importações</h2></div></div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Data</th><th>Ficheiro</th><th>Registos</th><th>Estado</th></tr></thead>
            <tbody>
              {store.imports.map((item) => <tr key={item.id}><td>{formatDate(item.createdAt, true)}</td><td><strong>{item.fileName}</strong></td><td>{item.recordCount}</td><td><span className={`${styles.badge} ${item.status === 'completed' ? styles.badgeGood : item.status === 'failed' ? styles.badgeBad : styles.badgeWarn}`}>{statusPt(item.status)}</span></td></tr>)}
              {!store.imports.length ? <tr><td colSpan={4}>Ainda não existem importações.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </TraceabilityShell>
  );
}
