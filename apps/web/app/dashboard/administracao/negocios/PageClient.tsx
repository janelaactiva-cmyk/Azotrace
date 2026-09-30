'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/lib/auth-context';
import { getBusinessIcon } from '~/lib/business-icons';
import Breadcrumb from './_components/Breadcrumb';
import TabsNegocios from './_components/TabsNegocios';

export default function PageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [negocios, setNegocios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Não espera pelo user. Corre sempre.
    loadNegocios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNegocios = async () => {
    try {
      console.log('[negocios] user atual:', user?.id, user?.email);

      // Query SEM filtro por user_id.
      // O RLS do Supabase decide o que é visível:
      //   - admin@azotrace.com → vê tudo (policies admin_*)
      //   - outros users        → veem só os deles (policies tenant_*)
      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[negocios] erro:', error);
        throw error;
      }

      console.log('[negocios] devolvidos:', data?.length ?? 0);
      setNegocios(data || []);
    } catch (error) {
      console.error('[negocios] catch:', error);
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(16px, 3vw, 34px)' }}>
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Administração', href: '/dashboard/administracao' },
          { label: 'Produtos', href: '/dashboard/administracao/produtos' },
          { label: 'Negócio' },
        ]}
      />

      <header style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>🏢 Negócio</h1>
        <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>
          Cria novos negócios ou consulta os existentes.
        </p>
      </header>

      <TabsNegocios />

      {loading ? (
        <p>A carregar...</p>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
              📊 Lista de Negócios
            </h2>
            <button
              onClick={() => router.push('/dashboard/administracao/negocios/criar')}
              style={{
                padding: '8px 16px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              ➕ Criar Negócio
            </button>
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
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            background: `${icon.color}22`,
                            color: icon.color,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                          }}
                        >
                          {icon.icon} {icon.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{n.quantidade || '-'} kg</td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => router.push(`/dashboard/administracao/negocios/${n.id}`)}
                          style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {negocios.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                      Nenhum negócio criado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}