import { SaveWebsiteTemplateSchema } from '../schema';

/**
 * O editor guarda diretamente pelo cliente Supabase em page.tsx.
 * Mantém-se esta função apenas para compatibilidade com imports antigos.
 */
export async function saveWebsiteTemplateAction(input: unknown) {
  return SaveWebsiteTemplateSchema.parse(input);
}
