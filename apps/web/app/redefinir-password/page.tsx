'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Link from 'next/link';

export default function RedefinirPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    // Verificar se o utilizador veio do link de reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    };
    checkSession();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordErrors([]);

    const errors = validatePassword(password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (password !== confirmPassword) {
      setError('❌ As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError('❌ ' + (err.message || 'Erro ao atualizar password'));
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
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            🔐 Redefinir Password
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Define uma nova password para a tua conta
          </p>
        </div>

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
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
              ✅ Password atualizada!
            </p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              A ser redirecionado para o login...
            </p>
          </div>
        )}

        {passwordErrors.length > 0 && (
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Nova Password
            </label>
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
              autoComplete="new-password"
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Confirmar Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'A atualizar...' : '🔐 Atualizar Password'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link
            href="/login"
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
