'use client';

import { useState } from 'react';
import { useTheme } from '~/lib/theme-context';

// Definição da hierarquia e dos novos preços anuais fixos dos planos
const PLANOS_HIERARQUIA: Record<string, number> = {
  'Base': 1,
  'Essential': 2,
  'Pro': 3,
};

const PLANOS_PRECOS_ANUAIS: Record<string, number> = {
  'Base': 239.88,
  'Essential': 371.88,
  'Pro': 851.88,
};

export default function GestaoSubscricoesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Lista simulada de subscrições com datas de início e fim reais (ciclo de 1 ano / 365 dias)
  const [subscricoes, setSubscricoes] = useState([
    { id: 1, nome: 'João Silva', email: 'janelaactiva@gmail.com', planoAtual: 'Pro', inicio: '09/03/2026', expira: '09/03/2027', estado: 'Ativa' },
    { id: 2, nome: 'João Silva', email: 'janelaactiva@gmail.com', planoAtual: 'Base', inicio: '09/03/2026', expira: '09/03/2027', estado: 'Ativa' },
    { id: 3, nome: 'João Silva', email: 'janelaactiva@gmail.com', planoAtual: 'Essential', inicio: '09/03/2026', expira: '09/03/2027', estado: 'Ativa' },
    { id: 4, nome: 'João Silva', email: 'janelaactiva@gmail.com', planoAtual: 'Base', inicio: '09/03/2026', expira: '09/03/2027', estado: 'Ativa' },
    { id: 5, nome: 'N/D', email: 'janelaactiva@gmail.com', planoAtual: 'Pro', inicio: '09/02/2026', expira: '09/02/2027', estado: 'Ativa' },
  ]);

  const [planosSelecionados, setPlanosSelecionados] = useState<Record<number, string>>({});
  const [detalheAlteracao, setDetalheAlteracao] = useState<{
    utilizadorId: number;
    nome: string;
    email: string;
    planoAntigo: string;
    planoNovo: string;
    tipo: 'UPGRADE' | 'DOWNGRADE';
    inicioPlano: string;
    fimPlano: string;
    diasRestantes: number;
    creditoAntigo: number;
    custoNovo: number;
    subtotal: number;
    iva: number;
    totalAPagar: number;
    creditoFuturo: number;
    entidade: string;
    referencia: string;
  } | null>(null);

  const handlePlanoChange = (id: number, novoPlano: string) => {
    setPlanosSelecionados(prev => ({ ...prev, [id]: novoPlano }));
  };

  const processarAlteracao = (sub: typeof subscricoes[0], tipoForcado: 'UPGRADE' | 'DOWNGRADE') => {
    const planoNovo = planosSelecionados[sub.id] !== undefined ? planosSelecionados[sub.id] : sub.planoAtual;
    
    if (planoNovo === sub.planoAtual) {
      alert('Por favor, selecione um plano diferente do atual no menu dropdown antes de clicar em Upgrade ou Downgrade.');
      return;
    }

    const nivelAtual = PLANOS_HIERARQUIA[sub.planoAtual] || 1;
    const nivelNovo = PLANOS_HIERARQUIA[planoNovo] || 1;

    if (tipoForcado === 'UPGRADE' && nivelNovo <= nivelAtual) {
      alert('Para fazer um Upgrade, o novo plano selecionado tem de ser superior ao atual.');
      return;
    }
    if (tipoForcado === 'DOWNGRADE' && nivelNovo >= nivelAtual) {
      alert('Para fazer um Downgrade, o novo plano selecionado tem de ser inferior ao atual.');
      return;
    }

    const precoAntigoAnual = PLANOS_PRECOS_ANUAIS[sub.planoAtual] || 239.88;
    const precoNovoAnual = PLANOS_PRECOS_ANUAIS[planoNovo] || 239.88;

    // Configurado exatamente para 365 dias (ciclo anual completo)
    const diasRestantes = 365;
    const totalDiasNoCiclo = 365;

    const diarioAntigo = precoAntigoAnual / totalDiasNoCiclo;
    const diarioNovo = precoNovoAnual / totalDiasNoCiclo;

    const creditoAntigo = diarioAntigo * diasRestantes;
    const custoNovo = diarioNovo * diasRestantes;
    
    const diferencaBruta = custoNovo - creditoAntigo;

    let subtotal = 0;
    let iva = 0;
    let totalAPagar = 0;
    let creditoFuturo = 0;

    if (tipoForcado === 'UPGRADE') {
      subtotal = diferencaBruta > 0 ? diferencaBruta : 0;
      iva = subtotal * 0.16; // 16% IVA Açores
      totalAPagar = subtotal + iva;
    } else {
      creditoFuturo = Math.abs(diferencaBruta);
    }

    setDetalheAlteracao({
      utilizadorId: sub.id,
      nome: sub.nome,
      email: sub.email,
      planoAntigo: sub.planoAtual,
      planoNovo,
      tipo: tipoForcado,
      inicioPlano: sub.inicio,
      fimPlano: sub.expira,
      diasRestantes,
      creditoAntigo: Number(creditoAntigo.toFixed(2)),
      custoNovo: Number(custoNovo.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      iva: Number(iva.toFixed(2)),
      totalAPagar: Number(totalAPagar.toFixed(2)),
      creditoFuturo: Number(creditoFuturo.toFixed(2)),
      entidade: '12345',
      referencia: '987 654 321'
    });
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', color: isDark ? '#e5e7eb' : '#111827' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Gestão de Subscrições Anuais</h2>

      {/* Tabela de Subscrições */}
      <div style={{ background: isDark ? '#1f2937' : '#ffffff', borderRadius: '8px', overflowX: 'auto', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: isDark ? '#374151' : '#f9fafb', borderBottom: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}` }}>
              <th style={{ padding: '12px' }}>NOME</th>
              <th style={{ padding: '12px' }}>E-MAIL</th>
              <th style={{ padding: '12px' }}>PLANO ATUAL</th>
              <th style={{ padding: '12px' }}>INÍCIO DA ANUIDADE</th>
              <th style={{ padding: '12px' }}>RENOVAÇÃO (1 ANO)</th>
              <th style={{ padding: '12px' }}>ESTADO</th>
              <th style={{ padding: '12px' }}>AÇÕES (UPGRADE / DOWNGRADE)</th>
            </tr>
          </thead>
          <tbody>
            {subscricoes.map((sub) => {
              const planoSelecionado = planosSelecionados[sub.id] !== undefined ? planosSelecionados[sub.id] : sub.planoAtual;
              return (
                <tr key={sub.id} style={{ borderBottom: `1px solid ${isDark ? '#374151' : '#f3f4f6'}` }}>
                  <td style={{ padding: '12px' }}>{sub.nome}</td>
                  <td style={{ padding: '12px' }}>{sub.email}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{sub.planoAtual}</td>
                  <td style={{ padding: '12px' }}>{sub.inicio}</td>
                  <td style={{ padding: '12px' }}>{sub.expira}</td>
                  <td style={{ padding: '12px' }}>{sub.estado}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <select
                        value={planoSelecionado}
                        onChange={(e) => handlePlanoChange(sub.id, e.target.value)}
                        style={{
                          padding: '4px 6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background: isDark ? '#374151' : '#fff',
                          color: isDark ? '#fff' : '#000',
                          border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`
                        }}
                      >
                        <option value="Base">Base (239.88€/ano)</option>
                        <option value="Essential">Essential (371.88€/ano)</option>
                        <option value="Pro">Pro (851.88€/ano)</option>
                      </select>

                      <button
                        onClick={() => processarAlteracao(sub, 'UPGRADE')}
                        style={{
                          padding: '5px 8px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '11px'
                        }}
                      >
                        ⬆️ Upgrade
                      </button>

                      <button
                        onClick={() => processarAlteracao(sub, 'DOWNGRADE')}
                        style={{
                          padding: '5px 8px',
                          background: '#eab308',
                          color: '#000',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '11px'
                        }}
                      >
                        ⬇️ Downgrade
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quadro dinâmico em baixo com os cálculos baseados em 365 dias */}
      {detalheAlteracao && (
        <div style={{
          marginTop: '32px',
          background: isDark ? '#1f2937' : '#ffffff',
          border: `2px solid ${detalheAlteracao.tipo === 'UPGRADE' ? '#2563eb' : '#eab308'}`,
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: detalheAlteracao.tipo === 'UPGRADE' ? '#3b82f6' : '#eab308' }}>
              Detalhes de {detalheAlteracao.tipo} Anual ({detalheAlteracao.planoAntigo} ➔ {detalheAlteracao.planoNovo})
            </h3>
            <button
              onClick={() => setDetalheAlteracao(null)}
              style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: isDark ? '#fff' : '#000' }}
            >
              ✕
            </button>
          </div>

          {/* Dados temporais do cliente */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px', fontSize: '13px', background: isDark ? '#374151' : '#f3f4f6', padding: '12px', borderRadius: '8px' }}>
            <div><strong>Cliente:</strong> {detalheAlteracao.nome}</div>
            <div><strong>Início da Anuidade:</strong> {detalheAlteracao.inicioPlano}</div>
            <div><strong>Fim da Anuidade:</strong> {detalheAlteracao.fimPlano}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Bloco de Contas Anual com 365 dias */}
            <div style={{ background: isDark ? '#374151' : '#f9fafb', padding: '16px', borderRadius: '8px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, fontWeight: 'bold', borderBottom: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`, paddingBottom: '6px' }}>
                Cálculo Anual ({detalheAlteracao.diasRestantes} dias / 1 ano completo):
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Valor do Plano Antigo (365 dias):</span>
                <span>-{detalheAlteracao.creditoAntigo} €</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Valor do Novo Plano (365 dias):</span>
                <span>+{detalheAlteracao.custoNovo} €</span>
              </div>

              {detalheAlteracao.tipo === 'UPGRADE' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Subtotal da Diferença:</span>
                    <span>{detalheAlteracao.subtotal} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span>IVA Açores (16%):</span>
                    <span>+{detalheAlteracao.iva} €</span>
                  </div>
                  <hr style={{ borderColor: isDark ? '#4b5563' : '#d1d5db', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold' }}>
                    <span>Total a Pagar Agora:</span>
                    <span style={{ color: '#2563eb' }}>{detalheAlteracao.totalAPagar} €</span>
                  </div>
                </>
              ) : (
                <>
                  <hr style={{ borderColor: isDark ? '#4b5563' : '#d1d5db', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#eab308', fontWeight: 'bold' }}>
                    <span>Valor a Pagar Agora:</span>
                    <span>0.00 €</span>
                  </div>
                  <div style={{ background: '#eab30822', padding: '8px', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}>
                    💡 <strong>Crédito Acumulado Anual:</strong> Sobram <strong>{detalheAlteracao.creditoFuturo} €</strong> da anuidade anterior. Este valor fica em saldo e será descontado automaticamente na fatura de renovação do próximo ano.
                  </div>
                </>
              )}
            </div>

            {/* Bloco de Ação / Multibanco ou Confirmação */}
            {detalheAlteracao.tipo === 'UPGRADE' ? (
              <div style={{ background: isDark ? '#111827' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#ef4444' }}>💳 REFERÊNCIA MULTIBANCO (UPGRADE ANUAL)</div>
                <p style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280', margin: '0 0 10px 0' }}>Envie esta referência para o cliente liquidar a diferença da anuidade:</p>
                
                <div style={{ background: isDark ? '#1f2937' : '#f9fafb', padding: '8px 16px', borderRadius: '6px', width: '100%', boxSizing: 'border-box', border: `1px dashed ${isDark ? '#4b5563' : '#cbd5e1'}` }}>
                  <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Entidade:</strong> {detalheAlteracao.entidade}</p>
                  <p style={{ margin: '2px 0', fontSize: '12px' }}><strong>Referência:</strong> {detalheAlteracao.referencia}</p>
                  <p style={{ margin: '2px 0', fontSize: '14px', color: '#2563eb', fontWeight: 'bold' }}>Valor: {detalheAlteracao.totalAPagar} €</p>
                </div>

                <button
                  onClick={() => {
                    alert('Referência Multibanco gerada e enviada com sucesso!');
                    setDetalheAlteracao(null);
                  }}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '8px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Confirmar e Enviar Referência
                </button>
              </div>
            ) : (
              <div style={{ background: isDark ? '#111827' : '#ffffff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#10b981' }}>✅ REGISTAR DOWNGRADE ANUAL</div>
                <p style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280', margin: '0 0 12px 0' }}>A anuidade anterior estava paga até {detalheAlteracao.fimPlano}. O crédito anual foi guardado para abater na próxima anuidade.</p>
                
                <button
                  onClick={() => {
                    alert('Downgrade aplicado com sucesso e crédito anual guardado.');
                    setDetalheAlteracao(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Concluir Registo de Downgrade
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}