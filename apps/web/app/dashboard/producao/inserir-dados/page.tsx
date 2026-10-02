'use client';

import { useEffect, useMemo, useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../../_components/TraceabilityShell';
import styles from '../../_components/traceability.module.css';
import { useProducerWorkspace } from '../../_lib/use-producer-workspace';
import { buildRecordSchema } from '../../onboarding/_lib/dynamic-zod';
import { makeLocalId } from '../../onboarding/_lib/local-store';
import { uploadProducerAsset } from '../../onboarding/_lib/supabase-store';

const STEPS = ['Produto e lote', 'Etapa e origem', 'Dados', 'Confirmar'];

export default function InserirDadosPage() {
  const { store, persist, loading } = useProducerWorkspace();

  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [stageId, setStageId] = useState('');
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const batches = useMemo(
    () => store?.batches.filter((batch) => !productId || batch.productId === productId) ?? [],
    [store, productId],
  );

  const selectedProduct = store?.products.find((product) => product.id === productId);
  const selectedBatch = store?.batches.find((batch) => batch.id === batchId);
  const selectedStage = store?.stages.find((stage) => stage.id === stageId);
  const selectedUnits = store?.units.filter((unit) => unitIds.includes(unit.id)) ?? [];

  useEffect(() => {
    if (!store) return;

    const firstProduct = store.products[0];
    const firstBatch = firstProduct
      ? store.batches.find((batch) => batch.productId === firstProduct.id)
      : undefined;

    setProductId(firstProduct?.id ?? '');
    setBatchId(firstBatch?.id ?? '');
    setStageId(store.stages[0]?.id ?? '');
    setUnitIds(firstBatch?.unitIds ?? []);
    setValues({});
    setFiles({});
    setFieldErrors({});
    setError('');
    setMessage('');
    setStep(0);
    setMaxVisitedStep(0);
  }, [store?.business.id]);

  useEffect(() => {
    if (!store || !productId) return;

    const currentBatchStillExists = batches.some((batch) => batch.id === batchId);
    if (currentBatchStillExists) return;

    const firstBatch = batches[0];
    setBatchId(firstBatch?.id ?? '');
    setUnitIds(firstBatch?.unitIds ?? []);
  }, [store?.batches.length, productId, batchId, batches]);

  if (loading) {
    return (
      <TraceabilityShell eyebrow="Produção" title="Inserir dados">
        <div className={styles.cardPad}>A carregar…</div>
      </TraceabilityShell>
    );
  }

  if (!store?.completed) {
    return (
      <TraceabilityShell eyebrow="Produção" title="Inserir dados">
        <EmptyWorkspace />
      </TraceabilityShell>
    );
  }

  function changeProduct(nextProductId: string) {
    if (!store) return;
    const nextBatch = store.batches.find((batch) => batch.productId === nextProductId);
    setProductId(nextProductId);
    setBatchId(nextBatch?.id ?? '');
    setUnitIds(nextBatch?.unitIds ?? []);
    setError('');
  }

  function changeBatch(nextBatchId: string) {
    const batch = batches.find((item) => item.id === nextBatchId);
    setBatchId(nextBatchId);
    setUnitIds(batch?.unitIds ?? []);
    setError('');
  }

  function valuesForValidation() {
    const hydrated: Record<string, unknown> = { ...values };

    for (const field of store!.fields) {
      if (field.fieldType === 'image' && files[field.key]) {
        hydrated[field.key] = '__imagem_selecionada__';
      }
    }

    return hydrated;
  }

  function validateCurrentStep() {
    setError('');
    setFieldErrors({});

    if (step === 0) {
      if (!store.products.length) {
        setError('Ainda não existem produtos. Cria primeiro um produto antes de registar a produção.');
        return false;
      }
      if (!productId) {
        setError('Seleciona um produto para continuar.');
        return false;
      }
      if (!batches.length) {
        setError('O produto selecionado ainda não tem lotes. Cria primeiro um lote para este produto.');
        return false;
      }
      if (!batchId) {
        setError('Seleciona um lote para continuar.');
        return false;
      }
      return true;
    }

    if (step === 1) {
      if (store.stages.length > 0 && !stageId) {
        setError('Seleciona a etapa de produção para continuar.');
        return false;
      }
      if (store.units.length > 0 && unitIds.length === 0) {
        setError(`Seleciona pelo menos uma ${store.productType?.unitLabel?.toLowerCase() ?? 'unidade'} de origem.`);
        return false;
      }
      return true;
    }

    if (step === 2) {
      const parsed = buildRecordSchema(store.fields).safeParse(valuesForValidation());

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? '');
          if (key && !nextErrors[key]) {
            nextErrors[key] = issue.message || 'Valor inválido.';
          }
        }
        setFieldErrors(nextErrors);
        setError('Revê os campos assinalados antes de continuar.');
        return false;
      }

      return true;
    }

    return true;
  }

  function nextStep() {
    if (!validateCurrentStep()) return;
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setMaxVisitedStep((current) => Math.max(current, next));
  }

  function previousStep() {
    setError('');
    setFieldErrors({});
    setStep((current) => Math.max(0, current - 1));
  }

  async function save() {
    if (!store) return;

    setSaving(true);
    setError('');
    setMessage('');
    setFieldErrors({});

    try {
      if (!productId || !batchId) {
        setStep(0);
        setError('Seleciona o produto e o lote antes de guardar.');
        return;
      }

      const hydrated: Record<string, unknown> = { ...values };

      for (const field of store.fields) {
        const file = files[field.key];
        if (field.fieldType === 'image' && file) {
          hydrated[field.key] = await uploadProducerAsset(file, store.business.id, `registos/${field.key}`);
        }
      }

      const parsed = buildRecordSchema(store.fields).safeParse(hydrated);

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? '');
          if (key && !nextErrors[key]) {
            nextErrors[key] = issue.message || 'Valor inválido.';
          }
        }
        setFieldErrors(nextErrors);
        setStep(2);
        setError('Existem dados inválidos. Corrige os campos assinalados e tenta novamente.');
        return;
      }

      persist({
        ...store,
        records: [
          {
            id: makeLocalId('record'),
            productId,
            batchId,
            stageId: stageId || undefined,
            productionUnitIds: unitIds,
            data: parsed.data as Record<string, unknown>,
            createdAt: new Date().toISOString(),
          },
          ...store.records,
        ],
      });

      setValues({});
      setFiles({});
      setFieldErrors({});
      setMessage('Registo de produção guardado com sucesso.');
      setStep(0);
      setMaxVisitedStep(0);
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : 'Não foi possível guardar o registo de produção. Tenta novamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <TraceabilityShell
      eyebrow="Produção · Inserir dados"
      title="Novo registo de produção"
      description="Segue os quatro passos para registar a produção do lote."
    >
      <section className={styles.card}>
        <div className={styles.tabs} aria-label="Etapas do registo de produção">
          {STEPS.map((label, index) => {
            const available = index <= maxVisitedStep;
            return (
              <button
                type="button"
                className={`${styles.tab} ${index === step ? styles.tabActive : ''}`}
                key={label}
                disabled={!available}
                aria-current={index === step ? 'step' : undefined}
                onClick={() => {
                  if (!available) return;
                  setError('');
                  setFieldErrors({});
                  setStep(index);
                }}
                style={{
                  opacity: available ? 1 : 0.5,
                  cursor: available ? 'pointer' : 'not-allowed',
                }}
              >
                {index + 1} {label}
              </button>
            );
          })}
        </div>

        <div className={styles.cardPad}>
          {error ? <div className={styles.error}>{error}</div> : null}
          {message ? <div className={styles.success}>{message}</div> : null}

          {step === 0 ? (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: error || message ? 18 : 0 }}>
                <div>
                  <h2>Produto e lote</h2>
                  <p>Escolhe o produto e o lote onde será guardado o registo.</p>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label>Produto *</label>
                  <select
                    className={styles.select}
                    value={productId}
                    onChange={(event) => changeProduct(event.target.value)}
                  >
                    {!store.products.length ? <option value="">Sem produtos disponíveis</option> : null}
                    {store.products.map((product) => (
                      <option value={product.id} key={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Lote *</label>
                  <select
                    className={styles.select}
                    value={batchId}
                    onChange={(event) => changeBatch(event.target.value)}
                    disabled={!batches.length}
                  >
                    {!batches.length ? <option value="">Sem lotes para este produto</option> : null}
                    {batches.map((batch) => (
                      <option value={batch.id} key={batch.id}>{batch.code}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: error ? 18 : 0 }}>
                <div>
                  <h2>Etapa e origem</h2>
                  <p>Indica em que fase está a produção e as unidades que deram origem ao registo.</p>
                </div>
              </div>

              <div className={styles.field} style={{ maxWidth: 420 }}>
                <label>Etapa de produção{store.stages.length ? ' *' : ''}</label>
                <select
                  className={styles.select}
                  value={stageId}
                  onChange={(event) => {
                    setStageId(event.target.value);
                    setError('');
                  }}
                  disabled={!store.stages.length}
                >
                  {!store.stages.length ? <option value="">Sem etapas configuradas</option> : null}
                  {store.stages.map((stage) => (
                    <option value={stage.id} key={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.sectionTitle}>
                <div>
                  <h2>{store.productType?.unitLabel ?? 'Unidades'} de origem</h2>
                  <p>Por defeito são selecionadas as unidades associadas ao lote.</p>
                </div>
              </div>

              {store.units.length ? (
                <div className={styles.grid3}>
                  {store.units.map((unit) => (
                    <label className={styles.checkRow} key={unit.id}>
                      <input
                        type="checkbox"
                        checked={unitIds.includes(unit.id)}
                        onChange={(event) => {
                          setUnitIds((current) =>
                            event.target.checked
                              ? [...new Set([...current, unit.id])]
                              : current.filter((id) => id !== unit.id),
                          );
                          setError('');
                        }}
                      />
                      <strong>{unit.code}</strong> {unit.name}
                    </label>
                  ))}
                </div>
              ) : (
                <div className={styles.notice}>
                  Este negócio ainda não tem unidades de produção configuradas.
                </div>
              )}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: error ? 18 : 0 }}>
                <div>
                  <h2>Dados de produção</h2>
                  <p>Preenche os campos definidos para este negócio. Os campos com * são obrigatórios.</p>
                </div>
              </div>

              {!store.fields.length ? (
                <div className={styles.notice}>
                  Não existem campos configurados. Podes continuar e guardar o registo apenas com o produto, lote e etapa.
                </div>
              ) : (
                <div className={styles.formGrid}>
                  {store.fields.map((field) => {
                    const fieldError = fieldErrors[field.key];

                    return (
                      <div className={styles.field} key={field.key}>
                        <label>
                          {field.label}{field.required ? ' *' : ''}{field.unit ? ` (${field.unit})` : ''}
                        </label>

                        {field.fieldType === 'textarea' ? (
                          <textarea
                            className={styles.textarea}
                            value={String(values[field.key] ?? '')}
                            onChange={(event) => {
                              setValues((current) => ({ ...current, [field.key]: event.target.value }));
                              setFieldErrors((current) => ({ ...current, [field.key]: '' }));
                            }}
                          />
                        ) : field.fieldType === 'boolean' ? (
                          <label className={styles.checkRow}>
                            <input
                              type="checkbox"
                              checked={Boolean(values[field.key])}
                              onChange={(event) => {
                                setValues((current) => ({ ...current, [field.key]: event.target.checked }));
                                setFieldErrors((current) => ({ ...current, [field.key]: '' }));
                              }}
                            />
                            Sim
                          </label>
                        ) : field.fieldType === 'image' ? (
                          <input
                            className={styles.input}
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              setFiles((current) => ({
                                ...current,
                                [field.key]: event.target.files?.[0] ?? null,
                              }));
                              setFieldErrors((current) => ({ ...current, [field.key]: '' }));
                            }}
                          />
                        ) : field.fieldType === 'select' ? (
                          <select
                            className={styles.select}
                            value={String(values[field.key] ?? '')}
                            onChange={(event) => {
                              setValues((current) => ({ ...current, [field.key]: event.target.value }));
                              setFieldErrors((current) => ({ ...current, [field.key]: '' }));
                            }}
                          >
                            <option value="">Selecionar</option>
                            {(field.options ?? []).map((option) => (
                              <option value={option} key={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className={styles.input}
                            type={
                              field.fieldType === 'number'
                                ? 'number'
                                : field.fieldType === 'date'
                                  ? 'date'
                                  : field.fieldType === 'datetime'
                                    ? 'datetime-local'
                                    : 'text'
                            }
                            value={String(values[field.key] ?? '')}
                            onChange={(event) => {
                              setValues((current) => ({ ...current, [field.key]: event.target.value }));
                              setFieldErrors((current) => ({ ...current, [field.key]: '' }));
                            }}
                          />
                        )}

                        {fieldError ? (
                          <span style={{ color: '#b33d3d', fontSize: 12, fontWeight: 700 }}>
                            {fieldError}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: error ? 18 : 0 }}>
                <div>
                  <h2>Confirmar registo</h2>
                  <p>Confirma os dados antes de guardar.</p>
                </div>
              </div>

              <div className={styles.grid3}>
                <div className={styles.stat}>
                  <span>Produto</span>
                  <strong style={{ fontSize: 16 }}>{selectedProduct?.name ?? '—'}</strong>
                </div>
                <div className={styles.stat}>
                  <span>Lote</span>
                  <strong style={{ fontSize: 16 }}>{selectedBatch?.code ?? '—'}</strong>
                </div>
                <div className={styles.stat}>
                  <span>Etapa</span>
                  <strong style={{ fontSize: 16 }}>{selectedStage?.name ?? 'Sem etapa'}</strong>
                </div>
              </div>

              <div className={styles.sectionTitle}>
                <div>
                  <h2>Origem</h2>
                  <p>
                    {selectedUnits.length
                      ? selectedUnits.map((unit) => `${unit.code} · ${unit.name}`).join(', ')
                      : 'Sem unidades selecionadas.'}
                  </p>
                </div>
              </div>

              {store.fields.length ? (
                <section className={styles.card} style={{ boxShadow: 'none' }}>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {store.fields.map((field) => {
                          const file = files[field.key];
                          const rawValue = values[field.key];
                          const displayValue =
                            field.fieldType === 'image'
                              ? file?.name ?? '—'
                              : field.fieldType === 'boolean'
                                ? rawValue ? 'Sim' : 'Não'
                                : rawValue == null || rawValue === ''
                                  ? '—'
                                  : String(rawValue);

                          return (
                            <tr key={field.key}>
                              <td><strong>{field.label}</strong></td>
                              <td>{displayValue}{field.unit && displayValue !== '—' ? ` ${field.unit}` : ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          <div
            className={styles.actions}
            style={{
              justifyContent: 'space-between',
              marginTop: 22,
              paddingTop: 16,
              borderTop: '1px solid #e7ebee',
            }}
          >
            <div>
              {step > 0 ? (
                <button className={styles.secondary} type="button" onClick={previousStep}>
                  ← Anterior
                </button>
              ) : null}
            </div>

            <div className={styles.actions}>
              {step === 2 ? (
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => {
                    setValues({});
                    setFiles({});
                    setFieldErrors({});
                    setError('');
                  }}
                >
                  Limpar dados
                </button>
              ) : null}

              {step < STEPS.length - 1 ? (
                <button className={styles.primary} type="button" onClick={nextStep}>
                  Seguinte →
                </button>
              ) : (
                <button
                  className={styles.primary}
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  {saving ? 'A guardar…' : 'Guardar registo'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </TraceabilityShell>
  );
}
