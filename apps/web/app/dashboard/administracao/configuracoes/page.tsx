import { redirect } from 'next/navigation';
import { SETTINGS_ROOT } from './settings-navigation';
export const instant = false;
export default function ConfiguracoesPage() {
 redirect(SETTINGS_ROOT + '/multifator');
}
