'use client';
import { Moon, Sun } from 'lucide-react';
import MfaSettings from '~/components/MfaSettings';
import { useTheme } from '~/lib/theme-context';
import SettingsShell from './SettingsShell';
import PlatformForm from './PlatformForm';
import ServiceSettings from './ServiceSettings';
import type { SettingsSection } from './settings-navigation';
import styles from './settings.module.css';

function Preferences() {
 const { theme, toggleTheme } = useTheme();
 return <div><div className={styles.blockHeading}><h2>Aspeto da aplicação</h2><p>Escolhe como preferes ver a tua área de trabalho.</p></div>
  <div className={styles.preferenceRow}><div><h3>Tema {theme === 'dark' ? 'escuro' : 'claro'}</h3><p>Esta preferência aplica-se à tua sessão.</p></div><button type="button" className={styles.secondary} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={17} aria-hidden="true"/> : <Moon size={17} aria-hidden="true"/>}Ativar modo {theme === 'dark' ? 'claro' : 'escuro'}</button></div>
  <div className={styles.divider}/><div className={styles.blockHeading}><h2>Idioma e datas</h2><p>Apresentação atual da plataforma.</p></div><dl className={styles.facts}><div><dt>Idioma da aplicação</dt><dd>Português</dd></div><div><dt>Fuso das subscrições</dt><dd>Açores · Atlantic/Azores</dd></div></dl>
  <p className={styles.hint}>A preferência de tema é guardada neste navegador quando existe consentimento para cookies.</p>
 </div>;
}
export default function SettingsPage({ section }: { section: SettingsSection }) {
 return <SettingsShell section={section}>{section === 'multifator' ? <div className={styles.mfa}><MfaSettings/></div> : section === 'plataforma' ? <PlatformForm/> : section === 'preferencias' ? <Preferences/> : <ServiceSettings emails={section === 'emails'}/>}</SettingsShell>;
}
