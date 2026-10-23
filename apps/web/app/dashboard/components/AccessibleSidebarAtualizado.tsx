'use client';



import Link from 'next/link';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { usePathname } from 'next/navigation';

import {

  BarChart3,

  Building2,

  CheckCircle,

  ChevronDown,

  ChevronRight,

  ChevronUp,

  ClipboardList,

  CreditCard,

  Factory,

  Pencil,

  Layers,

  LayoutDashboard,

  Link2,
  Mail,

  Lock,

  MessageCircle,

  Package,

  QrCode,

  Route,

  Settings,

  Shield,

  Upload,

  Users,

  Warehouse,

  type LucideIcon,

} from 'lucide-react';



import { hasPermission, type LocalPermission, type LocalUserRole } from '../_lib/local-users';

import { useLocalUser } from '../_lib/use-local-user';

import { administrationItem } from '../_lib/admin-navigation';



export type NavigationItem = {

  id: string;

  label: string;

  icon: LucideIcon;

  description?: string;

  path?: string;

  permission?: LocalPermission;

  roles?: LocalUserRole[];

  disabled?: boolean;

  children?: NavigationItem[];

};



type AccessibleSidebarProps = {

  isDark: boolean;

  sidebarActive: string;

  sidebarTextColor: string;

  sidebarSubtext: string;

  isSidebarExpanded: boolean;

  accentColor: string;

  businessId?: string | null;

  isMobile?: boolean;

  isPinned?: boolean;

  onPinnedChange?: (pinned: boolean) => void;

  onNavigate?: () => void;

  closeRequest?: number;

  onFlyoutChange?: (open: boolean) => void;

};



const productionItem: NavigationItem = {

  id: 'producao',

  label: 'Produção',

  icon: Factory,

  description: 'Operação diária do negócio ativo.',

  children: [

    { id: 'producao-inserir', label: 'Inserir dados', icon: Pencil, path: '/dashboard/producao/inserir-dados', permission: 'production.write' },

    { id: 'producao-registos', label: 'Registos', icon: ClipboardList, path: '/dashboard/producao/registos', permission: 'production.read' },

    { id: 'producao-etapas', label: 'Etapas', icon: Route, path: '/dashboard/producao/etapas', permission: 'production.read' },

    { id: 'producao-qualidade', label: 'Qualidade', icon: CheckCircle, path: '/dashboard/producao/qualidade', permission: 'production.read' },

    { id: 'producao-importar', label: 'Importar dados', icon: Upload, path: '/dashboard/producao/importar', permission: 'production.write' },

    { id: 'producao-unidades', label: 'Unidades de produção', icon: Warehouse, path: '/dashboard/producao/unidades', permission: 'production.read' },

    { id: 'produtos', label: 'Produtos', icon: Package, path: '/dashboard/produtos', permission: 'products.manage' },

    { id: 'lotes', label: 'Lotes', icon: Layers, path: '/dashboard/lotes', permission: 'lots.manage' },

  ],

};



const traceabilityItem: NavigationItem = {

  id: 'rastreabilidade',

  label: 'Rastreabilidade',

  icon: Link2,

  description: 'Publicação para o consumidor e validação.',

  children: [

    { id: 'publicacao-qr', label: 'Publicação e QR', icon: QrCode, path: '/dashboard/publicacao', permission: 'traceability.manage' },

    { id: 'blockchain', label: 'Blockchain', icon: Link2, path: '/dashboard/blockchain', permission: 'blockchain.view' },

  ],

};



const SUPERADMIN_ITEMS: NavigationItem[] = [
  {
    id: 'superadmin-visao-geral',
    label: 'Visão geral',
    icon: LayoutDashboard,
    description: 'Dashboard: resumo da plataforma, empresas, receita, atividade e alertas.',
    roles: ['superadmin'],
    children: [
      { id: 'superadmin-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { id: 'superadmin-reports-bi', label: 'Reports / BI', icon: BarChart3, path: '/dashboard/super-admin/relatorios-bi', description: 'Relatórios e indicadores globais da plataforma.' },
    ],
  },
  {
    id: 'superadmin-clientes',
    label: 'Clientes e acessos',
    icon: Building2,
    description: 'Empresas clientes, utilizadores, funções e permissões.',
    roles: ['superadmin'],
    children: [
      { id: 'superadmin-empresas', label: 'Empresas clientes', icon: Building2, path: '/dashboard/super-admin/empresas', description: 'Lista e gestão das empresas.' },
      ...(administrationItem.children?.filter((item) => item.label === 'Utilizadores') ?? []),
    ],
  },
  {
    id: 'superadmin-faturacao',
    label: 'Planos e faturação',
    icon: CreditCard,
    description: 'Planos, subscrições e pagamentos da plataforma.',
    roles: ['superadmin'],
    children: [
      { id: 'superadmin-planos', label: 'Planos de pagamento', icon: CreditCard, path: '/dashboard/subscricoes/planos', description: 'Preços, funcionalidades e limites.' },
      ...(administrationItem.children?.filter((item) => item.label === 'Pagamentos e subscrições') ?? []),
    ],
  },
  {
    id: 'superadmin-apoio',
    label: 'Apoio',
    icon: MessageCircle,
    description: 'Assistência automática e pedidos de suporte.',
    roles: ['superadmin'],
    children: [
      { id: 'superadmin-chatbot', label: 'Chatbot', icon: MessageCircle, path: '/dashboard/chatbot', description: 'Configuração e acompanhamento do assistente.' },
      { id: 'superadmin-tickets', label: 'Suporte / Tickets', icon: ClipboardList, path: '/dashboard/super-admin/suporte', description: 'Pedidos de ajuda e respetivo estado.' },
    ],
  },
  {
    id: 'superadmin-controlo',
    label: 'Controlo e sistema',
    icon: Settings,
    description: 'Auditoria, métricas, privacidade e opções gerais.',
    roles: ['superadmin'],
    children: [
      { id: 'superadmin-logs-metricas', label: 'Logs e métricas', icon: BarChart3, path: '/dashboard/super-admin/logs-metricas', description: 'Histórico de ações, erros e indicadores da plataforma.' },
      { id: 'superadmin-blockchain', label: 'Blockchain', icon: Link2, path: '/dashboard/super-admin/blockchain', description: 'Monitorização da cadeia, verificação dos registos e participantes.', roles: ['superadmin'] },
      ...(administrationItem.children?.filter((item) => item.label === 'RGPD / Privacidade').map((item) => ({ ...item, label: 'RGPD' })) ?? []),
      { id: 'superadmin-configuracoes', label: 'Configurações', icon: Settings, description: 'Segurança, dados da plataforma, preferências, emails e integrações.', children: [
        { id: 'superadmin-config-mfa', label: 'Autenticação multifator', icon: Shield, path: '/dashboard/administracao/configuracoes/multifator' },
        { id: 'superadmin-config-platform', label: 'Dados da plataforma', icon: Building2, path: '/dashboard/administracao/configuracoes/plataforma' },
        { id: 'superadmin-config-preferences', label: 'Preferências', icon: Settings, path: '/dashboard/administracao/configuracoes/preferencias' },
        { id: 'superadmin-config-emails', label: 'Emails e notificações', icon: Mail, path: '/dashboard/administracao/configuracoes/emails' },
        { id: 'superadmin-config-integrations', label: 'Integrações', icon: Link2, path: '/dashboard/administracao/configuracoes/integracoes' },
      ] },
    ],
  },
];

const ALL_ITEMS: NavigationItem[] = [

  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Visão geral da atividade.', path: '/dashboard', permission: 'dashboard.view' },

  productionItem,

  traceabilityItem,

  { id: 'report-bi', label: 'Report / BI', icon: BarChart3, description: 'Relatórios e indicadores.', path: '/dashboard/analytics', permission: 'reports.view' },

  { id: 'chatbot', label: 'Chatbot', icon: MessageCircle, description: 'Assistente reservado ao proprietário do sistema.', path: '/dashboard/chatbot', permission: 'chatbot.manage', roles: ['superadmin'] },

  administrationItem,
  { id: 'controlo-sistema', label: 'Controlo e sistema', icon: Settings, children: [
    { id: 'configuracoes', label: 'Configurações', icon: Settings, description: 'Segurança e preferências da conta.', children: [
      { id: 'config-empresa', label: 'Dados da empresa', icon: Building2, path: '/dashboard/administracao/empresa', roles: ['admin'] },
      { id: 'config-mfa', label: 'Autenticação multifator', icon: Shield, path: '/dashboard/administracao/configuracoes/multifator' },
      { id: 'config-preferencias', label: 'Preferências', icon: Settings, path: '/dashboard/administracao/configuracoes/preferencias' },
    ] },
  ] },

];



function itemContainsPath(item: NavigationItem, pathname: string): boolean {

  if (item.path === pathname) return true;

  if (item.path && item.path !== '/dashboard' && pathname.startsWith(`${item.path}/`)) return true;

  return Boolean(item.children?.some((child) => itemContainsPath(child, pathname)));

}



function filterItem(item: NavigationItem, user: ReturnType<typeof useLocalUser>, businessId?: string | null, administration = false): NavigationItem | null {

  // Para o Super Admin, preserva as opções da árvore de Administração
  // mesmo depois de as mover para as novas secções do menu.
  const adminTree = administration || item.id === 'administracao' || user.role === 'superadmin';

  if (item.roles && !item.roles.includes(user.role)) return null;

  if (item.permission && !hasPermission(user, item.permission, adminTree ? null : businessId)) {

    return adminTree && user.role === 'superadmin' ? { ...item, disabled: true } : null;

  }



  if (item.children?.length) {

    const children = item.children

      .map((child) => filterItem(child, user, businessId, adminTree))

      .filter((child): child is NavigationItem => Boolean(child));

    if (!children.length) return null;

    return { ...item, children };

  }



  return item;

}



const EXTENDED_WIDTH = 204;

const CONTEXT_WIDTH = 276;



function IconBox({ icon: Icon, active, accentColor, size = 18 }: { icon: LucideIcon; active: boolean; accentColor: string; size?: number }) {

  return (

    <span

      aria-hidden="true"

      style={{

        width: 26,

        minWidth: 26,

        height: 26,

        display: 'grid',

        placeItems: 'center',

        borderRadius: 8,

        color: active ? accentColor : 'currentColor',

        background: active ? `color-mix(in srgb, ${accentColor}, transparent 90%)` : 'transparent',

        transition: 'background 160ms ease, color 160ms ease',

      }}

    >

      <Icon size={size} strokeWidth={1.8} style={{ display: 'block', width: size, height: size, flexShrink: 0 }} />

    </span>

  );

}



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

  const rowStyle: CSSProperties = {

    width: '100%', minHeight: 35, display: 'flex', alignItems: 'center', gap: 7,

    padding: '5px 7px', borderRadius: 8, borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent',

    background: active ? sidebarActive : 'transparent', color: active ? sidebarTextColor : sidebarSubtext,

    textDecoration: 'none', textAlign: 'left', fontFamily: 'inherit', fontSize: 13,

    fontWeight: active ? 700 : 500, cursor: 'pointer', boxSizing: 'border-box',

  };

  const ItemIcon = item.icon;



  return (

    <li style={{ listStyle: 'none' }}>

      {hasChildren ? (

        <button type="button" aria-expanded={open} onClick={() => toggle(item.id)} style={rowStyle}>

          <IconBox icon={ItemIcon} active={active} accentColor={accentColor} size={17} />

          <span style={{ flex: 1 }}>{item.label}</span>

          {open ? <ChevronUp size={15} strokeWidth={1.8} /> : <ChevronDown size={15} strokeWidth={1.8} />}

        </button>

      ) : item.disabled ? (

        <button type="button" disabled title="Entre como Admin da empresa para usar esta opção." style={{ ...rowStyle, opacity: .55, cursor: 'not-allowed' }}>

          <IconBox icon={ItemIcon} active={false} accentColor={accentColor} size={17} />

          <span>{item.label}</span>

        </button>

      ) : (

        <Link href={item.path!} onClick={onNavigate} aria-current={item.path === pathname ? 'page' : undefined} style={rowStyle}>

          <IconBox icon={ItemIcon} active={active} accentColor={accentColor} size={17} />

          <span style={{ flex: 1 }}>{item.label}</span>

        </Link>

      )}

      {hasChildren && open ? (

        <ul style={{ margin: '4px 0 5px 14px', padding: '2px 0 2px 12px', display: 'flex', flexDirection: 'column', gap: 3, borderLeft: `3px solid ${accentColor}` }}>

          {item.children!.map((child) => (

            <AccordionItem key={child.id} item={child} pathname={pathname} openIds={openIds} toggle={toggle} isDark={isDark} sidebarActive={sidebarActive} sidebarTextColor={sidebarTextColor} sidebarSubtext={sidebarSubtext} accentColor={accentColor} onNavigate={onNavigate} />

          ))}

        </ul>

      ) : null}

    </li>

  );

}



function MobileItem(props: Parameters<typeof AccordionItem>[0]) {

  return <AccordionItem {...props} />;

}



export default function AccessibleSidebarAtualizado({

  isDark,

  sidebarActive,

  sidebarTextColor,

  sidebarSubtext,

  isSidebarExpanded,

  accentColor,

  businessId,

  isMobile = false,

  isPinned = false,

  onNavigate,

  closeRequest = 0,

  onFlyoutChange,

}: AccessibleSidebarProps) {

  const pathname = usePathname();

  const user = useLocalUser();

  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());



  const navigationItems = user.role === 'superadmin' ? SUPERADMIN_ITEMS : ALL_ITEMS;

  const mainItems = useMemo(

    () => navigationItems.map((item) => filterItem(item, user, businessId)).filter((item): item is NavigationItem => Boolean(item)),

    [navigationItems, user, businessId],

  );



  useEffect(() => {

    if (!isSidebarExpanded && !isPinned) { setOpenIds(new Set()); setSelectedRootId(null); }

  }, [isSidebarExpanded, isPinned]);



  useEffect(() => {

    setSelectedRootId(null);

    setOpenIds(new Set());

  }, [pathname]);



  useEffect(() => { setSelectedRootId(null); setOpenIds(new Set()); }, [closeRequest, user.id]);

  useEffect(() => {

    onFlyoutChange?.(Boolean(!isMobile && isSidebarExpanded && selectedRootId));

  }, [selectedRootId, isMobile, isSidebarExpanded, onFlyoutChange]);



  const toggle = (id: string) => {

    setOpenIds((previous) => {

      const next = new Set(previous);

      if (next.has(id)) next.delete(id);

      else next.add(id);

      return next;

    });

  };



  const selectedRoot = selectedRootId ? mainItems.find((item) => item.id === selectedRootId) ?? null : null;



  if (isMobile) {

    return (

      <nav aria-label="Navegação principal do dashboard" style={{ width: '100%' }}>

        <ul style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: 0, padding: 0 }}>

          {mainItems.map((item) => (

            <MobileItem key={item.id} item={item} pathname={pathname} openIds={openIds} toggle={toggle} isDark={isDark} sidebarActive={sidebarActive} sidebarTextColor={sidebarTextColor} sidebarSubtext={sidebarSubtext} accentColor={accentColor} onNavigate={onNavigate} />

          ))}

        </ul>

      </nav>

    );

  }



  return (

    <nav aria-label="Navegação principal do dashboard" style={{ position: 'relative', width: '100%' }}>

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: 0, padding: 0 }}>

        {mainItems.map((item) => {

          const active = itemContainsPath(item, pathname);

          const selected = selectedRoot?.id === item.id;

          const ItemIcon = item.icon;

          const highlighted = active || selected;

          const base: CSSProperties = {

            width: '100%', height: 36, display: 'flex', alignItems: 'center',

            justifyContent: isSidebarExpanded ? 'flex-start' : 'center', gap: isSidebarExpanded ? 10 : 0,

            padding: isSidebarExpanded ? '5px 7px' : '5px 4px', borderRadius: 9,

            borderWidth: 1, borderStyle: 'solid', borderColor: selected ? (isDark ? '#4b5563' : '#d1d5db') : 'transparent',

            background: highlighted ? sidebarActive : 'transparent', color: highlighted ? sidebarTextColor : sidebarSubtext,

            textDecoration: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: highlighted ? 700 : 500,

            textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', overflow: 'hidden', whiteSpace: 'nowrap',

          };

          const icon = <IconBox icon={ItemIcon} active={highlighted} accentColor={accentColor} size={19} />;



          if (item.children?.length) {

            return (

              <li key={item.id} style={{ listStyle: 'none' }}>

                <button type="button" aria-label={item.label} aria-expanded={selected} title={!isSidebarExpanded ? item.label : undefined} onMouseEnter={() => { setSelectedRootId(item.id); setOpenIds(new Set()); }} onFocus={() => setSelectedRootId(item.id)} onClick={() => setSelectedRootId(item.id)} style={base}>

                  {icon}

                  {isSidebarExpanded ? <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span> : null}

                  {isSidebarExpanded ? <ChevronRight size={16} strokeWidth={1.8} /> : null}

                </button>

              </li>

            );

          }



          return (

            <li key={item.id} style={{ listStyle: 'none' }}>

              <Link href={item.path!} title={!isSidebarExpanded ? item.label : undefined} onMouseEnter={() => setSelectedRootId(null)} onFocus={() => setSelectedRootId(null)} onClick={() => { setSelectedRootId(null); onNavigate?.(); }} style={base}>

                {icon}

                {isSidebarExpanded ? <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span> : null}

              </Link>

            </li>

          );

        })}

      </ul>



      {isSidebarExpanded && selectedRoot?.children?.length ? (

        <aside aria-label={`Opções de ${selectedRoot.label}`} style={{ position: 'fixed', left: EXTENDED_WIDTH, top: 0, bottom: 0, width: CONTEXT_WIDTH, height: '100dvh', padding: '12px 9px 10px', boxSizing: 'border-box', background: isDark ? '#1f2937' : '#fff', borderLeft: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRight: `4px solid ${accentColor}`, boxShadow: isDark ? '12px 0 28px rgba(0,0,0,.28)' : '12px 0 28px rgba(15,23,42,.16)', zIndex: 1190, overflowY: 'auto' }}>

          <header style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '4px 8px 15px', marginBottom: 9, borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}>

            <IconBox icon={selectedRoot.icon} active accentColor={accentColor} size={19} />

            <div>

              <h2 style={{ margin: 0, color: sidebarTextColor, fontSize: 15, fontWeight: 700 }}>{selectedRoot.label}</h2>

              {selectedRoot.description ? <p style={{ margin: '6px 0 0', color: sidebarSubtext, fontSize: 12, lineHeight: 1.5 }}>{selectedRoot.description}</p> : null}

            </div>

            <button type="button" aria-label="Fechar submenus" onClick={() => { setSelectedRootId(null); setOpenIds(new Set()); }} style={{ border: 0, background: 'transparent', color: sidebarTextColor, cursor: 'pointer', marginLeft: 'auto' }}>×</button>

          </header>

          <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>

            {selectedRoot.children!.map((child) => (

              <AccordionItem key={child.id} item={child} pathname={pathname} openIds={openIds} toggle={toggle} isDark={isDark} sidebarActive={sidebarActive} sidebarTextColor={sidebarTextColor} sidebarSubtext={sidebarSubtext} accentColor={accentColor} onNavigate={onNavigate} />

            ))}

          </ul>

        </aside>

      ) : null}

    </nav>

  );

}
