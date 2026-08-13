'use client';

import { useState, useEffect } from 'react';

export default function CookieToast() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Verificar cookies a cada 5 segundos
    const checkCookies = () => {
      const hasCookies = document.cookie.length > 0;
      if (hasCookies) {
        setMessage('🍪 Cookies ativos');
        setShow(true);
        setTimeout(() => setShow(false), 3000);
      }
    };

    // Verificar ao carregar
    checkCookies();

    // Verificar periodicamente
    const interval = setInterval(checkCookies, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 9998,
        background: '#1e293b',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'slideIn 0.3s ease-out',
        border: '1px solid #334155'
      }}
    >
      <span>{message}</span>
      <button
        onClick={() => setShow(false)}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '0 4px'
        }}
      >
        ✕
      </button>
      <style>{`
        @keyframes slideIn {
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
