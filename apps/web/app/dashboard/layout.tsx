'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme-context';
import { useBusiness } from '~/lib/business-context';
import { getBusinessIcon } from '~/lib/business-icons';
import AccessibleSidebarAtualizado from './components/AccessibleSidebarAtualizado';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
  const { selectedBusinessType, selectedBusinessName } = useBusiness();
  
  const [mounted, setMounted] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [directEmail, setDirectEmail] = useState<string>('admin@azotrace.com');

  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLElement>(null);

  const handleLogout = useCallback(async () => {
    localStorage.removeItem('is_super_admin');
    localStorage.removeItem('user_email');
    localStorage.removeItem('impersonate_user_email');
    localStorage.removeItem('impersonate_user_name');
    document.cookie = 'impersonate_user_id=; path=/; max-age=0';
    document.cookie = 'impersonate_user_email=; path=/; max-age=0';
    await supabase.auth.signOut();
    window.location.href = '/';
  }, []);

  // --- SISTEMA DE INATIVIDADE (IDLE TIMEOUT) ---
  useEffect(() => {
    // 15 minutos de inatividade (em milissegundos). Podes alterar aqui (ex: 30 * 60 * 1000 para 30 min)
    const IDLE_TIMEOUT_MS = 15 * 60 * 1000; 
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Ação executada quando o tempo esgotar
        console.warn('Sessão terminada por inatividade.');
        handleLogout();
      }, IDLE_TIMEOUT_MS);
    };

    // Eventos que indicam atividade do utilizador
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];

    // Registar os listeners de eventos
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Iniciar o temporizador pela primeira vez
    resetTimer();

    // Limpar os listeners e o temporizador ao desmontar o componente
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [handleLogout]);
  // ---------------------------------------------

  useEffect(() => {
    setMounted(true);
    setSelectedUserEmail(localStorage.getItem('impersonate_user_email'));
    setSelectedUserName(localStorage.getItem('impersonate_user_name'));
    setDirectEmail(localStorage.getItem('user_email') || 'admin@azotrace.com');

    loadAppUsers();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        const email = data.session.user.email;
        setDirectEmail(email);
        localStorage.setItem('user_email', email);
        if (email === 'admin@azotrace.com') {
          localStorage.setItem('is_super_admin', 'true');
        }
      }
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const syncViewport = () => {
      setIsMobile(media.matches);
      setSidebarExpanded(false);
      setSidebarPinned(false);
    };

    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobile || !sidebarExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, sidebarExpanded]);

  const isSuperAdmin = directEmail === 'admin@azotrace.com' || (typeof window !== 'undefined' && localStorage.getItem('is_super_admin') === 'true');

  const loadAppUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (!error && data) {
        const formattedUsers = data.map(u => ({
          ...u,
          email: u.email || u.mail || u.username || `Utilizador ${u.id?.slice(0, 6)}`,
          name: u.name || u.full_name || u.nome || ''
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
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = theme === 'dark';
  const businessIcon = selectedBusinessType ? getBusinessIcon(selectedBusinessType) : null;
  const businessColor = businessIcon?.color || '#6B7280';

  const sidebarBg = isDark ? '#1f2937' : '#ffffff';
  const sidebarTextColor = isDark ? '#ffffff' : '#111827';
  const sidebarSubtext = isDark ? '#9ca3af' : '#6b7280';
  const sidebarActive = isDark ? '#374151' : '#e5e7eb';
  const sidebarBorderColor = selectedBusinessType ? businessColor : (isDark ? '#374151' : '#e5e7eb');
  
  const buttonBg = isDark ? '#374151' : '#f3f4f6';
  const buttonText = isDark ? '#ffffff' : '#111827';

  const filteredAppUsers = searchQuery.trim() === '' ? [] : appUsers
    .filter(dbUser => dbUser.email !== 'admin@azotrace.com')
    .filter(dbUser => {
      const query = searchQuery.toLowerCase();
      const emailMatch = dbUser.email?.toLowerCase().includes(query);
      const nameMatch = dbUser.name?.toLowerCase().includes(query);
      return emailMatch || nameMatch;
    });

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'sans-serif',
      background: isDark ? '#111827' : '#f3f4f6',
      color: isDark ? '#e5e7eb' : '#111827'
    }}>
      {isMobile && !sidebarExpanded && (
        <button
          type="button"
          aria-label="Abrir menu de navegação"
          aria-controls="dashboard-sidebar"
          aria-expanded={false}
          onClick={() => setSidebarExpanded(true)}
          style={{
            position: 'fixed',
            top: '12px',
            left: '12px',
            zIndex: 1450,
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            border: `1px solid ${sidebarBorderColor}`,
            background: sidebarBg,
            color: sidebarTextColor,
            boxShadow: '0 6px 18px rgba(15,23,42,.16)',
            cursor: 'pointer',
            fontSize: '22px',
          }}
        >
          ☰
        </button>
      )}

      {sidebarExpanded && (!sidebarPinned || isMobile) && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => {
            setSidebarPinned(false);
            setSidebarExpanded(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: isMobile ? 1300 : 900,
            border: 0,
            padding: 0,
            margin: 0,
            background: isDark ? 'rgba(2, 6, 23, .58)' : 'rgba(15, 23, 42, .34)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            cursor: isMobile ? 'pointer' : 'default',
          }}
        />
      )}

      <aside
        id="dashboard-sidebar"
        ref={menuRef}
        aria-label="Barra lateral do dashboard"
        onMouseEnter={() => { if (!isMobile) setSidebarExpanded(true); }}
        onMouseLeave={() => {
          if (!isMobile && !sidebarPinned) {
            setSidebarExpanded(false);
            setProfileMenuOpen(false);
            setSearchQuery('');
          }
        }}
        onFocusCapture={() => { if (!isMobile) setSidebarExpanded(true); }}
        onBlurCapture={(event) => {
          if (!isMobile && !sidebarPinned && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setSidebarExpanded(false);
            setProfileMenuOpen(false);
          }
        }}
        style={{
          width: isMobile ? 'min(88vw, 320px)' : (sidebarExpanded ? '248px' : '72px'),
          background: sidebarBg,
          color: sidebarTextColor,
          padding: isMobile ? '14px 12px' : '14px 8px',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          height: '100vh',
          overflow: isMobile ? 'auto' : 'visible',
          zIndex: isMobile ? 1400 : 1000,
          left: 0,
          top: 0,
          transform: isMobile ? (sidebarExpanded ? 'translateX(0)' : 'translateX(-105%)') : undefined,
          transition: 'width 180ms ease, padding 180ms ease, transform 220ms ease, border-color 0.4s ease, background 0.3s ease, color 0.3s ease, box-shadow 180ms ease',
          borderRight: `4px solid ${sidebarBorderColor}`,
          boxShadow: sidebarExpanded ? '8px 0 24px rgba(15, 23, 42, 0.18)' : 'none',
          boxSizing: 'border-box'
        }}
      >
        {isMobile && sidebarExpanded && (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => {
              setSidebarPinned(false);
              setSidebarExpanded(false);
            }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 1500,
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
              background: isDark ? '#111827' : '#f9fafb',
              color: sidebarTextColor,
              cursor: 'pointer',
              fontSize: '22px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}

        {/* PARTE SUPERIOR (Logo, Negócio + Links) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            width: '100%',
            height: sidebarExpanded ? '92px' : '54px',
            position: 'relative',
            marginBottom: sidebarExpanded ? '4px' : '10px',
            transition: 'height 180ms ease'
          }}>
            <a
              href="https://azotrace.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir página inicial da Azotrace"
              title="Azotrace.com"
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'block',
                borderRadius: '10px',
                lineHeight: 0,
              }}
            >
              <img
                src="/assets/images/logo.png"
                alt="Azotrace"
                style={{
                  width: sidebarExpanded ? '86px' : '44px',
                  height: sidebarExpanded ? '86px' : '44px',
                  objectFit: 'contain',
                  display: 'block',
                  transition: 'width 180ms ease, height 180ms ease'
                }}
              />
            </a>
          </div>

          {sidebarExpanded && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px', 
              marginBottom: '12px',
              marginTop: '2px',
              minHeight: selectedBusinessName ? '32px' : '0',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              {selectedBusinessName && (
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: '600',
                  color: businessColor,
                  padding: '3px 8px',
                  background: isDark ? `${businessColor}22` : `${businessColor}11`,
                  borderRadius: '8px',
                  width: 'fit-content',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedBusinessName}
                </div>
              )}

              {isMobile && mounted && selectedUserEmail && (
                <div style={{
                  padding: '3px 6px',
                  background: '#2563eb22',
                  color: '#2563eb',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  wordBreak: 'break-all'
                }}>
                  Conta: {selectedUserEmail}
                </div>
              )}
            </div>
          )}

          <AccessibleSidebarAtualizado
            isDark={isDark}
            sidebarActive={sidebarActive}
            sidebarTextColor={sidebarTextColor}
            sidebarSubtext={sidebarSubtext}
            isSidebarExpanded={sidebarExpanded}
            accentColor={sidebarBorderColor}
            isMobile={isMobile}
            isPinned={sidebarPinned}
            onPinnedChange={(pinned) => {
              setSidebarPinned(pinned);
              if (pinned) setSidebarExpanded(true);
            }}
            onNavigate={() => {
  if (isMobile) {
    setSidebarPinned(false);
    setSidebarExpanded(false);
    return;
  }

  if (!sidebarPinned) {
    setSidebarExpanded(false);
  }
}}
          />
        </div>

        {/* PARTE INFERIOR (Perfil, Tema, Terminar Sessão) */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px', 
          paddingTop: '12px',
          paddingBottom: '24px',
          marginTop: 'auto',
          borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          position: 'relative'
        }}>
          {!isMobile && (
            <div style={{ display: 'flex', justifyContent: sidebarExpanded ? 'stretch' : 'center', width: '100%', padding: '0 0 8px' }}>
              <button
                type="button"
                aria-label={sidebarPinned ? 'Reduzir menu lateral' : 'Expandir menu lateral'}
                title={sidebarPinned ? 'Reduzir' : 'Expandir'}
                aria-pressed={sidebarPinned}
                onClick={() => {
                  const next = !sidebarPinned;
                  setSidebarPinned(next);
                  setSidebarExpanded(next);
                }}
                style={{
                  width: sidebarExpanded ? '100%' : '52px',
                  minHeight: sidebarExpanded ? '36px' : '48px',
                  padding: sidebarExpanded ? '8px 10px' : '5px 2px',
                  display: 'inline-flex',
                  flexDirection: sidebarExpanded ? 'row' : 'column',
                  alignItems: 'center',
                  justifyContent: sidebarExpanded ? 'flex-start' : 'center',
                  gap: sidebarExpanded ? '8px' : '3px',
                  borderRadius: '9px',
                  border: `1px solid ${sidebarPinned ? sidebarBorderColor : (isDark ? '#4b5563' : '#d1d5db')}`,
                  background: sidebarPinned ? `${sidebarBorderColor}22` : 'transparent',
                  color: sidebarPinned ? sidebarBorderColor : sidebarSubtext,
                  cursor: 'pointer',
                  fontSize: sidebarExpanded ? '12px' : '9px',
                  fontWeight: '600',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17v5" />
                  <path d="M5 17h14" />
                  <path d="M6 3h12l-2 6 2 4H6l2-4-2-6Z" />
                </svg>
                <span>{sidebarPinned ? 'Reduzir' : 'Expandir'}</span>
              </button>
            </div>
          )}

          
          {profileMenuOpen && (
            <section aria-label="Gestão da sessão e da conta" style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '0',
              right: '0',
              background: isDark ? '#374151' : '#ffffff',
              border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}` }}>
                <p style={{ fontSize: '10px', color: sidebarSubtext, margin: 0, fontWeight: 'bold' }}>
                  {isSuperAdmin ? 'GERIR CONTAS (SUPABASE)' : 'SESSÃO'}
                </p>
                <p style={{ fontSize: '11px', color: sidebarTextColor, margin: '2px 0 0 0', wordBreak: 'break-all' }}>
                  {selectedUserEmail ? selectedUserEmail : (directEmail || 'admin@azotrace.com')}
                </p>
              </div>

              {isSuperAdmin && (
                <>
                  <div style={{ padding: '6px 8px', borderBottom: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}` }}>
                    <input 
                      type="text"
                      placeholder="🔍 Pesquisar..."
                      aria-label="Pesquisar utilizadores"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
                        background: isDark ? '#1f2937' : '#f9fafb',
                        color: sidebarTextColor
                      }}
                    />
                  </div>

                  {searchQuery.trim() !== '' && (
                    <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
                      {filteredAppUsers.length > 0 ? (
                        filteredAppUsers.map((dbUser, index) => {
                          const userEmail = dbUser.email;
                          const userName = dbUser.name;
                          const isSelected = selectedUserEmail === userEmail;

                          return (
                            <button
                              type="button"
                              key={index}
                              aria-label={`Usar conta ${userName || userEmail}`}
                              onClick={() => {
                                localStorage.setItem('impersonate_user_email', userEmail);
                                localStorage.setItem('impersonate_user_name', userName || '');
                                document.cookie = `impersonate_user_id=${dbUser.id}; path=/; max-age=86400`;
                                document.cookie = `impersonate_user_email=${encodeURIComponent(userEmail)}; path=/; max-age=86400`;
                                setSelectedUserEmail(userEmail);
                                setSelectedUserName(userName || null);
                                setProfileMenuOpen(false);
                                setSearchQuery('');
                                window.location.reload(); 
                              }}
                              style={{
                                padding: '6px 10px',
                                fontSize: '11px',
                                borderBottom: `1px solid ${isDark ? '#4b5563' : '#f3f4f6'}`,
                                cursor: 'pointer',
                                color: isSelected ? '#2563eb' : sidebarTextColor,
                                background: isSelected ? (isDark ? '#4b5563' : '#e5e7eb') : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                fontWeight: isSelected ? 'bold' : 'normal',
                                width: '100%',
                                border: 'none',
                                textAlign: 'left',
                                fontFamily: 'inherit'
                              }}
                            >
                              <span style={{ fontWeight: '600' }}>{userName || 'Utilizador sem nome'}</span>
                              <span style={{ fontSize: '10px', color: sidebarSubtext }}>{userEmail}</span>
                            </button>
                          );
                        })
                      ) : (
                        <p style={{ padding: '8px', fontSize: '11px', color: sidebarSubtext, textAlign: 'center', margin: 0 }}>Nenhum encontrado.</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {selectedUserEmail && (
                <button
                  onClick={() => {
                    localStorage.removeItem('impersonate_user_email');
                    localStorage.removeItem('impersonate_user_name');
                    document.cookie = 'impersonate_user_id=; path=/; max-age=0';
                    document.cookie = 'impersonate_user_email=; path=/; max-age=0';
                    setSelectedUserEmail(null);
                    setSelectedUserName(null);
                    setProfileMenuOpen(false);
                    setSearchQuery('');
                    window.location.reload();
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
                    textAlign: 'center',
                    color: '#eab308',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  Voltar à Minha Conta (Admin)
                </button>
              )}
            </section>
          )}

          {/* Botão de Perfil */}
          <button
            type="button"
            aria-expanded={profileMenuOpen}
            aria-label="Abrir opções da conta"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: sidebarExpanded ? '8px' : '0',
              padding: sidebarExpanded ? '8px 10px' : '8px 6px',
              justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              borderRadius: '6px',
              cursor: 'pointer',
              background: profileMenuOpen ? sidebarActive : 'transparent',
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              fontFamily: 'inherit',
              textAlign: 'left'
            }}
          >
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: selectedUserEmail ? '#eab308' : '#2563eb',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            
            {sidebarExpanded && (
              <>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <p style={{ 
                    fontSize: '12px', 
                    color: sidebarTextColor, 
                    fontWeight: '600', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    margin: 0 
                  }}>
                    {mounted ? (selectedUserName ? selectedUserName : (selectedUserEmail ? selectedUserEmail : directEmail)) : 'A carregar...'}
                  </p>
                </div>

                <span style={{ fontSize: '9px', color: sidebarSubtext, flexShrink: 0 }} aria-hidden="true">
                  {profileMenuOpen ? '▼' : '▲'}
                </span>
              </>
            )}
          </button>

          {/* Botão Tema */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              width: '100%',
              padding: sidebarExpanded ? '8px 10px' : '8px 6px',
              background: buttonBg,
              color: buttonText,
              border: `1px solid ${sidebarBorderColor}`,
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
            {sidebarExpanded && <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>

          {/* Botão Sair */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: sidebarExpanded ? '8px 10px' : '8px 6px',
              background: buttonBg,
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              borderRadius: '6px',
              textAlign: 'center',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              gap: '6px'
            }}
          >
            <span aria-hidden="true">↪</span>
            {sidebarExpanded && <span>Terminar Sessão</span>}
          </button>

        </div>
      </aside>

      <main id="dashboard-main" tabIndex={-1} style={{
        marginLeft: isMobile ? '0' : '72px',
        flex: 1,
        padding: isMobile ? '72px 16px 24px' : '32px 40px',
        background: isDark ? '#111827' : '#f3f4f6',
        minHeight: '100vh',
        color: isDark ? '#e5e7eb' : '#111827'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}