'use client';

import { useState } from 'react';
import MegaMenu from '../components/MegaMenu';

export default function AdministracaoClient() {
  const [currentPath, setCurrentPath] = useState<string>('');

  const handleMenuClick = (path: string) => {
    setCurrentPath(path);
  };

  const getPageName = (path: string) => {
    if (!path) return 'Seleciona uma opção';
    const parts = path.split('/');
    const lastPart = parts[parts.length - 1];
    const nameMap: Record<string, string> = {
      'configuracoes': 'Configurações Gerais',
      'empresa': 'Dados da Empresa',
      'categorias': 'Categorias de Produtos',
      'criar': 'Criar Categoria',
      'subcategorias': 'Subcategorias',
      'campos': 'Campos dos Produtos',
      'negocios': 'Negócios',
      'utilizadores': 'Listar Utilizadores',
      'editar': 'Editar Utilizador',
      'perfis': 'Perfis e Permissões',
      'politica': 'Política de Privacidade',
      'consentimentos': 'Consentimentos',
      'pedidos': 'Pedidos dos Titulares',
      'novo': 'Novo Pedido',
      'historico': 'Histórico de Pedidos',
      '2024': '2024',
      '2025': '2025',
      '2026': '2026',
      'exportacao': 'Exportação de Dados',
      'apagamento': 'Apagamento / Anonimização',
      'retencao': 'Retenção de Dados',
      'subcontratantes': 'Subcontratantes',
      'atividades': 'Registo de Atividades',
      'acesso': 'Logs de Acesso',
      'acoes': 'Logs de Ações',
      'erros': 'Logs de Erros',
      'qrcodes': 'QR Codes',
    };
    return nameMap[lastPart] || lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  };

  const pageName = getPageName(currentPath);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>⚙️ Administração</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Gerir todos os aspetos do sistema</p>
        </div>
      </div>

      {/* MegaMenu */}
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        border: '1px solid #e5e7eb',
        padding: '12px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <MegaMenu onItemClick={handleMenuClick} />
        {currentPath && (
          <span style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            borderLeft: '1px solid #e5e7eb',
            paddingLeft: '16px'
          }}>
            📍 {pageName}
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        minHeight: '300px'
      }}>
        {currentPath ? (
          <div>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              color: 'var(--text-primary)', 
              marginBottom: '16px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '12px'
            }}>
              {pageName}
            </h2>
            <div style={{
              padding: '20px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              minHeight: '200px'
            }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '150px',
                color: '#6b7280'
              }}>
                <span style={{ fontSize: '48px', marginBottom: '16px' }}>📄</span>
                <p style={{ fontSize: '16px', fontWeight: '500' }}>{pageName}</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Conteúdo em desenvolvimento. Brevemente disponível.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📋</span>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Seleciona uma opção do menu
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Clica em <strong>Administração</strong> e navega pelos submenus.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
