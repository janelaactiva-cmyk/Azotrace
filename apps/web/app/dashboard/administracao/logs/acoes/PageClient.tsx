'use client';

import { useState } from 'react';

export default function PageClient() {
  const [logs] = useState([
    { id: '1', data: '2024-01-15 10:35', utilizador: 'admin@email.com', acao: 'Criou Negócio', entidade: 'Negócio #123' },
    { id: '2', data: '2024-01-15 11:30', utilizador: 'user@email.com', acao: 'Editou Perfil', entidade: 'Utilizador #45' },
    { id: '3', data: '2024-01-15 14:00', utilizador: 'admin@email.com', acao: 'Eliminou Categoria', entidade: 'Categoria #7' },
  ]);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>📝 Logs de Ações</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Data</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Utilizador</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ação</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Entidade</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', color: '#6b7280' }}>{l.data}</td>
                <td style={{ padding: '12px' }}>{l.utilizador}</td>
                <td style={{ padding: '12px' }}>{l.acao}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{l.entidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
