'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '~/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.log('🔴 Erro ao obter utilizador:', error.message);
        setUser(null);
        // Limpar cookies se houver erro
        if (typeof document !== 'undefined') {
          document.cookie.split(';').forEach(c => {
            document.cookie = c
              .replace(/^ +/, '')
              .replace(/=.*/, '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/');
          });
        }
      } else {
        setUser(user);
        if (user) {
          console.log('👤 Utilizador autenticado:', user.email);
        }
      }
    } catch (error) {
      console.error('Erro ao obter utilizador:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUser();

    // Ouvir mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Evento de autenticação:', event);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          // Limpar cookies no logout
          if (typeof document !== 'undefined') {
            document.cookie.split(';').forEach(c => {
              document.cookie = c
                .replace(/^ +/, '')
                .replace(/=.*/, '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/');
            });
          }
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Limpar todos os cookies
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/');
      });
    }
  };

  const refreshUser = async () => {
    await getUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
