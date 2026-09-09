import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../database.types';
import { getSupabaseClientKeys } from '../get-supabase-client-keys';

// Variável para guardar a única instância global no browser
let cachedClient: any = null;

/**
 * @name getSupabaseBrowserClient
 * @description Get a Supabase client for use in the Browser (Singleton)
 */
export function getSupabaseBrowserClient<GenericSchema = Database>() {
  // No servidor, retorna sempre uma nova instância por request
  if (typeof window === 'undefined') {
    const keys = getSupabaseClientKeys();
    return createBrowserClient<GenericSchema>(keys.url, keys.anonKey);
  }

  // No browser, se já existir uma instância criada, reutiliza-a!
  if (!cachedClient) {
    const keys = getSupabaseClientKeys();
    cachedClient = createBrowserClient<GenericSchema>(keys.url, keys.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return cachedClient;
}