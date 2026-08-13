'use client';

import { useState } from 'react';

export default function FeedbackButtonSimple() {
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
          fontWeight: '600'
        }}
      >
        💬 Feedback
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '0',
          width: '350px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '24px'
        }}>
          <h3 style={{ margin: '0 0 8px 0' }}>📝 Enviar Feedback</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>Ajuda-nos a melhorar!</p>
          <textarea
            placeholder="O que achas do Azotrace?"
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
            onClick={() => { alert('✅ Feedback enviado! Obrigado.'); setIsOpen(false); }}
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
          >
            📤 Enviar
          </button>
        </div>
      )}
    </div>
  );
}
