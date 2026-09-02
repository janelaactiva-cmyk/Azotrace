'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PLANS = {
  base: {
    id: 'base',
    nome: 'Base',
    preco: 0.43,
    preco_anual: 0.43,
    iva: 0.16,
    features: ['1 Utilizador', 'Rastreabilidade Básica de Produtos', 'QR Codes Limitados', 'Actualizações Gratuitas', '1 Mês de Suporte']
  },
  essential: {
    id: 'essential',
    nome: 'Essential',
    preco: 30.99,
    preco_anual: 371.88,
    iva: 0.16,
    features: ['5 Utilizadores', 'Todos os Recursos Avançados', 'QR Codes Limitados', 'Actualizações Gratuitas', 'Utilização de um só projeto', '4 Meses de Suporte']
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    preco: 70.99,
    preco_anual: 851.88,
    iva: 0.16,
    features: ['Utilizadores Ilimitados', 'Recursos Premium e Prioritários', 'Lifetime access', 'Actualizações Gratuitas', 'Múltiplos projetos', 'Suporte Prioritário 24/7']
  }
};

const CONFIG_PRICE = 100.00;

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isCommercial, setIsCommercial] = useState(false);
  const [includeSetup, setIncludeSetup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('essential');
  const [emailError, setEmailError] = useState<string>('');
  const [form, setForm] = useState({
    nome: '',
    email: '',
    confirmEmail: '',
    telefone: '',
    nif: '',
    nomeEmpresa: '',
    nifEmpresa: '',
    morada: '',
  });

  useEffect(() => {
    const savedPlan = localStorage.getItem('selectedPlan');
    if (savedPlan && PLANS[savedPlan as keyof typeof PLANS]) {
      setSelectedPlan(savedPlan);
    }
  }, []);

  // ✅ Validar emails
  useEffect(() => {
    if (form.confirmEmail && form.email !== form.confirmEmail) {
      setEmailError('Os emails não coincidem');
    } else if (form.confirmEmail && form.email === form.confirmEmail) {
      setEmailError('');
    } else if (!form.confirmEmail) {
      setEmailError('');
    }
  }, [form.email, form.confirmEmail]);

  const calcularPreco = () => {
    const plano = PLANS[selectedPlan as keyof typeof PLANS];
    if (!plano) return { total: 0, iva: 0, base: 0, setupTotal: 0, setupIva: 0 };
    
    const base = plano.preco_anual;
    const iva = base * 0.16;
    let total = base + iva;

    let setupTotal = 0;
    let setupIva = 0;
    if (includeSetup) {
      setupIva = CONFIG_PRICE * 0.16;
      setupTotal = CONFIG_PRICE + setupIva;
      total += setupTotal;
    }

    return { base, iva, total, setupTotal, setupIva };
  };

  const { base, iva, total, setupTotal, setupIva } = calcularPreco();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!form.nome || !form.email || !form.telefone) {
        alert('❌ Preencha todos os campos obrigatórios');
        setLoading(false);
        return;
      }

      if (form.email !== form.confirmEmail) {
        alert('❌ Os emails não coincidem');
        setLoading(false);
        return;
      }

      // 🔒 Validação rigorosa de 9 dígitos para o Telemóvel
      if (form.telefone.length !== 9) {
        alert('❌ O número de telemóvel tem de ter obrigatoriamente 9 dígitos');
        setLoading(false);
        return;
      }

      // 🔒 Validação de 9 dígitos para o NIF Pessoal (caso seja preenchido)
      if (form.nif && form.nif.length !== 9) {
        alert('❌ O NIF pessoal tem de ter obrigatoriamente 9 dígitos');
        setLoading(false);
        return;
      }

      if (isCommercial && (!form.nomeEmpresa || !form.nifEmpresa || !form.morada)) {
        alert('❌ Preencha o Nome da Empresa, NIF e Morada');
        setLoading(false);
        return;
      }

      // 🔒 Validação de 9 dígitos para o NIF da Empresa
      if (isCommercial && form.nifEmpresa.length !== 9) {
        alert('❌ O NIF da empresa tem de ter obrigatoriamente 9 dígitos');
        setLoading(false);
        return;
      }

      const plano = PLANS[selectedPlan as keyof typeof PLANS];

      const dadosCheckout = {
        plano: selectedPlan,
        plano_nome: plano.nome,
        valor_base: base,
        valor_iva: iva,
        valor_total: total,
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        nif: form.nif || '',
        is_commercial: isCommercial,
        nome_empresa: isCommercial ? form.nomeEmpresa : '',
        nif_empresa: isCommercial ? form.nifEmpresa : '',
        morada: isCommercial ? form.morada : '',
        include_setup: includeSetup,
        config_price: CONFIG_PRICE,
        config_iva: setupIva,
        config_total: setupTotal,
      };

      console.log('📝 Enviando dados:', dadosCheckout);

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosCheckout),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar checkout');
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }

    } catch (error: any) {
      console.error('❌ Erro:', error);
      alert('❌ Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    let newValue = value;
    if (name === 'telefone' || name === 'nif' || name === 'nifEmpresa') {
      // Remove carateres não numéricos e limita estritamente a 9 dígitos
      newValue = value.replace(/\D/g, '').slice(0, 9);
    }

    setForm({ ...form, [name]: newValue });
    
    if (name === 'email' && form.confirmEmail) {
      if (newValue !== form.confirmEmail) {
        setEmailError('Os emails não coincidem');
      } else {
        setEmailError('');
      }
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: '#f3f4f6',
      padding: '40px 20px',
      fontFamily: 'sans-serif'
    },
    wrapper: {
      maxWidth: '900px',
      margin: '0 auto'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    subtitle: {
      color: '#6b7280',
      marginBottom: '24px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px'
    },
    card: {
      background: 'white',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontWeight: '500',
      marginBottom: '4px',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px'
    },
    inputError: {
      width: '100%',
      padding: '10px',
      border: '2px solid #dc2626',
      borderRadius: '6px',
      fontSize: '14px',
      background: '#fef2f2'
    },
    errorText: {
      color: '#dc2626',
      fontSize: '12px',
      marginTop: '4px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer'
    },
    checkboxLabel: {
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    companyFields: {
      background: '#f9fafb',
      padding: '16px',
      borderRadius: '6px',
      border: '1px solid #e5e7eb',
      marginBottom: '16px'
    },
    button: {
      width: '100%',
      padding: '14px',
      background: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      opacity: loading ? 0.7 : 1
    },
    sticky: {
      position: 'sticky',
      top: '24px'
    } as const
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <h1 style={styles.title}>🛒 Finalizar Compra</h1>
        <p style={styles.subtitle}>
          Preenche os dados para finalizar a compra do plano {PLANS[selectedPlan as keyof typeof PLANS]?.nome}
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <form onSubmit={handleSubmit}>
              <h2 style={styles.cardTitle}>👤 Dados Pessoais</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder=""
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  style={emailError ? styles.inputError : styles.input}
                  placeholder=""
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirmar email *</label>
                <input
                  type="email"
                  name="confirmEmail"
                  value={form.confirmEmail}
                  onChange={handleChange}
                  style={emailError ? styles.inputError : styles.input}
                  placeholder=""
                  required
                  disabled={!form.email}
                />
                {emailError && (
                  <p style={styles.errorText}>⚠️ {emailError}</p>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Telefone/Telemóvel*</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="telefone"
                  maxLength={9}
                  value={form.telefone}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder=""
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>NIF (Opcional)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="nif"
                  maxLength={9}
                  value={form.nif}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder=""
                />
              </div>

              <div style={{ ...styles.formGroup, marginTop: '8px' }}>
                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={isCommercial}
                    onChange={(e) => setIsCommercial(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={styles.checkboxLabel}> É comercial?</span>
                </label>
              </div>

              {isCommercial && (
                <div style={styles.companyFields}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Dados da Empresa
                  </h3>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nome da Empresa *</label>
                    <input
                      type="text"
                      name="nomeEmpresa"
                      value={form.nomeEmpresa}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder=""
                      required={isCommercial}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>NIF da Empresa*</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="nifEmpresa"
                      maxLength={9}
                      value={form.nifEmpresa}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder=""
                      required={isCommercial}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Morada *</label>
                    <input
                      type="text"
                      name="morada"
                      value={form.morada}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder=""
                      required={isCommercial}
                    />
                  </div>
                </div>
              )}

              <div style={{ ...styles.formGroup, marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                <label style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={includeSetup}
                    onChange={(e) => setIncludeSetup(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={styles.checkboxLabel}>
                      Formação e apoio na configuração
                    </span>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                      +€{(CONFIG_PRICE * 1.16).toFixed(2) } (Valor com IVA incluído)
                    </p>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !!emailError}
                style={{
                  ...styles.button,
                  opacity: loading || !!emailError ? 0.5 : 1,
                  cursor: loading || !!emailError ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '🔄 A processar...' : '💳 Pagar Agora'}
              </button>
              {emailError && (
                <p style={{ ...styles.errorText, marginTop: '8px', textAlign: 'center' }}>
                  ⚠️ Corrige o erro antes de continuar
                </p>
              )}
            </form>
          </div>

          <div>
            <div style={{ ...styles.card, ...styles.sticky }}>
              <h2 style={styles.cardTitle}>📋 Resumo do Plano e Extras</h2>

              <div style={{
                background: '#f0f7ff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px'
              }}>
                <p style={{ fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
                  {PLANS[selectedPlan as keyof typeof PLANS]?.nome}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: '500', marginBottom: '8px' }}>Inclui:</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {PLANS[selectedPlan as keyof typeof PLANS]?.features.map((feature, idx) => (
                    <li key={idx} style={{
                      padding: '4px 0',
                      fontSize: '14px',
                      color: '#555',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>✅</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#6b7280' }}>Plano Anual</span>
                  <span>{base.toFixed(2)}€</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>IVA (16%)</span>
                  <span>{iva.toFixed(2)}€</span>
                </div>

                {includeSetup && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#2563eb' }}>
                      <span>+ Pacote Configuração</span>
                      <span>{CONFIG_PRICE.toFixed(2)}€</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                      <span>IVA Configuração (16%)</span>
                      <span>{setupIva.toFixed(2)}€</span>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
                  <span>Total</span>
                  <span style={{ color: '#2563eb' }}>{total.toFixed(2)}€</span>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', textAlign: 'center' }}>
                  * IVA incluído a 16% · Pagamento anual
                </p>
              </div>

              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f0fdf4',
                borderRadius: '6px',
                border: '1px solid #bbf7d0'
              }}>
                <p style={{ fontSize: '14px', color: '#16a34a', margin: 0, textAlign: 'center' }}>
                  🔒 Pagamento seguro via Stripe
                </p>
              </div>

              {isCommercial && form.nomeEmpresa && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: '#f3f4f6',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#374151'
                }}>
                  <p style={{ margin: 0 }}><strong>Empresa:</strong> {form.nomeEmpresa}</p>
                  <p style={{ margin: 0 }}><strong>NIF:</strong> {form.nifEmpresa}</p>
                  <p style={{ margin: 0 }}><strong>Morada:</strong> {form.morada}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}