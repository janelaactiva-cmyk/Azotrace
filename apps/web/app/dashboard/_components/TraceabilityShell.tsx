
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { BusinessWorkspaceSwitcher } from './BusinessWorkspaceSwitcher';
import styles from './traceability.module.css';

export { styles as traceStyles };

export function TraceabilityShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <BusinessWorkspaceSwitcher />
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className={styles.headerActions}>{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}

export function EmptyWorkspace({ label = 'Conclui primeiro o onboarding deste negócio.' }: { label?: string }) {
  return (
    <section className={styles.empty}>
      <strong>Negócio ainda não configurado</strong>
      <p>{label}</p>
      <Link href="/dashboard/onboarding" className={styles.primary}>Continuar configuração</Link>
    </section>
  );
}
