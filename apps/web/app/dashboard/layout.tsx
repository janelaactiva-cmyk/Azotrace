'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, Lock, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '~/lib/theme-context';
import { useBusiness } from '~/lib/business-context';
import AccessibleSidebarAtualizado from './components/AccessibleSidebarAtualizado';
import { BUSINESS_CHANGED_EVENT, BUSINESSES_UPDATED_EVENT, getActiveProducerState } from './onboarding/_lib/local-store';
import { canAccessPath, clearCurrentLocalUserSession, roleLabel, setCurrentLocalUser } from './_lib/local-users';
import { supabase } from '~/lib/supabase';
import { onlineBusinesses, onlineError, onlineCanImpersonate } from './_lib/online-state';
import { useLocalUser } from './_lib/use-local-user';
import workspaceStyles from './_components/business-workspace-switcher.module.css';
import SessionMfaGate from '~/components/SessionMfaGate';
import { loadOnlineContext } from './_lib/online-billing';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SessionMfaGate><DashboardLayoutContent>{children}</DashboardLayoutContent></SessionMfaGate>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { selectedBusinessId, clearSelectedBusiness } = useBusiness();
  const pathname = usePathname();
  const localUser = useLocalUser();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [closeMenus, setCloseMenus] = useState(0);
  const [workspaceAccent, setWorkspaceAccent] = useState('#47B37D');
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      // Abre ao passar o rato no desktop ou pelo botão no mobile.
      setSidebarExpanded(false);
      setSidebarPinned(false);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const syncAccent = () => {
      if (localUser.role === 'superadmin') {
        setWorkspaceAccent('#6d28d9');
        document.documentElement.style.setProperty('--azotrace-business-accent', '#6d28d9');
        return;
      }
      const state = getActiveProducerState(selectedBusinessId ? String(selectedBusinessId) : null);
      const valid = state?.business.companyId === localUser.companyId && onlineBusinesses.some((business) => business.id === state?.business.id && business.companyId === localUser.companyId);
      const accent = valid ? state!.business.accentColor || '#47B37D' : '#47B37D';
      setWorkspaceAccent(accent);
      document.documentElement.style.setProperty('--azotrace-business-accent', accent);
    };
    syncAccent();
    window.addEventListener('storage', syncAccent);
    window.addEventListener(BUSINESS_CHANGED_EVENT, syncAccent as EventListener);
    window.addEventListener(BUSINESSES_UPDATED_EVENT, syncAccent as EventListener);
    return () => {
      window.removeEventListener('storage', syncAccent);
      window.removeEventListener(BUSINESS_CHANGED_EVENT, syncAccent as EventListener);
      window.removeEventListener(BUSINESSES_UPDATED_EVENT, syncAccent as EventListener);
    };
  }, [selectedBusinessId, localUser.role, localUser.companyId]);

  useEffect(() => {
    if (!isMobile || !sidebarExpanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isMobile, sidebarExpanded]);

  const activeBusiness = onlineBusinesses.find((business) => business.id === String(selectedBusinessId) && business.companyId === localUser.companyId && (localUser.role === 'admin' || localUser.businessIds.includes(business.id)));
  const selectedBusinessName = activeBusiness?.name || 'Sem negócio';
  useEffect(() => {
    if (localUser.active && selectedBusinessId && !activeBusiness) clearSelectedBusiness();
  }, [localUser.id, localUser.companyId, selectedBusinessId, activeBusiness?.id]);
  const isDark = theme === 'dark';
  const sidebarBg = isDark ? '#1f2937' : '#ffffff';
  const sidebarTextColor = isDark ? '#ffffff' : '#111827';
  const sidebarSubtext = isDark ? '#9ca3af' : '#6b7280';
  const sidebarActive = isDark ? '#2b3544' : '#f5f7f8';
  const expanded = isMobile ? sidebarExpanded : sidebarExpanded || sidebarPinned;
  const dismissMenus = () => {
    setSidebarExpanded(false);
    setFlyoutOpen(false);
    setCloseMenus((previous) => previous + 1);
  };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismissMenus(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  const routeAllowed = canAccessPath(localUser, pathname, selectedBusinessId ? String(selectedBusinessId) : null);

  const handleSignOut = async () => {
      await supabase.auth.signOut();
      clearCurrentLocalUserSession();
      window.location.replace('/landing');
  };

  if (!mounted || !localUser.active) return <div style={{ padding: 32 }}><p role={onlineError?'alert':'status'}>{onlineError || 'A validar sessão Supabase…'}</p>{onlineError ? <><button type="button" onClick={()=>void loadOnlineContext().catch(()=>undefined)}>Tentar novamente</button><button type="button" onClick={handleSignOut}>Encerrar sessão e voltar à landing</button></> : null}</div>;

  if (mounted && !routeAllowed) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: isDark ? '#111827' : '#f3f4f6', color: isDark ? '#fff' : '#111827' }}>
        <section style={{ width: 'min(100%, 520px)', padding: 28, borderRadius: 14, background: sidebarBg, border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, margin: '0 auto 12px', display: 'grid', placeItems: 'center', borderRadius: 12, background: isDark ? '#273244' : '#f2f6f4', color: workspaceAccent }}><Lock size={21} strokeWidth={1.8} /></div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Sem permissão</h1>
          <p style={{ margin: '0 0 18px', color: sidebarSubtext, fontSize: 14 }}>O utilizador {localUser.name} não tem acesso a esta área.</p>
          <a href="/dashboard" style={{ display: 'inline-flex', padding: '10px 14px', borderRadius: 8, background: '#2563eb', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>Voltar ao Dashboard</a>
        </section>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', background: isDark ? '#111827' : '#f3f4f6', color: isDark ? '#e5e7eb' : '#111827' }}>
      {isMobile && !sidebarExpanded && (
        <button type="button" aria-label="Abrir menu" onClick={() => setSidebarExpanded(true)} style={{ position: 'fixed', top: 12, left: 12, zIndex: 1450, width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 11, border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, background: sidebarBg, color: sidebarTextColor, cursor: 'pointer', boxShadow: '0 6px 18px rgba(15,23,42,.08)' }}><Menu size={20} strokeWidth={1.8} /></button>
      )}

      {(expanded && (!sidebarPinned || isMobile) || flyoutOpen) && (
        <button type="button" aria-label="Fechar menu" onClick={dismissMenus} style={{ position: 'fixed', inset: 0, zIndex: 900, border: 0, background: isDark ? 'rgba(2,6,23,.48)' : 'rgba(15,23,42,.18)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      )}

      <aside
        id="dashboard-sidebar"
        className={workspaceStyles.sidebar}
        ref={menuRef}
        onMouseEnter={() => { if (!isMobile && !sidebarPinned) setSidebarExpanded(true); }}
        onMouseLeave={() => { if (!isMobile) dismissMenus(); }}
        style={{
          width: isMobile ? 'min(88vw,320px)' : (expanded ? 240 : 68),
          position: 'fixed', left: 0, top: 0, height: '100dvh', zIndex: isMobile ? 1400 : 1000,
          transform: isMobile ? (sidebarExpanded ? 'translateX(0)' : 'translateX(-105%)') : undefined,
          transition: 'width 180ms ease, transform 220ms ease',
          background: sidebarBg, color: sidebarTextColor, borderRight: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          boxShadow: expanded && !sidebarPinned ? '10px 0 28px rgba(15,23,42,.08)' : 'none',
          padding: '12px 7px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: '100%',
            height: 128,
            flexShrink: 0,
            padding: expanded ? '2px 8px 16px' : '2px 4px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <a
            href="https://azotrace.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir página inicial da Azotrace"
            title="Azotrace.com"
            style={{
              width: expanded ? 72 : 40,
              height: expanded ? 72 : 40,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 10,
              lineHeight: 0,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <img
              src="/assets/images/logo.png"
              alt="Azotrace"
              style={{
                width: expanded ? 72 : 40,
                height: expanded ? 72 : 40,
                objectFit: 'contain',
                display: 'block',
                transition: 'width 180ms ease, height 180ms ease',
              }}
            />
          </a>

          {expanded && (
            <div
              style={{
                width: '100%',
                marginTop: 8,
                padding: '0 4px',
                color: sidebarSubtext,
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
              }}
              title={localUser.role === 'superadmin' ? 'Plataforma Azotrace' : selectedBusinessName}
            >
              {localUser.role === 'superadmin' ? 'Plataforma Azotrace' : selectedBusinessName}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
          <AccessibleSidebarAtualizado isDark={isDark} sidebarActive={sidebarActive} sidebarTextColor={sidebarTextColor} sidebarSubtext={sidebarSubtext} isSidebarExpanded={expanded} accentColor={workspaceAccent} businessId={localUser.role === 'superadmin' ? null : selectedBusinessId ? String(selectedBusinessId) : null} isMobile={isMobile} isPinned={sidebarPinned} closeRequest={closeMenus} onFlyoutChange={setFlyoutOpen} onNavigate={dismissMenus} />
        </div>

        <div style={{ display: 'grid', gap: 8, paddingTop: 12, flexShrink: 0, borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}>
          {expanded && (
            <div style={{ padding: '8px 10px', borderRadius: 8, background: isDark ? '#111827' : '#f9fafb' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{localUser.name}</div>
              <div style={{ fontSize: 12, color: sidebarSubtext, overflow: 'hidden', textOverflow: 'ellipsis' }}>{localUser.email}</div>
              <div style={{ fontSize: 12, color: sidebarSubtext, marginTop: 3 }}>{roleLabel(localUser.role)}</div>
            </div>
          )}
          {!isMobile && (
            <button type="button" aria-label={sidebarPinned ? 'Recolher menu' : 'Expandir menu'} title={sidebarPinned ? 'Recolher menu' : 'Expandir menu'} aria-controls="dashboard-sidebar" aria-expanded={expanded} onClick={() => { const next = !sidebarPinned; setSidebarPinned(next); setSidebarExpanded(next); }} style={footerButton(isDark)}>{sidebarPinned ? <ArrowLeft size={16} strokeWidth={1.8} /> : <ArrowRight size={16} strokeWidth={1.8} />}{expanded ? <span>{sidebarPinned ? 'Recolher menu' : 'Expandir menu'}</span> : null}</button>
          )}
          <button type="button" aria-label={isDark ? "Modo claro" : "Modo escuro"} onClick={toggleTheme} style={footerButton(isDark)}>{isDark ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}{expanded ? <span>{isDark ? 'Modo claro' : 'Modo escuro'}</span> : null}</button>
          {localUser.role !== 'superadmin' && onlineCanImpersonate ? (
            <button type="button" aria-label="Voltar ao Super Admin" onClick={() => { setCurrentLocalUser('local-owner'); window.location.href = '/dashboard'; }} style={{ ...footerButton(isDark), color: '#dc2626' }}><ArrowLeft size={16} strokeWidth={1.8} />{expanded ? <span>Voltar ao Super Admin</span> : null}</button>
          ) : null}
          <button type="button" onClick={handleSignOut} style={{ ...footerButton(isDark), color: '#dc2626' }} title="Encerrar sessão">
            <LogOut size={16} strokeWidth={1.8} />
            {expanded ? <span>Encerrar sessão</span> : null}
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: isMobile ? 0 : (sidebarPinned ? 240 : 68), transition: 'margin-left 180ms ease', flex: 1, padding: isMobile ? '72px 16px 24px' : '32px 40px', minWidth: 0 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>{children}</div>
      </main>
    </div>
  );
}

function footerButton(isDark: boolean): React.CSSProperties {
  return { width: '100%', minHeight: 38, padding: '8px 9px', border: '1px solid transparent', borderRadius: 9, background: 'transparent', color: isDark ? '#d1d5db' : '#4b5563', cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 9 };
}
