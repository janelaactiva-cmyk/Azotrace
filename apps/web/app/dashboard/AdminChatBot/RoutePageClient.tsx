'use client';

import { useState, useEffect } from 'react';

interface ChatbotQuestion {
  id: number;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  order_position: number;
  created_at: string;
  updated_at: string;
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
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredQuestions = questions.filter(q =>
    q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💬 Gestão do Chatbot</h1>
          <p className="text-gray-500 text-sm">Gerir perguntas e respostas do chatbot da landing page</p>
        </div>
        <div className="text-sm text-gray-400">
          {questions.length} perguntas no total
        </div>
      </div>

      {/* Formulário de criação/edição */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          {editingId ? '✏️ Editar Pergunta' : '➕ Nova Pergunta'}
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
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pergunta *
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Ex: Como funciona o rastreamento?"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="Geral">Geral</option>
              <option value="Suporte">Suporte</option>
              <option value="Faturação">Faturação</option>
              <option value="Técnico">Técnico</option>
              <option value="Produto">Produto</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resposta *
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              rows={3}
              placeholder="Escreve a resposta aqui..."
              required
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Ativo</span>
            </label>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ question: '', answer: '', category: 'Geral', is_active: true });
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Cancelar edição
              </button>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              {editingId ? '💾 Atualizar' : '➕ Adicionar Pergunta'}
            </button>
          </div>
        </form>
      </div>

      {/* Barra de pesquisa e filtros */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
        <div className="flex gap-2 flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Procurar perguntas..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredQuestions.length} de {questions.length} perguntas
        </div>
      </div>

      {/* Lista de perguntas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-4">🤖</span>
            <p className="text-gray-500 text-lg">Nenhuma pergunta encontrada</p>
            <p className="text-gray-400 text-sm">Adiciona a tua primeira pergunta acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pergunta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuestions.map((q, index) => (
                  <tr key={q.id} className={`hover:bg-gray-50 transition ${!q.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={q.question}>
                        {q.question}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {q.category || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(q.id, q.is_active)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          q.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {q.is_active ? '✅ Ativo' : '❌ Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(q.id);
                            setFormData({
                              question: q.question,
                              answer: q.answer,
                              category: q.category || 'Geral',
                              is_active: q.is_active,
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}