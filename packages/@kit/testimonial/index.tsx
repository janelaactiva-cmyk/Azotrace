'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../apps/web/lib/supabase';

interface Testimonial {
  id: string;
  author: string;
  content: string;
  rating: number;
  is_approved: boolean;
  created_at: string;
}

export function TestimonialsSection({ limit = 6, showStars = true }: { limit?: number; showStars?: boolean }) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_approved', true)
        .limit(limit)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', color: '#6b7280' }}>A carregar testemunhos...</p>;
  if (testimonials.length === 0) return null;

  return (
    <div style={{ padding: '20px 0' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '32px', color: '#111827' }}>
        💬 O que os nossos clientes dizem
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
      }}>
        {testimonials.map((t) => (
          <div
            key={t.id}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {showStars && (
              <div style={{ marginBottom: '8px', fontSize: '18px' }}>
                {'⭐'.repeat(Math.min(t.rating || 5, 5))}
              </div>
            )}
            <p style={{ fontSize: '15px', color: '#374151', fontStyle: 'italic', marginBottom: '12px', lineHeight: '1.6' }}>
              "{t.content}"
            </p>
            <p style={{ fontWeight: '600', color: '#111827' }}>— {t.author}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TestimonialAdmin() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ author: '', content: '', rating: 5 });

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.author || !form.content) return;
    try {
      const { error } = await supabase.from('testimonials').insert([{
        author: form.author,
        content: form.content,
        rating: form.rating,
        is_approved: false
      }]);
      if (error) throw error;
      setForm({ author: '', content: '', rating: 5 });
      loadTestimonials();
      alert('✅ Testemunho adicionado! Aguarda aprovação.');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este testemunho?')) return;
    try {
      await supabase.from('testimonials').delete().eq('id', id);
      loadTestimonials();
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  const toggleApproved = async (id: string, current: boolean) => {
    try {
      await supabase.from('testimonials').update({ is_approved: !current }).eq('id', id);
      loadTestimonials();
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  if (loading) return <p>A carregar...</p>;

  return (
    <div>
      {/* Formulário de Adição */}
      <div style={{
        background: '#f9fafb',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
          ➕ Adicionar Testemunho
        </h4>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px' }}>
          <input
            type="text"
            placeholder="Autor *"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            required
          />
          <input
            type="text"
            placeholder="Conteúdo *"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            required
          />
          <select
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) })}
            style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          >
            {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} ⭐</option>)}
          </select>
          <button
            type="submit"
            style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            💾 Adicionar
          </button>
        </form>
      </div>

      {/* Lista de Testemunhos */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Autor</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Conteúdo</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Rating</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {testimonials.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{t.author}</td>
                <td style={{ padding: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.content}
                </td>
                <td style={{ padding: '12px' }}>{'⭐'.repeat(t.rating)}</td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => toggleApproved(t.id, t.is_approved)}
                    style={{
                      background: t.is_approved ? '#22c55e' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {t.is_approved ? '✅ Aprovado' : '⏳ Pendente'}
                  </button>
                </td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {testimonials.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  Nenhum testemunho encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
