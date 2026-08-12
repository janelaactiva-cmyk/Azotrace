'use client';

import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/lib/auth-context';

export default function PageClient() {
  const { user } = useAuth();
  const [subcategorias, setSubcategorias] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', categoria_id: '', descricao: '' });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subRes, catRes] = await Promise.all([
        supabase.from('subcategorias').select('*, categorias(nome)').order('created_at', { ascending: false }),
        supabase.from('categorias').select('id, nome')
      ]);
      if (subRes.error) throw subRes.error;
      if (catRes.error) throw catRes.error;
      setSubcategorias(subRes.data || []);
      setCategorias(catRes.data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.categoria_id) return;

    try {
      if (editing) {
        const { error } = await supabase.from('subcategorias').update(form).eq('id', editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subcategorias').insert([{ ...form, user_id: user?.id }]);
        if (error) throw error;
      }
      setForm({ nome: '', categoria_id: '', descricao: '' });
      setEditing(null);
      await loadData();
      alert(editing ? '✅ Subcategoria atualizada!' : '✅ Subcategoria criada!');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      const { error } = await supabase.from('subcategorias').delete().eq('id', id);
      if (error) throw error;
      await loadData();
      alert('🗑️ Subcategoria eliminada!');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  if (loading) return <p>A carregar...</p>;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>📂 Subcategorias</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '24px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input
            type="text"
            placeholder="Nome da subcategoria"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            required
          />
          <select
            value={form.categoria_id}
            onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
            style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            required
          >
            <option value="">Selecione a categoria</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            style={{ gridColumn: 'span 2', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <button type="submit" style={{ marginTop: '12px', padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          {editing ? '✏️ Atualizar' : '➕ Adicionar'}
        </button>
      </form>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Nome</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Categoria</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {subcategorias.map((s) => (
              <tr key={s.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{s.nome}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{s.categorias?.nome || '-'}</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => { setForm({ nome: s.nome, categoria_id: s.categoria_id, descricao: s.descricao || '' }); setEditing(s.id); }} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>✏️</button>
                  <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {subcategorias.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Nenhuma subcategoria criada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
