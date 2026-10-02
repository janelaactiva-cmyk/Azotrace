'use client';

import Link from 'next/link';

export type BreadcrumbItem = {
  label: string;
  href?: string; // se não tiver href, é o item atual (último)
};

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '16px' }}>
      <ol
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          fontSize: '12px',
          color: '#6b7280',
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isLast || !item.href ? (
                <span aria-current="page" style={{ fontWeight: 700, color: '#111827' }}>
                  {item.label}
                </span>
              ) : (
                <>
                  <Link href={item.href} style={{ color: '#2563eb', textDecoration: 'none' }}>
                    {item.label}
                  </Link>
                  <span aria-hidden="true" style={{ color: '#9ca3af' }}>›</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}