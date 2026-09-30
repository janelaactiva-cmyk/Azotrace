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
      // getSession primeiro (usa cookie/localStorage sem validar no servidor)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.log('🔴 Erro ao obter sessão:', sessionError.message);
        setUser(null);
        return;
      }

      if (!sessionData.session) {
        // Sem sessão — não é erro, é só um utilizador não autenticado
        console.log('ℹ️ Sem sessão ativa.');
        setUser(null);
        return;
      }

      // Só se houver sessão, validamos o user no servidor
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.log('🔴 Erro ao obter utilizador:', userError.message);
        setUser(null);
        return;
      }

      setUser(userData.user);
      if (userData.user) {
        console.log('👤 Utilizador autenticado:', userData.user.email);
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
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setUser(session?.user || null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
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
    // 🔒 NÃO apagamos cookies manualmente — o supabase.auth.signOut() já trata disso
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