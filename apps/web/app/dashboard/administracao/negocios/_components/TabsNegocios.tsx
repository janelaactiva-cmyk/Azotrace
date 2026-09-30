'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    id: 'formulario',
    label: 'Formulário do Negócio',
    icon: '📝',
    href: '/dashboard/administracao/negocios/criar',
  },
  {
    id: 'listar',
    label: 'Listar Negócios',
    icon: '📋',
    href: '/dashboard/administracao/negocios',
  },
];

export default function TabsNegocios() {
  const pathname = usePathname();

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
        // Ativo quando pathname é exatamente a href OU começa por ela (ex: /criar/xyz)
        const active =
          pathname === tab.href ||
          (tab.id === 'listar' && pathname.startsWith('/dashboard/administracao/negocios/') && !pathname.startsWith('/dashboard/administracao/negocios/criar'));

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