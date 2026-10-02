'use client';

import { BusinessWorkspaceSwitcher } from '../../_components/BusinessWorkspaceSwitcher';
import { useProducerWorkspace } from '../../_lib/use-producer-workspace';
import styles from '../onboarding.module.css';

export default function UnidadesProducaoPage() {
  const { store, loading, syncError } = useProducerWorkspace();

  if (loading) {
    return <div className={styles.page}><BusinessWorkspaceSwitcher /><div className={styles.card}>A carregar unidades…</div></div>;
  }

  return (
    <div className={styles.page}>
      <BusinessWorkspaceSwitcher />
      <div className={styles.card}>
        <h1 className={styles.title}>Unidades de produção</h1>
        <p className={styles.subtitle}>Estufas, colmeias, pipas, cubas, parcelas ou outras unidades reais do negócio.</p>
        {syncError ? <div className={styles.error}>{syncError}</div> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Código</th><th>Nome</th><th>Tipo de produto</th><th>Tipo de unidade</th><th>Estado</th></tr></thead>
            <tbody>
              {(store?.units ?? []).map((unit) => (
                <tr key={unit.id}>
                  <td><strong>{unit.code}</strong></td><td>{unit.name}</td><td>{store?.productType?.name ?? '-'}</td><td>{store?.productType?.unitLabel ?? '-'}</td><td><span className={styles.badge}>{unit.status === 'active' ? 'Ativa' : 'Inativa'}</span></td>
                </tr>
              ))}
              {!store?.units.length ? <tr><td colSpan={5}>Sem unidades. Usa a configuração inicial.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
