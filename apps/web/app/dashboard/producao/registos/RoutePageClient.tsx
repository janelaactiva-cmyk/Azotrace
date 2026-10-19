'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

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
  const { store, loading } = useProducerWorkspace();
  const localUser = useLocalUser();
  const [query, setQuery] = useState('');
  const [productId, setProductId] = useState('');
  const [stageId, setStageId] = useState('');
  const [unitId, setUnitId] = useState('');

  const rows = useMemo(() => {
    if (!store) return [];

    return [...store.records]
      .sort((a, b) => (b.recordedAt || b.createdAt).localeCompare(a.recordedAt || a.createdAt))
      .filter((record) => {
        const primaryUnitId = record.productionUnitId || record.productionUnitIds[0] || '';
        const searchText = [
          productName(store, record.productId),
          batchCode(store, record.batchId),
          stageName(store, record.stageId),
          productionUnitName(store, primaryUnitId),
        ].join(' ').toLowerCase();

        return (
          (!productId || record.productId === productId) &&
          (!stageId || record.stageId === stageId) &&
          (!unitId || record.productionUnitIds.includes(unitId) || record.productionUnitId === unitId) &&
          (!query || searchText.includes(query.toLowerCase()))
        );
      });
  }, [store, query, productId, stageId, unitId]);

  if (loading) {
    return (
      <TraceabilityShell eyebrow="Produção" title="Registos">
        <div className={styles.cardPad}>A carregar…</div>
      </TraceabilityShell>
    );
  }

  if (!store?.completed) {
    return (
      <TraceabilityShell eyebrow="Produção" title="Registos">
        <EmptyWorkspace />
      </TraceabilityShell>
    );
  }

  const canEdit = hasPermission(localUser, 'production.write', store.business.id);

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
      eyebrow="Produção · Registos"
      title="Registos de produção"
      description="Histórico semanal por lote, etapa e unidade de produção. Cada registo pode ser editado sem alterar os restantes."
      actions={(
        <>
          <button className={styles.secondary} type="button" onClick={exportCsv}>Exportar CSV</button>
          {canEdit ? <Link className={styles.primary} href="/dashboard/producao/inserir-dados">+ Novo registo</Link> : null}
        </>
      )}
    >
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
              {rows.map((record) => {
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
                        <Link className={styles.smallButton} href={`/dashboard/producao/registos/${record.id}`}>
                          Editar
                        </Link>
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
      </section>
    </TraceabilityShell>
  );
}
