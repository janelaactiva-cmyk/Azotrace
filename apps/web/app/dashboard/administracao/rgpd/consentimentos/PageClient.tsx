'use client';

import { useState } from 'react';

export default function PageClient() {
  const [consentimentos, setConsentimentos] = useState([
    { id: '1', email: 'user1@email.com', data: '2024-01-15', status: '✅ Aceite' },
    { id: '2', email: 'user2@email.com', data: '2024-01-20', status: '✅ Aceite' },
    { id: '3', email: 'user3@email.com', data: '2024-02-01', status: '❌ Rejeitado' },
  ]);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>✅ Consentimentos</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Email</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Data</th><th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Status</th></tr>
          </thead>
          <tbody>
            {consentimentos.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{c.email}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{c.data}</td>
                <td style={{ padding: '12px' }}>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
