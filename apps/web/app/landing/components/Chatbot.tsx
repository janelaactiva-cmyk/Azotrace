'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import styles from './Chatbot.module.css';
import { normalizeQuestion } from '~/lib/azoia-answers';
import { findChatbotQuestion, renderChatbotAnswer } from '~/lib/chatbot-questions';
import { useChatbotQuestions } from '~/lib/use-chatbot-questions';
import { usePlanCatalog } from '~/lib/use-plan-catalog';

const SupportTicketPanel = dynamic(() => import('~/components/SupportTicketPanel'), {
  loading: () => <p role="status">A abrir o suporte…</p>,
});

const PublicHelpPanel = dynamic(() => import('~/components/PublicHelpPanel'), {
  loading: () => <p role="status">A abrir o formulário de ajuda…</p>,
});

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function Chatbot({ mode = 'help', initialOpen = false }: { mode?: 'help' | 'tickets'; initialOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportVisited, setSupportVisited] = useState(false);
  const { catalog, error: catalogError } = usePlanCatalog();
  const isTechnicalHelp = (value: string) => normalizeQuestion(value) === 'preciso de ajuda tecnica';
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { questions, loading: questionsLoading, error: questionsError } = useChatbotQuestions(isOpen);
  const suggestions = questions.filter(row => row.is_active).slice(0, 4).map(row => row.question);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (supportOpen) setSupportVisited(true); }, [supportOpen]);

  // Mensagem de boas-vindas
  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: 'Olá! Sou o AZOIA. Como posso ajudar?',
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

  const getBotResponse = (userMessage: string): string => {
    if (questionsError) return questionsError;
    if (questionsLoading) return 'As perguntas estão a ser carregadas. Tente novamente dentro de instantes.';
    const matched = findChatbotQuestion(userMessage, questions);
    if (matched) return renderChatbotAnswer(matched.answer, catalogError ? null : catalog);
    const normalized = normalizeQuestion(userMessage);
    if (/^(ola|bom dia|boa tarde|boa noite)$/.test(normalized)) return 'Olá! Sou o AZOIA. Como posso ajudar?';
    if (/^(obrigado|obrigada)$/.test(normalized)) return 'De nada. Estou disponível para ajudar.';
    return 'Não encontrei uma resposta para essa questão. Pode escolher uma das perguntas sugeridas ou utilizar ' + (mode === 'tickets' ? 'o suporte de tickets.' : 'o formulário de ajuda.');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (isTechnicalHelp(message)) { setMessage(''); setSupportOpen(true); return; }

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

  const handleSuggestionClick = (suggestion: string) => {
    setMessage('');
    if (isTechnicalHelp(suggestion)) { setSupportOpen(true); return; }
    
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
    <div className={styles.root} style={{ position: 'fixed', bottom: '90px', right: '24px', zIndex: 9999 }}>
      {/* Botão do Chat */}
      <button
        aria-label={isOpen ? 'Fechar o AZOIA' : 'Abrir o AZOIA'}
        aria-expanded={isOpen}
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
        {isOpen ? <span>✕</span> : <img src="/assets/images/azoia-head-azotrace.webp" alt="" aria-hidden="true" width={38} height={38} style={{display:'block'}} />}
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
      {(
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
          display: isOpen ? 'flex' : 'none',
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
                <img src="/assets/images/azoia-head-azotrace.webp" alt="" aria-hidden="true" width={32} height={32} style={{display:'block'}} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>AZOIA</div>
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

          <div hidden={!supportOpen} style={{flex:1,minHeight:0,overflowY:'auto'}}>{supportVisited && (mode === 'tickets' ? <SupportTicketPanel onBack={()=>setSupportOpen(false)}/> : <PublicHelpPanel onBack={()=>setSupportOpen(false)}/>)}</div>
          <div hidden={supportOpen} style={{display:supportOpen?'none':'flex',flex:1,minHeight:0,flexDirection:'column'}}>
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
                    whiteSpace: 'pre-line',
                    lineHeight: '1.6',
                    boxShadow: msg.sender === 'bot' ? '0 2px 8px rgba(0,0,0,0.04)' : '0 2px 8px rgba(35, 77, 135, 0.2)',
                    wordBreak: 'break-word'
                  }}
                >
                  {msg.text}
                </div>
                <span style={{ fontSize: '12px', color: '#94a3b8', padding: '0 4px' }}>
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

          {/* Sugestões - vêm da BD */}
          <div style={{
            padding: '8px 16px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            borderTop: '1px solid #e5e7eb',
            background: 'white'
          }}>
            {questionsError && <p role="status" style={{fontSize:12,margin:0,color:'#000'}}>{questionsError}</p>}
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
                {suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion}
              </button>
            ))}
          </div>

          <div style={{padding:'8px 16px',background:'#fff',borderTop:'1px solid #e5e7eb'}}><button type="button" onClick={()=>setSupportOpen(true)} style={{border:'1px solid #234d87',borderRadius:8,padding:'8px 12px',background:'#fff',color:'#234d87'}}>{mode === 'tickets' ? 'Ajuda técnica · Criar ticket' : 'Precisa de ajuda? · Formulário'}</button></div>
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
              placeholder="Escreva a sua mensagem"
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
        </div>
      )}
    </div>
  );
}
