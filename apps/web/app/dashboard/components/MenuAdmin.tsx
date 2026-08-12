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
      { id: 'produtos-categorias', label: 'Categorias de Produtos', icon: '🏷️', path: '/dashboard/administracao/categorias' },
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
      { id: 'rgpd-requests', label: 'Pedidos dos Titulares', icon: '📋', path: '/dashboard/administracao/rgpd/pedidos' },
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
      { id: 'seguranca-logs', label: 'Logs / Auditoria', icon: '📊', path: '/dashboard/administracao/logs' },
      { id: 'seguranca-qrcodes', label: 'QR Codes', icon: '📱', path: '/dashboard/administracao/qrcodes' },
    ]
  },
];

export default function MenuAdmin({ onItemClick }: { onItemClick?: (path: string) => void }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveMenu(null);
        setActiveSubMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (path: string) => {
    if (onItemClick) onItemClick(path);
    router.push(path);
    setIsOpen(false);
    setActiveMenu(null);
    setActiveSubMenu(null);
  };

  // Função para renderizar submenus
  const renderSubMenu = (items: MenuItem[], level: number = 0) => {
    return (
      <div style={{ 
        minWidth: '220px',
        background: 'white',
        padding: '4px 0',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        {items.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isActive = activeSubMenu === item.id;

          return (
            <div 
              key={item.id}
              style={{ 
                position: 'relative',
                borderBottom: '1px solid #f3f4f6'
              }}
              onMouseEnter={() => {
                if (hasChildren) {
                  setActiveSubMenu(item.id);
                }
              }}
              onMouseLeave={() => {
                if (hasChildren) {
                  setActiveSubMenu(null);
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  background: isActive ? '#f3f4f6' : 'transparent',
                  color: '#111827',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  minHeight: '36px'
                }}
                onClick={() => {
                  if (item.path) {
                    handleItemClick(item.path);
                  }
                }}
              >
                <span>
                  {item.icon && <span style={{ marginRight: '8px' }}>{item.icon}</span>}
                  {item.label}
                </span>
                {hasChildren && (
                  <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '20px' }}>›</span>
                )}
              </div>
              {hasChildren && isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '0',
                    marginLeft: '2px',
                    zIndex: 99999
                  }}
                >
                  {renderSubMenu(item.children!, level + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'block', width: '100%' }}>
      {/* Botão Administração */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
        <span style={{ 
          fontSize: '10px',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
        }}>
          ▶
        </span>
      </div>

      {/* Menu Principal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            left: '250px',
            top: '80px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e5e7eb',
            minWidth: '220px',
            padding: '4px 0',
            zIndex: 99999,
            maxHeight: '70vh',
            overflowY: 'auto',
            overflowX: 'visible'
          }}
        >
          {menuConfig.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isActive = activeMenu === item.id;

            return (
              <div 
                key={item.id}
                style={{ 
                  position: 'relative',
                  borderBottom: '1px solid #f3f4f6'
                }}
                onMouseEnter={() => {
                  if (hasChildren) {
                    setActiveMenu(item.id);
                  }
                }}
                onMouseLeave={() => {
                  if (hasChildren) {
                    setActiveMenu(null);
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    background: isActive ? '#f3f4f6' : 'transparent',
                    color: '#111827',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    minHeight: '38px'
                  }}
                  onClick={() => {
                    if (item.path) {
                      handleItemClick(item.path);
                    }
                  }}
                >
                  <span>
                    {item.icon && <span style={{ marginRight: '8px' }}>{item.icon}</span>}
                    {item.label}
                  </span>
                  {hasChildren && (
                    <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '20px' }}>›</span>
                  )}
                </div>
                {hasChildren && isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '100%',
                      top: '0',
                      marginLeft: '2px',
                      zIndex: 99999
                    }}
                  >
                    {renderSubMenu(item.children!)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
