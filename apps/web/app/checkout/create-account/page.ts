'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Logo from '~/components/Logo';

export default function SuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // 1. Obter session_id do URL
    const params = new URLSearchParams(window.location.search);
    const sId = params.get('session_id');
    if (sId) setSessionId(sId);

    // 2. Verificar se o utilizador já está autenticado
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        associateCheckout(sId, user.id);
      }
    });
  }, []);

  const associateCheckout = async (sId: string | null, userId: string) => {
    if (!sId) return;
    try {
      await fetch('/api/associate-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sId, userId }),
      });
    } catch (err) {
      console.error('Erro ao associar checkout:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) throw signUpError;

      if (data?.user) {
        await associateCheckout(sessionId, data.user.id);
        setUser(data.user);
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  // Ecrã caso já esteja logado ou após criar conta com sucesso
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">Pagamento Confirmado!</h1>
          <p className="text-gray-600 mb-6 text-sm">
            Conta associada com sucesso: <strong>{user.email}</strong>
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Ir para o Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Ecrã do formulário para criar conta
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Logo width={160} height={50} />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Criar a sua conta</h1>
          <p className="text-gray-600 text-sm mt-1">
            Insira os seus dados para finalizar o acesso.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="exemplo@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha (mín. 8 caracteres)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'A processar...' : 'Criar Conta e Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Já tem conta?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-blue-600 font-medium hover:underline"
          >
            Fazer login
          </button>
        </div>
      </div>
    </div>
  );
}