'use server';

import { SaveWebsiteTemplateSchema } from '../schema';

/**
 * Compatibilidade com imports antigos. O editor atual guarda através do
 * cliente central ~/lib/supabase, sem dependências MakerKit.
 */
export async function saveWebsiteTemplateAction(input: unknown) {
  return SaveWebsiteTemplateSchema.parse(input);
}
