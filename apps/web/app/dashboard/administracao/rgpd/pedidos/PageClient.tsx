'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PageClient() {
  const router = useRouter();
  const [pedidos] = useState([
    { id: '1', email: 'user1@email.com', tipo: 'Acesso', data: '2024-01-15', status: '✅ Concluído' },
    { id: '2', email: 'user2@email.com', tipo: 'Eliminação', data: '2024-01-20', status: '⏳ Em processamento' },
  ]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>📋 Pedidos dos Titulares</h2>
        <button onClick={() => router.push('/dashboard/administracao/rgpd/pedidos/novo')} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>➕ Novo Pedido</button>
      </div>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Email</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Tipo</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Data</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Status</th></tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{p.email}</td>
                <td style={{ padding: '12px' }}>{p.tipo}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{p.data}</td>
                <td style={{ padding: '12px' }}>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
