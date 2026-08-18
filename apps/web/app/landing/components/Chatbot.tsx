'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const suggestions = [
  'Como funciona a Azotrace?',
  'Quais os preços?',
  'Como criar QR Codes?',
  'Preciso de ajuda técnica',
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  
  // 1. Inicializa o estado vazio para evitar conflitos de SSR no Next.js
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 2. Insere a mensagem de boas-vindas com data real apenas no cliente
  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: '👋 Olá! Sou o assistente da Azotrace. Como posso ajudar-te?',
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Scroll para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Foco no input quando abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    // Simular resposta do bot
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(userMessage.text),
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 600 + Math.random() * 400);
  };

  const getBotResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase();
    
    if (msg.includes('preço') || msg.includes('custo') || msg.includes('valor') || msg.includes('€')) {
      return '💰 Os planos da Azotrace começam em 19,99€/mês. Temos opções para produtores individuais e empresas. Posso ajudar-te a escolher o melhor plano?';
    }
    
    if (msg.includes('qr code') || msg.includes('qr') || msg.includes('codigo')) {
      return '📱 A Azotrace gera QR Codes únicos para cada produto. Basta registar o produto na plataforma e o código é gerado automaticamente!';
    }
    
    if (msg.includes('como funciona') || msg.includes('funciona') || msg.includes('plataforma')) {
      return '🔧 A Azotrace funciona em 4 passos simples: 1️⃣ Registas o produto, 2️⃣ Geras o QR Code, 3️⃣ Aplicas no produto, 4️⃣ O cliente descobre a história do produto ao digitalizar o código.';
    }
    
    if (msg.includes('contacto') || msg.includes('falar') || msg.includes('email') || msg.includes('telefone')) {
      return '📞 Podes contactar-nos por email geral@azotrace.pt ou pelo telefone +351 296 286 288. Estamos disponíveis de segunda a sexta, das 9h às 18h.';
    }
    
    if (msg.includes('ajuda') || msg.includes('suporte') || msg.includes('problema')) {
      return '🛠️ A nossa equipa de suporte está disponível para te ajudar! Envia um email para suporte@azotrace.pt que responderemos rapidamente.';
    }
    
    if (msg.includes('obrigado') || msg.includes('obrigada') || msg.includes('👍')) {
      return '🙏 De nada! Estou aqui para ajudar. Se precisares de mais alguma coisa, é só perguntar.';
    }
    
    if (msg.includes('olá') || msg.includes('oi') || msg.includes('bom dia')) {
      return '👋 Olá! Como posso ajudar-te hoje? Pergunta-me sobre a Azotrace, preços, ou como criar QR Codes.';
    }
    
    return '🤔 Obrigado pela tua mensagem! A nossa equipa vai analisar e responder em breve. Enquanto isso, posso ajudar com outras questões sobre a Azotrace.';
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    setTimeout(() => {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: suggestion,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      
      setTimeout(() => {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: getBotResponse(suggestion),
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      }, 600);
    }, 100);
  };

  const formatTime = (date: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ position: 'fixed', bottom: '90px', right: '24px', zIndex: 9999 }}>
      {/* Botão do Chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #234D87 0%, #1a3a6b 100%)',
          color: 'white',
          border: 'none',
          fontSize: '28px',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(35, 77, 135, 0.35)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {isOpen ? <span>✕</span> : <span>💬</span>}
        {!isOpen && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '16px',
            height: '16px',
            background: '#22c55e',
            borderRadius: '50%',
            border: '3px solid white'
          }} />
        )}
      </button>

      {/* Janela do Chat */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '0',
          width: '400px',
          maxWidth: 'calc(100vw - 48px)',
          height: '520px',
          maxHeight: 'calc(100vh - 180px)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #234D87 0%, #1a3a6b 100%)',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                🤖
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>Assistente Azotrace</div>
                <div style={{ fontSize: '12px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    background: '#22c55e',
                    borderRadius: '50%',
                  }} />
                  Online
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {/* Mensagens */}
          <div style={{
            flex: 1,
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: '#f8fafc'
          }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'bot' ? 'flex-start' : 'flex-end',
                  gap: '2px'
                }}
              >
                <div
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    maxWidth: '85%',
                    background: msg.sender === 'bot' ? 'white' : 'linear-gradient(135deg, #234D87 0%, #1a3a6b 100%)',
                    color: msg.sender === 'bot' ? '#1f2937' : 'white',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    boxShadow: msg.sender === 'bot' ? '0 2px 8px rgba(0,0,0,0.04)' : '0 2px 8px rgba(35, 77, 135, 0.2)',
                    wordBreak: 'break-word'
                  }}
                >
                  {msg.text}
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', padding: '0 4px' }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: 'flex', gap: '4px', padding: '8px 0' }}>
                <span style={{ width: '8px', height: '8px', background: '#94a3b8', borderRadius: '50%' }} />
                <span style={{ width: '8px', height: '8px', background: '#94a3b8', borderRadius: '50%' }} />
                <span style={{ width: '8px', height: '8px', background: '#94a3b8', borderRadius: '50%' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões */}
          <div style={{
            padding: '8px 16px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            borderTop: '1px solid #e5e7eb',
            background: 'white'
          }}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '4px 12px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{
            padding: '12px 16px',
            display: 'flex',
            gap: '8px',
            borderTop: '1px solid #e5e7eb',
            background: 'white',
            flexShrink: 0
          }}>
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreve a tua mensagem..."
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
            <button
              type="submit"
              disabled={!message.trim()}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #234D87 0%, #1a3a6b 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: message.trim() ? 1 : 0.5
              }}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}