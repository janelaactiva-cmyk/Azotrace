'use client';

import { useState } from 'react';

export default function PageClient() {
  const [atividades] = useState([
    { id: '1', data: '2024-01-15 10:30', utilizador: 'admin@email.com', acao: 'Login', detalhe: 'IP 192.168.1.1' },
    { id: '2', data: '2024-01-15 11:00', utilizador: 'user@email.com', acao: 'Exportação', detalhe: 'Dados de negócios' },
    { id: '3', data: '2024-01-15 12:15', utilizador: 'admin@email.com', acao: 'Eliminação', detalhe: 'Utilizador user2@email.com' },
  ]);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>📝 Registo de Atividades</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Data</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Utilizador</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ação</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Detalhe</th></tr>
          </thead>
          <tbody>
            {atividades.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', color: '#6b7280' }}>{a.data}</td>
                <td style={{ padding: '12px' }}>{a.utilizador}</td>
                <td style={{ padding: '12px' }}>{a.acao}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{a.detalhe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
