import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';
import { getSupabaseClientKeys } from '../get-supabase-client-keys';

/** The SSR library maintains the browser singleton and its typed return value. */
export function getSupabaseBrowserClient<GenericSchema = Database>() {
  const keys = getSupabaseClientKeys();
  return createBrowserClient<GenericSchema>(keys.url, keys.anonKey, {
    isSingleton: typeof window !== 'undefined',
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
