'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type PublicTraceSnapshot = {
  businessId?: string;
  batchId?: string;
  businessName?: string;
  businessColor?: string;
  productName?: string;
  batchCode?: string;
  unitName?: string;
  unitLabel?: string;
  publishedAt?: string;
  fields?: Array<{ label?: string; value?: unknown; public?: boolean }>;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

function readSnapshot(businessId: string, batchId: string): PublicTraceSnapshot | null {
  if (typeof window === 'undefined') return null;

  const directKeys = [
    `azotrace:trace:${businessId}:${batchId}`,
    `azotrace:public-trace:${businessId}:${batchId}`,
    `azotrace:publication:${businessId}:${batchId}`,
  ];

  for (const key of directKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as PublicTraceSnapshot;
    } catch {}
  }

  // Compatibilidade com versões anteriores que guardavam publicações
  // dentro de objetos maiores no localStorage.
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw || (!raw.includes(batchId) && !raw.includes(businessId))) continue;

      const parsed = JSON.parse(raw);

      const collections = [
        parsed?.publications,
        parsed?.publicTracePages,
        parsed?.tracePages,
        parsed?.publishedBatches,
      ];

      for (const collection of collections) {
        if (!Array.isArray(collection)) continue;

        const found = collection.find((item: any) =>
          (item?.batchId === batchId || item?.batch_id === batchId || item?.id === batchId) &&
          (!item?.businessId || item?.businessId === businessId || item?.business_id === businessId)
        );

        if (found) return found as PublicTraceSnapshot;
      }
    } catch {}
  }

  return null;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function TracePage() {
  const params = useParams<{ businessId: string; batchId: string }>();
  const businessId = params?.businessId ?? '';
  const batchId = params?.batchId ?? '';

  const [mounted, setMounted] = useState(false);
  const [snapshot, setSnapshot] = useState<PublicTraceSnapshot | null>(null);

  useEffect(() => {
    setMounted(true);
    setSnapshot(readSnapshot(businessId, batchId));
  }, [businessId, batchId]);

  const color = snapshot?.businessColor || '#2f855a';

  const rows = useMemo(() => {
    if (!snapshot) return [];

    if (Array.isArray(snapshot.fields) && snapshot.fields.length) {
      return snapshot.fields
        .filter((field) => field?.public !== false)
        .map((field) => ({
          label: field.label || 'Informação',
          value: formatValue(field.value),
        }));
    }

    if (snapshot.data && typeof snapshot.data === 'object') {
      return Object.entries(snapshot.data).map(([label, value]) => ({
        label,
        value: formatValue(value),
      }));
    }

    return [];
  }, [snapshot]);

  if (!mounted) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Arial, sans-serif', padding: 24 }}>
        <p style={{ fontSize: 14 }}>A carregar rastreabilidade…</p>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', fontFamily: 'Arial, sans-serif', padding: 24 }}>
        <section style={{ width: 'min(100%, 620px)', background: '#fff', borderRadius: 16, padding: 28, borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb' }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 24 }}>Página ainda não publicada neste browser</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
            Esta versão está em modo local. Publique primeiro o lote em “Publicação e QR” neste mesmo browser.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Arial, sans-serif', color: '#0f172a' }}>
      <div style={{ height: 6, background: color }} />

      <div style={{ width: 'min(100% - 32px, 920px)', margin: '0 auto', padding: '32px 0 56px' }}>
        <header style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color }}>
            Rastreabilidade Azotrace
          </p>
          <h1 style={{ margin: 0, fontSize: 32 }}>
            {snapshot.productName || snapshot.businessName || 'Produto'}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: '#64748b' }}>
            Lote: {snapshot.batchCode || batchId}
          </p>
        </header>

        <section style={{ background: '#fff', borderRadius: 16, borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb', padding: 24, marginBottom: 18 }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 20 }}>Origem</h2>

          <div style={{ display: 'grid', gap: 14 }}>
            {snapshot.businessName ? (
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Empresa / negócio</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{snapshot.businessName}</div>
              </div>
            ) : null}

            {snapshot.unitName ? (
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  {snapshot.unitLabel || 'Unidade de produção'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{snapshot.unitName}</div>
              </div>
            ) : null}
          </div>
        </section>

        {rows.length ? (
          <section style={{ background: '#fff', borderRadius: 16, borderWidth: 1, borderStyle: 'solid', borderColor: '#e5e7eb', padding: 24 }}>
            <h2 style={{ margin: '0 0 18px', fontSize: 20 }}>Informação do produto</h2>
            <div style={{ display: 'grid', gap: 0 }}>
              {rows.map((row, index) => (
                <div key={`${row.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 240px) 1fr', gap: 16, padding: '12px 0', borderBottom: index === rows.length - 1 ? 'none' : '1px solid #eef2f7' }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{row.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.value}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <footer style={{ marginTop: 24, fontSize: 12, color: '#94a3b8' }}>
          {snapshot.publishedAt ? `Publicado em ${snapshot.publishedAt}` : 'Informação publicada pelo produtor.'}
        </footer>
      </div>
    </main>
  );
}
