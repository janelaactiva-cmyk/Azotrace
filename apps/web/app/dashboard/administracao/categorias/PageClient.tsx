'use client';

import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/lib/auth-context';

interface Categoria {
  id: string;
  nome: string;
  descricao: string;
  created_at: string;
}

export default function PageClient() {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    try {
      if (editing) {
        const { error } = await supabase
          .from('categorias')
          .update({ nome, descricao })
          .eq('id', editing);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categorias')
          .insert([{ nome, descricao, user_id: user?.id }]);
        if (error) throw error;
      }

      setNome('');
      setDescricao('');
      setEditing(null);
      await loadCategorias();
      alert(editing ? '✅ Categoria atualizada!' : '✅ Categoria criada!');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (error) throw error;
      await loadCategorias();
      alert('🗑️ Categoria eliminada!');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  const handleEdit = (categoria: Categoria) => {
    setNome(categoria.nome);
    setDescricao(categoria.descricao || '');
    setEditing(categoria.id);
  };

  if (loading) return <p>A carregar...</p>;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
        🏷️ Categorias de Produtos
      </h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '24px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
          <input
            type="text"
            placeholder="Nome da categoria"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            required
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            {editing ? '✏️ Atualizar' : '➕ Adicionar'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => { setNome(''); setDescricao(''); setEditing(null); }}
              style={{ padding: '8px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              ↩️ Cancelar
            </button>
          )}
        </div>
      </form>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Nome</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Descrição</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{c.nome}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{c.descricao || '-'}</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => handleEdit(c)} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>✏️</button>
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {categorias.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Nenhuma categoria criada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
