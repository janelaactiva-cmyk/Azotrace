'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Link from 'next/link';
import Logo from '~/components/Logo';

export default function RegisterPage() {
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

  useEffect(() => {
    // 🔒 SEGURANÇA: Se tentarem aceder a esta página sem passar pela chave, são expulsos de volta para a página de sucesso/chave!
    const savedEmail = sessionStorage.getItem('validated_email');
    if (!savedEmail) {
      router.push('/checkout/success');
      return;
    }

    // Preenche o email automaticamente no formulário
    setForm((prev) => ({ ...prev, email: savedEmail }));

    // Verificar se já está logado
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    };
    checkUser();
  }, [router]);

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
      setError('❌ As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      // Cria a conta no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      if (data?.user) {
        // Limpa o email da memória para o fluxo ficar limpo
        sessionStorage.removeItem('validated_email');
        setUser(data.user);
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setError('❌ ' + (err.message || 'Erro ao criar conta'));
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '20px' }}>
        <div style={{ background: 'white', padding: '48px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
            Conta Criada com Sucesso!
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            A conta associada a <strong>{user.email}</strong> está pronta.
          </p>
          <Link
            href="/dashboard"
            style={{ display: 'inline-block', padding: '12px 32px', background: '#2563eb', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}
          >
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

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            Chave Validada!
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Define a tua palavra-passe para concluir o registo.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {passwordErrors.length > 0 && (
          <div style={{ background: '#fef3c7', color: '#d97706', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
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
              Email (Validado pela chave)
            </label>
            <input
              type="email"
              value={form.email}
              readOnly
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                background: '#e5e7eb',
                color: '#374151',
                cursor: 'not-allowed'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Palavra-passe
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
              placeholder="••••••••"
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '6px', fontSize: '14px' }}>
              Confirmar Palavra-passe
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}
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
            {loading ? 'A criar conta...' : '📝 Criar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
}