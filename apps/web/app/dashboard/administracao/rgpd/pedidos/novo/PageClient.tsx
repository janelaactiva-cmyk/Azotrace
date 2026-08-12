'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PageClient() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', tipo: 'Acesso', descricao: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('✅ Pedido criado com sucesso!');
    router.push('/dashboard/administracao/rgpd/pedidos');
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>➕ Novo Pedido</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Email *</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} required />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Tipo *</label>
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} required>
            <option value="Acesso">Acesso</option>
            <option value="Retificação">Retificação</option>
            <option value="Eliminação">Eliminação</option>
            <option value="Exportação">Exportação</option>
          </select>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Descrição</label>
          <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'none' }} />
        </div>
        <button type="submit" style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>💾 Criar Pedido</button>
      </form>
    </div>
  );
}
