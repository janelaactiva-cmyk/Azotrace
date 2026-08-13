'use client';

import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
          setTimeout(() => setShow(true), 1000);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          setIsLoggedIn(true);
          const consent = localStorage.getItem('cookie-consent');
          if (!consent) {
            setTimeout(() => setShow(true), 1000);
          }
        } else if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          setShow(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShow(false);
    // Ativar analytics/tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
    console.log('🍪 Cookies aceites - Analytics ativado');
  };

  const handleReject = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setShow(false);
    // Desativar apenas analytics/tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied'
      });
    }
    console.log('🍪 Cookies rejeitados - Analytics desativado. Cookies de autenticação mantidos.');
  };

  if (!show || !isLoggedIn) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#1e293b',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '560px',
        width: '90%',
        animation: 'slideUp 0.3s ease-out',
        border: '1px solid #334155',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <span style={{ fontSize: '24px' }}>🍪</span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>
            Utilizamos cookies essenciais para autenticação.
          </p>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
            Os cookies de autenticação são necessários para aceder à área privada.
            {` `}
            <span style={{ color: '#60a5fa' }}>
              Os cookies de analytics só são ativados se aceitares.
            </span>
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleAccept}
          style={{
            padding: '6px 16px',
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#16a34a'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#22c55e'}
        >
          Aceitar
        </button>
        <button
          onClick={handleReject}
          style={{
            padding: '6px 16px',
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid #475569',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#334155';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          Rejeitar
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
