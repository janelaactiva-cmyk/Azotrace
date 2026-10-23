'use client';
import Link from 'next/link';
import CompanyDetailsPanel from '~/components/CompanyDetailsPanel';
import { useLocalUser } from '../../_lib/use-local-user';
import { useTheme } from '~/lib/theme-context';
import { loadOnlineContext } from '../../_lib/online-billing';
import styles from '~/components/company-details.module.css';

export default function EmpresaClient() {
  const user = useLocalUser();
  const { theme } = useTheme();
  if (!user.id) return <p role="status">A validar a sessão…</p>;
  if (user.role === 'superadmin') return <div className={styles.root} data-theme={theme}><h1>Dados das empresas</h1><Link className={styles.button} href="/dashboard/super-admin/empresas">Abrir empresas clientes</Link></div>;
  if (!user.active || user.role !== 'admin' || !user.companyId) return <p role="alert">Só o admin pode consultar e editar a ficha da sua empresa.</p>;
  return <div className={styles.root} data-theme={theme}><header><h1>Dados da empresa</h1><p className={styles.caption}>Dados partilhados com a equipa Azotrace. As alterações guardadas ficam disponíveis na mesma ficha.</p></header><CompanyDetailsPanel key={user.companyId} companyId={user.companyId} showHistory onSaved={() => void loadOnlineContext().catch(() => undefined)}/></div>;
}
