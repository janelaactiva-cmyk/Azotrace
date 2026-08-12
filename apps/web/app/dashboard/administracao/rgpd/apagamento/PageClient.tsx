'use client';

import { useState } from 'react';

export default function PageClient() {
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !confirm) return;
    if (!confirm('Tem certeza que deseja apagar todos os dados deste utilizador?')) return;
    alert('🗑️ Dados de ' + email + ' serão apagados em 30 dias.');
    setEmail('');
    setConfirm(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>🗑️ Apagamento / Anonimização</h2>
      <p style={{ color: '#dc2626', marginBottom: '16px' }}>⚠️ Esta ação é irreversível. Os dados serão permanentemente eliminados.</p>
      <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        <input type="email" placeholder="Email do utilizador" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '12px' }} required />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          Confirmo que pretendo apagar os dados deste utilizador
        </label>
        <button type="submit" disabled={!email || !confirm} style={{ padding: '10px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!email || !confirm) ? 0.5 : 1 }}>
          🗑️ Apagar Dados
        </button>
      </form>
    </div>
  );
}
