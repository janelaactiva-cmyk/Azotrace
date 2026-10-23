'use client';
import { uiMessagePt } from '~/lib/ui-messages-pt';


import { useState } from 'react';
import { withAuthTimeout } from '~/lib/auth-navigation';
import {recoveryQrOrigin} from '~/lib/qr-origin';
import { supabase } from '~/lib/supabase';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const origin=recoveryQrOrigin(window.location.origin);
      if(!origin)throw new Error('Abre a Azotrace pelo endereço oficial para pedir a recuperação da password.');
      const { error } = await withAuthTimeout(
        supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${origin}/redefinir-password` }),
        'O envio demorou demasiado. Verifica a ligação e tenta novamente.',
        15000,
      );

      if (error) throw error;

      setSuccess(true);
    } catch (err: unknown) {
      setError(uiMessagePt(err, 'Não foi possível enviar o pedido de recuperação. Tenta novamente.'));
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
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'white',
        padding: 'clamp(20px, 5vw, 40px)',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
                boxSizing: 'border-box',
        maxWidth: '440px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            Recuperar password
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Enviaremos um link para redefinir a sua password
          </p>
        </div>

        {error && (
          <div role="alert" style={{
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
                Pedido de recuperação enviado.
              </p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Se existir uma conta com este email, receberá o link de recuperação. Verifica também a pasta de spam.
              </p>
            </div>
            
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
                boxSizing: 'border-box',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                placeholder=""
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
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
              {loading ? 'A enviar...' : 'Enviar link'}
            </button>
          </form>
        )}

       
      </div>
    </div>
  );
}
