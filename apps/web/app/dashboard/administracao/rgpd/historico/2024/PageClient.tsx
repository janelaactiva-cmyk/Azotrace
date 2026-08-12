'use client';

export default function PageClient() {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
        📅 Histórico 2024
      </h2>
      <div style={{
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
      }}>
        <span style={{ fontSize: '48px', marginBottom: '16px' }}>📅</span>
        <p style={{ fontSize: '16px', fontWeight: '500' }}>Histórico 2024</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>
          Conteúdo em desenvolvimento. Brevemente disponível.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '16px',
            padding: '8px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          🔄 Recarregar
        </button>
      </div>
    </div>
  );
}
