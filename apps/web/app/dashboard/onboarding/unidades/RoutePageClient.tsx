'use client';

import { useMemo, useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../../_components/TraceabilityShell';
import styles from '../../_components/traceability.module.css';
import { useProducerWorkspace } from '../../_lib/use-producer-workspace';
import {
  addProductionUnitWithAutomaticBatch,
  createAutomaticBatchForUnit,
  makeLocalId,
  type LocalProductionUnit,
} from '../_lib/local-store';

export default function UnidadesProducaoPage() {
  const { store, persist, loading } = useProducerWorkspace();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeByUnit = useMemo(() => {
    const map = new Map<string, string>();
    for (const batch of store?.batches ?? []) {
      if (batch.status === 'active' && batch.productionUnitId && !map.has(batch.productionUnitId)) {
        map.set(batch.productionUnitId, batch.id);
      }
    }
    return map;
  }, [store]);

  if (loading) return <TraceabilityShell eyebrow="Produção" title="Unidades de produção"><div className={styles.cardPad}>A carregar…</div></TraceabilityShell>;
  if (!store?.completed) return <TraceabilityShell eyebrow="Produção" title="Unidades de produção"><EmptyWorkspace /></TraceabilityShell>;

  const unitLabel = store.productType?.unitLabel || 'Unidade';
  const prefix = store.productType?.unitPrefix || 'UND';

  function nextCode() {
    const max = store!.units.reduce((value, unit) => {
      const match = unit.code.match(/(\d+)$/);
      return Math.max(value, match ? Number(match[1]) : 0);
    }, 0);
    return `${prefix}-${String(max + 1).padStart(2, '0')}`;
  }

  function addUnit() {
    if (!store) return;

    setError('');
    setMessage('');
    const finalCode = (code.trim() || nextCode()).toUpperCase();
    const finalName = name.trim() || `${unitLabel} ${store.units.length + 1}`;
    if (store.units.some((unit) => unit.code.toLowerCase() === finalCode.toLowerCase())) {
      setError('Já existe uma unidade com este código.');
      return;
    }
    if (!store.productType) {
      setError('O tipo de produto ainda não está configurado.');
      return;
    }

    const unit: LocalProductionUnit = {
      id: makeLocalId('unit'),
      productTypeId: store.productType.id,
      code: finalCode,
      name: finalName,
      status: 'active',
    };
    const created = addProductionUnitWithAutomaticBatch(store, unit);
    persist(created.state);
    setCode('');
    setName('');
    setMessage(created.batch
      ? `${unitLabel} criada e lote ${created.batch.code} criado automaticamente.`
      : `${unitLabel} criada. O primeiro lote será criado automaticamente quando existir um produto.`);
  }

  function toggleUnit(unitId: string) {
    if (!store) return;

    setError('');
    setMessage('');
    const unit = store.units.find((item) => item.id === unitId);
    if (!unit) return;
    const nextStatus = unit.status === 'active' ? 'inactive' : 'active';
    let next = {
      ...store,
      units: store.units.map((item) => item.id === unitId ? { ...item, status: nextStatus as 'active' | 'inactive' } : item),
    };
    if (nextStatus === 'active') {
      next = createAutomaticBatchForUnit(next, unitId).state;
    }
    persist(next);
    setMessage(nextStatus === 'active'
      ? `${unitLabel} reativada. Foi garantido um lote ativo para esta unidade.`
      : `${unitLabel} marcada como inativa. O histórico e os lotes anteriores foram preservados.`);
  }

  return (
    <TraceabilityShell
      eyebrow="Produção"
      title="Unidades de produção"
      description={`${unitLabel}s são permanentes e podem ser reutilizadas ao longo dos anos. Cada unidade ativa tem um lote/ciclo atual; ao terminar o ciclo, é criado automaticamente o seguinte.`}
    >
      {message ? <div className={styles.success} style={{ marginBottom: 14 }}>{message}</div> : null}
      {error ? <div className={styles.error} style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className={styles.card}>
        <div className={styles.cardPad}>
          <div className={styles.sectionTitle}><div><h2>Adicionar {unitLabel.toLowerCase()}</h2><p>Pode acrescentar novas unidades a qualquer momento. O Azotrace cria o primeiro lote automaticamente.</p></div></div>
          <div className={styles.grid2}>
            <div className={styles.field}><label>Código</label><input className={styles.input} value={code} onChange={(event) => setCode(event.target.value)} placeholder={nextCode()} /></div>
            <div className={styles.field}><label>Nome</label><input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} placeholder={`${unitLabel} ${store.units.length + 1}`} /></div>
          </div>
          <div className={styles.actions} style={{ justifyContent: 'flex-end', marginTop: 14 }}><button className={styles.primary} type="button" onClick={addUnit}>+ Adicionar {unitLabel.toLowerCase()}</button></div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Código</th><th>Nome</th><th>Estado</th><th>Lote atual</th><th>Ciclos anteriores</th><th>Ações</th></tr></thead>
            <tbody>
              {store.units.map((unit) => {
                const activeBatchId = activeByUnit.get(unit.id);
                const activeBatch = store.batches.find((batch) => batch.id === activeBatchId);
                const historyCount = store.batches.filter((batch) => batch.productionUnitId === unit.id && batch.status === 'finished').length;
                return (
                  <tr key={unit.id}>
                    <td><strong>{unit.code}</strong></td>
                    <td>{unit.name}</td>
                    <td><span className={`${styles.badge} ${unit.status === 'active' ? styles.badgeGood : ''}`}>{unit.status === 'active' ? 'Ativa' : 'Inativa'}</span></td>
                    <td>{activeBatch ? <a className={styles.link} href={`/dashboard/lotes/${activeBatch.id}`}>{activeBatch.code}</a> : '—'}</td>
                    <td>{historyCount}</td>
                    <td><button className={styles.smallButton} type="button" onClick={() => toggleUnit(unit.id)}>{unit.status === 'active' ? 'Desativar' : 'Reativar'}</button></td>
                  </tr>
                );
              })}
              {!store.units.length ? <tr><td colSpan={6}>Ainda não existem unidades de produção.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </TraceabilityShell>
  );
}
