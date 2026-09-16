'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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

export default function MegaMenu({ onItemClick }: { onItemClick?: (path: string) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [isDark, setIsDark] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkTheme = () => {
      const darkActive = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
      setIsDark(darkActive);
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
        setActiveSubMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdministrationActive = pathname.startsWith('/dashboard/administracao');
  const isActive = isAdministrationActive || openMenu;

  const currentBackground = isActive 
    ? (isDark ? '#374151' : '#e5e7eb') 
    : 'transparent';

  const currentColor = isActive 
    ? (isDark ? '#ffffff' : '#111827') 
    : (isDark ? '#9ca3af' : '#6b7280');

  const handleItemClientClick = (path: string) => {
    if (onItemClick) onItemClick(path);
    router.push(path);
    setOpenMenu(false);
    setActiveSubMenu(null);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', width: '100%' }}>
      {/* Botão de Administração */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          background: currentBackground,
          color: currentColor,
          transition: 'background 0.15s ease, color 0.15s ease',
          fontSize: '14px',
          gap: '8px',
          width: '100%'
        }}
        onClick={() => {
          setOpenMenu(!openMenu);
          setActiveSubMenu(null);
        }}
      >
        <span>⚙️</span>
        <span style={{ flex: 1, fontWeight: isActive ? '600' : 'normal' }}>Administração</span>
        <span style={{ 
          fontSize: '10px', 
          transform: openMenu ? 'rotate(180deg)' : 'rotate(0deg)',
          color: currentColor
        }}>
          ▼
        </span>
      </div>

      {/* Caixa do Menu Flutuante Principal */}
      {openMenu && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            marginTop: '4px',
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            color: isDark ? '#e5e7eb' : '#111827',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
            minWidth: '240px',
            padding: '6px 0',
            zIndex: 9999
          }}
        >
          {menuConfig.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isSubOpen = activeSubMenu === item.id;

            return (
              <div key={item.id} style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    color: isDark ? '#e5e7eb' : '#111827',
                    fontSize: '14px',
                    gap: '10px',
                    whiteSpace: 'nowrap',
                    backgroundColor: isSubOpen ? (isDark ? '#374151' : '#f3f4f6') : 'transparent'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6'; }}
                  onMouseLeave={(e) => { 
                    if (!isSubOpen) e.currentTarget.style.backgroundColor = 'transparent'; 
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) {
                      setActiveSubMenu(isSubOpen ? null : item.id);
                    } else if (item.path) {
                      handleItemClientClick(item.path);
                    }
                  }}
                >
                  {item.icon && <span style={{ fontSize: '16px' }}>{item.icon}</span>}
                  <span style={{ flex: 1, fontWeight: 500 }}>{item.label}</span>
                  {hasChildren && <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>{isSubOpen ? '▼' : '▶'}</span>}
                </div>

                {/* Submenu lateral */}
                {hasChildren && isSubOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '100%',
                      top: '0',
                      backgroundColor: isDark ? '#1f2937' : '#ffffff',
                      color: isDark ? '#e5e7eb' : '#111827',
                      borderRadius: '8px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                      border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
                      minWidth: '220px',
                      padding: '6px 0',
                      zIndex: 10000,
                    }}
                  >
                    {item.children!.map((subItem) => (
                      <div
                        key={subItem.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          color: isDark ? '#e5e7eb' : '#111827',
                          fontSize: '14px',
                          gap: '8px',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (subItem.path) handleItemClientClick(subItem.path);
                        }}
                      >
                        {subItem.icon && <span style={{ fontSize: '16px' }}>{subItem.icon}</span>}
                        <span style={{ flex: 1 }}>{subItem.label}</span>
                      </div>
                    ))}
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