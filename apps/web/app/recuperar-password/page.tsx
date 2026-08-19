'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Link from 'next/link';

export default function RecuperarPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação');
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
            🔑 Recuperar Password
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Enviaremos um link para redefinir a tua password
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
            ❌ {error}
          </div>
        )}

        {success ? (
          <div>
            <div style={{
              background: '#dcfce7',
              color: '#16a34a',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
                ✅ Email enviado!
              </p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Verifica a tua caixa de correio (inclui spam).
              </p>
            </div>
            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              ← Voltar ao Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
                Email
              </label>
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
                autoComplete="email"
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
              {loading ? 'A enviar...' : '📧 Enviar link'}
            </button>
          </form>
        )}

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
