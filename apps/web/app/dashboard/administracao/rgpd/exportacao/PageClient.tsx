'use client';

import { useState } from 'react';

export default function PageClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    alert('📤 Pedido de exportação enviado para ' + email);
    setEmail('');
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>📤 Exportação de Dados</h2>
      <p style={{ color: '#6b7280', marginBottom: '16px' }}>Solicita a exportação de todos os dados de um utilizador.</p>
      <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        <input type="email" placeholder="Email do utilizador" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '12px' }} required />
        <button type="submit" disabled={loading} style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'A processar...' : '📤 Solicitar Exportação'}
        </button>
      </form>
    </div>
  );
}
