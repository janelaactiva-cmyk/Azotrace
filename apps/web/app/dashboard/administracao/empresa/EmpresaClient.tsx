'use client';

import { useState } from 'react';

export default function EmpresaClient() {
  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState({
    nome: 'Azotrace',
    nif: '123456789',
    morada: 'Rua Exemplo, 123',
    cidade: 'Lisboa',
    codigoPostal: '1000-000',
    telefone: '+351 912345678',
    email: 'info@azotrace.com',
    website: 'www.azotrace.com',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('✅ Dados da empresa guardados com sucesso!');
    } catch (error) {
      alert('❌ Erro ao guardar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmpresa({ ...empresa, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
        🏢 Dados da Empresa
      </h2>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Nome</label>
            <input
              type="text"
              name="nome"
              value={empresa.nome}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>NIF</label>
            <input
              type="text"
              name="nif"
              value={empresa.nif}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Morada</label>
            <input
              type="text"
              name="morada"
              value={empresa.morada}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Cidade</label>
            <input
              type="text"
              name="cidade"
              value={empresa.cidade}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Código Postal</label>
            <input
              type="text"
              name="codigoPostal"
              value={empresa.codigoPostal}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Telefone</label>
            <input
              type="text"
              name="telefone"
              value={empresa.telefone}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Email</label>
            <input
              type="email"
              name="email"
              value={empresa.email}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px', fontSize: '14px' }}>Website</label>
            <input
              type="text"
              name="website"
              value={empresa.website}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '20px',
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
          {loading ? 'A guardar...' : '💾 Guardar Dados'}
        </button>
      </form>
    </div>
  );
}
