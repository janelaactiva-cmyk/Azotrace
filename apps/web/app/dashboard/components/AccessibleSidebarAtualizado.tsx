'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';

type NavigationItem = {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  path?: string;
  children?: NavigationItem[];
};

type AccessibleSidebarProps = {
  isDark: boolean;
  sidebarActive: string;
  sidebarTextColor: string;
  sidebarSubtext: string;
  isSidebarExpanded: boolean;
  accentColor: string;
  isMobile?: boolean;
  isPinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  onNavigate?: () => void;
};

const productionItem: NavigationItem = {
  id: 'producao',
  label: 'Produção',
  icon: '🏭',
  description: 'Operação diária do negócio ativo.',
  children: [
    { id: 'producao-inserir', label: 'Inserir dados', icon: '✍️', path: '/dashboard/producao/inserir-dados' },
    { id: 'producao-registos', label: 'Registos', icon: '📋', path: '/dashboard/producao/registos' },
    { id: 'producao-etapas', label: 'Etapas', icon: '🧭', path: '/dashboard/producao/etapas' },
    { id: 'producao-qualidade', label: 'Qualidade', icon: '✅', path: '/dashboard/producao/qualidade' },
    { id: 'producao-importar', label: 'Importar dados', icon: '📥', path: '/dashboard/producao/importar' },
    { id: 'producao-unidades', label: 'Unidades de produção', icon: '🏗️', path: '/dashboard/producao/unidades' },
    { id: 'produtos', label: 'Produtos', icon: '📦', description: 'Produtos e configuração dos respetivos dados.', path: '/dashboard/produtos' },
    { id: 'lotes', label: 'Lotes', icon: '🗂️', description: 'Lotes e respetiva origem.', path: '/dashboard/lotes' },
  ],
};

const traceabilityItem: NavigationItem = {
  id: 'rastreabilidade',
  label: 'Rastreabilidade',
  icon: '🔗',
  description: 'Publicação para o consumidor, relatórios e validação.',
  children: [
    {
      id: 'publicacao-qr',
      label: 'Publicação e QR',
      icon: '▦',
      description: 'Escolher dados públicos, atualizar a página e imprimir o QR.',
      path: '/dashboard/publicacao',
    },
    {
      id: 'report-bi',
      label: 'Report / BI',
      icon: '📈',
      description: 'Relatórios e indicadores do negócio.',
      path: '/dashboard/analytics',
    },
    {
      id: 'blockchain',
      label: 'Blockchain',
      icon: '⛓️',
      description: 'Histórico e validação blockchain.',
      path: '/dashboard/blockchain',
    },
  ],
};

const administrationItem: NavigationItem = {
  id: 'administracao',
  label: 'Administração',
  icon: '⚙️',
  description: 'Configuração da empresa, equipa, privacidade e subscrição.',
  children: [
    {
      id: 'negocio-config',
      label: 'Negócio',
      icon: '🏢',
      description: 'Dados e configuração do negócio ativo.',
      path: '/dashboard/administracao/negocios',
    },
    {
      id: 'users',
      label: 'Utilizadores',
      icon: '👥',
      description: 'Contas, perfis, permissões e acessos.',
      path: '/dashboard/administracao/utilizadores',
    },
    {
      id: 'rgpd',
      label: 'RGPD / Privacidade',
      icon: '🔒',
      description: 'Privacidade, consentimentos e direitos dos titulares.',
      path: '/dashboard/administracao/rgpd/politica',
    },
    {
      id: 'seguranca',
      label: 'Segurança',
      icon: '🛡️',
      description: 'Auditoria e monitorização dos acessos e ações.',
      path: '/dashboard/administracao/logs/acesso',
    },
    {
      id: 'pagamentos-subscricoes',
      label: 'Pagamentos e subscrições',
      icon: '💳',
      description: 'Planos, pagamentos e subscrições.',
      path: '/dashboard/subscricoes',
    },
  ],
};

const mainItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    description: 'Visão geral da atividade.',
    path: '/dashboard',
  },
  productionItem,
  traceabilityItem,
  administrationItem,
];

function itemContainsPath(item: NavigationItem, pathname: string): boolean {
  if (item.path === pathname) return true;
  if (item.path && item.path !== '/dashboard' && pathname.startsWith(`${item.path}/`)) return true;
  return Boolean(item.children?.some((child) => itemContainsPath(child, pathname)));
}

const EXTENDED_WIDTH = 248;
const CONTEXT_WIDTH = 320;

function AccordionItem({
  item,
  pathname,
  openIds,
  toggle,
  isDark,
  sidebarActive,
  sidebarTextColor,
  sidebarSubtext,
  accentColor,
  depth = 0,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  openIds: Set<string>;
  toggle: (id: string) => void;
  isDark: boolean;
  sidebarActive: string;
  sidebarTextColor: string;
  sidebarSubtext: string;
  accentColor: string;
  depth?: number;
  onNavigate?: () => void;
}) {
  const hasChildren = Boolean(item.children?.length);
  const open = openIds.has(item.id);
  const active = itemContainsPath(item, pathname);
  const rowStyle: CSSProperties = {
    width: '100%',
    minHeight: '42px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid transparent',
    background: active ? sidebarActive : 'transparent',
    color: active ? sidebarTextColor : sidebarSubtext,
    textDecoration: 'none',
    textAlign: 'left',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    boxSizing: 'border-box',
  };

  return (
    <li style={{ listStyle: 'none' }}>
      {hasChildren ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`accordion-${item.id}`}
          onClick={() => toggle(item.id)}
          style={rowStyle}
        >
          <span aria-hidden="true" style={{ width: '23px', textAlign: 'center', fontSize: '17px', flexShrink: 0 }}>
            {item.icon ?? '•'}
          </span>
          <span style={{ flex: 1 }}>{item.label}</span>
          <span aria-hidden="true" style={{ fontSize: '15px', lineHeight: 1, fontWeight: 700 }}>{open ? '▴' : '▾'}</span>
        </button>
      ) : (
        <Link
          href={item.path!}
          aria-current={item.path === pathname ? 'page' : undefined}
          onClick={onNavigate}
          style={rowStyle}
        >
          <span aria-hidden="true" style={{ width: '23px', textAlign: 'center', fontSize: '17px', flexShrink: 0 }}>
            {item.icon ?? '•'}
          </span>
          <span style={{ flex: 1 }}>{item.label}</span>
        </Link>
      )}

      {hasChildren && open && (
        <ul
          id={`accordion-${item.id}`}
          style={{
            margin: '4px 0 5px 14px',
            padding: '2px 0 2px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            borderLeft: `3px solid ${accentColor}`,
          }}
        >
          {item.children!.map((child) => (
            <AccordionItem
              key={child.id}
              item={child}
              pathname={pathname}
              openIds={openIds}
              toggle={toggle}
              isDark={isDark}
              sidebarActive={sidebarActive}
              sidebarTextColor={sidebarTextColor}
              sidebarSubtext={sidebarSubtext}
              accentColor={accentColor}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function MobileItem({
  item,
  pathname,
  openIds,
  toggle,
  isDark,
  sidebarActive,
  sidebarTextColor,
  sidebarSubtext,
  accentColor,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  openIds: Set<string>;
  toggle: (id: string) => void;
  isDark: boolean;
  sidebarActive: string;
  sidebarTextColor: string;
  sidebarSubtext: string;
  accentColor: string;
  onNavigate?: () => void;
}) {
  const hasChildren = Boolean(item.children?.length);
  const open = openIds.has(item.id);
  const active = itemContainsPath(item, pathname);
  const style: CSSProperties = {
    width: '100%',
    minHeight: '46px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 10px',
    borderRadius: '9px',
    border: '1px solid transparent',
    background: active ? sidebarActive : 'transparent',
    color: active ? sidebarTextColor : sidebarSubtext,
    fontFamily: 'inherit',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    textAlign: 'left',
    cursor: 'pointer',
    boxSizing: 'border-box',
  };

  return (
    <li style={{ listStyle: 'none' }}>
      {hasChildren ? (
        <button type="button" aria-expanded={open} onClick={() => toggle(item.id)} style={style}>
          <span aria-hidden="true" style={{ width: '26px', textAlign: 'center', fontSize: '19px' }}>{item.icon}</span>
          <span style={{ flex: 1 }}>{item.label}</span>
          <span aria-hidden="true" style={{ fontSize: '15px', lineHeight: 1, fontWeight: 700 }}>{open ? '▴' : '▾'}</span>
        </button>
      ) : (
        <Link href={item.path!} onClick={onNavigate} aria-current={item.path === pathname ? 'page' : undefined} style={style}>
          <span aria-hidden="true" style={{ width: '26px', textAlign: 'center', fontSize: '19px' }}>{item.icon}</span>
          <span style={{ flex: 1 }}>{item.label}</span>
        </Link>
      )}
      {hasChildren && open && (
        <ul style={{ margin: '4px 0 6px 15px', padding: '2px 0 2px 12px', borderLeft: `3px solid ${accentColor}`, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {item.children!.map((child) => (
            <MobileItem
              key={child.id}
              item={child}
              pathname={pathname}
              openIds={openIds}
              toggle={toggle}
              isDark={isDark}
              sidebarActive={sidebarActive}
              sidebarTextColor={sidebarTextColor}
              sidebarSubtext={sidebarSubtext}
              accentColor={accentColor}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function AccessibleSidebarAtualizado({
  isDark,
  sidebarActive,
  sidebarTextColor,
  sidebarSubtext,
  isSidebarExpanded,
  accentColor,
  isMobile = false,
  isPinned = false,
  onNavigate,
}: AccessibleSidebarProps) {
  const pathname = usePathname();
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSidebarExpanded && !isPinned) {
      setOpenIds(new Set());
    }
  }, [isSidebarExpanded, isPinned]);

  const toggle = (id: string) => {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedRoot = selectedRootId
    ? mainItems.find((item) => item.id === selectedRootId) ?? null
    : null;

  useEffect(() => {
    setSelectedRootId(null);
    setOpenIds(new Set());
  }, [pathname]);

  if (isMobile) {
    return (
      <nav aria-label="Navegação principal do dashboard" style={{ width: '100%' }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: 0, padding: 0 }}>
          {mainItems.map((item) => (
            <MobileItem
              key={item.id}
              item={item}
              pathname={pathname}
              openIds={openIds}
              toggle={toggle}
              isDark={isDark}
              sidebarActive={sidebarActive}
              sidebarTextColor={sidebarTextColor}
              sidebarSubtext={sidebarSubtext}
              accentColor={accentColor}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navegação principal do dashboard"
      onMouseLeave={(event) => {
        if (!isPinned) return;
        const nextTarget = event.relatedTarget as Node | null;
        if (!event.currentTarget.contains(nextTarget)) {
          setSelectedRootId(null);
          setOpenIds(new Set());
        }
      }}
      style={{ position: 'relative', width: '100%' }}
    >
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: 0, padding: 0 }}>
        {mainItems.map((item) => {
          const active = itemContainsPath(item, pathname);
          const selected = selectedRoot?.id === item.id;
          const base: CSSProperties = {
            width: '100%',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
            gap: isSidebarExpanded ? '10px' : 0,
            padding: isSidebarExpanded ? '8px 10px' : '8px 6px',
            borderRadius: '9px',
            border: `1px solid ${selected ? (isDark ? '#4b5563' : '#d1d5db') : 'transparent'}`,
            background: active || selected ? sidebarActive : 'transparent',
            color: active || selected ? sidebarTextColor : sidebarSubtext,
            textDecoration: 'none',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: active || selected ? 700 : 500,
            textAlign: 'left',
            cursor: 'pointer',
            boxSizing: 'border-box',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'padding 180ms ease, gap 180ms ease, background 120ms ease, color 120ms ease',
          };

          const icon = (
            <span
              aria-hidden="true"
              style={{
                width: '26px',
                minWidth: '26px',
                textAlign: 'center',
                fontSize: '20px',
                lineHeight: 1,
              }}
            >
              {item.icon}
            </span>
          );

          if (item.children?.length) {
            return (
              <li key={item.id} style={{ listStyle: 'none' }}>
                <button
                  type="button"
                  title={!isSidebarExpanded ? item.label : undefined}
                  aria-label={item.label}
                  aria-expanded={selected}
                  onMouseEnter={() => setSelectedRootId(item.id)}
                  onFocus={() => setSelectedRootId(item.id)}
                  onClick={() => setSelectedRootId(item.id)}
                  style={base}
                >
                  {icon}
                  {isSidebarExpanded && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                  {isSidebarExpanded && <span aria-hidden="true" style={{ fontSize: '17px' }}>›</span>}
                </button>
              </li>
            );
          }

          return (
            <li key={item.id} style={{ listStyle: 'none' }}>
              <Link
                href={item.path!}
                title={!isSidebarExpanded ? item.label : undefined}
                aria-label={item.label}
                aria-current={item.path === pathname ? 'page' : undefined}
                onMouseEnter={() => {
                  setSelectedRootId(null);
                  setOpenIds(new Set());
                }}
                onFocus={() => {
                  setSelectedRootId(null);
                  setOpenIds(new Set());
                }}
                onClick={() => {
                  setSelectedRootId(null);
                  setOpenIds(new Set());
                  onNavigate?.();
                }}
                style={base}
              >
                {icon}
                {isSidebarExpanded && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      {isSidebarExpanded && selectedRoot?.children?.length && (
        <aside
          aria-label={`Opções de ${selectedRoot.label}`}
          style={{
            position: 'fixed',
            left: `${EXTENDED_WIDTH}px`,
            top: 0,
            bottom: 0,
            width: `${CONTEXT_WIDTH}px`,
            height: '100vh',
            padding: '18px 12px 16px',
            boxSizing: 'border-box',
            background: isDark ? '#1f2937' : '#ffffff',
            borderLeft: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            borderRight: `4px solid ${accentColor}`,
            boxShadow: isDark ? '12px 0 28px rgba(0,0,0,.28)' : '12px 0 28px rgba(15,23,42,.16)',
            zIndex: 1190,
            overflowY: 'auto',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '11px',
              padding: '4px 8px 15px',
              marginBottom: '9px',
              borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '24px', marginTop: '1px' }}>{selectedRoot.icon}</span>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, color: sidebarTextColor, fontSize: '15px', lineHeight: 1.25 }}>{selectedRoot.label}</h2>
              {selectedRoot.description && (
                <p style={{ margin: '6px 0 0', color: sidebarSubtext, fontSize: '12px', lineHeight: 1.5 }}>
                  {selectedRoot.description}
                </p>
              )}
            </div>
          </header>

          <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {selectedRoot.children!.map((child) => (
              <AccordionItem
                key={child.id}
                item={child}
                pathname={pathname}
                openIds={openIds}
                toggle={toggle}
                isDark={isDark}
                sidebarActive={sidebarActive}
                sidebarTextColor={sidebarTextColor}
                sidebarSubtext={sidebarSubtext}
                accentColor={accentColor}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </aside>
      )}
    </nav>
  );
}