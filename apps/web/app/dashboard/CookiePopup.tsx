'use client';

import { useState, useEffect } from 'react';

export default function CookiePopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [cookies, setCookies] = useState<string>('');

  const checkCookies = () => {
    const cookieString = document.cookie;
    setCookies(cookieString);
    
    if (cookieString && cookieString.includes('sb-')) {
      setShowPopup(true);
      // Esconder automaticamente após 5 segundos
      setTimeout(() => setShowPopup(false), 5000);
    }
  };

  useEffect(() => {
    // Verificar ao carregar
    checkCookies();
    
    // Verificar a cada 10 segundos
    const interval = setInterval(checkCookies, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      maxWidth: '700px',
      width: '100%',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{
        background: '#1e293b',
        color: '#ffffff',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🍪</span>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: '#ffffff' }}>
                Sessão Ativa & Cookies
              </h4>
              <p style={{ fontSize: '13px', color: '#ffffff', margin: '4px 0 0 0', fontWeight: '400', opacity: 0.9 }}>
                Autenticado com sucesso na plataforma
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 4px',
              opacity: 0.8
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#0f172a',
          borderRadius: '6px',
          fontSize: '11px',
          color: '#ffffff',
          wordBreak: 'break-all',
          maxHeight: '60px',
          overflowY: 'auto',
          opacity: 0.9
        }}>
          {cookies.substring(0, 100)}...
        </div>

        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(cookies);
              alert('🍪 Cookies copiados!');
            }}
            style={{
              padding: '6px 14px',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            📋 Copiar
          </button>
          <button
            onClick={handleClose}
            style={{
              padding: '6px 14px',
              background: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Fechar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}