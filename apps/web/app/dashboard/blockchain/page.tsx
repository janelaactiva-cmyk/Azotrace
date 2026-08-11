'use client';

import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { getBusinessIcon } from '~/lib/business-icons';
import { useTheme } from '~/lib/theme-context';

export default function BlockchainPage() {
  const { theme } = useTheme();
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlocks(data || []);
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

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>⛓️ Blockchain</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px' }}>Histórico de eventos</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total Eventos</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{blocks.length}</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Estado</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>✅ Válida</p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Último Bloco</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {blocks.length > 0 ? `#${blocks.length}` : '-'}
          </p>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="card" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '56px', marginBottom: '16px' }}>⛓️</p>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>Nenhum evento registado</h3>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {blocks.map((block) => {
            const icon = getBusinessIcon(block.tipo);
            return (
              <div key={block.id} style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <span style={{ fontSize: '28px' }}>{icon.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '16px' }}>{block.nome}</p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '13px',
                      padding: '2px 12px',
                      borderRadius: '12px',
                      background: `${icon.color}22`,
                      color: icon.color
                    }}>
                      {icon.label}
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      📅 {new Date(block.created_at).toLocaleString('pt-PT')}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  #{block.id.slice(0, 8)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
