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
    id: 'users',
    label: 'Utilizadores',
    icon: '👥',
    children: [
      { id: 'users-list', label: 'Listar Utilizadores', icon: '📋', path: '/dashboard/administracao/utilizadores' },
      { id: 'users-create', label: 'Criar Utilizador', icon: '➕', path: '/dashboard/administracao/utilizadores/criar' },
      { id: 'users-edit', label: 'Editar Utilizador', icon: '✏️', path: '/dashboard/administracao/utilizadores/editar' },
    ]
  },
  {
    id: 'profiles',
    label: 'Perfis e Permissões',
    icon: '👤',
    children: [
      { id: 'profiles-list', label: 'Listar Perfis', icon: '📋', path: '/dashboard/administracao/perfis' },
      { id: 'profiles-create', label: 'Criar Perfil', icon: '➕', path: '/dashboard/administracao/perfis/criar' },
      { id: 'profiles-permissions', label: 'Permissões', icon: '🔐', path: '/dashboard/administracao/perfis/permissoes' },
    ]
  },
  {
    id: 'businesses',
    label: 'Negócios',
    icon: '📦',
    children: [
      { id: 'businesses-list', label: 'Listar Negócios', icon: '📋', path: '/dashboard/administracao/negocios' },
      { id: 'businesses-create', label: 'Criar Negócio', icon: '➕', path: '/dashboard/administracao/negocios/criar' },
    ]
  },
  {
    id: 'categories',
    label: 'Categorias de Produtos',
    icon: '🏷️',
    children: [
      { id: 'categories-list', label: 'Listar Categorias', icon: '📋', path: '/dashboard/administracao/categorias' },
      { id: 'categories-create', label: 'Criar Categoria', icon: '➕', path: '/dashboard/administracao/categorias/criar' },
    ]
  },
  {
    id: 'fields',
    label: 'Campos dos Produtos',
    icon: '📋',
    children: [
      { id: 'fields-list', label: 'Listar Campos', icon: '📋', path: '/dashboard/administracao/campos' },
      { id: 'fields-create', label: 'Criar Campo', icon: '➕', path: '/dashboard/administracao/campos/criar' },
    ]
  },
  {
    id: 'qrcodes',
    label: 'QR Codes',
    icon: '📱',
    path: '/dashboard/administracao/qrcodes'
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
    id: 'logs',
    label: 'Logs / Auditoria',
    icon: '📊',
    path: '/dashboard/administracao/logs'
  },
  {
    id: 'settings',
    label: 'Configurações Gerais',
    icon: '⚙️',
    path: '/dashboard/administracao/configuracoes'
  },
];

// Submenu flutuante
function SubMenu({ items, onItemClick, parentRef }: { 
  items: MenuItem[]; 
  onItemClick: (path: string) => void;
  parentRef: React.RefObject<HTMLDivElement>;
}) {
  const [subOpen, setSubOpen] = useState<string | null>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);

  // Fechar submenu quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subMenuRef.current && !subMenuRef.current.contains(event.target as Node)) {
        setSubOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={subMenuRef}
      style={{
        position: 'absolute',
        left: '100%',
        top: '0',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        border: '1px solid #e5e7eb',
        minWidth: '220px',
        padding: '4px 0',
        zIndex: 1000,
        animation: 'slideIn 0.15s ease-out'
      }}
    >
      {items.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const isOpen = subOpen === item.id;

        return (
          <div 
            key={item.id} 
            style={{ position: 'relative' }}
            onMouseEnter={() => {
              if (hasChildren) {
                setSubOpen(item.id);
              }
            }}
            onMouseLeave={() => {
              if (hasChildren) {
                setTimeout(() => setSubOpen(null), 100);
              }
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#374151',
                fontSize: '14px',
                transition: 'all 0.15s ease',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onClick={() => {
                if (item.path) {
                  onItemClick(item.path);
                  setSubOpen(null);
                }
              }}
            >
              {item.icon && <span style={{ fontSize: '16px' }}>{item.icon}</span>}
              <span style={{ flex: 1 }}>{item.label}</span>
              {hasChildren && (
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>▶</span>
              )}
            </div>
            {hasChildren && isOpen && (
              <SubMenu 
                items={item.children} 
                onItemClick={onItemClick}
                parentRef={subMenuRef}
              />
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

export default function MenuAdmin({ onItemClick }: { onItemClick?: (path: string) => void }) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (path: string) => {
    if (onItemClick) onItemClick(path);
    router.push(path);
    setOpenMenu(null);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Botão principal */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: openMenu ? '#e5e7eb' : 'transparent',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          color: '#111827',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f3f4f6';
        }}
        onMouseLeave={(e) => {
          if (!openMenu) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
        onClick={() => {
          setOpenMenu(openMenu === 'admin' ? null : 'admin');
        }}
      >
        <span>⚙️</span>
        <span>Administração</span>
        <span style={{ 
          fontSize: '12px', 
          transition: 'transform 0.2s',
          transform: openMenu === 'admin' ? 'rotate(180deg)' : 'rotate(0deg)',
          color: '#9ca3af'
        }}>
          ▼
        </span>
      </div>

      {/* Menu dropdown */}
      {openMenu === 'admin' && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            marginTop: '4px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            minWidth: '220px',
            padding: '4px 0',
            zIndex: 999
          }}
        >
          {menuConfig.map((item) => {
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.id} style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#374151',
                    fontSize: '14px',
                    transition: 'all 0.15s ease',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => {
                    if (item.path) {
                      handleItemClick(item.path);
                    }
                  }}
                >
                  {item.icon && <span style={{ fontSize: '16px' }}>{item.icon}</span>}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {hasChildren && (
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>▶</span>
                  )}
                </div>
                {hasChildren && (
                  <SubMenu 
                    items={item.children} 
                    onItemClick={handleItemClick}
                    parentRef={menuRef}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
