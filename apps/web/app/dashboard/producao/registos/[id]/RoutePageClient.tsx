'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';


import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../../../_components/TraceabilityShell';
import styles from '../../../_components/traceability.module.css';
import { useProducerWorkspace } from '../../../_lib/use-producer-workspace';
import { productionUnitName } from '../../../_lib/producer-utils';
import { buildRecordSchema } from '../../../onboarding/_lib/dynamic-zod';
import { imageFileToLocalDataUrl } from '../../../onboarding/_lib/local-store';
import { uploadProducerAsset } from '../../../onboarding/_lib/supabase-store';

function toDateTimeInput(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function EditarRegistoPage() {
  const params = useParams<{ id: string }>();
  const { store, persist, loading } = useProducerWorkspace();
  const record = store?.records.find((item) => item.id === params.id);

  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [stageId, setStageId] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!record) return;
    setProductId(record.productId);
    setBatchId(record.batchId);
    setStageId(record.stageId || '');
    setRecordedAt(toDateTimeInput(record.recordedAt || record.createdAt));
    setValues(record.data || {});
    setFiles({});
    setFieldErrors({});
    setError('');
  }, [record?.id]);

  const batches = useMemo(
    () => store?.batches.filter((batch) => batch.productId === productId) ?? [],
    [store, productId],
  );
  const selectedBatch = store?.batches.find((batch) => batch.id === batchId);

  if (loading) return <TraceabilityShell eyebrow="Produção" title="Editar registo"><div className={styles.cardPad}>A carregar…</div></TraceabilityShell>;
  if (!store?.completed) return <TraceabilityShell eyebrow="Produção" title="Editar registo"><EmptyWorkspace /></TraceabilityShell>;
  if (!record) return <TraceabilityShell eyebrow="Produção · Registos" title="Registo não encontrado"><section className={styles.empty}><p>O registo que tentou abrir não existe neste negócio.</p><Link className={styles.primary} href="/dashboard/producao/registos">Voltar aos registos</Link></section></TraceabilityShell>;

  const unitLabel = store.productType?.unitLabel ?? 'Unidade';

  function changeProduct(nextProductId: string) {
    const nextBatch = store!.batches.find((batch) => batch.productId === nextProductId);
    setProductId(nextProductId);
    setBatchId(nextBatch?.id ?? '');
    setError('');
  }

  async function save() {
    if (!record) return;

    if (!store) return;
    setSaving(true);
    setError('');
    setMessage('');
    setFieldErrors({});

    try {
      if (!productId) return setError('Selecione o produto.');
      if (!batchId) return setError('Selecione o lote.');
      if (store.units.length && !selectedBatch?.productionUnitId) return setError(`O lote selecionado não tem ${unitLabel.toLowerCase()} associada.`);
      if (store.stages.length && !stageId) return setError('Selecione a etapa de produção.');
      if (!recordedAt) return setError('Indique a data e hora dos dados.');

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
        setError('Revise os campos assinalados antes de guardar.');
        return;
      }

      const productionUnitId = selectedBatch?.productionUnitId || undefined;
      persist({
        ...store,
        records: store.records.map((item) => item.id === record.id ? {
          ...item,
          productId,
          batchId,
          stageId: stageId || undefined,
          productionUnitId,
          productionUnitIds: productionUnitId ? [productionUnitId] : [],
          recordedAt: new Date(recordedAt).toISOString(),
          data: parsed.data as Record<string, unknown>,
          updatedAt: new Date().toISOString(),
        } : item),
      });
      setMessage('Registo atualizado com sucesso. Os restantes registos históricos não foram alterados.');
    } catch (cause) {
      console.error(cause);
      setError(uiMessagePt(cause instanceof Error && cause.message ? cause.message : 'Não foi possível atualizar o registo. Tente novamente.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <TraceabilityShell eyebrow="Produção · Registos" title="Editar registo" description={`Pode alterar o lote, etapa, data e valores. A ${unitLabel.toLowerCase()} é definida pelo lote selecionado.`} actions={<Link className={styles.secondary} href="/dashboard/producao/registos">← Voltar aos registos</Link>}>
      <section className={styles.card}>
        <div className={styles.cardPad}>
          {error ? <div className={styles.error}>{error}</div> : null}
          {message ? <div className={styles.success}>{message}</div> : null}

          <div className={styles.sectionTitle}><div><h2>Identificação do registo</h2><p>Para mudar de estufa, colmeia ou pipa, selecione o lote correspondente a essa unidade.</p></div></div>
          <div className={styles.grid2}>
            <div className={styles.field}><label>Produto *</label><select className={styles.select} value={productId} onChange={(event) => changeProduct(event.target.value)}>{store.products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></div>
            <div className={styles.field}><label>Lote *</label><select className={styles.select} value={batchId} onChange={(event) => setBatchId(event.target.value)}><option value="">Selecionar lote</option>{batches.map((batch) => <option value={batch.id} key={batch.id}>{batch.code} · {productionUnitName(store, batch.productionUnitId)}</option>)}</select></div>
            <div className={styles.field}><label>{unitLabel}</label><input className={styles.input} readOnly value={selectedBatch ? productionUnitName(store, selectedBatch.productionUnitId) : ''} /></div>
            <div className={styles.field}><label>Data e hora dos dados *</label><input className={styles.input} type="datetime-local" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} /></div>
            <div className={styles.field}><label>Etapa{store.stages.length ? ' *' : ''}</label><select className={styles.select} value={stageId} onChange={(event) => setStageId(event.target.value)} disabled={!store.stages.length}>{!store.stages.length ? <option value="">Sem etapas configuradas</option> : <option value="">Selecionar etapa</option>}{store.stages.map((stage) => <option value={stage.id} key={stage.id}>{stage.name}</option>)}</select></div>
          </div>

          <div className={styles.sectionTitle}><div><h2>Dados de produção</h2><p>Altere apenas os valores desta observação semanal.</p></div></div>
          {!store.fields.length ? <div className={styles.notice}>Este negócio não tem campos adicionais configurados.</div> : (
            <div className={styles.formGrid}>
              {store.fields.map((field) => {
                const fieldError = fieldErrors[field.key];
                const currentValue = values[field.key];
                return (
                  <div className={styles.field} key={field.key}>
                    <label>{field.label}{field.required ? ' *' : ''}{field.unit ? ` (${field.unit})` : ''}</label>
                    {field.fieldType === 'textarea' ? <textarea className={styles.textarea} value={String(currentValue ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /> : null}
                    {field.fieldType === 'boolean' ? <label className={styles.checkRow}><input type="checkbox" checked={Boolean(currentValue)} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.checked }))} /> Sim</label> : null}
                    {field.fieldType === 'image' ? <><span className={styles.muted}>Selecione uma nova imagem apenas se pretender substituir a atual.</span><input className={styles.input} type="file" accept="image/*" onChange={(event) => setFiles((current) => ({ ...current, [field.key]: event.target.files?.[0] ?? null }))} /></> : null}
                    {field.fieldType === 'select' ? <select className={styles.select} value={String(currentValue ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}><option value="">Selecionar</option>{(field.options ?? []).map((option) => <option value={option} key={option}>{option}</option>)}</select> : null}
                    {!['textarea', 'boolean', 'image', 'select'].includes(field.fieldType) ? <input className={styles.input} type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : field.fieldType === 'datetime' ? 'datetime-local' : 'text'} value={String(currentValue ?? '')} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /> : null}
                    {fieldError ? <span style={{ color: '#b33d3d', fontSize: 12, fontWeight: 700 }}>{fieldError}</span> : null}
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.actions} style={{ justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: '#e7ebee' }}>
            <Link className={styles.secondary} href="/dashboard/producao/registos">Cancelar</Link>
            <button className={styles.primary} type="button" disabled={saving} onClick={() => void save()}>{saving ? 'A guardar…' : 'Guardar alterações'}</button>
          </div>
        </div>
      </section>
    </TraceabilityShell>
  );
}
