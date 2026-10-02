'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useBusiness } from '~/lib/business-context';

import { BusinessWorkspaceSwitcher } from '../../_components/BusinessWorkspaceSwitcher';

import styles from '../onboarding.module.css';
import {
  PRODUCER_PRESETS,
  getPreset,
  type FieldDefinition,
  type FieldType,
} from '../_lib/catalog';
import { buildRecordSchema } from '../_lib/dynamic-zod';
import {
  createEmptyProducerState,
  getActiveProducerState,
  makeLocalId,
  saveProducerState,
  DEFAULT_BUSINESS_COLORS,
  type ProducerLocalState,
} from '../_lib/local-store';
import { loadRemoteProducerState, saveRemoteProducerState, uploadProducerAsset } from '../_lib/supabase-store';

const STEP_LABELS = [
  'Bem-vindo',
  'Negócio',
  'Tipo de produto',
  'Unidades',
  'Campos',
  'Etapas',
  'Produto e lote',
  'Primeiro registo',
  'Concluído',
];

function makeKey(label: string) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function generateBatchCode(productTypeName: string) {
  const prefix = makeKey(productTypeName).replace(/_/g, '').slice(0, 3).toUpperCase() || 'LOT';
  return `${prefix}-${new Date().getFullYear()}-0001`;
}

export default function ProducerOnboarding({ forceNew = false }: { forceNew?: boolean }) {
  const router = useRouter();
  const initializedRef = useRef(false);
  const { selectedBusinessId, selectedBusinessName, setSelectedBusiness } = useBusiness();

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [store, setStore] = useState<ProducerLocalState | null>(null);

  const [companyName, setCompanyName] = useState(selectedBusinessName ?? '');
  const [accentColor, setAccentColor] = useState(DEFAULT_BUSINESS_COLORS[0]!);
  const [businessKind, setBusinessKind] = useState('Produção');
  const [location, setLocation] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');

  const [presetId, setPresetId] = useState('agriculture');
  const [productTypeName, setProductTypeName] = useState('Ananás');
  const [unitLabel, setUnitLabel] = useState('Estufa');
  const [unitPrefix, setUnitPrefix] = useState('EST');
  const [unitCount, setUnitCount] = useState(20);
  const [units, setUnits] = useState<Array<{ id: string; code: string; name: string }>>([]);

  const [fields, setFields] = useState<FieldDefinition[]>(getPreset('agriculture').fields.map((field) => ({ ...field })));
  const [stages, setStages] = useState<string[]>([...getPreset('agriculture').stages]);

  const [productName, setProductName] = useState('Ananás dos Açores');
  const [sku, setSku] = useState('ANA-001');
  const [productDescription, setProductDescription] = useState('');
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState('');
  const [batchCode, setBatchCode] = useState(`ANA-${new Date().getFullYear()}-0001`);
  const [batchStartDate, setBatchStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  const [recordStageId, setRecordStageId] = useState('');
  const [recordValues, setRecordValues] = useState<Record<string, any>>({});
  const [recordFiles, setRecordFiles] = useState<Record<string, File | null>>({});

  const selectedPreset = useMemo(() => getPreset(presetId), [presetId]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;

    const applyState = (next: ProducerLocalState) => {
      if (cancelled) return;
      setStore(next);
      setStep(Math.min(next.onboardingStep ?? 0, 8));
      setCompanyName(next.business.name || selectedBusinessName || '');
      setBusinessKind(next.business.kind || 'Produção');
      setLocation(next.business.location || '');
      setLogoUrl(next.business.logoUrl || '');
      setAccentColor(next.business.accentColor || DEFAULT_BUSINESS_COLORS[0]!);

      if (next.productType) {
        setPresetId(next.productType.presetId || 'custom');
        setProductTypeName(next.productType.name);
        setUnitLabel(next.productType.unitLabel);
        setUnitPrefix(next.productType.unitPrefix);
      }

      if (next.units.length) {
        setUnits(next.units.map(({ id, code, name }) => ({ id, code, name })));
        setUnitCount(next.units.length);
        setSelectedUnitIds(next.batches[0]?.unitIds?.length ? next.batches[0].unitIds : next.units.map((unit) => unit.id));
      }
      if (next.fields.length) setFields(next.fields.map((field) => ({ ...field })));
      if (next.stages.length) {
        setStages([...next.stages].sort((a, b) => a.position - b.position).map((stage) => stage.name));
        setRecordStageId(next.stages[0]?.id ?? '');
      }
      if (next.products[0]) {
        setProductName(next.products[0].name);
        setSku(next.products[0].sku ?? '');
        setProductDescription(next.products[0].description ?? '');
        setProductImageUrl(next.products[0].imageUrl ?? '');
      }
      if (next.batches[0]) {
        setBatchCode(next.batches[0].code);
        setBatchStartDate(next.batches[0].startDate);
      }
      setLoaded(true);
    };

    const initialize = async () => {
      if (forceNew) {
        applyState(createEmptyProducerState({ name: '' }));
        return;
      }

      const preferredId = selectedBusinessId ? String(selectedBusinessId) : null;
      const local = getActiveProducerState(preferredId);
      if (local) applyState(local);

      if (preferredId) {
        try {
          const remote = await loadRemoteProducerState(preferredId);
          if (remote) {
            applyState(remote);
            return;
          }
          if (local) await saveRemoteProducerState(local);
        } catch (cause) {
          console.warn('Não foi possível carregar o onboarding do Supabase:', cause);
          if (!local && !cancelled) setError('Não foi possível carregar os dados do negócio no Supabase.');
        }
      }

      if (!local && !cancelled) {
        applyState(createEmptyProducerState({
          id: selectedBusinessId ? String(selectedBusinessId) : undefined,
          name: selectedBusinessName ?? '',
        }));
      }
    };

    void initialize();
    return () => { cancelled = true; };
  }, [forceNew, selectedBusinessId, selectedBusinessName]);

  const persist = async (next: ProducerLocalState) => {
    saveProducerState(next);
    setStore(next);
    await saveRemoteProducerState(next);
  };

  const runSave = async (fn: () => Promise<void> | void) => {
    try {
      setSaving(true);
      setError('');
      await fn();
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível guardar os dados.');
    } finally {
      setSaving(false);
    }
  };

  const saveCompany = async () => {
    if (!store) return;
    if (!companyName.trim()) throw new Error('Indica o nome da empresa.');

    // Garante que o negócio já existe no Supabase antes de carregar ficheiros
    // para o Storage (as políticas usam o business_id como fronteira multitenant).
    await saveRemoteProducerState(store);
    const nextLogoUrl = logoFile ? await uploadProducerAsset(logoFile, store.business.id, 'logos') : logoUrl;
    const next: ProducerLocalState = {
      ...store,
      business: {
        ...store.business,
        name: companyName.trim(),
        kind: businessKind.trim() || 'Produção',
        location: location.trim(),
        logoUrl: nextLogoUrl,
        accentColor,
      },
      onboardingStep: 2,
    };

    await persist(next);
    setLogoUrl(nextLogoUrl);
    setSelectedBusiness(next.business.id as any, next.business.kind, next.business.name);
    document.documentElement.style.setProperty('--azotrace-business-accent', next.business.accentColor);
    setStep(2);
  };

  const choosePreset = (id: string) => {
    const preset = getPreset(id);
    setPresetId(id);
    setProductTypeName(preset.defaultProductType);
    setUnitLabel(preset.unitLabel);
    setUnitPrefix(preset.unitPrefix);
    setFields(preset.fields.map((field) => ({ ...field })));
    setStages([...preset.stages]);
    setBatchCode(generateBatchCode(preset.defaultProductType || 'produto'));
    if (preset.defaultColor) setAccentColor(preset.defaultColor);
  };

  const saveProductType = async () => {
    if (!store) return;
    if (!productTypeName.trim()) throw new Error('Indica o tipo de produto.');

    const productTypeId = store.productType?.id ?? makeLocalId('ptype');
    const next: ProducerLocalState = {
      ...store,
      business: { ...store.business, accentColor },
      productType: {
        id: productTypeId,
        name: productTypeName.trim(),
        presetId,
        unitLabel: unitLabel.trim() || 'Unidade',
        unitPrefix: unitPrefix.trim().toUpperCase() || 'UND',
      },
      onboardingStep: 3,
    };
    await persist(next);
    setBatchCode(generateBatchCode(productTypeName));
    setStep(3);
  };

  const generateUnits = () => {
    const count = Math.max(1, Math.min(500, Number(unitCount) || 1));
    const prefix = (unitPrefix || 'UND').toUpperCase();
    setUnits(
      Array.from({ length: count }, (_, index) => ({
        id: makeLocalId('unit'),
        code: `${prefix}-${String(index + 1).padStart(2, '0')}`,
        name: `${unitLabel || 'Unidade'} ${index + 1}`,
      })),
    );
  };

  const saveUnits = async () => {
    if (!store?.productType) throw new Error('Configura primeiro o tipo de produto.');
    const source = units.length ? units : [{ id: makeLocalId('unit'), code: `${unitPrefix}-01`, name: `${unitLabel} 1` }];
    const storedUnits = source.map((unit) => ({ ...unit, productTypeId: store.productType!.id, status: 'active' as const }));
    const next: ProducerLocalState = { ...store, units: storedUnits, onboardingStep: 4 };
    await persist(next);
    setUnits(source);
    setSelectedUnitIds(storedUnits.map((unit) => unit.id));
    setStep(4);
  };

  const addField = () => {
    setFields((current) => [
      ...current,
      {
        key: `campo_${current.length + 1}`,
        label: `Novo campo ${current.length + 1}`,
        fieldType: 'text',
        required: false,
        public: true,
      },
    ]);
  };

  const saveFields = async () => {
    if (!store) return;
    const normalized = fields.map((field) => ({ ...field, key: field.key || makeKey(field.label) }));
    await persist({ ...store, fields: normalized, onboardingStep: 5 });
    setFields(normalized);
    setStep(5);
  };

  const saveStages = async () => {
    if (!store?.productType) throw new Error('Tipo de produto em falta.');
    const storedStages = stages
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name, position) => ({ id: makeLocalId('stage'), productTypeId: store.productType!.id, name, position }));
    if (!storedStages.length) throw new Error('Adiciona pelo menos uma etapa.');
    await persist({ ...store, stages: storedStages, onboardingStep: 6 });
    setRecordStageId(storedStages[0]?.id ?? '');
    setStep(6);
  };

  const saveProductAndBatch = async () => {
    if (!store?.productType) throw new Error('Configuração incompleta.');
    if (!productName.trim()) throw new Error('Indica o nome do produto.');
    if (!batchCode.trim()) throw new Error('Indica o código do lote.');

    const nextImageUrl = productImageFile ? await uploadProducerAsset(productImageFile, store.business.id, 'produtos') : productImageUrl;
    const productId = store.products[0]?.id ?? makeLocalId('product');
    const batchId = store.batches[0]?.id ?? makeLocalId('batch');

    const product = {
      id: productId,
      productTypeId: store.productType.id,
      name: productName.trim(),
      sku: sku.trim() || undefined,
      description: productDescription.trim() || undefined,
      imageUrl: nextImageUrl || undefined,
    };

    const batch = {
      id: batchId,
      productId,
      code: batchCode.trim(),
      startDate: batchStartDate,
      status: 'active' as const,
      unitIds: selectedUnitIds,
    };

    await persist({ ...store, products: [product, ...store.products.slice(1)], batches: [batch, ...store.batches.slice(1)], onboardingStep: 7 });
    setProductImageUrl(nextImageUrl);
    setStep(7);
  };

  const saveFirstRecord = async () => {
    if (!store?.products[0] || !store.batches[0]) throw new Error('Produto ou lote em falta.');

    const hydratedValues = { ...recordValues };
    for (const field of fields) {
      const file = recordFiles[field.key];
      if (field.fieldType === 'image' && file) {
        hydratedValues[field.key] = await uploadProducerAsset(file, store.business.id, `registos/${field.key}`);
      }
    }

    const parsed = buildRecordSchema(fields).safeParse(hydratedValues);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Revê os dados do formulário.');

    const record = {
      id: makeLocalId('record'),
      productId: store.products[0].id,
      batchId: store.batches[0].id,
      stageId: recordStageId || store.stages[0]?.id,
      productionUnitIds: selectedUnitIds,
      data: parsed.data as Record<string, unknown>,
      createdAt: new Date().toISOString(),
    };

    await persist({ ...store, records: [record, ...store.records], onboardingStep: 8, completed: true });
    setStep(8);
  };

  if (!loaded || !store) return <div className={styles.loading}>A preparar a configuração local…</div>;

  return (
    <div className={styles.page} style={{ ['--business-accent' as any]: accentColor }}>
      {!forceNew ? <BusinessWorkspaceSwitcher /> : null}
      <section className={styles.hero} style={{ background: `linear-gradient(125deg, ${accentColor}, #10202e)` }}>
        <div>
          <h1>Configuração inicial do produtor</h1>
          <p>Configura o negócio uma vez. Depois, o trabalho diário acontece em Produção.</p>
        </div>
        <div><strong>{Math.min(step + 1, 9)} / 9</strong><div className={styles.footerNote} style={{ color: '#dbeafe' }}>Supabase — sincronização ativa</div></div>
      </section>

      <div className={styles.progress}>
        {STEP_LABELS.slice(1).map((_, index) => <div key={index} className={`${styles.progressItem} ${step > index ? styles.progressItemActive : ''}`} />)}
      </div>

      <div className={styles.shell}>
        <aside className={styles.steps}>
          {STEP_LABELS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`${styles.step} ${step === index ? styles.stepActive : ''} ${step > index ? styles.stepDone : ''}`}
              onClick={() => { if (step === 8 || index <= step) setStep(index); }}
            >
              <span className={styles.number}>{step > index ? '✓' : index + 1}</span>
              <span>{label}</span>
            </button>
          ))}
        </aside>

        <main className={styles.card}>
          {error ? <div className={styles.error}>{error}</div> : null}

          {step === 0 ? (
            <>
              <h2 className={styles.title}>Bem-vindo ao Azotrace</h2>
              <p className={styles.subtitle}>Vamos preparar o sistema para a forma real como produzes: estufas, colmeias, pipas, cubas, parcelas ou outra unidade.</p>
              <div className={styles.notice}>Os dados são guardados no Supabase por negócio. O armazenamento local é usado apenas como cache e para migração automática dos testes anteriores.</div>
              <div className={styles.summary}>
                <div className={styles.summaryCard}><strong>1. Negócio</strong><div className={styles.muted}>Nome, cor e identificação deste espaço.</div></div>
                <div className={styles.summaryCard}><strong>2. Produto</strong><div className={styles.muted}>Ananás, mel, vinho, carne ou outro.</div></div>
                <div className={styles.summaryCard}><strong>3. Unidades</strong><div className={styles.muted}>20 estufas, 80 colmeias, 15 pipas…</div></div>
                <div className={styles.summaryCard}><strong>4. Rastreabilidade</strong><div className={styles.muted}>Campos, etapas, lote e registos.</div></div>
              </div>
              <div className={styles.actions}><span /><button className={styles.buttonPrimary} onClick={() => setStep(1)}>Começar configuração →</button></div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h2 className={styles.title}>1. Identificar o negócio</h2>
              <p className={styles.subtitle}>Dá um nome a este espaço. Podes criar outros negócios depois e cada um terá dados e cor próprios.</p>
              <div className={styles.grid2}>
                <div className={styles.field}><label>Nome do negócio *</label><input className={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ananás / Mel / Vinho" /></div>
                <div className={styles.field}><label>Tipo de negócio</label><input className={styles.input} value={businessKind} onChange={(e) => setBusinessKind(e.target.value)} placeholder="Produção agrícola" /></div>
                <div className={styles.field}><label>Localização</label><input className={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="São Miguel, Açores" /></div>
                <div className={styles.field}><label>Logótipo</label><input className={styles.input} type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />{logoUrl ? <img className={styles.thumb} src={logoUrl} alt="Logótipo" /> : null}</div>
                <div className={styles.field}>
                  <label>Cor do negócio</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {DEFAULT_BUSINESS_COLORS.map((color) => (
                      <button key={color} type="button" aria-label={`Escolher cor ${color}`} onClick={() => setAccentColor(color)} style={{ width: 30, height: 30, borderRadius: '50%', background: color, border: accentColor === color ? '3px solid #10202e' : '2px solid white', boxShadow: '0 0 0 1px #cfd8df', cursor: 'pointer' }} />
                    ))}
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ width: 38, height: 30, border: 0, background: 'transparent' }} />
                  </div>
                </div>
              </div>
              <div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setStep(0)}>← Voltar</button><button disabled={saving} className={styles.buttonPrimary} onClick={() => void runSave(saveCompany)}>Guardar e continuar →</button></div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2 className={styles.title}>2. O que produz?</h2>
              <p className={styles.subtitle}>Escolhe um modelo inicial. Tudo pode ser personalizado depois.</p>
              <div className={styles.presetGrid}>
                {PRODUCER_PRESETS.map((preset) => (
                  <button key={preset.id} type="button" className={`${styles.preset} ${presetId === preset.id ? styles.presetSelected : ''}`} onClick={() => choosePreset(preset.id)}>
                    <span className={styles.presetIcon}>{preset.icon}</span><strong>{preset.label}</strong><span className={styles.muted}>{preset.example}</span>
                  </button>
                ))}
              </div>
              <div className={styles.grid3} style={{ marginTop: 18 }}>
                <div className={styles.field}><label>Tipo de produto</label><input className={styles.input} value={productTypeName} onChange={(e) => setProductTypeName(e.target.value)} /></div>
                <div className={styles.field}><label>Nome da unidade</label><input className={styles.input} value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="Estufa / Colmeia / Pipa" /></div>
                <div className={styles.field}><label>Prefixo</label><input className={styles.input} value={unitPrefix} onChange={(e) => setUnitPrefix(e.target.value.toUpperCase())} /></div>
              </div>
              <div className={styles.notice} style={{ marginTop: 16 }}>Exemplo selecionado: <strong>{selectedPreset.defaultProductType || 'Personalizado'}</strong> → unidade base <strong>{unitLabel}</strong>.</div>
              <div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setStep(1)}>← Voltar</button><button disabled={saving} className={styles.buttonPrimary} onClick={() => void runSave(saveProductType)}>Guardar e continuar →</button></div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2 className={styles.title}>3. Unidades de produção</h2>
              <p className={styles.subtitle}>Cria as unidades reais do negócio. Um lote poderá agregar várias destas unidades.</p>
              <div className={styles.grid3}>
                <div className={styles.field}><label>Tipo de unidade</label><input className={styles.input} value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} /></div>
                <div className={styles.field}><label>Prefixo</label><input className={styles.input} value={unitPrefix} onChange={(e) => setUnitPrefix(e.target.value.toUpperCase())} /></div>
                <div className={styles.field}><label>Quantidade</label><input className={styles.input} type="number" min={1} max={500} value={unitCount} onChange={(e) => setUnitCount(Number(e.target.value))} /></div>
              </div>
              <button className={styles.buttonSecondary} style={{ margin: '14px 0' }} onClick={generateUnits}>Gerar {unitCount} {unitLabel.toLowerCase()}(s)</button>
              <div className={styles.unitList}>
                {units.map((unit, index) => (
                  <div key={unit.id} className={styles.unitRow}>
                    <input className={styles.input} style={{ maxWidth: 120 }} value={unit.code} onChange={(e) => setUnits((current) => current.map((item, i) => i === index ? { ...item, code: e.target.value } : item))} />
                    <input className={styles.input} value={unit.name} onChange={(e) => setUnits((current) => current.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
                  </div>
                ))}
                {!units.length ? <div className={styles.unitRow}>Carrega em “Gerar” para criar as unidades.</div> : null}
              </div>
              <div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setStep(2)}>← Voltar</button><button disabled={saving} className={styles.buttonPrimary} onClick={() => void runSave(saveUnits)}>Guardar e continuar →</button></div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h2 className={styles.title}>4. Campos do formulário</h2>
              <p className={styles.subtitle}>Define que dados são introduzidos em cada registo de produção.</p>
              <div className={styles.tableWrap}>
                <table className={styles.table}><thead><tr><th>Campo</th><th>Tipo</th><th>Unidade</th><th>Obrigatório</th><th>Público QR</th><th /></tr></thead><tbody>
                  {fields.map((field, index) => (
                    <tr key={`${field.key}-${index}`}>
                      <td><input className={styles.input} value={field.label} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, label: e.target.value, key: makeKey(e.target.value) } : item))} /></td>
                      <td><select className={styles.select} value={field.fieldType} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, fieldType: e.target.value as FieldType } : item))}>{['text','textarea','number','date','datetime','select','boolean','image'].map((type) => <option key={type} value={type}>{type}</option>)}</select></td>
                      <td><input className={styles.input} value={field.unit ?? ''} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, unit: e.target.value } : item))} /></td>
                      <td><input type="checkbox" checked={field.required} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, required: e.target.checked } : item))} /></td>
                      <td><input type="checkbox" checked={field.public} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, public: e.target.checked } : item))} /></td>
                      <td><button className={styles.buttonDanger} onClick={() => setFields((current) => current.filter((_, i) => i !== index))}>×</button></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
              <button className={styles.buttonSecondary} style={{ marginTop: 12 }} onClick={addField}>+ Adicionar campo</button>
              <div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setStep(3)}>← Voltar</button><button disabled={saving} className={styles.buttonPrimary} onClick={() => void runSave(saveFields)}>Guardar e continuar →</button></div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h2 className={styles.title}>5. Etapas de produção</h2>
              <p className={styles.subtitle}>Estas etapas formam a linha temporal de rastreabilidade do produto.</p>
              {stages.map((stage, index) => (
                <div key={index} className={styles.stageRow}><span className={styles.number}>{index + 1}</span><input className={styles.input} value={stage} onChange={(e) => setStages((current) => current.map((item, i) => i === index ? e.target.value : item))} /><button className={styles.buttonDanger} onClick={() => setStages((current) => current.filter((_, i) => i !== index))}>×</button></div>
              ))}
              <button className={styles.buttonSecondary} onClick={() => setStages((current) => [...current, 'Nova etapa'])}>+ Adicionar etapa</button>
              <div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setStep(4)}>← Voltar</button><button disabled={saving} className={styles.buttonPrimary} onClick={() => void runSave(saveStages)}>Guardar e continuar →</button></div>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <h2 className={styles.title}>6. Criar primeiro produto e lote</h2>
              <p className={styles.subtitle}>O lote pode ter origem numa ou em várias unidades de produção.</p>
              <div className={styles.grid2}>
                <div className={styles.field}><label>Nome do produto *</label><input className={styles.input} value={productName} onChange={(e) => setProductName(e.target.value)} /></div>
                <div className={styles.field}><label>SKU</label><input className={styles.input} value={sku} onChange={(e) => setSku(e.target.value)} /></div>
                <div className={styles.field}><label>Descrição</label><textarea className={styles.textarea} value={productDescription} onChange={(e) => setProductDescription(e.target.value)} /></div>
                <div className={styles.field}><label>Imagem</label><input className={styles.input} type="file" accept="image/*" onChange={(e) => setProductImageFile(e.target.files?.[0] ?? null)} />{productImageUrl ? <img className={styles.thumb} src={productImageUrl} alt="Produto" /> : null}</div>
                <div className={styles.field}><label>Código do lote *</label><input className={styles.input} value={batchCode} onChange={(e) => setBatchCode(e.target.value)} /></div>
                <div className={styles.field}><label>Data de início</label><input className={styles.input} type="date" value={batchStartDate} onChange={(e) => setBatchStartDate(e.target.value)} /></div>
              </div>
              <h3 style={{ marginTop: 20 }}>Unidades de origem</h3>
              <div className={styles.unitList}>
                {units.map((unit) => <label key={unit.id} className={styles.unitRow}><input type="checkbox" checked={selectedUnitIds.includes(unit.id)} onChange={(e) => setSelectedUnitIds((current) => e.target.checked ? [...new Set([...current, unit.id])] : current.filter((id) => id !== unit.id))} /><strong>{unit.code}</strong><span>{unit.name}</span></label>)}
              </div>
              <div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setStep(5)}>← Voltar</button><button disabled={saving} className={styles.buttonPrimary} onClick={() => void runSave(saveProductAndBatch)}>Criar produto e lote →</button></div>
            </>
          ) : null}

          {step === 7 ? (
            <>
              <h2 className={styles.title}>7. Primeiro registo de produção</h2>
              <p className={styles.subtitle}>Este é o mesmo formulário que ficará disponível em Produção → Inserir dados.</p>
              <div className={styles.field} style={{ marginBottom: 14 }}><label>Etapa</label><select className={styles.select} value={recordStageId} onChange={(e) => setRecordStageId(e.target.value)}>{store.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></div>
              <div className={styles.grid2}>
                {fields.map((field) => (
                  <div key={field.key} className={styles.field}>
                    <label>{field.label}{field.required ? ' *' : ''}{field.unit ? ` (${field.unit})` : ''}</label>
                    {field.fieldType === 'textarea' ? <textarea className={styles.textarea} value={recordValues[field.key] ?? ''} onChange={(e) => setRecordValues((value) => ({ ...value, [field.key]: e.target.value }))} /> : null}
                    {field.fieldType === 'boolean' ? <label className={styles.check}><input type="checkbox" checked={Boolean(recordValues[field.key])} onChange={(e) => setRecordValues((value) => ({ ...value, [field.key]: e.target.checked }))} /> Sim</label> : null}
                    {field.fieldType === 'image' ? <input className={styles.input} type="file" accept="image/*" onChange={(e) => setRecordFiles((value) => ({ ...value, [field.key]: e.target.files?.[0] ?? null }))} /> : null}
                    {field.fieldType === 'select' ? <select className={styles.select} value={recordValues[field.key] ?? ''} onChange={(e) => setRecordValues((value) => ({ ...value, [field.key]: e.target.value }))}><option value="">Selecionar</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select> : null}
                    {!['textarea','boolean','image','select'].includes(field.fieldType) ? <input className={styles.input} type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : field.fieldType === 'datetime' ? 'datetime-local' : 'text'} value={recordValues[field.key] ?? ''} onChange={(e) => setRecordValues((value) => ({ ...value, [field.key]: e.target.value }))} /> : null}
                  </div>
                ))}
              </div>
              <div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setStep(6)}>← Voltar</button><button disabled={saving} className={styles.buttonPrimary} onClick={() => void runSave(saveFirstRecord)}>Guardar primeiro registo →</button></div>
            </>
          ) : null}

          {step === 8 ? (
            <>
              <div className={styles.success}><h2 className={styles.title}>Configuração concluída ✓</h2><p>O teste local já tem empresa, produto, unidades, campos, etapas, lote e um primeiro registo.</p></div>
              <div className={styles.summary} style={{ marginTop: 18 }}>
                <div className={styles.summaryCard}><strong>Negócio</strong><div><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: accentColor, marginRight: 6 }} />{companyName}</div></div>
                <div className={styles.summaryCard}><strong>Produto</strong><div>{productName}</div></div>
                <div className={styles.summaryCard}><strong>Unidades</strong><div>{units.length} {unitLabel.toLowerCase()}(s)</div></div>
                <div className={styles.summaryCard}><strong>Lote</strong><div>{batchCode}</div></div>
              </div>
              <div className={styles.notice} style={{ marginTop: 18 }}>A partir de agora: <strong>Produção → Inserir dados</strong> (`/dashboard/producao/inserir-dados`).</div>
              <div className={styles.actions}><button className={styles.buttonSecondary} onClick={() => setStep(7)}>← Rever</button><div style={{ display: 'flex', gap: 8 }}><button className={styles.buttonSecondary} onClick={() => router.push('/dashboard/onboarding?new=1')}>+ Adicionar outro negócio</button><button className={styles.buttonPrimary} onClick={() => router.push('/dashboard')}>Ir para o Dashboard →</button></div></div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
