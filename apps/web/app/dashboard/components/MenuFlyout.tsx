'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
}

const menuConfig: MenuItem[] = [
  {
    id: 'geral',
    label: 'Geral',
    icon: '📋',
    children: [
      { id: 'geral-config', label: 'Configurações Gerais', icon: '⚙️', path: '/dashboard/administracao/configuracoes' },
      { id: 'geral-empresa', label: 'Dados da Empresa', icon: '🏢', path: '/dashboard/administracao/empresa' },
    ]
  },
  {
    id: 'produtos',
    label: 'Produtos',
    icon: '📦',
    children: [
      { 
        id: 'produtos-categorias', 
        label: 'Categorias de Produtos', 
        icon: '🏷️',
        children: [
          { id: 'categorias-list', label: 'Listar Categorias', icon: '📋', path: '/dashboard/administracao/categorias' },
          { id: 'categorias-create', label: 'Criar Categoria', icon: '➕', path: '/dashboard/administracao/categorias/criar' },
          { 
            id: 'categorias-sub', 
            label: 'Subcategorias', 
            icon: '📂',
            children: [
              { id: 'sub-list', label: 'Listar Subcategorias', icon: '📋', path: '/dashboard/administracao/subcategorias' },
              { id: 'sub-create', label: 'Criar Subcategoria', icon: '➕', path: '/dashboard/administracao/subcategorias/criar' },
            ]
          }
        ]
      },
      { id: 'produtos-campos', label: 'Campos dos Produtos', icon: '📋', path: '/dashboard/administracao/campos' },
      { id: 'produtos-negocios', label: 'Negócios', icon: '📊', path: '/dashboard/administracao/negocios' },
    ]
  },
  {
    id: 'users',
    label: 'Utilizadores',
    icon: '👥',
    children: [
      { id: 'users-list', label: 'Listar Utilizadores', icon: '📋', path: '/dashboard/administracao/utilizadores' },
      { id: 'users-create', label: 'Criar Utilizador', icon: '➕', path: '/dashboard/administracao/utilizadores/criar' },
      { id: 'users-edit', label: 'Editar Utilizador', icon: '✏️', path: '/dashboard/administracao/utilizadores/editar' },
      { id: 'users-perfis', label: 'Perfis e Permissões', icon: '👤', path: '/dashboard/administracao/perfis' },
    ]
  },
  {
    id: 'rgpd',
    label: 'RGPD / Privacidade',
    icon: '🔒',
    children: [
      { id: 'rgpd-policy', label: 'Política de Privacidade', icon: '📄', path: '/dashboard/administracao/rgpd/politica' },
      { id: 'rgpd-consents', label: 'Consentimentos', icon: '✅', path: '/dashboard/administracao/rgpd/consentimentos' },
      { 
        id: 'rgpd-requests', 
        label: 'Pedidos dos Titulares', 
        icon: '📋',
        children: [
          { id: 'rgpd-requests-list', label: 'Listar Pedidos', icon: '📋', path: '/dashboard/administracao/rgpd/pedidos' },
          { id: 'rgpd-requests-new', label: 'Novo Pedido', icon: '➕', path: '/dashboard/administracao/rgpd/pedidos/novo' },
          { 
            id: 'rgpd-requests-history', 
            label: 'Histórico de Pedidos', 
            icon: '📜',
            children: [
              { id: 'history-2024', label: '2024', icon: '📅', path: '/dashboard/administracao/rgpd/historico/2024' },
              { id: 'history-2025', label: '2025', icon: '📅', path: '/dashboard/administracao/rgpd/historico/2025' },
              { id: 'history-2026', label: '2026', icon: '📅', path: '/dashboard/administracao/rgpd/historico/2026' },
            ]
          }
        ]
      },
      { id: 'rgpd-export', label: 'Exportação de Dados', icon: '📤', path: '/dashboard/administracao/rgpd/exportacao' },
      { id: 'rgpd-delete', label: 'Apagamento / Anonimização', icon: '🗑️', path: '/dashboard/administracao/rgpd/apagamento' },
      { id: 'rgpd-retention', label: 'Retenção de Dados', icon: '📅', path: '/dashboard/administracao/rgpd/retencao' },
      { id: 'rgpd-contractors', label: 'Subcontratantes', icon: '🤝', path: '/dashboard/administracao/rgpd/subcontratantes' },
      { id: 'rgpd-activities', label: 'Registo de Atividades', icon: '📝', path: '/dashboard/administracao/rgpd/atividades' },
    ]
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    icon: '🛡️',
    children: [
      { 
        id: 'seguranca-logs', 
        label: 'Logs / Auditoria', 
        icon: '📊',
        children: [
          { id: 'logs-acesso', label: 'Logs de Acesso', icon: '🔐', path: '/dashboard/administracao/logs/acesso' },
          { id: 'logs-accao', label: 'Logs de Ações', icon: '📝', path: '/dashboard/administracao/logs/acoes' },
          { id: 'logs-erro', label: 'Logs de Erros', icon: '❌', path: '/dashboard/administracao/logs/erros' },
        ]
      },
      { id: 'seguranca-qrcodes', label: 'QR Codes', icon: '📱', path: '/dashboard/administracao/qrcodes' },
    ]
  },
];

// Componente Flyout estilo Rádio Popular
function FlyoutMenu({ 
  items, 
  onItemClick,
  level = 0
}: { 
  items: MenuItem[]; 
  onItemClick: (path: string) => void;
  level?: number;
}) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div style={{ 
      minWidth: '220px',
      background: 'white',
      padding: '0',
      borderRadius: level === 0 ? '0' : '0',
      border: 'none',
      boxShadow: level === 0 ? '0 10px 40px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      {items.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const isHovered = hoveredItem === item.id;

        return (
          <div 
            key={item.id}
            style={{ 
              position: 'relative',
              borderBottom: '1px solid #f0f0f0',
              background: isHovered ? '#f5f5f5' : 'transparent'
            }}
            onMouseEnter={() => {
              if (hasChildren) {
                setHoveredItem(item.id);
              }
            }}
            onMouseLeave={() => {
              setHoveredItem(null);
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                cursor: 'pointer',
                color: '#111827',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                minHeight: '38px',
                fontWeight: isHovered ? '500' : '400'
              }}
              onClick={() => {
                if (item.path) {
                  onItemClick(item.path);
                  setHoveredItem(null);
                }
              }}
            >
              <span>
                {item.icon && <span style={{ marginRight: '10px' }}>{item.icon}</span>}
                {item.label}
              </span>
              {hasChildren && (
                <span style={{ 
                  fontSize: '14px', 
                  color: '#999',
                  marginLeft: '25px'
                }}>
                  ›
                </span>
              )}
            </div>
            {hasChildren && isHovered && (
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: '0',
                  marginLeft: '2px',
                  zIndex: 99999,
                  background: 'white',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0'
                }}
              >
                <FlyoutMenu 
                  items={item.children!} 
                  onItemClick={onItemClick}
                  level={level + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MenuFlyout({ onItemClick }: { onItemClick?: (path: string) => void }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (path: string) => {
    if (onItemClick) onItemClick(path);
    router.push(path);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'block', width: '100%' }}>
      {/* Botão Administração - SEM SETA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          background: isOpen ? '#374151' : 'transparent',
          color: isOpen ? 'white' : '#9ca3af',
          fontSize: '15px',
          transition: 'all 0.2s',
          width: '100%'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>⚙️ Administração</span>
      </div>

      {/* Menu Flyout - Estilo Rádio Popular */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            left: '250px',
            top: '80px',
            zIndex: 99999,
            maxHeight: '70vh',
            overflowY: 'auto',
            overflowX: 'visible',
            background: 'white',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e5e7eb',
            borderRadius: '0',
            minWidth: '220px',
            padding: '0'
          }}
        >
          <FlyoutMenu items={menuConfig} onItemClick={handleItemClick} />
        </div>
      )}
    </div>
  );
}
