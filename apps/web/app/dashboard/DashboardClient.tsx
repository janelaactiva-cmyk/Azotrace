'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { getBusinessIcon } from '~/lib/business-icons';
import { useTheme } from '~/lib/theme-context';
import { useBusiness } from '~/lib/business-context';
import { useAuth } from '~/lib/auth-context';
import CookieConsent from './CookieConsent';

const BusinessCard = memo(({ business, isSelected, onSelect }: any) => {
  const icon = getBusinessIcon(business.tipo);
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (date: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('pt-PT');
  };

  return (
    <div
      className="card"
      onClick={() => onSelect(business)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '20px',
        borderTop: `4px solid ${icon.color}`,
        cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${icon.color}` : (isHovered ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'),
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        background: isSelected ? `${icon.color}11` : 'var(--bg-card)',
        transform: isHovered ? 'scale(1.01)' : 'scale(1)',
        willChange: 'transform'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '28px' }}>{icon.icon}</span>
        <h3 style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--text-primary)' }}>{business.nome}</h3>
        {isSelected && <span style={{ marginLeft: 'auto', color: icon.color }}>✅</span>}
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
        Tipo: {icon.label}
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '14px' }}>
        {business.quantidade && (
          <p style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>📦 Quantidade:</span> {business.quantidade} kg
          </p>
        )}
        {business.origem && (
          <p style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>📍 Origem:</span> {business.origem}
          </p>
        )}
        {business.humidade && (
          <p style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>🌡️ Humidade:</span> {business.humidade}%
          </p>
        )}
        {business.temperatura && (
          <p style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>🌡️ Temperatura:</span> {business.temperatura}°C
          </p>
        )}
        {business.validade && (
          <p style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>📅 Validade:</span> {formatDate(business.validade)}
          </p>
        )}
      </div>

      {business.observacoes && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>📝 {business.observacoes}</p>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(business);
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
          transition: 'background 0.15s ease'
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
});

BusinessCard.displayName = 'BusinessCard';

export default function DashboardClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const { selectedBusinessId, setSelectedBusiness } = useBusiness();
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadBusinesses();
    }
  }, [user, authLoading]);

  const loadBusinesses = async () => {
    try {
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

  const handleSelectBusiness = useCallback((business: any) => {
    setSelectedBusiness(business.id, business.tipo, business.nome);
  }, [setSelectedBusiness]);

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
      {/* POPUP DE COOKIES - PEQUENO */}
      <CookieConsent />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
            transition: 'background 0.15s ease'
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {businesses.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              isSelected={b.id === selectedBusinessId}
              onSelect={handleSelectBusiness}
            />
          ))}
        </div>
      )}
    </div>
  );
}
