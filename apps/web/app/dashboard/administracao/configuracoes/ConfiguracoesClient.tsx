'use client';

import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/lib/auth-context';

export default function ConfiguracoesClient() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    siteName: 'Azotrace',
    siteDescription: 'Sistema de Gestão de Negócios',
    contactEmail: '',
    theme: 'light',
  });

  useEffect(() => {
    if (user) {
      setConfig(prev => ({ ...prev, contactEmail: user.email || '' }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('✅ Configurações guardadas com sucesso!');
    } catch (error) {
      alert('❌ Erro ao guardar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
        ⚙️ Configurações Gerais
      </h2>
      
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>
            Nome do Site
          </label>
          <input
            type="text"
            name="siteName"
            value={config.siteName}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>
            Descrição
          </label>
          <input
            type="text"
            name="siteDescription"
            value={config.siteDescription}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>
            Email de Contacto
          </label>
          <input
            type="email"
            name="contactEmail"
            value={config.contactEmail}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>
            Tema
          </label>
          <select
            name="theme"
            value={config.theme}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 24px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'A guardar...' : '💾 Guardar Configurações'}
        </button>
      </form>
    </div>
  );
}
