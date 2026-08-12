'use client';

import { useState } from 'react';

export default function PageClient() {
  const [subcontratantes, setSubcontratantes] = useState([
    { id: '1', nome: 'Cloud Provider S.A.', servico: 'Armazenamento', data: '2024-01-01' },
    { id: '2', nome: 'Email Service Lda.', servico: 'Email', data: '2024-03-15' },
  ]);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>🤝 Subcontratantes</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Nome</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Serviço</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Data</th></tr>
          </thead>
          <tbody>
            {subcontratantes.map((s) => (
              <tr key={s.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{s.nome}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{s.servico}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{s.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
