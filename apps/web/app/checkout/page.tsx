'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PLANS = {
  base: {
    id: 'base',
    nome: 'Base',
    preco: 19.99, // ← Preço por mês
    preco_anual: 239.88, // ← Preço anual (19.99 × 12)
    iva: 0.16,
    features: ['1 Utilizador', 'Rastreabilidade Básica de Produtos', 'QR Codes Limitados', 'Actualizações Gratuitas', '1 Mês de Suporte']
  },
  essential: {
    id: 'essential',
    nome: 'Essential',
    preco: 30.99,
    preco_anual: 371.88, // ← 30.99 × 12
    iva: 0.16,
    features: ['5 Utilizadores', 'Todos os Recursos Avançados', 'QR Codes Limitados', 'Actualizações Gratuitas', 'Utilização de um só projeto', '4 Meses de Suporte']
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    preco: 70.99,
    preco_anual: 851.88, // ← 70.99 × 12
    iva: 0.16,
    features: ['Utilizadores Ilimitados', 'Recursos Premium e Prioritários', 'Lifetime access', 'Actualizações Gratuitas', 'Múltiplos projetos', 'Suporte Prioritário 24/7']
  }
};

// ✅ Preço do Pacote de Configuração (anual - é um serviço único)
const CONFIG_PRICE = 100.00;

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isCommercial, setIsCommercial] = useState(false);
  const [includeSetup, setIncludeSetup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('essential');
  const [form, setForm] = useState({
    nome: '',
    email: '',
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

  const calcularPreco = () => {
    const plano = PLANS[selectedPlan as keyof typeof PLANS];
    if (!plano) return { total: 0, iva: 0, base: 0, setupTotal: 0, setupIva: 0 };
    
    // ✅ Usar o preço ANUAL (preco_anual)
    const base = plano.preco_anual;
    const iva = base * 0.16;
    let total = base + iva;

    // ✅ Se incluir configuração, adicionar com IVA
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

      if (isCommercial && (!form.nomeEmpresa || !form.nifEmpresa || !form.morada)) {
        alert('❌ Preencha o Nome da Empresa, NIF e Morada');
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
    setForm({ ...form, [name]: value });
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
    }
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
                  placeholder="João Silva"
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
                  style={styles.input}
                  placeholder="joao@email.com"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Telefone/Telemóvel *</label>
                <input
                  type="tel"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="+351 912 345 678"
                  required
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
                  <span style={styles.checkboxLabel}>🏢 É comercial</span>
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
                      placeholder="Empresa XYZ, Lda."
                      required={isCommercial}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>NIF da Empresa *</label>
                    <input
                      type="text"
                      name="nifEmpresa"
                      value={form.nifEmpresa}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder="123456789"
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
                      placeholder="Rua Exemplo, 123, Lisboa"
                      required={isCommercial}
                    />
                  </div>
                </div>
              )}

              {/* ✅ CROSS-SELL: Pacote de Configuração */}
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
                      +€{(CONFIG_PRICE * 1.16).toFixed(2)} 
                    </p>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={styles.button}
              >
                {loading ? '🔄 A processar...' : '💳 Pagar Agora'}
              </button>
            </form>
          </div>

          <div>
            <div style={{ ...styles.card, ...styles.sticky }}>
              <h2 style={styles.cardTitle}>📋 Resumo do Plano</h2>

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

                {/* ✅ Resumo do cross-sell */}
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