'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Logo from '~/components/Logo';
import Link from 'next/link';

function LoginForm() {
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

  // Função para autenticação com o Google
  const handleGoogleLogin = async () => {
    try {
      setError('');
      const redirectToUrl = fromCheckout 
        ? `${window.location.origin}/checkout/success` 
        : `${window.location.origin}/dashboard`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectToUrl,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError('❌ ' + (err.message || 'Erro ao entrar com o Google'));
    }
  };

  return (
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

      {/* Botão de Login com o Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          padding: '12px',
          background: 'white',
          color: '#374151',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '20px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.14C3.16 21.32 7.24 24 12 24z"/>
          <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.62H1.18C.43 8.14 0 9.87 0 12s.43 3.86 1.18 5.38l4.09-3.14z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.24 0 3.16 2.68 1.18 6.62l4.09 3.14c.95-2.85 3.6-4.96 6.73-4.96z"/>
        </svg>
        Entrar com o Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center', color: '#9ca3af', marginBottom: '20px' }}>
        <div style={{ flex: 1, borderBottom: '1px solid #e5e7eb' }}></div>
        <span style={{ padding: '0 10px', fontSize: '13px' }}>ou com email</span>
        <div style={{ flex: 1, borderBottom: '1px solid #e5e7eb' }}></div>
      </div>

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
            placeholder=""
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
            placeholder=""
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
          {loading ? 'A entrar...' : 'Entrar'}
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
          href="auth/criar-conta"
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
  );
}

export default function LoginPage() {
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
      <Suspense fallback={<div style={{ textAlign: 'center', color: '#6b7280' }}>A carregar...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}