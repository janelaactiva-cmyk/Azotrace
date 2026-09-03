'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import Link from 'next/link';
import { useTheme } from '~/lib/theme-context';
import { useBusiness } from '~/lib/business-context';
import { getBusinessIcon } from '~/lib/business-icons';
import { useAuth } from '~/lib/auth-context';
import MegaMenu from './components/MegaMenu';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { selectedBusinessType, selectedBusinessName } = useBusiness();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.email === 'admin@azotrace.com';

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(false);
      if (isSuperAdmin) {
        loadAppUsers();
        
        const match = document.cookie.match(new RegExp('(^| )impersonate_user_email=([^;]+)'));
        if (match) {
          setSelectedUserEmail(decodeURIComponent(match[2]));
        }
      }
    }
  }, [user, authLoading, isSuperAdmin]);

  const loadAppUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Erro ao carregar perfis:', error.message);
      } else if (data) {
        const formattedUsers = data.map(u => ({
          ...u,
          email: u.email || u.mail || u.username || `Utilizador ${u.id?.slice(0, 6)}`
        }));
        setAppUsers(formattedUsers);
      }
    } catch (err) {
      console.error('Erro ao ligar ao Supabase:', err);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = useCallback(async () => {
    document.cookie = 'impersonate_user_id=; path=/; max-age=0';
    document.cookie = 'impersonate_user_email=; path=/; max-age=0';
    await supabase.auth.signOut();
    window.location.href = '/';
  }, []);

  const navItems = [
    { path: '/dashboard', label: '📊 Dashboard' },
    { path: '/dashboard/administracao', label: '⚙️ Administração' },
    { path: '/dashboard/blockchain', label: '⛓️ Blockchain' },
    { path: '/dashboard/analytics', label: '📈 Análises/Estatísticas' },
    { path: '/dashboard/chatbot', label: '💬 Chatbot' },
    { path: '/dashboard/subscricoes', label: '💳 Subscrições' },
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
  const sidebarActive = isDark ? '#374151' : '#e5e7eb';
  const sidebarBorderColor = selectedBusinessType ? businessColor : (isDark ? '#4151' : '#e5e7eb');
  
  const buttonBg = isDark ? '#374151' : '#f3f4f6';
  const buttonHover = isDark ? '#4b5563' : '#e5e7eb';
  const buttonText = isDark ? '#ffffff' : '#111827';

  const currentActiveEmail = selectedUserEmail;
  
  // Filtramos para remover o próprio admin da lista de contas selecionáveis
  const filteredAppUsers = appUsers.filter(dbUser => dbUser.email !== 'admin@azotrace.com');

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      background: isDark ? '#111827' : '#f3f4f6',
      color: isDark ? '#e5e7eb' : '#111827'
    }}>
      <aside ref={menuRef} style={{
        width: '250px',
        background: sidebarBg,
        color: sidebarTextColor,
        padding: '24px 16px 16px 16px',
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
        {/* TOPO: Logo e Menu */}
        <div style={{ marginBottom: '220px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              width: '218px', 
              height: '80px',  
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto', 
              flexShrink: 0
            }}>
              <img 
                src="/assets/images/logo.png" 
                alt="Azotrace-logo" 
                style={{
                  width: '120px',  
                  height: '120px',  
                  objectFit: 'contain',
                  display: 'block',
                  flexShrink: 0
                }}
              />
            </div>
           
            {/* Bloco de Informação do Negócio / Conta Ativa */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px', 
              marginTop: '16px', 
              justifyContent: 'flex-start'
            }}>
              {selectedBusinessName && (
                <div style={{ 
                  fontSize: '15px', 
                  fontWeight: '600',
                  color: businessColor,
                  padding: '4px 12px',
                  background: isDark ? `${businessColor}22` : `${businessColor}11`,
                  borderRadius: '12px',
                  display: 'inline-block',
                  width: 'fit-content'
                }}>
                  {selectedBusinessName}  
                </div>
              )}

              {currentActiveEmail && (
                <div style={{
                  padding: '6px 10px',
                  background: '#2563eb22',
                  color: '#2563eb',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  wordBreak: 'break-all'
                }}>
                  Conta Ativa: {currentActiveEmail}
                </div>
              )}
            </div>
          </div>

          <nav style={{ marginBottom: '16px' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              
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
                    fontSize: '15px'
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* FUNDO: Fixado de forma absoluta na base da barra lateral */}
        <div style={{ 
          position: 'absolute', 
          bottom: '0', 
          left: '16px', 
          right: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          paddingBottom: '16px', 
          background: sidebarBg
        }}>
          
          {/* Menu Flutuante do Perfil */}
          {profileMenuOpen && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '0',
              right: '0',
              background: isDark ? '#374151' : '#ffffff',
              border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
              borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              zIndex: 9999,
              maxHeight: '320px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}` }}>
                <p style={{ fontSize: '11px', color: sidebarSubtext, margin: 0, fontWeight: 'bold' }}>
                  {isSuperAdmin ? 'GERIR CONTAS (SUPABASE)' : 'SESSÃO'}
                </p>
                <p style={{ fontSize: '12px', color: sidebarTextColor, margin: '2px 0 0 0', wordBreak: 'break-all' }}>
                  {user?.email}
                </p>
              </div>

              {isSuperAdmin && (
                <div style={{ overflowY: 'auto', maxHeight: '160px' }}>
                  {filteredAppUsers.length > 0 ? (
                    filteredAppUsers.map((dbUser, index) => {
                      const userEmail = dbUser.email || `ID: ${dbUser.id?.slice(0, 8)}`;
                      const isSelected = selectedUserEmail === userEmail;

                      return (
                        <div 
                          key={index}
                          onClick={() => {
                            setSelectedUserEmail(userEmail);
                            document.cookie = `impersonate_user_id=${dbUser.id}; path=/; max-age=86400`;
                            document.cookie = `impersonate_user_email=${encodeURIComponent(userEmail)}; path=/; max-age=86400`;
                            setProfileMenuOpen(false);
                            window.location.reload(); 
                          }}
                          style={{
                            padding: '10px 14px',
                            fontSize: '13px',
                            borderBottom: `1px solid ${isDark ? '#4b5563' : '#f3f4f6'}`,
                            cursor: 'pointer',
                            color: isSelected ? '#2563eb' : sidebarTextColor,
                            background: isSelected ? (isDark ? '#4b5563' : '#e5e7eb') : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: isSelected ? 'bold' : 'normal'
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = isDark ? '#4b5563' : '#f3f4f6'; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span>👤</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {userEmail}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ padding: '10px', fontSize: '12px', color: sidebarSubtext, textAlign: 'center', margin: 0 }}>Nenhum utilizador encontrado.</p>
                  )}
                </div>
              )}

              {selectedUserEmail && isSuperAdmin && (
                <button
                  onClick={() => {
                    setSelectedUserEmail(null);
                    document.cookie = 'impersonate_user_id=; path=/; max-age=0';
                    document.cookie = 'impersonate_user_email=; path=/; max-age=0';
                    setProfileMenuOpen(false);
                    window.location.reload();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
                    textAlign: 'center',
                    color: '#eab308',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  Voltar à Minha Conta (Admin)
                </button>
              )}

            </div>
          )}

          {/* 1. Botão de Perfil */}
          <div
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: profileMenuOpen ? sidebarActive : 'transparent',
              transition: 'background 0.2s ease',
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: selectedUserEmail ? '#eab308' : '#2563eb',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ 
                fontSize: '13px', 
                color: sidebarTextColor, 
                fontWeight: '600', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                margin: 0 
              }}>
                {selectedUserEmail ? `${selectedUserEmail}` : user?.email}
              </p>
            </div>

            <span style={{ fontSize: '10px', color: sidebarSubtext, flexShrink: 0 }}>
              {profileMenuOpen ? '▼' : '▲'}
            </span>
          </div>

          {/* 2. Botão de Modo Escuro/Claro */}
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
            onMouseEnter={(e) => { e.currentTarget.style.background = buttonHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = buttonBg; }}
          >
            {isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>

          {/* 3. Botão de Terminar Sessão */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: buttonBg,
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              borderRadius: '8px',
              textAlign: 'center',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? '#4b5563' : '#f3f4f6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = buttonBg; }}
          >
            Terminar Sessão
          </button>

        </div>
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