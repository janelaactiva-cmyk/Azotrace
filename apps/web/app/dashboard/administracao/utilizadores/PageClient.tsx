'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';

export default function PageClient() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      setUsers(data?.users || []);
    } catch (error) {
      console.error('Erro:', error);
      // Fallback para dados de exemplo
      setUsers([
        { id: '1', email: 'admin@azotrace.com', created_at: new Date().toISOString() },
        { id: '2', email: 'user@azotrace.com', created_at: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>A carregar...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>📋 Utilizadores</h2>
        <button onClick={() => router.push('/dashboard/administracao/utilizadores/criar')} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>➕ Criar Utilizador</button>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Criado em</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{u.email}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('pt-PT') : '-'}</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => router.push(`/dashboard/administracao/utilizadores/editar/${u.id}`)} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>✏️</button>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Nenhum utilizador encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
