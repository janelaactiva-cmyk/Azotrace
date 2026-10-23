'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';


import { useEffect, useMemo, useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../../_components/TraceabilityShell';
import styles from '../../_components/traceability.module.css';
import { useProducerWorkspace } from '../../_lib/use-producer-workspace';
import { productionUnitName } from '../../_lib/producer-utils';
import { buildRecordSchema } from '../../onboarding/_lib/dynamic-zod';
import { imageFileToLocalDataUrl, makeLocalId } from '../../onboarding/_lib/local-store';
import { uploadProducerAsset } from '../../onboarding/_lib/supabase-store';

const STEPS = ['Produto e lote', 'Etapa', 'Dados', 'Confirmar'];
const DRAFT_KEY_PREFIX = 'azotrace:production-record-draft:';

type ProductionRecordDraft = {
  step: number;
  productId: string;
  batchId: string;
  stageId: string;
  recordedAt: string;
  values: Record<string, unknown>;
  savedAt: string;
};

function nowForDateTimeInput() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function InserirDadosPage() {
  const { store, persist, loading } = useProducerWorkspace();
  const [step, setStep] = useState(0);
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [stageId, setStageId] = useState('');
  const [recordedAt, setRecordedAt] = useState(nowForDateTimeInput());
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState('');
  const [savedRecord, setSavedRecord] = useState(false);

  const batches = useMemo(
    () => store?.batches.filter((batch) => batch.status === 'active' && (!productId || batch.productId === productId)) ?? [],
    [store, productId],
  );

  const selectedProduct = store?.products.find((product) => product.id === productId);
  const selectedBatch = store?.batches.find((batch) => batch.id === batchId);
  const selectedStage = store?.stages.find((stage) => stage.id === stageId);
  const unitLabel = store?.productType?.unitLabel ?? 'Unidade';

  useEffect(() => {
    if (!store) return;
    const firstProduct = store.products[0];
    const firstBatch = firstProduct ? store.batches.find((batch) => batch.productId === firstProduct.id && batch.status === 'active') : undefined;
    setProductId(firstProduct?.id ?? '');
    setBatchId(firstBatch?.id ?? '');
    setStageId(store.stages[0]?.id ?? '');
    setRecordedAt(nowForDateTimeInput());
    setValues({});
    setFiles({});
    setFieldErrors({});
    setError('');
    setMessage('');
    setStep(0);
    setDraftSavedAt('');
    setSavedRecord(false);

    try {
      const draftRaw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${store.business.id}`);
      if (!draftRaw) return;
      const draft = JSON.parse(draftRaw) as Partial<ProductionRecordDraft>;
      const draftProduct = store.products.find((product) => product.id === draft.productId);
      const draftBatch = store.batches.find((batch) => batch.id === draft.batchId && batch.status === 'active');
      const draftStage = store.stages.find((stage) => stage.id === draft.stageId);
      if (draftProduct) setProductId(draftProduct.id);
      if (draftBatch && (!draftProduct || draftBatch.productId === draftProduct.id)) setBatchId(draftBatch.id);
      if (draftStage) setStageId(draftStage.id);
      if (typeof draft.recordedAt === 'string' && draft.recordedAt) setRecordedAt(draft.recordedAt);
      if (draft.values && typeof draft.values === 'object') setValues(draft.values);
      if (typeof draft.step === 'number') setStep(Math.max(0, Math.min(draft.step, STEPS.length - 1)));
      if (typeof draft.savedAt === 'string') setDraftSavedAt(draft.savedAt);
      setMessage('Rascunho recuperado. Podes continuar sem perder os dados guardados.');
    } catch {
      window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${store.business.id}`);
    }
  }, [store?.business.id]);

  useEffect(() => {
    if (!store || !productId) return;
    if (batches.some((batch) => batch.id === batchId)) return;
    setBatchId(batches[0]?.id ?? '');
  }, [store?.batches.length, productId, batchId, batches]);

  if (loading) return <TraceabilityShell eyebrow="Produção" title="Inserir dados"><div className={styles.cardPad}>A carregar…</div></TraceabilityShell>;
  if (!store?.completed) return <TraceabilityShell eyebrow="Produção" title="Inserir dados"><EmptyWorkspace /></TraceabilityShell>;

  function changeProduct(nextProductId: string) {
    if (!store) return;
    const nextBatch = store.batches.find((batch) => batch.productId === nextProductId && batch.status === 'active');
    setProductId(nextProductId);
    setBatchId(nextBatch?.id ?? '');
    setError('');
  }

  function valuesForValidation() {
    if (!store) return {};

    const hydrated: Record<string, unknown> = { ...values };
    for (const field of store.fields) {
      if (field.fieldType === 'image' && files[field.key]) hydrated[field.key] = '__imagem_selecionada__';
    }
    return hydrated;
  }

  function validateCurrentStep() {
    if (!store) return false;

    setError('');
    setFieldErrors({});

    if (step === 0) {
      if (!store.products.length) return setError('Ainda não existem produtos. Crie primeiro um produto.'), false;
      if (!productId) return setError('Selecione um produto para continuar.'), false;
      if (!batches.length) return setError('O produto selecionado ainda não tem um lote ativo. Ative uma unidade de produção; o lote será criado automaticamente.'), false;
      if (!batchId) return setError('Selecione um lote para continuar.'), false;
      if (store.units.length && !selectedBatch?.productionUnitId) return setError(`Este lote não tem ${unitLabel.toLowerCase()} associada. Verifique a unidade de produção antes de continuar.`), false;
      if (!recordedAt) return setError('Indique a data e hora a que estes dados se referem.'), false;
      return true;
    }

    if (step === 1) {
      if (store.stages.length > 0 && !stageId) return setError('Selecione a etapa de produção para continuar.'), false;
      return true;
    }

    if (step === 2) {
      const parsed = buildRecordSchema(store.fields).safeParse(valuesForValidation());
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? '');
          if (key && !nextErrors[key]) nextErrors[key] = issue.message || 'Valor inválido.';
        }
        setFieldErrors(nextErrors);
        setError('Revise os campos assinalados antes de continuar.');
        return false;
      }
      return true;
    }

    return true;
  }

  function saveDraftAndContinue() {
    if (!store || !validateCurrentStep()) return;
    const savedAt = new Date().toISOString();
    const draft: ProductionRecordDraft = {
      step: Math.min(step + 1, STEPS.length - 1),
      productId,
      batchId,
      stageId,
      recordedAt,
      values,
      savedAt,
    };
    try {
      window.localStorage.setItem(`${DRAFT_KEY_PREFIX}${store.business.id}`, JSON.stringify(draft));
      setDraftSavedAt(savedAt);
      setMessage('Rascunho guardado neste dispositivo. Podes continuar sem perder os dados.');
      setStep(draft.step);
    } catch {
      setError('Não foi possível guardar o rascunho neste dispositivo. Liberta espaço no armazenamento e tenta novamente.');
    }
  }

  function previousStep() {
    setError('');
    setFieldErrors({});
    setStep((current) => Math.max(0, current - 1));
  }

  async function save() {
    if (!store || !selectedBatch) return;
    setSaving(true);
    setError('');
    setMessage('');
    setFieldErrors({});

    try {
      const hydrated: Record<string, unknown> = { ...values };
      for (const field of store.fields) {
        const file = files[field.key];
        if (field.fieldType === 'image' && file) hydrated[field.key] = store?.business.id ? await uploadProducerAsset(file, store.business.id, 'registos') : await imageFileToLocalDataUrl(file);
      }

      const parsed = buildRecordSchema(store.fields).safeParse(hydrated);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? '');
          if (key && !nextErrors[key]) nextErrors[key] = issue.message || 'Valor inválido.';
        }
        setFieldErrors(nextErrors);
        setStep(2);
        setError('Existem dados inválidos. Corrija os campos assinalados e tente novamente.');
        return;
      }

      const timestamp = new Date().toISOString();
      const unitId = selectedBatch.productionUnitId || undefined;
      persist({
        ...store,
        records: [
          {
            id: makeLocalId('record'),
            productId,
            batchId,
            stageId: stageId || undefined,
            productionUnitId: unitId,
            productionUnitIds: unitId ? [unitId] : [],
            recordedAt: new Date(recordedAt).toISOString(),
            data: parsed.data as Record<string, unknown>,
            createdAt: timestamp,
          },
          ...store.records,
        ],
      });

      window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${store.business.id}`);
      setDraftSavedAt('');
      setSavedRecord(true);
      setMessage('Registo de produção guardado com sucesso. Os dados continuam visíveis neste ecrã.');
    } catch (cause) {
      console.error(cause);
      setError(uiMessagePt(cause instanceof Error && cause.message ? cause.message : 'Não foi possível guardar o registo de produção. Tente novamente.'));
    } finally {
      setSaving(false);
    }
  }

  function startNewRecord() {
    if (!store) return;
    const firstProduct = store.products[0];
    const firstBatch = firstProduct ? store.batches.find((batch) => batch.productId === firstProduct.id && batch.status === 'active') : undefined;
    setProductId(firstProduct?.id ?? '');
    setBatchId(firstBatch?.id ?? '');
    setStageId(store.stages[0]?.id ?? '');
    setRecordedAt(nowForDateTimeInput());
    setValues({});
    setFiles({});
    setFieldErrors({});
    setError('');
    setMessage('');
    setDraftSavedAt('');
    setSavedRecord(false);
    setStep(0);
  }

  const recordTitle = selectedStage?.name ? `Registo de ${selectedStage.name}` : 'Novo registo de produção';

  return (
    <TraceabilityShell eyebrow="Produção · Inserir dados" title={recordTitle} description={`Registe a atividade${selectedStage?.name ? ` “${selectedStage.name}”` : ''} no lote selecionado. A unidade é reutilizada ao longo do tempo e cada ciclo mantém o seu próprio histórico.`}>
      {message ? <div className={styles.success} style={{ marginBottom: 14 }}>{message}</div> : null}
      {draftSavedAt && !savedRecord ? <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 13 }}>Rascunho guardado às {new Date(draftSavedAt).toLocaleString('pt-PT')}.</p> : null}
      <section className={styles.card}>
        <div className={styles.cardPad}>
          <div className={styles.tabs} aria-label="Etapas do registo de produção" style={{ marginBottom: 20 }}>
            {STEPS.map((label, index) => (
              <button
                type="button"
                key={label}
                className={`${styles.tab} ${step === index ? styles.tabActive : ''}`}
                onClick={() => { if (index <= step) { setError(''); setFieldErrors({}); setStep(index); } }}
                disabled={index > step || savedRecord}
                style={{ opacity: index <= step && !savedRecord ? 1 : 0.5, cursor: index <= step && !savedRecord ? 'pointer' : 'not-allowed' }}
              >
                {index + 1} {label}
              </button>
            ))}
          </div>

          {error ? <div className={styles.error} style={{ marginBottom: 14 }}>{error}</div> : null}

          {step === 0 ? (
            <div className={styles.grid2}>
              <div className={styles.field}><label>Produto *</label><select className={styles.select} value={productId} onChange={(event) => changeProduct(event.target.value)}><option value="">Selecionar produto</option>{store.products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></div>
              <div className={styles.field}><label>Lote *</label><select className={styles.select} value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">Selecionar lote</option>{batches.map((batch) => <option value={batch.id} key={batch.id}>{batch.code} · {productionUnitName(store, batch.productionUnitId)}</option>)}</select></div>
              <div className={styles.field}><label>{unitLabel}</label><input className={styles.input} readOnly value={selectedBatch ? productionUnitName(store, selectedBatch.productionUnitId) : ''} placeholder={`Definida pelo lote`} /></div>
              <div className={styles.field}><label>Data e hora dos dados *</label><input className={styles.input} type="datetime-local" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} /></div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className={styles.field}><label>Etapa{store.stages.length ? ' *' : ''}</label><select className={styles.select} value={stageId} onChange={(event) => setStageId(event.target.value)} disabled={!store.stages.length}>{!store.stages.length ? <option value="">Sem etapas configuradas</option> : <option value="">Selecionar etapa</option>}{store.stages.map((stage) => <option value={stage.id} key={stage.id}>{stage.name}</option>)}</select></div>
          ) : null}

          {step === 2 ? (
            !store.fields.length ? <div className={styles.notice}>Este negócio não tem campos adicionais configurados.</div> : (
              <div className={styles.formGrid}>
                {store.fields.map((field) => {
                  const fieldError = fieldErrors[field.key];
                  const value = values[field.key];
                  return (
                    <div className={styles.field} key={field.key}>
                      <label>{field.label}{field.required ? ' *' : ''}{field.unit ? ` (${field.unit})` : ''}</label>
                      {field.fieldType === 'textarea' ? <textarea className={styles.textarea} value={String(value ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /> : null}
                      {field.fieldType === 'boolean' ? <label className={styles.checkRow}><input type="checkbox" checked={Boolean(value)} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.checked }))} /> Sim</label> : null}
                      {field.fieldType === 'image' ? <input className={styles.input} type="file" accept="image/*" onChange={(event) => setFiles((current) => ({ ...current, [field.key]: event.target.files?.[0] ?? null }))} /> : null}
                      {field.fieldType === 'select' ? <select className={styles.select} value={String(value ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}><option value="">Selecionar</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select> : null}
                      {!['textarea', 'boolean', 'image', 'select'].includes(field.fieldType) ? <input className={styles.input} type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : field.fieldType === 'datetime' ? 'datetime-local' : 'text'} value={String(value ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /> : null}
                      {fieldError ? <span style={{ color: '#b33d3d', fontSize: 12, fontWeight: 700 }}>{fieldError}</span> : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : null}

          {step === 3 ? (
            <div className={styles.grid2}>
              <div className={styles.stat}><span>Produto</span><strong style={{ fontSize: 16 }}>{selectedProduct?.name || '—'}</strong></div>
              <div className={styles.stat}><span>Lote</span><strong style={{ fontSize: 16 }}>{selectedBatch?.code || '—'}</strong></div>
              <div className={styles.stat}><span>{unitLabel}</span><strong style={{ fontSize: 16 }}>{selectedBatch ? productionUnitName(store, selectedBatch.productionUnitId) : '—'}</strong></div>
              <div className={styles.stat}><span>Etapa</span><strong style={{ fontSize: 16 }}>{selectedStage?.name || 'Sem etapa'}</strong></div>
            </div>
          ) : null}

          <div className={styles.actions} style={{ justifyContent: 'space-between', marginTop: 24 }}>
            <button className={styles.secondary} type="button" disabled={step === 0 || saving || savedRecord} onClick={previousStep}>← Anterior</button>
            {savedRecord ? <button className={styles.primary} type="button" onClick={startNewRecord}>+ Novo registo</button> : step < STEPS.length - 1 ? <button className={styles.primary} type="button" disabled={saving} onClick={saveDraftAndContinue}>Guardar e seguinte →</button> : <button className={styles.primary} type="button" disabled={saving} onClick={() => void save()}>{saving ? 'A guardar…' : 'Guardar registo'}</button>}
          </div>
        </div>
      </section>
    </TraceabilityShell>
  );
}
