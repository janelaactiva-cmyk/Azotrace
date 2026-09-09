'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Logo from '~/components/Logo';

export default function SuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // 🔐 Estados para o fluxo de MFA
  const [step, setStep] = useState<'form' | 'setup_mfa' | 'verify_mfa'>('form');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    const initPage = async () => {
      const savedEmail = sessionStorage.getItem('validated_email') || '';
      if (savedEmail) {
        setForm((prev) => ({ ...prev, email: savedEmail }));
      }

      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        if (user.email && !savedEmail) {
          setForm((prev) => ({ ...prev, email: user.email || '' }));
        }
        if (sessionId) {
          await associateCheckout(sessionId, user.id);
        }
        return;
      }

      if (!savedEmail && sessionId) {
        try {
          const res = await fetch(`/api/get-checkout-info?session_id=${sessionId}`);
          const data = await res.json();
          if (res.ok && data.email) {
            setForm((prev) => ({ ...prev, email: data.email || '' }));
          }
        } catch (err) {
          console.error('❌ Erro ao carregar dados do email:', err);
        }
      }
    };

    initPage();
  }, []);

  const associateCheckout = async (sessionId: string, userId: string) => {
    try {
      await fetch('/api/associate-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId }),
      });
    } catch (err) {
      console.error('Erro de rede ao associar checkout:', err);
    }
  };

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('1 letra maiúscula');
    if (!/[a-z]/.test(password)) errors.push('1 letra minúscula');
    if (!/[0-9]/.test(password)) errors.push('1 número');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('1 caractere especial');
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordErrors([]);

    const errors = validatePassword(form.password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      // 1. Criar a conta
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (signUpError) throw signUpError;

      // 2. Fazer login imediato para obter os dados frescos da sessão
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) throw signInError;

      if (signInData?.session) {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        if (sessionId && signInData.user) {
          await associateCheckout(sessionId, signInData.user.id);
        }

        setUser(signInData.user);

        // 🚀 Chamar o MFA passando o token explicitamente
        await handleEnrollMFA(signInData.session.access_token);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
      setLoading(false);
    }
  };

  // 📲 Passo 1: Registar o fator MFA
  const handleEnrollMFA = async (accessToken: string) => {
    try {
      const authenticatedSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: { persistSession: false },
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      );

      const { data, error } = await authenticatedSupabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrCodeSvg(data.totp.qr_code);
      setStep('setup_mfa');
    } catch (err: any) {
      console.error('Erro ao configurar MFA:', err);
      setError(err.message || 'Erro ao configurar MFA');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Passo 2: Confirmar o código MFA
  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setLoading(true);
    setError('');

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });

      if (verify.error) throw verify.error;

      router.push('/dashboard');
    } catch (err: any) {
      setError('Código inválido. Tenta novamente.');
      setLoading(false);
    }
  };

  const handleSkipMFA = () => {
    router.push('/dashboard');
  };

  if (user && step === 'form') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '20px' }}>
        <div style={{ background: 'white', padding: '48px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Pagamento Confirmado!</h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>O teu pagamento foi processado com sucesso e a conta foi associada.</p>
          <Link href="/dashboard" style={{ display: 'inline-block', padding: '12px 32px', background: '#2563eb', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}>
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '440px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Logo width={180} height={60} />
        </div>

        {step === 'setup_mfa' ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>Proteger Conta (MFA)</h1>
              <p style={{ color: '#6b7280', fontSize: '13px' }}>
                Lê o código QR abaixo com uma app de autenticação (ex: Google Authenticator, Authy) para ativar a verificação em duas etapas.
              </p>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                ❌ {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }} dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />

            <form onSubmit={handleVerifyMFA}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
                  Código de Verificação (6 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '18px', textAlign: 'center', letterSpacing: '4px' }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginBottom: '10px' }}
              >
                {loading ? 'A verificar...' : 'Confirmar e Ativar MFA'}
              </button>

              <button
                type="button"
                onClick={handleSkipMFA}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#6b7280', border: 'none', fontSize: '14px', cursor: 'pointer' }}
              >
                Saltar por agora
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Pagamento Confirmado!</h1>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Define a tua palavra-passe para concluir o acesso</p>
            </div>

            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                ❌ {error}
              </div>
            )}

            {passwordErrors.length > 0 && (
              <div style={{ background: '#fef3c7', color: '#d97706', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                <strong>🔒 Regras da senha:</strong>
                <ul style={{ marginTop: '6px', paddingLeft: '20px', marginBottom: '0' }}>
                  {passwordErrors.map((err, i) => (<li key={i}>{err}</li>))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', background: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Senha</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>Confirmar Senha</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'A criar...' : 'Criar Conta e Entrar'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}