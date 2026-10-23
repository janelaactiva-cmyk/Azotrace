'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '~/lib/theme-context';
import { COMPANY_DETAILS_EVENT, loadCompanyNotifications } from '~/lib/company-details-request';
import styles from './company-details.module.css';

export default function CompanyDataNotice({ userId, companyId, enabled }: { userId: string; companyId?: string; enabled: boolean }) {
  const { theme } = useTheme();
  const [pending, setPending] = useState<{ companyId: string; userId: string; count: number } | null>(null);
  useEffect(() => {
    setPending(null);
    if (!enabled || !companyId) return;
    let mounted = true, inflight = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (inflight || document.visibilityState === 'hidden') return;
      inflight = true;
      try { const result = await loadCompanyNotifications(companyId, controller.signal); if (mounted) setPending({ companyId, userId, count: result.notifications.length }); }
      catch { /* The company page provides full retry and error feedback. */ }
      finally { inflight = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus); window.addEventListener(COMPANY_DETAILS_EVENT, onFocus);
    return () => { mounted = false; controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', onFocus); window.removeEventListener(COMPANY_DETAILS_EVENT, onFocus); };
  }, [userId, companyId, enabled]);
  if (!enabled || !pending?.count || pending.companyId !== companyId || pending.userId !== userId) return null;
  return <div className={styles.root} data-theme={theme}><aside className={styles.globalNotice} aria-label="Atualização dos dados da empresa"><div><strong>Os dados da tua empresa foram atualizados pela equipa Azotrace.</strong><p>Consulta as alterações à ficha da empresa.</p></div><Link className={styles.button} href="/dashboard/administracao/empresa">Ver alterações</Link></aside></div>;
}
