'use client';

import Link from 'next/link';

export default function CancelPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '48px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏸️</div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Pagamento Cancelado
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          O pagamento foi cancelado. Podes tentar novamente quando estiveres pronto.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/checkout"
            style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: '#2563eb',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Tentar Novamente
          </Link>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: '#f3f4f6',
              color: '#374151',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '500',
              border: '1px solid #d1d5db'
            }}
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}
