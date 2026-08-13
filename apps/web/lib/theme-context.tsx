'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // Helper para verificar se existe o consentimento de cookies no browser
  const hasConsent = () => {
    if (typeof document === 'undefined') return false;
    // 💡 Ajusta 'cookie_consent=accepted' para a string/nome do cookie que o teu banner usa ao aceitar
    return document.cookie.includes('cookie_consent=accepted');
  };

  useEffect(() => {
    let initialTheme: Theme = 'light';

    // 1. Apenas lê a preferência do localStorage SE o utilizador tiver aceite os cookies
    if (hasConsent()) {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) {
        initialTheme = savedTheme;
      }
    } else {
      // Se rejeitou, garante que limpa qualquer vestígio guardado anteriormente
      localStorage.removeItem('theme');
    }

    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    // 2. Apenas grava no localStorage SE o utilizador tiver aceite os cookies
    if (hasConsent()) {
      localStorage.setItem('theme', newTheme);
    } else {
      localStorage.removeItem('theme');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}