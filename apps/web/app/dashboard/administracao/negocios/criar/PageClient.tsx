'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type CSSProperties } from 'react';
import { useAuth } from '~/lib/auth-context';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme-context';

const DRAFT_KEY = 'azotrace-negocio-form-draft';

type FormValues = {
  nome: string;
  tipo: string;
  quantidade: string;
};

const emptyForm: FormValues = {
  nome: '',
  tipo: '',
  quantidade: '',
};

export default function PageClient() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [form, setForm] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<FormValues>;
      setForm({
        nome: typeof parsed.nome === 'string' ? parsed.nome : '',
        tipo: typeof parsed.tipo === 'string' ? parsed.tipo : '',
        quantidade: typeof parsed.quantidade === 'string' ? parsed.quantidade : '',
      });
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (success) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, success]);

  const palette = useMemo(() => ({
    page: isDark ? '#111827' : '#f4f5f7',
    card: isDark ? '#1f2937' : '#ffffff',
    text: isDark ? '#f9fafb' : '#202124',
    muted: isDark ? '#9ca3af' : '#5f6368',
    border: isDark ? '#374151' : '#dadce0',
    input: isDark ? '#111827' : '#ffffff',
    accent: '#6d4aff',
    danger: '#d93025',
    success: '#137333',
  }), [isDark]);

  const updateField = (field: keyof FormValues, value: string) => {
    setSuccess(false);
    setMessage('');
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};
    if (!form.nome.trim()) nextErrors.nome = 'Indica o nome do negócio.';
    if (!form.tipo.trim()) nextErrors.tipo = 'Indica o tipo de negócio.';

    if (form.quantidade.trim()) {
      const quantity = Number(form.quantidade.replace(',', '.'));
      if (!Number.isFinite(quantity) || quantity < 0) {
        nextErrors.quantidade = 'Introduz uma quantidade válida, igual ou superior a zero.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(false);
    setMessage('');

    if (!validate()) return;
    if (!user?.id) {
      setMessage('Não foi possível identificar o utilizador autenticado. Volta a iniciar sessão e tenta novamente.');
      return;
    }

    setSubmitting(true);
    try {
      const quantidade = form.quantidade.trim()
        ? Number(form.quantidade.replace(',', '.'))
        : null;

      const { error } = await supabase.from('negocios').insert({
        nome: form.nome.trim(),
        tipo: form.tipo.trim(),
        quantidade,
        user_id: user.id,
      });

      if (error) throw error;

      localStorage.removeItem(DRAFT_KEY);
      setForm(emptyForm);
      setErrors({});
      setSuccess(true);
      setMessage('Negócio guardado com sucesso.');
    } catch (error: any) {
      setMessage(error?.message ? `Não foi possível guardar: ${error.message}` : 'Não foi possível guardar o negócio.');
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setForm(emptyForm);
    setErrors({});
    setSuccess(false);
    setMessage('');
    localStorage.removeItem(DRAFT_KEY);
  };

  const cardStyle: CSSProperties = {
    background: palette.card,
    border: `1px solid ${palette.border}`,
    borderRadius: '12px',
    boxShadow: isDark ? '0 1px 2px rgba(0,0,0,.2)' : '0 1px 2px rgba(60,64,67,.08)',
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    border: 0,
    borderBottom: `1px solid ${palette.border}`,
    background: 'transparent',
    color: palette.text,
    fontSize: '15px',
    padding: '10px 2px 8px',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <main
      style={{
        minHeight: '100%',
        background: palette.page,
        color: palette.text,
        padding: 'clamp(16px, 3vw, 34px)',
      }}
    >
      <div style={{ width: 'min(760px, 100%)', margin: '0 auto' }}>
        <div
          style={{
            ...cardStyle,
            overflow: 'hidden',
            marginBottom: '14px',
          }}
        >
          <div style={{ height: '10px', background: palette.accent }} />
          <div style={{ padding: '24px 26px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: '0 0 7px', color: palette.accent, fontSize: '12px', fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Administração · Produtos · Negócio
                </p>
                <h1 style={{ margin: 0, fontSize: 'clamp(24px, 4vw, 32px)', lineHeight: 1.2, fontWeight: 600 }}>
                  Formulário do Negócio
                </h1>
                <p style={{ margin: '10px 0 0', maxWidth: '620px', color: palette.muted, fontSize: '14px', lineHeight: 1.6 }}>
                  Regista os dados principais do negócio que serão utilizados no dashboard e nos processos de rastreabilidade.
                </p>
              </div>
              <Link
                href="/dashboard/administracao/negocios"
                style={{ color: palette.accent, textDecoration: 'none', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Ver negócios →
              </Link>
            </div>
            <p style={{ margin: '18px 0 0', color: palette.danger, fontSize: '12px' }}>* Campos obrigatórios</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <QuestionCard
            number="01"
            title="Nome do negócio"
            description="Escreve um nome curto e facilmente identificável."
            required
            error={errors.nome}
            palette={palette}
            cardStyle={cardStyle}
          >
            <input
              id="nome-negocio"
              name="nome"
              type="text"
              value={form.nome}
              onChange={(event) => updateField('nome', event.target.value)}
              placeholder="Ex.: Quinta Vale Verde"
              aria-invalid={Boolean(errors.nome)}
              aria-describedby={errors.nome ? 'nome-error' : undefined}
              autoComplete="organization"
              style={inputStyle}
            />
          </QuestionCard>

          <QuestionCard
            number="02"
            title="Tipo de negócio"
            description="Indica a atividade ou tipologia principal deste negócio."
            required
            error={errors.tipo}
            palette={palette}
            cardStyle={cardStyle}
          >
            <input
              id="tipo-negocio"
              name="tipo"
              type="text"
              value={form.tipo}
              onChange={(event) => updateField('tipo', event.target.value)}
              placeholder="Ex.: Produção agrícola, transformação, distribuição..."
              aria-invalid={Boolean(errors.tipo)}
              aria-describedby={errors.tipo ? 'tipo-error' : undefined}
              style={inputStyle}
            />
          </QuestionCard>

          <QuestionCard
            number="03"
            title="Quantidade inicial"
            description="Valor opcional, em quilogramas, usado nos indicadores atuais do Azotrace."
            error={errors.quantidade}
            palette={palette}
            cardStyle={cardStyle}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', maxWidth: '360px' }}>
              <input
                id="quantidade-negocio"
                name="quantidade"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.quantidade}
                onChange={(event) => updateField('quantidade', event.target.value)}
                placeholder="0"
                aria-invalid={Boolean(errors.quantidade)}
                aria-describedby={errors.quantidade ? 'quantidade-error' : undefined}
                style={{ ...inputStyle, flex: 1 }}
              />
              <span style={{ paddingBottom: '9px', color: palette.muted, fontSize: '14px', fontWeight: 700 }}>kg</span>
            </div>
          </QuestionCard>

          {message && (
            <div
              role={success ? 'status' : 'alert'}
              style={{
                ...cardStyle,
                marginBottom: '14px',
                padding: '14px 16px',
                borderLeft: `4px solid ${success ? palette.success : palette.danger}`,
                color: success ? palette.success : palette.danger,
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {success ? '✓ ' : ''}{message}
              {success && (
                <div style={{ marginTop: '9px' }}>
                  <Link href="/dashboard/administracao/negocios" style={{ color: palette.accent, fontWeight: 700, textDecoration: 'none' }}>
                    Abrir lista de negócios →
                  </Link>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '4px 2px 18px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                minWidth: '132px',
                border: 0,
                borderRadius: '7px',
                background: submitting ? (isDark ? '#4b5563' : '#b8aef6') : palette.accent,
                color: '#ffffff',
                padding: '11px 20px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,.12)',
              }}
            >
              {submitting ? 'A guardar…' : 'Guardar negócio'}
            </button>

            <button
              type="button"
              onClick={clearForm}
              disabled={submitting}
              style={{
                border: 0,
                background: 'transparent',
                color: palette.accent,
                padding: '10px 4px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              Limpar formulário
            </button>
          </div>
        </form>

        <p style={{ margin: '0 4px', color: palette.muted, fontSize: '11px', lineHeight: 1.5 }}>
          O rascunho é guardado automaticamente neste dispositivo até submeteres ou limpares o formulário.
        </p>
      </div>
    </main>
  );
}

function QuestionCard({
  number,
  title,
  description,
  required = false,
  error,
  children,
  palette,
  cardStyle,
}: {
  number: string;
  title: string;
  description: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  palette: {
    card: string;
    text: string;
    muted: string;
    border: string;
    input: string;
    accent: string;
    danger: string;
    success: string;
    page: string;
  };
  cardStyle: CSSProperties;
}) {
  const errorId = title === 'Nome do negócio'
    ? 'nome-error'
    : title === 'Tipo de negócio'
      ? 'tipo-error'
      : 'quantidade-error';

  return (
    <section
      style={{
        ...cardStyle,
        marginBottom: '14px',
        padding: '22px 24px 24px',
        borderColor: error ? palette.danger : palette.border,
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span
          aria-hidden="true"
          style={{
            width: '30px',
            height: '30px',
            flex: '0 0 30px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: `${palette.accent}16`,
            color: palette.accent,
            fontSize: '11px',
            fontWeight: 800,
          }}
        >
          {number}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <label style={{ display: 'block', color: palette.text, fontSize: '15px', fontWeight: 600, lineHeight: 1.4 }}>
            {title} {required && <span aria-label="obrigatório" style={{ color: palette.danger }}>*</span>}
          </label>
          <p style={{ margin: '5px 0 15px', color: palette.muted, fontSize: '12px', lineHeight: 1.55 }}>{description}</p>
          {children}
          {error && (
            <p id={errorId} style={{ margin: '8px 0 0', color: palette.danger, fontSize: '12px', fontWeight: 600 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
