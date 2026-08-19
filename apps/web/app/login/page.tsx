'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Logo from '~/components/Logo';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/dashboard');
      }
    };
    checkAuth();
  }, [router]);

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('🔒 Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('🔒 1 letra maiúscula');
    if (!/[a-z]/.test(password)) errors.push('🔒 1 letra minúscula');
    if (!/[0-9]/.test(password)) errors.push('🔒 1 número');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('🔒 1 caractere especial');
    }
    return errors;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPasswordErrors([]);

    const errors = validatePassword(registerPassword);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setError('❌ As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      if (data?.user) {
        setSuccess('✅ Conta criada! Verifica o teu email.');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setTimeout(() => setIsLogin(true), 3000);
      }
    } catch (err: any) {
      setError('❌ ' + (err.message || 'Erro ao registar'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      if (data?.user) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError('❌ ' + (err.message || 'Erro ao fazer login'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError('❌ ' + (err.message || 'Erro com Google'));
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
       
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px' }}>
          {isLogin ? 'Acessa a tua conta' : 'Cria a tua conta'}
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

        {success && (
          <div style={{
            background: '#dcfce7',
            color: '#16a34a',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        {!isLogin && passwordErrors.length > 0 && (
          <div style={{
            background: '#fef3c7',
            color: '#d97706',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            <strong>🔒 Regras da senha:</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '20px', marginBottom: '0' }}>
              {passwordErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Senha</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
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
        ) : (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Email</label>
              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Senha</label>
              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Mínimo 8 caracteres, maiúscula, minúscula, número e especial
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Confirmar Senha</label>
              <input
                type="password"
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'A criar...' : '📝 Criar Conta'}
            </button>
          </form>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            marginTop: '12px',
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9fafb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar com Google
        </button>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
              setPasswordErrors([]);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isLogin ? 'Não tem conta? 📝 Registar' : 'Já tem conta? 🔐 Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
