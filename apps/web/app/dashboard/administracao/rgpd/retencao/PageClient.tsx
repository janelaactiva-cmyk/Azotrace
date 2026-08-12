'use client';

import { useState } from 'react';

export default function PageClient() {
  const [retencao, setRetencao] = useState({
    negocios: '365',
    utilizadores: '730',
    logs: '90',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('✅ Períodos de retenção atualizados!');
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>📅 Retenção de Dados</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Negócios (dias)</label>
          <input type="number" value={retencao.negocios} onChange={(e) => setRetencao({ ...retencao, negocios: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Utilizadores (dias)</label>
          <input type="number" value={retencao.utilizadores} onChange={(e) => setRetencao({ ...retencao, utilizadores: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Logs (dias)</label>
          <input type="number" value={retencao.logs} onChange={(e) => setRetencao({ ...retencao, logs: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
        </div>
        <button type="submit" style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾 Guardar Períodos</button>
      </form>
    </div>
  );
}
