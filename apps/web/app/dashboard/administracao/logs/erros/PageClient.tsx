'use client';

import { useState } from 'react';

export default function PageClient() {
  const [logs] = useState([
    { id: '1', data: '2024-01-15 09:00', erro: 'Falha na autenticação', detalhe: 'Credenciais inválidas', status: '⚠️ Crítico' },
    { id: '2', data: '2024-01-15 13:20', erro: 'Timeout na API', detalhe: 'Conexão com Supabase falhou', status: '⚠️ Médio' },
  ]);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>❌ Logs de Erros</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Data</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Erro</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Detalhe</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Status</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', color: '#6b7280' }}>{l.data}</td>
                <td style={{ padding: '12px' }}>{l.erro}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{l.detalhe}</td>
                <td style={{ padding: '12px' }}>{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
