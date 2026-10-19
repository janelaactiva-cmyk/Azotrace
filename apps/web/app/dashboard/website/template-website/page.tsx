// Esta página depende da sessão validada pelo layout do dashboard.
export const instant = false;

import { redirect } from 'next/navigation';

export default function LegacyWebsiteTemplatePage() {
  redirect('/dashboard/administracao/negocios/template-website');
}
