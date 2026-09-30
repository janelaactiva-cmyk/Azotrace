import { supabase } from '~/lib/supabase';

export interface FieldConfig {
  name: string;
  number: string;
  title: string;
  description: string;
  type: 'text' | 'number' | 'email' | 'textarea';
  required: boolean;
  placeholder?: string;
  suffix?: string;
  min?: number;
}

export interface FormConfig {
  id: string;
  slug: string;
  nome: string;
  fields: FieldConfig[];
}

// Lê a config — usa .limit(1) em vez de .maybeSingle() para não rebentar com duplicados
export async function getFormConfig(slug: string): Promise<FormConfig | null> {
  const { data, error } = await supabase
    .from('form_configs')
    .select('*')
    .eq('slug', slug)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0] as FormConfig;
}

// Atualiza a config — procura pelo ID e atualiza só 1 linha
export async function updateFormConfigFields(slug: string, fields: FieldConfig[]) {
  // 1. Procurar a linha
  const { data: existing, error: findError } = await supabase
    .from('form_configs')
    .select('id')
    .eq('slug', slug)
    .limit(1);

  if (findError) return { data: null, error: findError };

  // 2. Se não existir, cria
  if (!existing || existing.length === 0) {
    const { data, error } = await supabase
      .from('form_configs')
      .insert({ slug, nome: 'Formulário do Negócio', fields })
      .select();
    return { data: data?.[0] || null, error };
  }

  // 3. Se existir, atualiza pelo ID (nunca rebenta, mesmo com duplicados)
  const { data, error } = await supabase
    .from('form_configs')
    .update({ fields })
    .eq('id', existing[0].id)
    .select();

  return { data: data?.[0] || null, error };
}