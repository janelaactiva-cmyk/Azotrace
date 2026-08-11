'use client';

import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { getBusinessIcon } from '~/lib/business-icons';
import { useTheme } from '~/lib/theme-context';

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>A carregar...</p>
      </div>
    );
  }

  const totalNegocios = businesses.length;
  const totalTipos = new Set(businesses.map(b => b.tipo)).size;
  const totalQuantidade = businesses.reduce((sum, b) => sum + (b.quantidade || 0), 0);
  const ultimoNegocio = businesses.length > 0 ? businesses[0] : null;

  const typeCounts: Record<string, number> = {};
  businesses.forEach(b => {
    typeCounts[b.tipo] = (typeCounts[b.tipo] || 0) + 1;
  });
  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>📈 Analytics</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px' }}>Estatísticas dos negócios</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>📦 Negócios</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalNegocios}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>🏷️ Tipos</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalTipos}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>📦 Quantidade</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalQuantidade} kg</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>📅 Último</p>
          <p style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
            {ultimoNegocio?.nome || '-'}
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>🏆 Top Tipos de Negócio</h3>
        {topTypes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Sem dados</p>
        ) : (
          <div>
            {topTypes.map(([tipo, count], index) => {
              const icon = getBusinessIcon(tipo);
              const maxCount = topTypes[0]?.[1] || 1;
              const percentage = (count / maxCount) * 100;
              
              return (
                <div key={tipo} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', width: '36px' }}>
                    #{index + 1}
                  </span>
                  <span style={{ fontSize: '28px' }}>{icon.icon}</span>
                  <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '15px' }}>{icon.label}</span>
                  <div style={{
                    flex: 2,
                    height: '10px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      background: icon.color,
                      borderRadius: '6px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)', width: '40px', textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
