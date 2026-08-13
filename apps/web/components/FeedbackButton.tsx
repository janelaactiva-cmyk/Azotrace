'use client';

import { useState } from 'react';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('feedback');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    setLoading(true);
    try {
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('✅ Feedback enviado! Obrigado.');
      setMessage('');
      setIsOpen(false);
    } catch (error) {
      alert('❌ Erro ao enviar feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {/* Botão de Feedback */}
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
          gap: '8px',
          transition: 'transform 0.2s, background 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1d4ed8';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#2563eb';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        💬 Feedback
      </button>

      {/* Modal de Feedback */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '0',
            width: '380px',
            maxWidth: '90vw',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            padding: '24px',
            border: '1px solid #e5e7eb',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
              📝 Enviar Feedback
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>
          </div>

          <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
            Ajuda-nos a melhorar o Azotrace!
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="feedback">💡 Sugestão</option>
                <option value="bug">🐛 Reportar Bug</option>
                <option value="feature">🚀 Nova Funcionalidade</option>
                <option value="other">📝 Outro</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
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
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
            >
              {loading ? 'A enviar...' : '📤 Enviar Feedback'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
