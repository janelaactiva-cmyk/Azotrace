'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Link from 'next/link';
import { useTheme } from '~/lib/theme-context';
import { useBusiness } from '~/lib/business-context';
import { getBusinessIcon } from '~/lib/business-icons';
import { useAuth } from '~/lib/auth-context';
import MegaMenu from './components/MegaMenu';
import { AlignCenter } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { selectedBusinessType, selectedBusinessName } = useBusiness();
  const { user, loading: authLoading, signOut } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleLogout = useCallback(async () => {
   await supabase.auth.signOut();
    // Força o navegador a ir para a raiz ignorando o router cache/middleware
    window.location.href = '/';
  }, []);

  const navItems = [
    { path: '/dashboard', label: '📊 Dashboard' },
    { path: '/dashboard/administracao', label: '⚙️ Administração' },
    { path: '/dashboard/blockchain', label: '⛓️ Blockchain' },
    { path: '/dashboard/analytics', label: '📈 Análises/Estatísticas' },
    { path: '/dashboard/chatbot', label: '💬 Chatbot' }, // ✅ ADICIONAR AQUI
    { path: '/dashboard/subscricoes', label: '💳 Subscrições' }, // 👈 Adicionado aqui!
  ];

  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme === 'dark' ? '#111827' : '#f3f4f6'
      }}>
        <p style={{ color: theme === 'dark' ? '#9ca3af' : '#374151' }}>A carregar...</p>
      </div>
    );
  }

  const isDark = theme === 'dark';
  
  const businessIcon = selectedBusinessType ? getBusinessIcon(selectedBusinessType) : null;
  const businessColor = businessIcon?.color || '#6B7280';

  const sidebarBg = isDark ? '#1f2937' : '#ffffff';
  const sidebarTextColor = isDark ? '#ffffff' : '#111827';
  const sidebarSubtext = isDark ? '#9ca3af' : '#6b7280';
  const sidebarHover = isDark ? '#374151' : '#f3f4f6';
  const sidebarActive = isDark ? '#374151' : '#e5e7eb';
  
  const sidebarBorderColor = selectedBusinessType ? businessColor : (isDark ? '#374151' : '#e5e7eb');
  
  const buttonBg = isDark ? '#374151' : '#f3f4f6';
  const buttonHover = isDark ? '#4b5563' : '#e5e7eb';
  const buttonText = isDark ? '#ffffff' : '#111827';

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      background: isDark ? '#111827' : '#f3f4f6',
      color: isDark ? '#e5e7eb' : '#111827'
    }}>
      <aside style={{
        width: '250px',
        background: sidebarBg,
        color: sidebarTextColor,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 1000,
        left: 0,
        top: 0,
        transition: 'border-color 0.4s ease, background 0.3s ease, color 0.3s ease',
        borderRight: `4px solid ${sidebarBorderColor}`
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: sidebarTextColor,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            
           
          </h1>
         <div style={{ 
            width: '100%', 
            height: '120px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '4px 0' 
        }}>
            <img 
              src="/assets/images/logo.png" 
              alt="Azotrace-logo" 
              style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block'
        }}
   />
 </div>
         
          {selectedBusinessName && (
            <p style={{ 
              fontSize: '15px', 
              fontWeight: '600',
              color: businessColor,
              marginTop: '8px',
              padding: '4px 12px',
              background: isDark ? `${businessColor}22` : `${businessColor}11`,
              borderRadius: '12px',
              display: 'inline-block',
              
            }}>
              {selectedBusinessName}  
            </p>
          )}
        </div>

        <nav style={{ marginBottom: '16px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
            
            if (item.label === '⚙️ Administração') {
              return (
                <div key={item.path} style={{ marginBottom: '4px' }}>
                  <MegaMenu />
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  display: 'block',
                  padding: '10px 16px',
                  marginBottom: '4px',
                  borderRadius: '8px',
                  background: isActive ? sidebarActive : 'transparent',
                  color: isActive ? sidebarTextColor : sidebarSubtext,
                  textDecoration: 'none',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  fontSize: '15px',
                  willChange: 'background, color'
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <button
            onClick={toggleTheme}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: buttonBg,
              color: buttonText,
              border: `1px solid ${sidebarBorderColor}`,
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
            }}
          >
            {isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#234D87',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#234D87';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#234D87';
            }}
          >
            🚪 Sair
          </button>
               <p style={{ fontSize: '15px', color: sidebarSubtext, marginTop: '4px' }}>
           user: {user?.email}
          </p>

        </div>

        <div style={{ flex: 1 }} />
      </aside>

      <main style={{
        marginLeft: '250px',
        flex: 1,
        padding: '32px 40px',
        background: isDark ? '#111827' : '#f3f4f6',
        minHeight: '100vh',
        color: isDark ? '#e5e7eb' : '#111827',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}
