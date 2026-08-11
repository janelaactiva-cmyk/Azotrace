'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '~/lib/supabase';
import { BUSINESS_TYPES, getBusinessIcon } from '~/lib/business-icons';
import { useTheme } from '~/lib/theme-context';
import { useAuth } from '~/lib/auth-context';

export default function AdministracaoClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    tipo: '',
    humidade: '',
    origem: '',
    temperatura: '',
    validade: '',
    quantidade: '',
    observacoes: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadBusinesses();
    }
  }, [user, authLoading]);

  const loadBusinesses = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!user) {
        alert('Faça login primeiro!');
        router.push('/login');
        return;
      }

      const novoNegocio = {
        nome: form.nome,
        tipo: form.tipo,
        humidade: form.humidade ? parseFloat(form.humidade) : null,
        origem: form.origem || null,
        temperatura: form.temperatura ? parseFloat(form.temperatura) : null,
        validade: form.validade || null,
        quantidade: form.quantidade ? parseFloat(form.quantidade) : null,
        observacoes: form.observacoes || null,
        user_id: user.id,
      };

      const { error } = await supabase.from('negocios').insert([novoNegocio]);
      if (error) throw error;

      setForm({
        nome: '',
        tipo: '',
        humidade: '',
        origem: '',
        temperatura: '',
        validade: '',
        quantidade: '',
        observacoes: ''
      });
      await loadBusinesses();
      alert('✅ Negócio adicionado com sucesso!');
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar este negócio?')) return;
    try {
      const { error } = await supabase.from('negocios').delete().eq('id', id);
      if (error) throw error;
      await loadBusinesses();
    } catch (error: any) {
      alert('❌ Erro: ' + error.message);
    }
  };

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>A carregar...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>⚙️ Administração</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Gerir negócios e configurações</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '10px 20px',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          ← Voltar
        </button>
      </div>

      <div className="card" style={{ padding: '28px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>➕ Adicionar Negócio</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>Nome *</label>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px' }}
                placeholder="Ex: Carne Premium"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>Tipo *</label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px' }}
                required
              >
                <option value="">Selecione...</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>🌡️ Humidade (%)</label>
              <input
                type="number"
                name="humidade"
                value={form.humidade}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px' }}
                step="0.1"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>🌡️ Temperatura (°C)</label>
              <input
                type="number"
                name="temperatura"
                value={form.temperatura}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px' }}
                step="0.1"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>📍 Origem</label>
              <input
                type="text"
                name="origem"
                value={form.origem}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px' }}
                placeholder="Ex: São Miguel, Açores"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>📅 Validade</label>
              <input
                type="date"
                name="validade"
                value={form.validade}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>📦 Quantidade (kg)</label>
              <input
                type="number"
                name="quantidade"
                value={form.quantidade}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px' }}
                step="0.1"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>📝 Observações</label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                rows={3}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '15px', resize: 'none' }}
                placeholder="Observações sobre o negócio..."
              />
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 28px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '500',
                opacity: saving ? 0.7 : 1,
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.background = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                if (!saving) e.currentTarget.style.background = '#2563eb';
              }}
            >
              {saving ? 'A guardar...' : '💾 Guardar'}
            </button>
            <button
              type="reset"
              onClick={() => setForm({
                nome: '',
                tipo: '',
                humidade: '',
                origem: '',
                temperatura: '',
                validade: '',
                quantidade: '',
                observacoes: ''
              })}
              style={{
                padding: '12px 28px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              ↩️ Limpar
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>📋 Lista de Negócios ({businesses.length})</h2>
        {businesses.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Nenhum negócio encontrado</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Nome</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Tipo</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Humidade</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Origem</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => {
                  const icon = getBusinessIcon(b.tipo);
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{b.nome}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          background: `${icon.color}22`,
                          color: icon.color
                        }}>
                          {icon.icon} {icon.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{b.humidade || '-'}%</td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{b.origem || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => handleDelete(b.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '20px',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#dc2626';
                          }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
