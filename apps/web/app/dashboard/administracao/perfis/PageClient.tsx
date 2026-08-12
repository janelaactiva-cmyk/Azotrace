'use client';

import { useState } from 'react';

export default function PageClient() {
  const [perfis, setPerfis] = useState([
    { id: '1', nome: 'Administrador', permissoes: ['admin', 'negocios', 'utilizadores', 'configuracoes'] },
    { id: '2', nome: 'Gestor', permissoes: ['negocios', 'utilizadores'] },
    { id: '3', nome: 'Utilizador', permissoes: ['negocios'] },
  ]);

  const permissoesDisponiveis = [
    { id: 'admin', label: 'Administração' },
    { id: 'negocios', label: 'Gerir Negócios' },
    { id: 'utilizadores', label: 'Gerir Utilizadores' },
    { id: 'configuracoes', label: 'Configurações' },
    { id: 'blockchain', label: 'Blockchain' },
    { id: 'analytics', label: 'Analytics' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>👤 Perfis e Permissões</h2>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Perfil</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Permissões</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {perfis.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', fontWeight: '500' }}>{p.nome}</td>
                <td style={{ padding: '12px' }}>
                  {p.permissoes.map((perm) => (
                    <span key={perm} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginRight: '4px' }}>
                      {permissoesDisponiveis.find(pd => pd.id === perm)?.label || perm}
                    </span>
                  ))}
                </td>
                <td style={{ padding: '12px' }}>
                  <button style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>✏️</button>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>➕ Criar Perfil</button>
      </div>
    </div>
  );
}
