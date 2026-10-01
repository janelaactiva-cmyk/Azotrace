'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '~/lib/supabase';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();         
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Field>({ name: '', title: '', type: 'text', required: false });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('form_configs')
        .select('fields')
        .eq('slug', 'negocio')
        .limit(1);
      if (data && data[0]?.fields) setFields(data[0].fields);
      setLoading(false);
    })();
  }, []);

  const persist = async (newFields: Field[]) => {
    setSaving(true);
    const { error } = await supabase
      .from('form_configs')
      .update({ fields: newFields })
      .eq('slug', 'negocio');
    setSaving(false);
    if (error) alert('Erro: ' + error.message);
    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.title.trim()) {
      alert('Preenche nome técnico e título.');
      return;
    }
    if (editingIdx === null && fields.some((f) => f.name === form.name.trim())) {
      alert('Já existe um campo com esse nome técnico.');
      return;
    }

    let updated: Field[];
    if (editingIdx !== null) {
      updated = fields.map((f, i) => (i === editingIdx ? { ...form } : f));
    } else {
      updated = [...fields, { ...form }];
    }

    await persist(updated);
    setForm({ name: '', title: '', type: 'text', required: false });
    setEditingIdx(null);
  };

  const handleEdit = (i: number) => {
    setForm(fields[i]);
    setEditingIdx(i);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameInputRef.current?.focus();
    }, 50);
  };

  const handleDelete = async (i: number) => {
    if (!confirm('Remover este campo?')) return;
    await persist(fields.filter((_, idx) => idx !== i));
  };

  const handleMove = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    await persist(next);
  };

  const handleCreateNew = () => {
    setForm({ name: '', title: '', type: 'text', required: false });
    setEditingIdx(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameInputRef.current?.focus();
    }, 50);
  };

  if (loading) return <p style={{ padding: 40 }}>A carregar…</p>;

  return (
    <div>
      {/* CABEÇALHO */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
          📋 Campos do Formulário do Negócio
        </h2>
        <button
          type="button"
          onClick={() => router.push('/dashboard/administracao/negocios/criar')}
            style={{
            padding: '8px 16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          ➕ Criar Novo Formulário
        </button>
      </div>

      {/* FORMULÁRIO */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{ marginBottom: '24px', background: '#f9fafb', padding: '20px', borderRadius: '8px', scrollMarginTop: '20px' }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Nome técnico (ex: data_producao)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ flex: 1, minWidth: '180px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            required
          />
          <input
            type="text"
            placeholder="Título (ex: Data de produção)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{ flex: 1, minWidth: '180px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as Field['type'], suffix: undefined, dateFormat: undefined })}
            style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          >
            <option value="text">Texto</option>
            <option value="number">Número</option>
            <option value="email">Email</option>
            <option value="textarea">Texto longo</option>
            <option value="date">📅 Data</option>
          </select>

          <input
            type="text"
            placeholder="Placeholder (opcional)"
            value={form.placeholder || ''}
            onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
            style={{ flex: 1, minWidth: '180px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          />

          {form.type === 'number' && (
            <select
              value={form.suffix || ''}
              onChange={(e) => setForm({ ...form, suffix: e.target.value })}
              style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: '200px' }}
            >
              <option value="">— Sem sufixo —</option>
              <optgroup label="Temperatura">
                <option value="°C">°C (Celsius)</option>
                <option value="°F">°F (Fahrenheit)</option>
                <option value="K">K (Kelvin)</option>
              </optgroup>
              <optgroup label="Massa / Peso">
                <option value="kg">kg (quilograma)</option>
                <option value="g">g (grama)</option>
                <option value="mg">mg (miligrama)</option>
                <option value="t">t (tonelada)</option>
              </optgroup>
              <optgroup label="Volume">
                <option value="L">L (litro)</option>
                <option value="mL">mL (mililitro)</option>
                <option value="m³">m³ (metro cúbico)</option>
                <option value="cm³">cm³ (centímetro cúbico)</option>
              </optgroup>
              <optgroup label="Comprimento">
                <option value="m">m (metro)</option>
                <option value="cm">cm (centímetro)</option>
                <option value="mm">mm (milímetro)</option>
                <option value="km">km (quilómetro)</option>
              </optgroup>
              <optgroup label="Percentagem">
                <option value="%">% (percentagem)</option>
                <option value="‰">‰ (permilagem)</option>
              </optgroup>
              <optgroup label="Área">
                <option value="m²">m² (metro quadrado)</option>
                <option value="cm²">cm² (centímetro quadrado)</option>
                <option value="ha">ha (hectare)</option>
              </optgroup>
              <optgroup label="Velocidade">
                <option value="km/h">km/h (quilómetros por hora)</option>
                <option value="m/s">m/s (metros por segundo)</option>
              </optgroup>
              <optgroup label="Energia">
                <option value="kWh">kWh (quilowatt-hora)</option>
                <option value="J">J (joule)</option>
                <option value="kcal">kcal (quilocaloria)</option>
              </optgroup>
              <optgroup label="Moeda">
                <option value="€">€ (Euro)</option>
                <option value="$">$ (Dólar)</option>
                <option value="£">£ (Libra)</option>
              </optgroup>
              <optgroup label="Outros">
                <option value="un">un (unidade)</option>
                <option value="pç">pç (peça)</option>
                <option value="dz">dz (dúzia)</option>
                <option value="GB">GB (gigabyte)</option>
                <option value="MB">MB (megabyte)</option>
              </optgroup>
            </select>
          )}

          {form.type === 'date' && (
            <select
              value={form.dateFormat || 'date'}
              onChange={(e) => setForm({ ...form, dateFormat: e.target.value as any })}
              style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: '220px' }}
            >
              <optgroup label="Formato da Data">
                <option value="date">📅 Data (dd/mm/aaaa)</option>
                <option value="datetime-local">📅🕐 Data + Hora</option>
                <option value="time">🕐 Só Hora</option>
                <option value="month">📅 Mês (mm/aaaa)</option>
                <option value="week">📅 Semana</option>
              </optgroup>
            </select>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
            Obrigatório
          </label>

          <button type="submit" disabled={saving} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
            {saving ? 'A guardar…' : editingIdx !== null ? '✏️ Atualizar' : '➕ Adicionar'}
          </button>

          {editingIdx !== null && (
            <button type="button" onClick={() => { setForm({ name: '', title: '', type: 'text', required: false }); setEditingIdx(null); }} style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              ↩️ Cancelar
            </button>
          )}
        </div>
      </form>

      {/* TABELA */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Nome</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Título</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Tipo</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Formato / Sufixo</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Obrigatório</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => {
              const extra =
                f.type === 'number' ? (f.suffix || '—') :
                f.type === 'date' ? (f.dateFormat || 'date') :
                '—';
              return (
                <tr key={f.name} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{f.name}</td>
                  <td style={{ padding: '12px' }}>{f.title}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>
                    {f.type === 'date' ? '📅 date' : f.type}
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{extra}</td>
                  <td style={{ padding: '12px' }}>{f.required ? '✅ Sim' : '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => handleMove(i, -1)} style={{ marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>↑</button>
                    <button onClick={() => handleMove(i, 1)} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>↓</button>
                    <button onClick={() => handleEdit(i)} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>✏️</button>
                    <button onClick={() => handleDelete(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>🗑️</button>
                  </td>
                </tr>
              );
            })}
            {fields.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Nenhum campo criado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}