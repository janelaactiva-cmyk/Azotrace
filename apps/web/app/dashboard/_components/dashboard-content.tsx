'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { getBusinessIcon } from '~/lib/business-icons';
import { useTheme } from '~/lib/theme-context';
import { useBusiness } from '~/lib/business-context';
import { useAuth } from '~/lib/auth-context';

export function DashboardContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const { selectedBusinessId, setSelectedBusiness } = useBusiness();
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Atualiza o useEffect para garantir que só carrega dados se existir uma sessão ativa:
useEffect(() => {
  if (authLoading) return; // Aguarda o fim do carregamento do AuthContext

  if (!user) {
    router.push('/login'); // Redireciona se não houver utilizador
    return;
  }

  loadBusinesses();
}, [user, authLoading, router]);

// 2. Protege a função loadBusinesses contra chamadas sem sessão:
const loadBusinesses = async () => {
  try {
    setLoading(true);

    // Verifica primeiro se a sessão existe antes de fazer a query
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('Nenhuma sessão ativa encontrada.');
      return;
    }

    const { data, error } = await supabase
      .from('negocios')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setBusinesses(data || []);
  } catch (error) {
    console.error('Erro ao carregar negócios:', error);
  } finally {
    setLoading(false);
  }
};

  const handleSelectBusiness = (business: any) => {
    setSelectedBusiness(business.id, business.tipo, business.nome);
  };

  if (authLoading || loading) {
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Visão geral dos teus negócios</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/administracao')}
          style={{
            padding: '12px 24px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '15px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2563eb';
          }}
        >
          ➕ Adicionar Negócio
        </button>
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectBusiness(b);
                  }}
                  style={{
                    marginTop: '16px',
                    padding: '8px 20px',
                    background: isSelected ? '#22c55e' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    width: '100%',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isSelected ? '#16a34a' : '#1d4ed8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelected ? '#22c55e' : '#2563eb';
                  }}
                >
                  {isSelected ? '✅ Selecionado' : '🔍 Selecionar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}