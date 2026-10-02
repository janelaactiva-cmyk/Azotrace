'use server';

import type { SaveWebsiteTemplateInput } from '../schema';

/**
 * Compatibilidade com imports antigos. O editor ativo encontra-se em
 * /dashboard/administracao/negocios/template-website e usa ~/lib/supabase.
 */
export async function saveWebsiteTemplateAction(
  _value: SaveWebsiteTemplateInput,
) {
  return {
    success: false as const,
    redirectedEditor: '/dashboard/administracao/negocios/template-website',
  };
}
