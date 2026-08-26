'use client';

import { useState, useEffect } from 'react';

interface ChatbotQuestion {
  id: number;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  order_position: number;
}

export default function AdminChatbot() {
  const [questions, setQuestions] = useState<ChatbotQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'Geral',
    is_active: true,
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chatbot');
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setFormData({ question: '', answer: '', category: 'Geral', is_active: true });
        fetchQuestions();
        alert('✅ Pergunta criada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao criar:', error);
      alert('❌ Erro ao criar pergunta.');
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const response = await fetch(`/api/chatbot/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setEditingId(null);
        setFormData({ question: '', answer: '', category: 'Geral', is_active: true });
        fetchQuestions();
        alert('✅ Pergunta atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao editar:', error);
      alert('❌ Erro ao editar pergunta.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tens a certeza que queres eliminar esta pergunta?')) return;
    try {
      const response = await fetch(`/api/chatbot/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchQuestions();
        alert('🗑️ Pergunta eliminada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao eliminar:', error);
      alert('❌ Erro ao eliminar pergunta.');
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    const question = questions.find(q => q.id === id);
    if (!question) return;

    try {
      const response = await fetch(`/api/chatbot/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...question, is_active: !currentStatus }),
      });
      if (response.ok) {
        fetchQuestions();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f7', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f7', padding: '40px 16px', fontFamily: 'sans-serif', color: '#1f2937' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Cabeçalho */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px 0' }}>
            💬 Gestão do Chatbot
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Configura e gere as perguntas e respostas automáticas do teu assistente.
          </p>
        </div>

        {/* Cartão do Formulário */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
            {editingId ? 'Editar Pergunta' : 'Nova Pergunta'}
          </h2>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingId) {
                handleEdit(editingId);
              } else {
                handleCreate(e);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                Pergunta *
              </label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Ex: Como funciona o envio?"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              >
                <option value="Geral">Geral</option>
                <option value="Suporte">Suporte</option>
                <option value="Faturação">Faturação</option>
                <option value="Técnico">Técnico</option>
                <option value="Produto">Produto</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#374151' }}>
                Resposta *
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box' }}
                placeholder="Escreve a resposta detalhada aqui..."
                required
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Ativo no Chatbot
              </label>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ question: '', answer: '', category: 'Geral', is_active: true });
                  }}
                  style={{ padding: '10px 16px', fontSize: '14px', fontWeight: '500', color: '#4b5563', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                {editingId ? '💾 Atualizar Pergunta' : '➕ Adicionar Pergunta'}
              </button>
            </div>
          </form>
        </div>

        {/* Cartão da Listagem */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#1f2937' }}>
            Perguntas Registadas ({questions.length})
          </h3>

          {questions.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '24px 0', margin: 0 }}>Ainda não existem perguntas cadastradas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {questions.map((q) => (
                <div 
                  key={q.id} 
                  style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', opacity: q.is_active ? 1 : 0.6, backgroundColor: q.is_active ? '#ffffff' : '#f9fafb' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#f3f4f6', fontWeight: '600', color: '#4b5563', borderRadius: '4px' }}>
                        {q.category || 'Geral'}
                      </span>
                      <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.question}</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.answer}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => toggleActive(q.id, q.is_active)}
                      style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', border: '1px solid', backgroundColor: q.is_active ? '#ecfdf5' : '#fff1f2', color: q.is_active ? '#047857' : '#be123c', borderColor: q.is_active ? '#a7f3d0' : '#fecdd3' }}
                    >
                      {q.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(q.id);
                        setFormData({
                          question: q.question,
                          answer: q.answer,
                          category: q.category || 'Geral',
                          is_active: q.is_active,
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '500', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '500', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}