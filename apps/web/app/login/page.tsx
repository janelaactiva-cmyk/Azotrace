'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Logo from '~/components/Logo';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCheckout = searchParams.get('from') === 'checkout';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (fromCheckout) {
          router.push('/checkout/success');
        } else {
          router.push('/dashboard');
        }
      }
    };
    checkAuth();
  }, [router, fromCheckout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        if (fromCheckout) {
          router.push('/checkout/success');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch (err: any) {
      setError('❌ ' + (err.message || 'Erro ao fazer login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      fontFamily: 'sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '440px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Logo width={180} height={60} />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px' }}>
          🔐 Entrar
        </h1>
        {fromCheckout && (
          <div style={{
            background: '#dbeafe',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            textAlign: 'center',
            border: '1px solid #93c5fd'
          }}>
            <p style={{ margin: 0, color: '#1e40af', fontSize: '14px' }}>
              🛒 Faz login para aceder ao teu plano
            </p>
          </div>
        )}
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px' }}>
          Acessa a tua conta
        </p>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'A entrar...' : '🔐 Entrar'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link
            href="/recuperar-password"
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Esqueci-me da password
          </Link>
          <span style={{ color: '#d1d5db', margin: '0 8px' }}>|</span>
          <Link
            href="/criar-conta"
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}
