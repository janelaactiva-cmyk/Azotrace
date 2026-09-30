'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { getBusinessIcon } from '~/lib/business-icons';
import { useBusiness } from '~/lib/business-context';
import { useAuth } from '~/lib/auth-context';

interface DashboardContentProps {
  userEmail?: string;
}

export function DashboardContent({ userEmail }: DashboardContentProps) {
  const router = useRouter();
  const { selectedBusinessId, setSelectedBusiness } = useBusiness();
  const { user } = useAuth();

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNegocios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNegocios = async () => {
    try {
      console.log('[dashboard] user atual:', user?.id, user?.email);

      // Sem filtro por user_id — o RLS decide o que é visível.
      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[dashboard] erro:', error);
        throw error;
      }

      console.log('[dashboard] devolvidos:', data?.length ?? 0);
      setBusinesses(data || []);
    } catch (err) {
      console.error('[dashboard] catch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusiness = (business: any) => {
    setSelectedBusiness(business.id, business.tipo, business.nome);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>A carregar negócios...</p>
      </div>
    );
  }

  const total = businesses.length;
  const tipos = new Set(businesses.map(b => b.tipo)).size;
  const quantidade = businesses.reduce((sum, b) => sum + (b.quantidade || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>📊 Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Visão geral dos teus negócios {userEmail && `(${userEmail})`}
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total Negócios</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{total}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tipos</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{tipos}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Quantidade Total</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{quantidade} kg</p>
        </div>
      </div>

      {businesses.length === 0 ? (
        <div className="card" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '56px', marginBottom: '16px' }}>📭</p>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>Nenhum negócio encontrado</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Adiciona o teu primeiro negócio em <strong>Administração</strong>
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {businesses.map((b) => {
            const icon = getBusinessIcon(b.tipo);
            const isSelected = b.id === selectedBusinessId;
            return (
              <div
                key={b.id}
                className="card"
                onClick={() => handleSelectBusiness(b)}
                style={{
                  padding: '20px',
                  borderTop: `4px solid ${icon.color}`,
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 0 3px ${icon.color}` : 'none',
                  transition: 'all 0.2s',
                  background: isSelected ? `${icon.color}11` : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>{icon.icon}</span>
                  <h3 style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--text-primary)' }}>{b.nome}</h3>
                  {isSelected && (
                    <span style={{ marginLeft: 'auto', color: icon.color }}>✅</span>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tipo: {icon.label}</p>
                {b.quantidade && <p style={{ color: 'var(--text-primary)' }}>📦 {b.quantidade} kg</p>}
                {b.origem && <p style={{ color: 'var(--text-primary)' }}>📍 {b.origem}</p>}
                {b.humidade && <p style={{ color: 'var(--text-primary)' }}>🌡️ {b.humidade}% humidade</p>}
                {b.temperatura && <p style={{ color: 'var(--text-primary)' }}>🌡️ {b.temperatura}°C</p>}
                {b.validade && (
                  <p style={{ color: 'var(--text-primary)' }}>📅 {new Date(b.validade).toLocaleDateString('pt-PT')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}