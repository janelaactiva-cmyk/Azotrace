'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useAuth } from '~/lib/auth-context';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme-context';
import { BUSINESS_TYPES } from '~/lib/business-icons';

interface Field {
  name: string;
  title: string;
  type: 'text' | 'number' | 'email' | 'textarea' | 'date';
  required: boolean;
  placeholder?: string;
  suffix?: string;
  dateFormat?: 'date' | 'datetime-local' | 'time' | 'month' | 'week';
}

export default function PageClient() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('form_configs')
      .select('fields')
      .eq('slug', 'negocio')
      .limit(1);
    const list: Field[] = (data && data[0] && data[0].fields) || [];
    setFields(list);
    const init: Record<string, string> = {};
    list.forEach((f) => { init[f.name] = ''; });
    setValues(init);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const palette = {
    card: isDark ? '#1f2937' : '#ffffff',
    text: isDark ? '#f9fafb' : '#202124',
    muted: isDark ? '#9ca3af' : '#5f6368',
    border: isDark ? '#374151' : '#dadce0',
    accent: '#6d4aff',
    danger: '#d93025',
    success: '#137333',
  };

  const cardStyle: CSSProperties = {
    background: palette.card,
    border: `1px solid ${palette.border}`,
    borderRadius: '12px',
    boxShadow: isDark ? '0 1px 2px rgba(0,0,0,.2)' : '0 1px 2px rgba(60,64,67,.08)',
  };

  const inputStyle: CSSProperties = {
    width: '100%', boxSizing: 'border-box', border: 0,
    borderBottom: `1px solid ${palette.border}`, background: 'transparent',
    color: palette.text, fontSize: '15px', padding: '10px 2px 8px',
    outline: 'none', fontFamily: 'inherit',
  };

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false); setMessage('');

    // Validar
    const errs: Record<string, string> = {};
    fields.forEach((f) => {
      const v = (values[f.name] || '').trim();
      if (f.required && !v) errs[f.name] = `Indica ${f.title.toLowerCase()}.`;
      if (v && f.type === 'number' && !Number.isFinite(Number(v.replace(',', '.')))) {
        errs[f.name] = 'Valor inválido.';
      }
      if (v && f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
        errs[f.name] = 'Email inválido.';
      }
    });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!user?.id) { setMessage('Sessão inválida.'); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = { user_id: user.id };
      const extras: Record<string, any> = {};

      // Mapeamento ROBUSTO: normaliza o nome técnico para minúsculas e sem espaços
      fields.forEach((f) => {
        const raw = values[f.name]?.trim() || '';
        let parsed: any = null;
        if (f.type === 'number') parsed = raw ? Number(raw.replace(',', '.')) : null;
        else parsed = raw || null;

        // Normaliza: "Nome" → "nome", "tipo de negócio" → "tipodenegocio"
        const key = f.name.toLowerCase().replace(/[\s_-]+/g, '');

        // === Colunas fixas da tabela `negocios` ===
        if (key === 'nome' || key === 'name' || key === 'nom' || key === 'produtor' || key === 'nomedoprodutor') {
          payload.nome = parsed;
        } else if (key.includes('tipo')) {
          payload.tipo = parsed;
        } else if (key === 'quantidade' || key === 'quant' || key === 'qty' || key === 'peso') {
          payload.quantidade = parsed;
        } else {
          // Qualquer outro campo vai para dados_extras
          extras[f.name] = parsed;
        }
      });
      payload.dados_extras = extras;

      // GARANTIA FINAL: `nome` NUNCA pode ser null
      if (!payload.nome) {
        // Fallback: primeiro campo de texto preenchido
        const firstFilled = fields.find((f) => f.type === 'text' && values[f.name]?.trim());
        if (firstFilled) {
          payload.nome = values[firstFilled.name].trim();
        } else {
          setMessage('O campo "Nome" é obrigatório.');
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from('negocios').insert(payload);
      if (error) throw error;

      const reset: Record<string, string> = {};
      fields.forEach((f) => { reset[f.name] = ''; });
      setValues(reset);
      setSuccess(true);
      setMessage('Negócio guardado com sucesso!');
    } catch (err: any) {
      setMessage(err?.message ? `Erro: ${err.message}` : 'Erro ao guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: palette.muted }}>A carregar…</div>;

  if (fields.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: 40, textAlign: 'center', width: 'min(760px, 100%)', margin: '0 auto' }}>
        <p style={{ color: palette.muted }}>Nenhum campo configurado.</p>
        <a href="/dashboard/administracao/negocios/campos" style={{ color: palette.accent, fontWeight: 700, textDecoration: 'none' }}>
          ⚙️ Configurar campos
        </a>
      </div>
    );
  }

  return (
    <div style={{ width: 'min(760px, 100%)', margin: '0 auto' }}>
      <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ height: '10px', background: palette.accent }} />
        <div style={{ padding: '18px 26px 16px', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <p style={{ margin: 0, color: palette.muted, fontSize: '13px' }}>
            Preenche os campos para criar um novo negócio.
          </p>
         
        </div>
        <div style={{ padding: '0 26px 14px' }}>
          <p style={{ margin: 0, color: palette.danger, fontSize: '12px' }}>* Campos obrigatórios</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {fields.map((field, idx) => {
          const value = values[field.name] || '';
          const error = errors[field.name];
          const numberLabel = String(idx + 1).padStart(2, '0');
          const isTipo = field.name.toLowerCase().includes('tipo');

          return (
            <section key={field.name} style={{ ...cardStyle, marginBottom: '14px', padding: '22px 24px 24px', borderColor: error ? palette.danger : palette.border }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ width: '30px', height: '30px', flex: '0 0 30px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${palette.accent}16`, color: palette.accent, fontSize: '12px', fontWeight: 800 }}>
                  {numberLabel}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <label style={{ display: 'block', color: palette.text, fontSize: '15px', fontWeight: 600 }}>
                    {field.title} {field.required && <span style={{ color: palette.danger }}>*</span>}
                  </label>

                  <div style={{ marginTop: '10px' }}>
                    {isTipo ? (
                      <select
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer', maxWidth: '400px', fontSize: '16px' }}
                      >
                        <option value="">— Escolhe o tipo de negócio —</option>
                        {BUSINESS_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.icon} {t.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'number' ? (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', maxWidth: '360px' }}>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        {field.suffix && <span style={{ paddingBottom: '9px', color: palette.muted, fontSize: '14px', fontWeight: 700 }}>{field.suffix}</span>}
                      </div>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    ) : field.type === 'date' ? (
                      <input
                        type={field.dateFormat || 'date'}
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        style={{ ...inputStyle, maxWidth: '320px' }}
                      />
                    ) : (
                      <input
                        type={field.type === 'email' ? 'email' : 'text'}
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        style={inputStyle}
                      />
                    )}
                  </div>

                  {error && <p style={{ margin: '8px 0 0', color: palette.danger, fontSize: '12px', fontWeight: 600 }}>{error}</p>}
                </div>
              </div>
            </section>
          );
        })}

        {message && (
          <div style={{ ...cardStyle, marginBottom: '14px', padding: '14px 16px', borderLeft: `4px solid ${success ? palette.success : palette.danger}`, color: success ? palette.success : palette.danger, fontSize: '13px', fontWeight: 600 }}>
            {success ? '✓ ' : ''}{message}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '4px 2px 18px' }}>
          <button type="submit" disabled={submitting} style={{ minWidth: '132px', border: 0, borderRadius: '7px', background: submitting ? '#b8aef6' : palette.accent, color: '#fff', padding: '11px 20px', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'A guardar…' : 'Guardar negócio'}
          </button>
          <button type="button" onClick={() => { const r: Record<string,string> = {}; fields.forEach((f) => { r[f.name] = ''; }); setValues(r); setErrors({}); setMessage(''); }} style={{ border: 0, background: 'transparent', color: palette.accent, padding: '10px 4px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            Limpar formulário
          </button>
        </div>
      </form>
    </div>
  );
}