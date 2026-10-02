'use client';

import Link from 'next/link';
import { useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../_components/TraceabilityShell';
import styles from '../_components/traceability.module.css';
import { useProducerWorkspace } from '../_lib/use-producer-workspace';
import { makeLocalId } from '../onboarding/_lib/local-store';

export default function ProdutosPage() {
  const { store, persist, loading } = useProducerWorkspace();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  if (loading) {
    return (
      <TraceabilityShell eyebrow="Produção" title="Produtos">
        <div className={styles.cardPad}>A carregar…</div>
      </TraceabilityShell>
    );
  }

  if (!store?.completed) {
    return (
      <TraceabilityShell eyebrow="Produção" title="Produtos">
        <EmptyWorkspace />
      </TraceabilityShell>
    );
  }

  function add() {
    setError('');

    if (!name.trim()) {
      setError('Indica o nome do produto.');
      return;
    }

    persist({
      ...store,
      products: [
        ...store.products,
        {
          id: makeLocalId('product'),
          productTypeId: store.productType?.id || '',
          name: name.trim(),
          sku: sku.trim() || undefined,
          description: description.trim() || undefined,
        },
      ],
    });

    setName('');
    setSku('');
    setDescription('');
  }

  return (
    <TraceabilityShell
      eyebrow="Produção"
      title="Produtos"
      description="Gere os produtos deste negócio. A configuração do tipo e dos campos fica acessível aqui, sem criar mais níveis no menu lateral."
      actions={
        <>
          <Link className={styles.secondary} href="/dashboard/produtos/tipos">
            Configurar tipo
          </Link>
          <Link className={styles.secondary} href="/dashboard/produtos/campos">
            Campos do formulário
          </Link>
        </>
      }
    >
      {error ? <div className={styles.error} style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className={styles.card}>
        <div className={styles.cardPad}>
          <div className={styles.sectionTitle} style={{ marginTop: 0 }}>
            <div>
              <h2>Novo produto</h2>
              <p>Adiciona um produto ao negócio ativo.</p>
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label>Nome *</label>
              <input
                className={styles.input}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                }}
                placeholder="Ex.: Ananás dos Açores"
              />
            </div>

            <div className={styles.field}>
              <label>SKU / Código</label>
              <input
                className={styles.input}
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                placeholder="ANA-001"
              />
            </div>

            <div className={styles.field}>
              <label>Descrição</label>
              <input
                className={styles.input}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição breve"
              />
            </div>
          </div>

          <div className={styles.actions} style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <button className={styles.primary} type="button" onClick={add}>
              + Adicionar produto
            </button>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tipo</th>
                <th>SKU</th>
                <th>Lotes</th>
                <th>Registos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {store.products.map((product) => {
                const hasBatches = store.batches.some((batch) => batch.productId === product.id);

                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <div className={styles.muted}>{product.description || 'Sem descrição'}</div>
                    </td>
                    <td>{store.productType?.name ?? '—'}</td>
                    <td>{product.sku || '—'}</td>
                    <td>{store.batches.filter((batch) => batch.productId === product.id).length}</td>
                    <td>{store.records.filter((record) => record.productId === product.id).length}</td>
                    <td>
                      <button
                        className={styles.danger}
                        type="button"
                        disabled={hasBatches}
                        title={hasBatches ? 'Não é possível eliminar um produto que já tem lotes.' : ''}
                        onClick={() =>
                          persist({
                            ...store,
                            products: store.products.filter((item) => item.id !== product.id),
                          })
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!store.products.length ? (
                <tr>
                  <td colSpan={6}>Ainda não existem produtos neste negócio.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </TraceabilityShell>
  );
}
