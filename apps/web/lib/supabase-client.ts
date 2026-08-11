// Tenta diferentes formas de importar
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Tenta ver se existe um cliente no kit
try {
  const { createClient } = await import('@kit/supabase-client');
  export const supabaseClient = createClient();
} catch {
  // Fallback para cliente direto
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  export const supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);
}
