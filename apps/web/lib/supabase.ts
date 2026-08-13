import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente para o browser - usa cookies em vez de localStorage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key: string) => {
        // Tentar obter do cookie
        if (typeof document !== 'undefined') {
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === key) {
              return decodeURIComponent(value);
            }
          }
        }
        return null;
      },
      setItem: (key: string, value: string) => {
        // Definir cookie com expiração de 7 dias
        if (typeof document !== 'undefined') {
          const expires = new Date();
          expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
          document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
        }
      },
      removeItem: (key: string) => {
        // Remover cookie
        if (typeof document !== 'undefined') {
          document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      },
    },
  },
});
