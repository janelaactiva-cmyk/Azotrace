'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/lib/auth-context';

export default function PageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [form, setForm] = useState({ nome: '', categoria_id: '', descricao: '' });

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    const { data } = await supabase.from('categorias').select('id, nome');
    setCategorias(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.categoria_id) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('subcategorias').insert([{ ...form, user_id: user?.id }]);
      if (error) throw error;
      alert('✅ Subcategoria criada!');
      router.push('/dashboard/administracao/subcategorias');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>➕ Criar Subcategoria</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Nome *</label>
          <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} required />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Categoria *</label>
          <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} required>
            <option value="">Selecione</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Descrição</label>
          <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'A criar...' : '💾 Criar Subcategoria'}
        </button>
      </form>
    </div>
  );
}
