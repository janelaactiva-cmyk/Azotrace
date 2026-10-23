'use client';
import { ShieldCheck, Building2, Palette, Mail, Plug } from 'lucide-react';
import { useLocalUser } from '../../_lib/use-local-user';
import { useTheme } from '~/lib/theme-context';
import { settingsSections, type SettingsSection } from './settings-navigation';
import styles from './settings.module.css';

const icons = { multifator: ShieldCheck, plataforma: Building2, preferencias: Palette, emails: Mail, integracoes: Plug };
export default function SettingsShell({ section = 'multifator', children }: { section?: SettingsSection; children?: React.ReactNode }) {
 const user = useLocalUser(), { theme } = useTheme();
 const current = settingsSections.find(item => item.id === section)!;
 if (!user.active) return <p role="status">A validar acesso às configurações…</p>;
 if (!current.personal && user.role !== 'superadmin') return <section><h1>Configuração da plataforma</h1><p role="alert">Esta página é exclusiva do Super Admin.</p></section>;
 const Icon = icons[section];
 return <div className={styles.root} data-theme={theme}>
  <header className={styles.header}><div><h1>{current.title}</h1><p>{current.description}</p></div><span className={styles.scope}>{current.personal ? 'A minha conta' : 'Plataforma'}</span></header>
  <section className={styles.panel + ' ' + styles.content}><div className={styles.sectionIcon}><Icon size={22} aria-hidden="true"/></div>{children}</section>
 </div>;
}
