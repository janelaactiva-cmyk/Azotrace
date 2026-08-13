'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../apps/web/lib/supabase';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image: string;
  status: string;
  published_at: string;
  created_at: string;
}

export function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>A carregar artigos...</p>;

  if (posts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
        📰 Sem artigos publicados ainda.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
      {posts.map((post) => (
        <div
          key={post.id}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            background: 'white',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {post.cover_image && (
            <img
              src={post.cover_image}
              alt={post.title}
              style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '12px' }}
            />
          )}
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
            {post.title}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
            {post.excerpt || post.content?.substring(0, 120) + '...'}
          </p>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            {post.published_at ? new Date(post.published_at).toLocaleDateString('pt-PT') : 'Rascunho'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BlogPost({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
  }, [slug]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      if (error) throw error;
      setPost(data);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>A carregar artigo...</p>;

  if (!post) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>404 - Artigo não encontrado</h2>
        <p style={{ color: '#6b7280' }}>O artigo que procura não existe ou foi removido.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
        {post.title}
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '16px' }}>
        {post.published_at ? new Date(post.published_at).toLocaleDateString('pt-PT') : 'Rascunho'}
      </p>
      {post.cover_image && (
        <img
          src={post.cover_image}
          alt={post.title}
          style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginBottom: '24px' }}
        />
      )}
      <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#374151' }}>
        {post.content || 'Conteúdo em breve...'}
      </div>
    </div>
  );
}

export function BlogAdmin() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    status: 'draft'
  });

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.slug) return;
    try {
      const { error } = await supabase.from('blog_posts').insert([{
        ...form,
        published_at: form.status === 'published' ? new Date().toISOString() : null
      }]);
      if (error) throw error;
      setForm({ title: '', slug: '', content: '', excerpt: '', status: 'draft' });
      loadPosts();
      alert('✅ Artigo criado!');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este artigo?')) return;
    try {
      await supabase.from('blog_posts').delete().eq('id', id);
      loadPosts();
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === 'published') {
        updates.published_at = new Date().toISOString();
      }
      await supabase.from('blog_posts').update(updates).eq('id', id);
      loadPosts();
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  if (loading) return <p>A carregar...</p>;

  return (
    <div>
      {/* Formulário de Criação */}
      <div style={{
        background: '#f9fafb',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>➕ Novo Artigo</h4>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input
            type="text"
            placeholder="Título *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            required
          />
          <input
            type="text"
            placeholder="Slug * (ex: artigo-exemplo)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
            style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            required
          />
          <input
            type="text"
            placeholder="Resumo"
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            style={{ gridColumn: 'span 2', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          />
          <textarea
            placeholder="Conteúdo"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={4}
            style={{ gridColumn: 'span 2', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'none' }}
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="draft">📝 Rascunho</option>
            <option value="published">🚀 Publicado</option>
          </select>
          <button
            type="submit"
            style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            💾 Criar Artigo
          </button>
        </form>
      </div>

      {/* Lista de Artigos */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Título</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Slug</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{p.title}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{p.slug}</td>
                <td style={{ padding: '12px' }}>
                  <select
                    value={p.status}
                    onChange={(e) => updateStatus(p.id, e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      background: 'white',
                      fontSize: '12px'
                    }}
                  >
                    <option value="draft">📝 Rascunho</option>
                    <option value="published">🚀 Publicado</option>
                  </select>
                </td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  Nenhum artigo criado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
