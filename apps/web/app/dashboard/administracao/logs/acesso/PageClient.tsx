'use client';

import { useState } from 'react';

export default function PageClient() {
  const [logs] = useState([
    { id: '1', data: '2024-01-15 10:30', utilizador: 'admin@email.com', ip: '192.168.1.1', status: '✅ Sucesso' },
    { id: '2', data: '2024-01-15 11:00', utilizador: 'user@email.com', ip: '192.168.1.2', status: '✅ Sucesso' },
    { id: '3', data: '2024-01-15 12:15', utilizador: 'unknown@email.com', ip: '10.0.0.1', status: '❌ Falha' },
  ]);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>🔐 Logs de Acesso</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Data</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Utilizador</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>IP</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Status</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', color: '#6b7280' }}>{l.data}</td>
                <td style={{ padding: '12px' }}>{l.utilizador}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{l.ip}</td>
                <td style={{ padding: '12px' }}>{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
