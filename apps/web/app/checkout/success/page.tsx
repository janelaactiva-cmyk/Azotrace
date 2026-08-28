'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerifyProductKeyPage() {
  const router = useRouter();
  const [productKey, setProductKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!productKey.trim()) {
      setError('Por favor, insere a chave do produto.');
      return;
    }

    setLoading(true);

    try {
      // Pedido à API para validar a chave gerada
      const response = await fetch('/api/verify-product-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Chave inválida ou já utilizada.');
      }

      // 1. Guardar o email retornado pela API no sessionStorage
      if (data.email) {
        sessionStorage.setItem('validated_email', data.email);
      }

      // 2. Redirecionar para a página de criar conta (SuccessPage) em vez do dashboard
      router.push('/success'); // Ajusta '/success' se a rota da tua página de criar conta for diferente

    } catch (err: any) {
      setError(err.message || 'Erro ao verificar a chave.');
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
      background: '#f3f4f6', // Fundo claro limpo
      padding: '20px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: '#ffffff', // Cartão branco
        padding: '40px',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 10px 15px rgba(0,0,0,0.03)',
        textAlign: 'center'
      }}>
        
        <h1 style={{ 
          fontSize: '22px', 
          fontWeight: 'bold', 
          marginBottom: '24px',
          letterSpacing: '-0.5px',
          color: '#111827'
        }}>
          Insira a chave que foi enviada por email:
        </h1>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              value={productKey}
              onChange={(e) => setProductKey(e.target.value)}
              placeholder="Insira a chave de licença"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#1f2937',
                fontSize: '15px',
                outline: 'none',
                textAlign: 'center'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Botão Verify em destaque */}
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: '#2563eb', // Azul moderno
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              🔑 {loading ? 'Verificando...' : 'Verifica'}
            </button>

            {/* Botão Back to homepage */}
            <Link
              href="/"
              style={{
                flex: 1,
                padding: '12px',
                background: 'transparent',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              ← Voltar ao inicio
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}