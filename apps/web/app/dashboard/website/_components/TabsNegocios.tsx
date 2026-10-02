'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    id: 'listar',
    label: 'Lista de Negócios',
    icon: '📋',
    href: '/dashboard/administracao/negocios',
  },
   {
    id: 'campos',
    label: 'Campos do Formulário',
    icon: '🧾',
    href: '/dashboard/administracao/negocios/campos',
  },
  
  {
    id: 'formulario',
    label: 'Formulário do Negócio',
    icon: '📝',
    href: '/dashboard/administracao/negocios/criar',
  },
 
  {
    id: 'template',
    label: 'Template do website',
    icon: '🎨',
    href: '/dashboard/administracao/negocios/template-website',
  },
];

export default function TabsNegocios() {
  const pathname = usePathname();

  // Descobre qual tab está ativa: a que tem o href MAIS LONGO que corresponde ao pathname atual
  const activeTab = tabs
    .filter((tab) => pathname === tab.href || pathname.startsWith(tab.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <nav
      aria-label="Subnavegação do negócio"
      style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '24px',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {tabs.map((tab) => {
        const active = activeTab?.id === tab.id;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '8px 8px 0 0',
              borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
              color: active ? '#2563eb' : '#6b7280',
              fontWeight: active ? 700 : 500,
              textDecoration: 'none',
              fontSize: '13px',
              transition: 'color 120ms ease, border-color 120ms ease',
            }}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}