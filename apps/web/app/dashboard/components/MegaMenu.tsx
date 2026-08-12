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
    label: '📋 Geral',
    children: [
      { id: 'geral-config', label: '⚙️ Configurações Gerais', path: '/dashboard/administracao/configuracoes' },
      { id: 'geral-empresa', label: '🏢 Dados da Empresa', path: '/dashboard/administracao/empresa' },
    ]
  },
  {
    id: 'produtos',
    label: '📦 Produtos',
    children: [
      { 
        id: 'produtos-categorias', 
        label: '🏷️ Categorias de Produtos',
        children: [
          { id: 'categorias-list', label: '📋 Listar Categorias', path: '/dashboard/administracao/categorias' },
          { id: 'categorias-create', label: '➕ Criar Categoria', path: '/dashboard/administracao/categorias/criar' },
          { 
            id: 'categorias-sub', 
            label: '📂 Subcategorias',
            children: [
              { id: 'sub-list', label: '📋 Listar Subcategorias', path: '/dashboard/administracao/subcategorias' },
              { id: 'sub-create', label: '➕ Criar Subcategoria', path: '/dashboard/administracao/subcategorias/criar' },
            ]
          }
        ]
      },
      { id: 'produtos-campos', label: '📋 Campos dos Produtos', path: '/dashboard/administracao/campos' },
      { id: 'produtos-negocios', label: '📊 Negócios', path: '/dashboard/administracao/negocios' },
    ]
  },
  {
    id: 'users',
    label: '👥 Utilizadores',
    children: [
      { id: 'users-list', label: '📋 Listar Utilizadores', path: '/dashboard/administracao/utilizadores' },
      { id: 'users-create', label: '➕ Criar Utilizador', path: '/dashboard/administracao/utilizadores/criar' },
      { id: 'users-edit', label: '✏️ Editar Utilizador', path: '/dashboard/administracao/utilizadores/editar' },
      { id: 'users-perfis', label: '👤 Perfis e Permissões', path: '/dashboard/administracao/perfis' },
    ]
  },
  {
    id: 'rgpd',
    label: '🔒 RGPD / Privacidade',
    children: [
      { id: 'rgpd-policy', label: '📄 Política de Privacidade', path: '/dashboard/administracao/rgpd/politica' },
      { id: 'rgpd-consents', label: '✅ Consentimentos', path: '/dashboard/administracao/rgpd/consentimentos' },
      { 
        id: 'rgpd-requests', 
        label: '📋 Pedidos dos Titulares',
        children: [
          { id: 'rgpd-requests-list', label: '📋 Listar Pedidos', path: '/dashboard/administracao/rgpd/pedidos' },
          { id: 'rgpd-requests-new', label: '➕ Novo Pedido', path: '/dashboard/administracao/rgpd/pedidos/novo' },
          { 
            id: 'rgpd-requests-history', 
            label: '📜 Histórico de Pedidos',
            children: [
              { id: 'history-2024', label: '📅 2024', path: '/dashboard/administracao/rgpd/historico/2024' },
              { id: 'history-2025', label: '📅 2025', path: '/dashboard/administracao/rgpd/historico/2025' },
              { id: 'history-2026', label: '📅 2026', path: '/dashboard/administracao/rgpd/historico/2026' },
            ]
          }
        ]
      },
      { id: 'rgpd-export', label: '📤 Exportação de Dados', path: '/dashboard/administracao/rgpd/exportacao' },
      { id: 'rgpd-delete', label: '🗑️ Apagamento / Anonimização', path: '/dashboard/administracao/rgpd/apagamento' },
      { id: 'rgpd-retention', label: '📅 Retenção de Dados', path: '/dashboard/administracao/rgpd/retencao' },
      { id: 'rgpd-contractors', label: '🤝 Subcontratantes', path: '/dashboard/administracao/rgpd/subcontratantes' },
      { id: 'rgpd-activities', label: '📝 Registo de Atividades', path: '/dashboard/administracao/rgpd/atividades' },
    ]
  },
  {
    id: 'seguranca',
    label: '🛡️ Segurança',
    children: [
      { 
        id: 'seguranca-logs', 
        label: '📊 Logs / Auditoria',
        children: [
          { id: 'logs-acesso', label: '🔐 Logs de Acesso', path: '/dashboard/administracao/logs/acesso' },
          { id: 'logs-accao', label: '📝 Logs de Ações', path: '/dashboard/administracao/logs/acoes' },
          { id: 'logs-erro', label: '❌ Logs de Erros', path: '/dashboard/administracao/logs/erros' },
        ]
      },
      { id: 'seguranca-qrcodes', label: '📱 QR Codes', path: '/dashboard/administracao/qrcodes' },
    ]
  },
];

// Componente de Coluna (cada nível do mega-menu)
function MenuColumn({ 
  items, 
  onItemClick,
  onItemHover,
  level = 0,
  activeItemId = null
}: { 
  items: MenuItem[]; 
  onItemClick: (path: string) => void;
  onItemHover: (itemId: string | null, level: number) => void;
  level?: number;
  activeItemId?: string | null;
}) {
  return (
    <div style={{ 
      minWidth: '220px',
      maxWidth: '220px',
      background: 'white',
      padding: '0',
      borderRight: '1px solid #e5e7eb',
      flexShrink: 0,
      maxHeight: '500px',
      overflowY: 'auto'
    }}>
      {items.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const isActive = activeItemId === item.id;

        return (
          <div 
            key={item.id}
            style={{ 
              borderBottom: '1px solid #f0f0f0',
              background: isActive ? '#f3f4f6' : 'transparent'
            }}
            onMouseEnter={() => {
              if (hasChildren) {
                onItemHover(item.id, level);
              }
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
                fontWeight: isActive ? '500' : '400'
              }}
              onClick={() => {
                if (item.path) {
                  onItemClick(item.path);
                }
              }}
            >
              <span>{item.label}</span>
              {hasChildren && (
                <span style={{ 
                  fontSize: '14px', 
                  color: '#9ca3af',
                  marginLeft: '20px'
                }}>
                  ›
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MegaMenu({ onItemClick }: { onItemClick?: (path: string) => void }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoverStack, setHoverStack] = useState<string[]>([]);

  // Fechar menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHoverStack([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Construir a pilha de menus com base nos hovers
  const buildMenuStack = () => {
    const stack: MenuItem[][] = [];
    let currentItems = menuConfig;
    stack.push(currentItems);

    for (let i = 0; i < hoverStack.length; i++) {
      const id = hoverStack[i];
      const found = currentItems.find(item => item.id === id);
      if (found && found.children) {
        currentItems = found.children;
        stack.push(currentItems);
      } else {
        break;
      }
    }

    return stack;
  };

  const menuStack = buildMenuStack();

  const handleItemHover = (itemId: string, level: number) => {
    // Remove todos os itens após este nível
    const newStack = hoverStack.slice(0, level);
    newStack.push(itemId);
    setHoverStack(newStack);
  };

  const handleItemClick = (path: string) => {
    if (onItemClick) onItemClick(path);
    router.push(path);
    setIsOpen(false);
    setHoverStack([]);
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
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setHoverStack([]);
        }}
      >
        <span>⚙️ Administração</span>
      </div>

      {/* MegaMenu - Múltiplas Colunas */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            left: '250px',
            top: '80px',
            zIndex: 99999,
            display: 'flex',
            background: 'white',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e5e7eb',
            maxHeight: '70vh',
            overflow: 'hidden'
          }}
        >
          {menuStack.map((items, index) => {
            // Determinar qual item está ativo neste nível
            const activeId = index < hoverStack.length ? hoverStack[index] : null;
            
            return (
              <MenuColumn
                key={index}
                items={items}
                onItemClick={handleItemClick}
                onItemHover={handleItemHover}
                level={index}
                activeItemId={activeId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
