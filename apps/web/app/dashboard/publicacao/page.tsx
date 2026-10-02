'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { EmptyWorkspace, TraceabilityShell } from '../_components/TraceabilityShell';
import styles from '../_components/traceability.module.css';
import {
  buildPublicationSnapshot,
  publicTraceUrl,
} from '../_lib/publication';
import { formatDate, productName } from '../_lib/producer-utils';
import { useProducerWorkspace } from '../_lib/use-producer-workspace';
import { makeLocalId, type LocalPublicSiteConfig } from '../onboarding/_lib/local-store';
import { getRemoteWebsiteStatus, savePublicTraceSnapshot } from '../onboarding/_lib/supabase-store';

type WebsiteStatus = 'loading' | 'published' | 'draft' | 'missing';
type LabelFormat = 'product' | 'small' | 'box' | 'a4';

const STEPS = ['Dados públicos', 'Website', 'Publicar', 'QR e impressão'];

const CORE_OPTIONS: Array<{
  key: keyof Pick<
    LocalPublicSiteConfig,
    | 'showBusinessName'
    | 'showBusinessLocation'
    | 'showProductName'
    | 'showProductDescription'
    | 'showBatchCode'
    | 'showBatchStartDate'
    | 'showOriginUnits'
    | 'showTimeline'
    | 'showQuality'
  >;
  label: string;
  help: string;
}> = [
  { key: 'showBusinessName', label: 'Nome do produtor', help: 'Nome do negócio/empresa.' },
  { key: 'showBusinessLocation', label: 'Localização', help: 'Origem geográfica do produtor.' },
  { key: 'showProductName', label: 'Nome do produto', help: 'Produto associado ao lote.' },
  { key: 'showProductDescription', label: 'Descrição do produto', help: 'Descrição comercial do produto.' },
  { key: 'showBatchCode', label: 'Código do lote', help: 'Identificador de rastreabilidade.' },
  { key: 'showBatchStartDate', label: 'Data de início do lote', help: 'Data de criação/início.' },
  { key: 'showOriginUnits', label: 'Unidades de origem', help: 'Estufas, colmeias, pipas, cubas, etc.' },
  { key: 'showTimeline', label: 'Histórico de produção', help: 'Etapas e registos públicos.' },
  { key: 'showQuality', label: 'Controlo de qualidade', help: 'Resultados de qualidade associados.' },
];

export default function PublicationPage() {
  const { store, persist, persistAsync, loading, syncing, syncError } = useProducerWorkspace();
  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [batchId, setBatchId] = useState('');
  const [format, setFormat] = useState<LabelFormat>('product');
  const [websiteStatus, setWebsiteStatus] = useState<WebsiteStatus>('loading');
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!store?.batches.length) return;

    const queryBatch = new URLSearchParams(window.location.search).get('batch');
    const initial = queryBatch && store.batches.some((item) => item.id === queryBatch)
      ? queryBatch
      : store.batches[0]!.id;

    setBatchId((current) => current || initial);
    setStep(0);
    setMaxVisitedStep(0);
    setMessage('');
    setError('');
  }, [store?.business.id, store?.batches.length]);

  const batch = useMemo(
    () => store?.batches.find((item) => item.id === batchId) ?? store?.batches[0],
    [store, batchId],
  );

  const recordsCount = useMemo(
    () => (store && batch ? store.records.filter((record) => record.batchId === batch.id).length : 0),
    [store, batch],
  );

  const qualityCount = useMemo(
    () => (store && batch ? store.qualityRecords.filter((record) => record.batchId === batch.id).length : 0),
    [store, batch],
  );

  const refreshWebsiteStatus = async () => {
    if (!store) return;
    try {
      setWebsiteStatus('loading');
      setWebsiteStatus(await getRemoteWebsiteStatus(store.business.id));
    } catch (cause) {
      console.error(cause);
      setWebsiteStatus('missing');
      setError(cause instanceof Error ? cause.message : 'Não foi possível verificar o Website publicado.');
    }
  };

  useEffect(() => {
    if (!store) return;
    void refreshWebsiteStatus();

    const onFocus = () => void refreshWebsiteStatus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.business.id]);

  if (loading) {
    return (
      <TraceabilityShell eyebrow="Rastreabilidade · Publicação" title="Publicação e QR">
        <div className={styles.cardPad}>A carregar…</div>
      </TraceabilityShell>
    );
  }

  if (!store?.completed) {
    return (
      <TraceabilityShell eyebrow="Rastreabilidade · Publicação" title="Publicação e QR">
        <EmptyWorkspace />
      </TraceabilityShell>
    );
  }

  if (!batch) {
    return (
      <TraceabilityShell eyebrow="Rastreabilidade · Publicação" title="Publicação e QR">
        <section className={styles.empty}>
          <strong>Ainda não existem lotes</strong>
          <p>Cria um lote e adiciona dados de produção antes de publicar.</p>
          <Link className={styles.primary} href="/dashboard/lotes">Ir para Lotes</Link>
        </section>
      </TraceabilityShell>
    );
  }

  const config = store.publicSite;
  const publicOrigin = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : '';
  const publicUrl = publicOrigin
    ? publicTraceUrl(publicOrigin, store.business.id, batch.id)
    : '';
  const qrPng = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(publicUrl)}`
    : '';
  const qrSvg = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&format=svg&data=${encodeURIComponent(publicUrl)}`
    : '';

  const hasData = recordsCount > 0;
  const pagePublished = store.publications.some((item) => item.batchId === batch.id && item.status === 'published');
  const qrSaved = store.qrCodes.some((item) => item.batchId === batch.id && item.format === format);

  function clearMessages() {
    setError('');
    setMessage('');
  }

  function updateConfig(patch: Partial<LocalPublicSiteConfig>) {
    clearMessages();
    persist({ ...store, publicSite: { ...store.publicSite, ...patch } });
  }

  function toggleField(key: string) {
    const selected = config.fieldKeys.includes(key);
    updateConfig({
      fieldKeys: selected
        ? config.fieldKeys.filter((item) => item !== key)
        : [...config.fieldKeys, key],
    });
  }

  function validateCurrentStep() {
    clearMessages();

    if (step === 0) {
      if (!batchId) {
        setError('Seleciona um lote para continuar.');
        return false;
      }
      if (!hasData) {
        setError('Este lote ainda não tem registos de produção. Adiciona pelo menos um registo antes de publicar.');
        return false;
      }
      return true;
    }

    if (step === 1) {
      if (websiteStatus !== 'published') {
        setError('Publica primeiro o Website deste negócio. Depois volta a esta página e continua.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!pagePublished) {
        setError('Publica primeiro a página deste lote para gerar o QR Code.');
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
    clearMessages();
    setStep((current) => Math.max(0, current - 1));
  }

  async function publishPage() {
    setPublishing(true);
    clearMessages();

    try {
      if (!hasData) {
        throw new Error('Este lote ainda não tem registos de produção.');
      }
      if (websiteStatus !== 'published') {
        throw new Error('Publica primeiro o Website deste negócio.');
      }

      const snapshot = buildPublicationSnapshot(store, batch.id);
      await savePublicTraceSnapshot({
        businessId: store.business.id,
        batchId: batch.id,
        snapshot,
      });

      const now = new Date().toISOString();
      const publications = [
        { batchId: batch.id, status: 'published' as const, publishedAt: now, updatedAt: now },
        ...store.publications.filter((item) => item.batchId !== batch.id),
      ];

      const defaultQrExists = store.qrCodes.some(
        (item) => item.batchId === batch.id && item.format === 'product',
      );

      const qrCodes = defaultQrExists
        ? store.qrCodes
        : [
            {
              id: makeLocalId('qr'),
              productId: batch.productId,
              batchId: batch.id,
              format: 'product' as const,
              publicUrl,
              createdAt: now,
            },
            ...store.qrCodes,
          ];

      await persistAsync({ ...store, publications, qrCodes });
      setMessage('Página do lote publicada no Supabase. O QR Code já pode ser gerado e impresso.');
      setMaxVisitedStep(3);
      setStep(3);
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof Error ? cause.message : 'Não foi possível publicar a página do lote.');
    } finally {
      setPublishing(false);
    }
  }

  function saveQr() {
    clearMessages();

    if (!pagePublished) {
      setError('Publica primeiro a página deste lote.');
      return;
    }

    const existing = store.qrCodes.find(
      (item) => item.batchId === batch.id && item.format === format,
    );

    if (existing) {
      setMessage('Este QR já está guardado para o lote e formato selecionados.');
      return;
    }

    persist({
      ...store,
      qrCodes: [
        {
          id: makeLocalId('qr'),
          productId: batch.productId,
          batchId: batch.id,
          format,
          publicUrl,
          createdAt: new Date().toISOString(),
        },
        ...store.qrCodes,
      ],
    });

    setMessage('QR Code guardado. Já podes descarregar ou imprimir a etiqueta.');
  }

  function printLabel() {
    if (!pagePublished || !qrPng) {
      setError('Publica primeiro a página deste lote.');
      return;
    }

    const copies = format === 'a4' ? 12 : 1;
    const labelWidth = format === 'small' ? '42mm' : format === 'box' ? '85mm' : '62mm';
    const labels = Array.from({ length: copies }, () => `
      <div class="label">
        <img src="${qrPng}" alt="QR Code" />
        <strong>${productName(store, batch.productId)}</strong>
        <span>Lote ${batch.code}</span>
        <small>${store.business.name}</small>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setError('O navegador bloqueou a janela de impressão. Permite pop-ups e tenta novamente.');
      return;
    }

    printWindow.document.write(`<!doctype html>
      <html lang="pt">
        <head>
          <meta charset="utf-8" />
          <title>Etiquetas ${batch.code}</title>
          <style>
            *{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:12mm;color:#17232d}
            .sheet{display:flex;flex-wrap:wrap;gap:8mm;align-items:flex-start}
            .label{width:${labelWidth};border:1px solid #d6dfe5;border-radius:8px;padding:5mm;text-align:center;break-inside:avoid}
            img{display:block;width:34mm;height:34mm;object-fit:contain;margin:0 auto 3mm}
            strong,span,small{display:block}strong{font-size:12pt}span{margin-top:1.5mm;font-size:10pt}small{margin-top:1mm;color:#657580;font-size:8pt}
            @media print{body{padding:6mm}.label{box-shadow:none}}
          </style>
        </head>
        <body><div class="sheet">${labels}</div><script>window.onload=()=>{window.print();}</script></body>
      </html>`);
    printWindow.document.close();
  }

  return (
    <TraceabilityShell
      eyebrow="Rastreabilidade · Publicação"
      title="Publicação e QR"
      description="Segue os quatro passos para preparar a página pública e imprimir o QR Code do lote."
    >
      <section className={styles.card}>
        <div className={styles.tabs} aria-label="Etapas da publicação e QR">
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
                  clearMessages();
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
          {syncError ? <div className={styles.error}>Sincronização: {syncError}</div> : null}

          {step === 0 ? (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: error || message ? 18 : 0 }}>
                <div>
                  <h2>Dados públicos</h2>
                  <p>Escolhe o lote e apenas os dados que o consumidor poderá consultar através do QR Code.</p>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label>Lote *</label>
                  <select
                    className={styles.select}
                    value={batch.id}
                    onChange={(event) => {
                      setBatchId(event.target.value);
                      clearMessages();
                    }}
                  >
                    {store.batches.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.code} · {productName(store, item.productId)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Produto</label>
                  <input className={styles.input} value={productName(store, batch.productId)} readOnly />
                </div>
              </div>

              <div className={styles.grid3} style={{ marginTop: 14 }}>
                <div className={styles.stat}>
                  <span>Registos de produção</span>
                  <strong>{recordsCount}</strong>
                  <small>{hasData ? 'Dados disponíveis para publicação' : 'Adiciona dados antes de continuar'}</small>
                </div>
                <div className={styles.stat}>
                  <span>Unidades de origem</span>
                  <strong>{batch.unitIds.length}</strong>
                  <small>{store.productType?.unitLabel ?? 'Unidades'} associadas ao lote</small>
                </div>
                <div className={styles.stat}>
                  <span>Qualidade</span>
                  <strong>{qualityCount}</strong>
                  <small>Controlo(s) associado(s)</small>
                </div>
              </div>

              <div className={styles.sectionTitle}>
                <div>
                  <h2>Texto da página pública</h2>
                  <p>Podes adaptar o título e a introdução apresentados ao consumidor.</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Título</label>
                  <input
                    className={styles.input}
                    value={config.headline}
                    onChange={(event) => updateConfig({ headline: event.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>Introdução</label>
                  <input
                    className={styles.input}
                    value={config.intro}
                    onChange={(event) => updateConfig({ intro: event.target.value })}
                  />
                </div>
              </div>

              <div className={styles.sectionTitle}>
                <div>
                  <h2>Informação visível</h2>
                  <p>Os dados desmarcados continuam internos e não aparecem na página pública.</p>
                </div>
              </div>

              <div className={styles.grid2}>
                {CORE_OPTIONS.map((option) => (
                  <label className={styles.checkRow} key={option.key} style={{ alignItems: 'flex-start', padding: '10px 0' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(config[option.key])}
                      onChange={(event) => updateConfig({ [option.key]: event.target.checked } as Partial<LocalPublicSiteConfig>)}
                    />
                    <span>
                      <strong style={{ display: 'block', color: '#24313c' }}>{option.label}</strong>
                      <small className={styles.muted}>{option.help}</small>
                    </span>
                  </label>
                ))}
              </div>

              <div className={styles.sectionTitle}>
                <div>
                  <h2>Campos de produção</h2>
                  <p>Escolhe quais dos campos configurados no negócio podem ser mostrados ao consumidor.</p>
                </div>
                <span className={styles.badge}>{config.fieldKeys.length} selecionado(s)</span>
              </div>

              {store.fields.length ? (
                <div className={styles.grid2}>
                  {store.fields.map((field) => (
                    <label className={styles.checkRow} key={field.key} style={{ alignItems: 'flex-start', padding: '10px 0' }}>
                      <input
                        type="checkbox"
                        checked={config.fieldKeys.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                      />
                      <span>
                        <strong style={{ display: 'block', color: '#24313c' }}>{field.label}</strong>
                        <small className={styles.muted}>{field.unit || field.fieldType}</small>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className={styles.notice}>Este negócio ainda não tem campos de produção configurados.</div>
              )}
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: error || message ? 18 : 0 }}>
                <div>
                  <h2>Website</h2>
                  <p>Escolhe o template, conteúdo, imagens e cores que o consumidor verá ao abrir o QR Code.</p>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.stat}>
                  <span>Estado do Website</span>
                  <strong style={{ fontSize: 17 }}>
                    {websiteStatus === 'published'
                      ? 'Publicado'
                      : websiteStatus === 'draft'
                        ? 'Rascunho'
                        : websiteStatus === 'loading'
                          ? 'A verificar…'
                          : 'Não configurado'}
                  </strong>
                  <small>O Website é partilhado por todos os lotes deste negócio.</small>
                </div>
                <div className={styles.stat}>
                  <span>Negócio</span>
                  <strong style={{ fontSize: 17 }}>{store.business.name}</strong>
                  <small>{store.business.location || 'Sem localização definida'}</small>
                </div>
              </div>

              {websiteStatus !== 'published' ? (
                <div className={styles.notice} style={{ marginTop: 14 }}>
                  O Website ainda não está publicado. Abre o editor, escolhe um dos templates e publica-o antes de continuar.
                </div>
              ) : (
                <div className={styles.success} style={{ marginTop: 14 }}>
                  Website publicado. Podes continuar para publicar os dados deste lote.
                </div>
              )}

              <div className={styles.actions} style={{ marginTop: 18 }}>
                <Link className={styles.primary} href="/dashboard/administracao/negocios/template-website">
                  Editar Website e templates
                </Link>
                <button className={styles.secondary} type="button" onClick={refreshWebsiteStatus}>
                  Atualizar estado
                </button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: error || message ? 18 : 0 }}>
                <div>
                  <h2>Publicar página do lote</h2>
                  <p>Confirma os dados antes de gerar o endereço público usado pelo QR Code.</p>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <tbody>
                    <tr><td><strong>Negócio</strong></td><td>{store.business.name}</td></tr>
                    <tr><td><strong>Produto</strong></td><td>{productName(store, batch.productId)}</td></tr>
                    <tr><td><strong>Lote</strong></td><td>{batch.code}</td></tr>
                    <tr><td><strong>Data de início</strong></td><td>{formatDate(batch.startDate)}</td></tr>
                    <tr><td><strong>Registos</strong></td><td>{recordsCount}</td></tr>
                    <tr><td><strong>Campos públicos</strong></td><td>{config.fieldKeys.length}</td></tr>
                    <tr><td><strong>Website</strong></td><td>{websiteStatus === 'published' ? 'Publicado' : 'Por publicar'}</td></tr>
                    <tr><td><strong>Página do lote</strong></td><td>{pagePublished ? 'Publicada' : 'Ainda não publicada'}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className={styles.notice} style={{ marginTop: 14 }}>
                A publicação fica guardada no Supabase. O mesmo QR pode ser aberto noutro dispositivo e mostra apenas os dados públicos escolhidos para este lote.
              </div>

              <div className={styles.actions} style={{ marginTop: 18 }}>
                <button className={styles.primary} type="button" onClick={publishPage} disabled={publishing}>
                  {publishing ? 'A publicar…' : pagePublished ? 'Atualizar publicação e gerar QR' : 'Publicar e gerar QR'}
                </button>
                {pagePublished ? (
                  <a className={styles.secondary} href={publicUrl} target="_blank" rel="noreferrer">
                    Ver página pública
                  </a>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className={styles.sectionTitle} style={{ marginTop: error || message ? 18 : 0 }}>
                <div>
                  <h2>QR e impressão</h2>
                  <p>Este QR Code abre diretamente a página pública do lote selecionado.</p>
                </div>
              </div>

              {!pagePublished ? (
                <div className={styles.error}>A página do lote ainda não está publicada.</div>
              ) : (
                <div className={styles.grid2}>
                  <div>
                    <div className={styles.qrBox}>
                      <img src={qrPng} alt={`QR Code do lote ${batch.code}`} />
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 12 }}>
                      <strong>{productName(store, batch.productId)}</strong>
                      <div className={styles.muted}>Lote {batch.code}</div>
                    </div>
                  </div>

                  <div>
                    <div className={styles.field}>
                      <label>Formato da etiqueta</label>
                      <select
                        className={styles.select}
                        value={format}
                        onChange={(event) => {
                          setFormat(event.target.value as LabelFormat);
                          clearMessages();
                        }}
                      >
                        <option value="product">Etiqueta produto</option>
                        <option value="small">Etiqueta pequena</option>
                        <option value="box">Etiqueta caixa</option>
                        <option value="a4">A4 com vários QR Codes</option>
                      </select>
                    </div>

                    <div className={styles.sectionTitle}>
                      <div>
                        <h2>Destino do QR</h2>
                        <p>Se atualizares a página mais tarde, este endereço mantém-se.</p>
                      </div>
                    </div>

                    <div className={styles.notice} style={{ overflowWrap: 'anywhere' }}>{publicUrl}</div>

                    <div className={styles.actions} style={{ marginTop: 16 }}>
                      <a className={styles.secondary} href={qrPng} target="_blank" rel="noreferrer">Abrir PNG</a>
                      <a className={styles.secondary} href={qrSvg} target="_blank" rel="noreferrer">Abrir SVG</a>
                      <button className={styles.secondary} type="button" onClick={printLabel}>Imprimir etiqueta</button>
                      <button className={styles.primary} type="button" onClick={saveQr}>
                        {qrSaved ? 'QR guardado' : 'Guardar QR'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
              {step < 2 ? (
                <button className={styles.primary} type="button" onClick={nextStep}>
                  Seguinte →
                </button>
              ) : null}

              {step === 2 && pagePublished ? (
                <button
                  className={styles.primary}
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMaxVisitedStep(3);
                    setStep(3);
                  }}
                >
                  Ver QR Code →
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </TraceabilityShell>
  );
}
