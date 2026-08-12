'use client';

import { useState } from 'react';

export default function PageClient() {
  const [qrcodes] = useState([
    { id: '1', nome: 'Produto A', codigo: 'QR-001', data: '2024-01-15' },
    { id: '2', nome: 'Produto B', codigo: 'QR-002', data: '2024-01-20' },
  ]);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>📱 QR Codes</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Nome</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Código</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Data</th></tr>
          </thead>
          <tbody>
            {qrcodes.map((q) => (
              <tr key={q.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{q.nome}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{q.codigo}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{q.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
