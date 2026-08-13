'use client';

import { useState } from 'react';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 24px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
      >
        💬 Feedback
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '0',
          width: '400px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>📝 Enviar Feedback</h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>Ajuda-nos a melhorar o Azotrace!</p>
          <form>
            <textarea
              placeholder="Descreve o teu feedback..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                resize: 'none',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
            <button
              type="button"
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onClick={() => { alert('✅ Feedback enviado! Obrigado.'); setIsOpen(false); }}
            >
              📤 Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default FeedbackButton;
