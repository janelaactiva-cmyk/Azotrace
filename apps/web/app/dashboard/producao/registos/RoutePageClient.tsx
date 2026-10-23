'use client';
import { confirmMessage } from '~/lib/app-messages';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../../_components/TraceabilityShell';
import styles from '../../_components/traceability.module.css';
import { useProducerWorkspace } from '../../_lib/use-producer-workspace';
import { useLocalUser } from '../../_lib/use-local-user';
import { hasPermission } from '../../_lib/local-users';
import {
  batchCode,
  csvEscape,
  downloadText,
  formatDate,
  productName,
  productionUnitName,
  stageName,
} from '../../_lib/producer-utils';

export default function RegistosPage() {
  const { store, persist, loading } = useProducerWorkspace();
  const localUser = useLocalUser();
  const [query, setQuery] = useState('');
  const [productId, setProductId] = useState('');
  const [stageId, setStageId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [feedback, setFeedback] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [pagination, setPagination] = useState({ key: '', page: 1 });

  const searchableRows = useMemo(() => {
    if (!store) return [];
    const products = new Map(store.products.map(item => [item.id, item.name]));
    const batches = new Map(store.batches.map(item => [item.id, item.code]));
    const stages = new Map(store.stages.map(item => [item.id, item.name]));
    const units = new Map(store.units.map(item => [item.id, `${item.code} · ${item.name}`]));
    return [...store.records]
      .sort((a, b) => (b.recordedAt || b.createdAt).localeCompare(a.recordedAt || a.createdAt))
      .map((record) => {
        const primaryUnitId = record.productionUnitId || record.productionUnitIds[0] || '';
        const searchText = [
          products.get(record.productId) || 'Produto',
          batches.get(record.batchId) ?? 'Sem lote',
          stages.get(record.stageId || '') ?? 'Sem etapa',
          primaryUnitId ? units.get(primaryUnitId) ?? 'Unidade removida' : 'Sem unidade',
        ].join(' ').toLowerCase();
        return { record, searchText };
      });
  }, [store]);
  const rows = useMemo(() => {
    const search = deferredQuery.toLowerCase();
    return searchableRows.filter(({ record, searchText }) => {
        return (
          (!productId || record.productId === productId) &&
          (!stageId || record.stageId === stageId) &&
          (!unitId || record.productionUnitIds.includes(unitId) || record.productionUnitId === unitId) &&
          (!search || searchText.includes(search))
        );
      }).map(({ record }) => record);
  }, [searchableRows, deferredQuery, productId, stageId, unitId]);
  const pageKey = JSON.stringify([store?.business.id, deferredQuery, productId, stageId, unitId]);
  const pageCount = Math.max(1, Math.ceil(rows.length / 50));
  const page = pagination.key === pageKey ? Math.min(pagination.page, pageCount) : 1;
  const visibleRows = rows.slice((page - 1) * 50, page * 50);

  if (loading) {
    return (
      <TraceabilityShell eyebrow="Produção" title="Registos de dados">
        <div className={styles.cardPad}>A carregar…</div>
      </TraceabilityShell>
    );
  }

  if (!store?.completed) {
    return (
      <TraceabilityShell eyebrow="Produção" title="Registos de dados">
        <EmptyWorkspace />
      </TraceabilityShell>
    );
  }

  const canEdit = hasPermission(localUser, 'production.write', store.business.id);

  async function deleteRecord(recordId: string) {
    if (!store || !canEdit) return;
    const record = store.records.find((item) => item.id === recordId);
    if (!record) return;
    const recordLabel = `${productName(store, record.productId)} · ${stageName(store, record.stageId)} · ${formatDate(record.recordedAt || record.createdAt, true)}`;
    if (!(await confirmMessage(`Eliminar este registo de dados?\n\n${recordLabel}\n\nSó este registo será removido. O produto, o lote e os restantes registos serão mantidos. Esta ação não pode ser anulada.`))) return;
    persist({ ...store, records: store.records.filter((item) => item.id !== recordId) });
    setFeedback('O registo de dados foi eliminado. Os restantes dados foram mantidos.');
  }

  function exportCsv() {
    if (!store) return;

    const header = 'Data;Produto;Lote;Etapa;Unidade;Dados';
    const lines = rows.map((record) => {
      const primaryUnitId = record.productionUnitId || record.productionUnitIds[0];
      return [
        record.recordedAt || record.createdAt,
        productName(store, record.productId),
        batchCode(store, record.batchId),
        stageName(store, record.stageId),
        productionUnitName(store, primaryUnitId),
        JSON.stringify(record.data),
      ].map(csvEscape).join(';');
    });

    downloadText(`registos-${store.business.name}.csv`, [header, ...lines].join('\n'));
  }

  return (
    <TraceabilityShell
      eyebrow="Produção · Registos de dados"
      title="Registos de dados"
      description="Histórico dos dados introduzidos por lote, etapa e unidade de produção. Cada registo pode ser editado ou eliminado sem alterar os restantes."
      actions={(
        <>
          <button className={styles.secondary} type="button" onClick={exportCsv}>Exportar CSV</button>
          {canEdit ? <Link className={styles.primary} href="/dashboard/producao/inserir-dados">+ Novo registo</Link> : null}
        </>
      )}
    >
      {feedback ? <div className={styles.success} style={{ marginBottom: 14 }} role="status">{feedback}</div> : null}
      <section className={styles.card}>
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            placeholder="Pesquisar registo…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className={styles.toolbarGroup}>
            <select
              className={styles.select}
              style={{ width: 180 }}
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              <option value="">Todos os produtos</option>
              {store.products.map((product) => (
                <option value={product.id} key={product.id}>{product.name}</option>
              ))}
            </select>

            <select
              className={styles.select}
              style={{ width: 180 }}
              value={stageId}
              onChange={(event) => setStageId(event.target.value)}
            >
              <option value="">Todas as etapas</option>
              {store.stages.map((stage) => (
                <option value={stage.id} key={stage.id}>{stage.name}</option>
              ))}
            </select>

            <select
              className={styles.select}
              style={{ width: 210 }}
              value={unitId}
              onChange={(event) => setUnitId(event.target.value)}
            >
              <option value="">Todas as unidades</option>
              {store.units.map((unit) => (
                <option value={unit.id} key={unit.id}>{unit.code} · {unit.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Lote</th>
                <th>Unidade</th>
                <th>Etapa</th>
                <th>Dados</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((record) => {
                const primaryUnitId = record.productionUnitId || record.productionUnitIds[0];
                const legacyExtraUnits = Math.max(0, record.productionUnitIds.length - 1);
                return (
                  <tr key={record.id}>
                    <td className={styles.nowrap}>{formatDate(record.recordedAt || record.createdAt, true)}</td>
                    <td><strong>{productName(store, record.productId)}</strong></td>
                    <td>{batchCode(store, record.batchId)}</td>
                    <td>
                      {productionUnitName(store, primaryUnitId)}
                      {legacyExtraUnits ? <span className={styles.muted}> +{legacyExtraUnits}</span> : null}
                    </td>
                    <td><span className={`${styles.badge} ${styles.badgeGood}`}>{stageName(store, record.stageId)}</span></td>
                    <td className={styles.muted}>
                      {Object.entries(record.data)
                        .slice(0, 2)
                        .map(([key, value]) => `${key}: ${String(value)}`)
                        .join(' · ') || '—'}
                    </td>
                    <td>
                      {canEdit ? (
                        <div className={styles.actions}>
                          <Link className={styles.smallButton} href={`/dashboard/producao/registos/${record.id}`}>
                            Editar
                          </Link>
                          <button className={styles.danger} type="button" onClick={() => deleteRecord(record.id)}>
                            Eliminar
                          </button>
                        </div>
                      ) : <span className={styles.muted}>Consulta</span>}
                    </td>
                  </tr>
                );
              })}

              {!rows.length ? (
                <tr>
                  <td colSpan={7}>Sem registos para os filtros selecionados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <nav className={styles.toolbar} aria-label="Páginas dos registos de dados">
          <span role="status">{rows.length ? `${(page - 1) * 50 + 1}–${Math.min(page * 50, rows.length)} de ${rows.length} registos` : '0 registos'}</span>
          <div className={styles.toolbarGroup}>
            <button type="button" className={styles.secondary} disabled={page === 1} onClick={() => setPagination({ key: pageKey, page: page - 1 })}>Anterior</button>
            <span>Página {page} de {pageCount}</span>
            <button type="button" className={styles.secondary} disabled={page === pageCount} onClick={() => setPagination({ key: pageKey, page: page + 1 })}>Seguinte</button>
          </div>
        </nav>
      </section>
    </TraceabilityShell>
  );
}
