'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);
        setLoading(false);
      } catch (error) {
        console.error('Erro:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'sans-serif'
      }}>
        <p>A carregar...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f3f4f6', 
      padding: '24px', 
      fontFamily: 'sans-serif' 
    }}>
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>📊 Dashboard</h1>
        <p style={{ color: '#6b7280' }}>Bem-vindo, {user?.email}!</p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '24px'
        }}>
          <div style={{ 
            background: '#f9fafb', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb' 
          }}>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Total Negócios</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>0</p>
          </div>
          <div style={{ 
            background: '#f9fafb', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb' 
          }}>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Tipos</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>0</p>
          </div>
          <div style={{ 
            background: '#f9fafb', 
            padding: '16px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb' 
          }}>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Quantidade</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>0 kg</p>
          </div>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
            router.refresh();
          }}
          style={{
            marginTop: '24px',
            padding: '8px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
