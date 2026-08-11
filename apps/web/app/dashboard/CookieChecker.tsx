'use client';

import { useState, useEffect } from 'react';

export default function CookieChecker() {
  const [cookies, setCookies] = useState<{name: string, value: string}[]>([]);
  const [allCookies, setAllCookies] = useState<string>('');
  const [cookieCount, setCookieCount] = useState(0);
  const [hasAuthCookie, setHasAuthCookie] = useState(false);

  useEffect(() => {
    checkCookies();
    
    // Verificar a cada 5 segundos
    const interval = setInterval(checkCookies, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkCookies = () => {
    const cookieString = document.cookie;
    setAllCookies(cookieString);
    
    if (cookieString) {
      const cookiePairs = cookieString.split(';').map(c => c.trim());
      const parsed = cookiePairs.map(c => {
        const [name, ...valueParts] = c.split('=');
        return { name: name.trim(), value: valueParts.join('=') };
      });
      setCookies(parsed);
      setCookieCount(parsed.length);
      
      // Verificar se há cookies de autenticação
      const hasAuth = parsed.some(c => 
        c.name.includes('sb-') || 
        c.name.includes('auth') || 
        c.name.includes('token')
      );
      setHasAuthCookie(hasAuth);
    } else {
      setCookies([]);
      setCookieCount(0);
      setHasAuthCookie(false);
    }
  };

  const handleRefresh = () => {
    checkCookies();
    console.log('🍪 Cookies atualizados:', document.cookie);
  };

  const handleClearCookies = () => {
    if (confirm('Tem certeza que deseja limpar todos os cookies?')) {
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/');
      });
      checkCookies();
      alert('🍪 Cookies limpos! Recarregue a página.');
      window.location.reload();
    }
  };

  return (
    <div style={{
      marginBottom: '24px',
      padding: '20px',
      borderRadius: '12px',
      border: `2px solid ${hasAuthCookie ? '#22c55e' : '#ef4444'}`,
      background: hasAuthCookie ? '#f0fdf4' : '#fef2f2',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>{hasAuthCookie ? '✅' : '❌'}</span>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: hasAuthCookie ? '#16a34a' : '#dc2626' }}>
              {hasAuthCookie ? 'Cookies Ativos' : 'Cookies Não Encontrados'}
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              {cookieCount > 0 
                ? `${cookieCount} cookie(s) encontrado(s)` 
                : 'Nenhum cookie encontrado'}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleRefresh}
            style={{
              padding: '6px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            🔄 Verificar
          </button>
          <button
            onClick={handleClearCookies}
            style={{
              padding: '6px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            🗑️ Limpar Cookies
          </button>
        </div>
      </div>

      {cookieCount > 0 && (
        <div style={{ marginTop: '12px' }}>
          <details style={{ cursor: 'pointer' }}>
            <summary style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
              📋 Ver detalhes dos cookies
            </summary>
            <div style={{ 
              marginTop: '8px', 
              padding: '12px', 
              background: 'white', 
              borderRadius: '6px',
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              fontSize: '12px'
            }}>
              {cookies.map((c, i) => (
                <div key={i} style={{ 
                  padding: '4px 0', 
                  borderBottom: i < cookies.length - 1 ? '1px solid #f3f4f6' : 'none',
                  display: 'flex',
                  gap: '8px'
                }}>
                  <span style={{ fontWeight: '600', color: '#374151', minWidth: '120px' }}>{c.name}</span>
                  <span style={{ color: '#6b7280', wordBreak: 'break-all' }}>
                    {c.value.length > 50 ? c.value.substring(0, 50) + '...' : c.value}
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
        <p style={{ fontSize: '11px', color: '#9ca3af' }}>
          💡 Os cookies de autenticação (sb-*) são HttpOnly e não aparecem aqui.
          Para os ver, usa DevTools → Application → Cookies.
        </p>
      </div>
    </div>
  );
}
