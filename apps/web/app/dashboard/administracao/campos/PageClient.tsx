'use client';

import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/lib/auth-context';

export default function PageClient() {
  const { user } = useAuth();
  const [campos, setCampos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', tipo: 'texto', obrigatorio: false });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    loadCampos();
  }, []);

  const loadCampos = async () => {
    try {
      const { data, error } = await supabase.from('campos_produtos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCampos(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) return;

    try {
      if (editing) {
        const { error } = await supabase.from('campos_produtos').update(form).eq('id', editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('campos_produtos').insert([{ ...form, user_id: user?.id }]);
        if (error) throw error;
      }
      setForm({ nome: '', tipo: 'texto', obrigatorio: false });
      setEditing(null);
      await loadCampos();
      alert(editing ? '✅ Campo atualizado!' : '✅ Campo criado!');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      const { error } = await supabase.from('campos_produtos').delete().eq('id', id);
      if (error) throw error;
      await loadCampos();
      alert('🗑️ Campo eliminado!');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  if (loading) return <p>A carregar...</p>;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>📋 Campos dos Produtos</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '24px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Nome do campo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} required />
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}>
            <option value="texto">Texto</option>
            <option value="numero">Número</option>
            <option value="data">Data</option>
            <option value="select">Seleção</option>
            <option value="checkbox">Checkbox</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="checkbox" checked={form.obrigatorio} onChange={(e) => setForm({ ...form, obrigatorio: e.target.checked })} />
            Obrigatório
          </label>
          <button type="submit" style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            {editing ? '✏️ Atualizar' : '➕ Adicionar'}
          </button>
          {editing && <button type="button" onClick={() => { setForm({ nome: '', tipo: 'texto', obrigatorio: false }); setEditing(null); }} style={{ padding: '8px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>↩️ Cancelar</button>}
        </div>
      </form>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Nome</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Obrigatório</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {campos.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{c.nome}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{c.tipo}</td>
                <td style={{ padding: '12px' }}>{c.obrigatorio ? '✅ Sim' : '❌ Não'}</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => { setForm({ nome: c.nome, tipo: c.tipo, obrigatorio: c.obrigatorio }); setEditing(c.id); }} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>✏️</button>
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {campos.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Nenhum campo criado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
