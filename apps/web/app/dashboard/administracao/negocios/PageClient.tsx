'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/lib/auth-context';
import { getBusinessIcon } from '~/lib/business-icons';

export default function PageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [negocios, setNegocios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNegocios();
  }, []);

  const loadNegocios = async () => {
    try {
      const { data, error } = await supabase.from('negocios').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      setNegocios(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    try {
      const { error } = await supabase.from('negocios').delete().eq('id', id);
      if (error) throw error;
      await loadNegocios();
      alert('🗑️ Negócio eliminado!');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  if (loading) return <p>A carregar...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>📊 Negócios</h2>
        <button onClick={() => router.push('/dashboard/administracao/negocios/criar')} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>➕ Criar Negócio</button>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Nome</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Quantidade</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {negocios.map((n) => {
              const icon = getBusinessIcon(n.tipo);
              return (
                <tr key={n.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>{n.nome}</td>
                  <td style={{ padding: '12px' }}><span style={{ background: `${icon.color}22`, color: icon.color, padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{icon.icon} {icon.label}</span></td>
                  <td style={{ padding: '12px' }}>{n.quantidade || '-'} kg</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => router.push(`/dashboard/administracao/negocios/${n.id}`)} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>✏️</button>
                    <button onClick={() => handleDelete(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>🗑️</button>
                  </td>
                </tr>
              );
            })}
            {negocios.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Nenhum negócio criado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
