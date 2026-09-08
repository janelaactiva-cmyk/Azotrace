'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '~/lib/theme-context';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yzfyoboxiwvppbeptp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'a-tua-chave-anon-aqui';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SubscriptionHistoryItem {
  oldPlan: string;
  newPlan: string;
  purchasedAt: string;
}

interface SubscriptionItem {
  id: string;
  dbId: any;
  clientCode: string;
  name: string;
  email: string;
  companyName: string;
  nif: string;
  morada: string;
  currentPlan: 'Pro' | 'Essential' | 'Base';
  startDate: string;
  renewalDate: string;
  status: string;
}

const PLAN_PRICES = {
  Base: 239.88,
  Essential: 371.88,
  Pro: 851.88,
};

export default function SubscricoesAnuaisPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingDb, setLoadingDb] = useState<boolean>(false);
  const [targetPlansMap, setTargetPlansMap] = useState<{ [key: string]: keyof typeof PLAN_PRICES }>({});
  
  // Histórico isolado por chave única (NIF + Email)
  const [clientHistories, setClientHistories] = useState<{ [clientKey: string]: SubscriptionHistoryItem[] }>({});

  const fetchRealSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar subscrições:', error);
        return;
      }

      if (data && data.length > 0) {
        let savedHistories: { [key: string]: SubscriptionHistoryItem[] } = {};
        try {
          const raw = localStorage.getItem('azotrace_client_histories_v8');
          if (raw) savedHistories = JSON.parse(raw);
        } catch (e) {
          console.error(e);
        }

        let indexCounter = 0;
        const uniqueMap = new Map<string, SubscriptionItem>();

        data.forEach((sub) => {
          indexCounter++;
          const subId = String(sub.id || indexCounter);
          const email = (sub.email || `sem-email-${indexCounter}@exemplo.com`).toLowerCase().trim();
          const nif = (sub.nif || '509123456').trim();
          
          // Chave única composta por NIF e Email para garantir restrição estrita
          const clientKey = `${nif}_${email}`;

          if (uniqueMap.has(clientKey)) return;

          // Lê exatamente da coluna 'nome' da tua tabela do Supabase (com fallbacks de segurança)
          const extractedName = sub.nome || sub.name || sub.full_name || sub.client_name || email.split('@')[0];

          const startDateFormatted = sub.started_at ? sub.started_at.split('T')[0] : '2026-01-01';
          const expiresAtFormatted = sub.expires_at ? sub.expires_at.split('T')[0] : '2027-01-01';
          const planName = (sub.plan_name || 'Base') as 'Pro' | 'Essential' | 'Base';

          if (!savedHistories[clientKey] || savedHistories[clientKey].length === 0) {
            savedHistories[clientKey] = [
              {
                oldPlan: 'Nenhum (Registo Inicial)',
                newPlan: planName,
                purchasedAt: startDateFormatted
              }
            ];
          }

          uniqueMap.set(clientKey, {
            id: subId,
            dbId: sub.id,
            clientCode: `CLI-00${indexCounter}`,
            name: extractedName,
            email: email,
            companyName: sub.company_name || 'Janela Activa, Lda',
            nif: nif,
            morada: sub.morada || 'N/A',
            currentPlan: planName,
            startDate: startDateFormatted,
            renewalDate: expiresAtFormatted,
            status: sub.status || 'Ativa',
          });
        });

        const formatted = Array.from(uniqueMap.values());

        setClientHistories(savedHistories);
        try {
          localStorage.setItem('azotrace_client_histories_v8', JSON.stringify(savedHistories));
        } catch (e) {}

        setSubscriptions(formatted);
        setSelectedSubId(prev => (formatted.some(s => s.id === prev) ? prev : formatted[0]?.id || ''));
        setTargetPlansMap(prev => {
          const initialTargets = { ...prev };
          formatted.forEach(s => {
            if (!initialTargets[s.id]) {
              initialTargets[s.id] = s.currentPlan === 'Pro' ? 'Essential' : 'Pro';
            }
          });
          return initialTargets;
        });
      } else {
        setSubscriptions([]);
      }
    } catch (err) {
      console.error('Erro crítico:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchRealSubscriptions();
  }, []);

  const filteredSubscriptions = useMemo(() => {
    if (!searchTerm.trim()) return subscriptions;
    const term = searchTerm.toLowerCase();
    return subscriptions.filter(sub => 
      sub.clientCode.toLowerCase().includes(term) ||
      sub.name.toLowerCase().includes(term) ||
      sub.email.toLowerCase().includes(term) ||
      sub.nif.toLowerCase().includes(term) ||
      sub.currentPlan.toLowerCase().includes(term)
    );
  }, [subscriptions, searchTerm]);

  const selectedSub = subscriptions.find(s => s.id === selectedSubId) || subscriptions[0];

  const selectedClientKey = selectedSub ? `${selectedSub.nif}_${selectedSub.email}` : '';
  const currentClientHistory = useMemo(() => {
    if (!selectedClientKey) return [];
    return clientHistories[selectedClientKey] || [];
  }, [clientHistories, selectedClientKey]);

  const handleTargetPlanChange = (id: string, value: string) => {
    setTargetPlansMap(prev => ({ ...prev, [id]: value as keyof typeof PLAN_PRICES }));
  };

  const calculateProrata = (startDateStr: string, currentPlan: keyof typeof PLAN_PRICES, targetPlan: keyof typeof PLAN_PRICES) => {
    const start = new Date(startDateStr || '2026-01-01');
    const today = new Date();
    
    const diffTime = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysUsed = Math.max(0, diffTime);
    const totalDaysInYear = 365;

    const currentAnnualPrice = PLAN_PRICES[currentPlan] || 239.88;
    const targetAnnualPrice = PLAN_PRICES[targetPlan] || 371.88;

    const dailyRateCurrent = currentAnnualPrice / totalDaysInYear;
    const dailyRateTarget = targetAnnualPrice / totalDaysInYear;

    const daysRemaining = Math.max(0, totalDaysInYear - daysUsed);
    const unusedCredit = dailyRateCurrent * daysRemaining;
    const targetCostForRemainingDays = dailyRateTarget * daysRemaining;
    const difference = targetCostForRemainingDays - unusedCredit;

    return {
      daysUsed,
      daysRemaining,
      unusedCredit: unusedCredit.toFixed(2),
      targetCost: targetCostForRemainingDays.toFixed(2),
      difference: Math.abs(difference).toFixed(2),
      isUpgrade: targetAnnualPrice > currentAnnualPrice
    };
  };

  const cardBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111827';
  const subTextColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  if (loadingList) {
    return <div style={{ padding: '60px', textAlign: 'center', color: textColor, fontSize: '15px' }}>A carregar subscrições...</div>;
  }

  if (subscriptions.length === 0 || !selectedSub) {
    return (
      <div style={{ maxWidth: '1300px', margin: '40px auto', padding: '40px', textAlign: 'center', color: textColor, background: cardBg, borderRadius: '12px', border: `1px solid ${borderColor}` }}>
        <h2>A tabela `subscriptions` está vazia.</h2>
      </div>
    );
  }

  const selectedTargetPlan = targetPlansMap[selectedSub.id] || (selectedSub.currentPlan === 'Base' ? 'Essential' : 'Pro');
  const calculation = calculateProrata(selectedSub.startDate, selectedSub.currentPlan, selectedTargetPlan);

  const handleSendEmailNotification = () => {
    const actionText = calculation.isUpgrade ? 'Upgrade' : 'Downgrade';
    const subject = encodeURIComponent(`[Azotrace] Pagamento Pendente - ${actionText} para ${selectedTargetPlan}`);
    const body = encodeURIComponent(
      `Olá ${selectedSub.name},\n\nResumo da Alteração de Plano (${selectedSub.currentPlan} -> ${selectedTargetPlan}):\n` +
      `• Valor Proporcional: ${calculation.difference} €\n• Entidade: 12345 | Referência: 987 654 321\n\nEquipa Azotrace`
    );
    window.location.href = `mailto:${selectedSub.email}?subject=${subject}&body=${body}`;
  };

  const handleConfirmChange = async () => {
    if (selectedSub.currentPlan === selectedTargetPlan) {
      alert('⚠️ O plano selecionado é igual ao plano atual.');
      return;
    }

    try {
      setLoadingDb(true);
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const purchaseDate = new Date().toISOString().split('T')[0];

      const oldPlanBeforeChange = selectedSub.currentPlan;

      const { data, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_name: selectedTargetPlan,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          reminder_sent: false
        })
        .eq('id', selectedSub.dbId)
        .select();

      if (updateError) {
        alert('❌ Erro do Supabase: ' + updateError.message);
        setLoadingDb(false);
        return;
      }

      if (!data || data.length === 0) {
        alert('⚠️ O Supabase bloqueou a atualização (verifique se desativou o RLS na tabela `subscriptions`).');
        setLoadingDb(false);
        return;
      }

      const newHistoryItem: SubscriptionHistoryItem = {
        oldPlan: oldPlanBeforeChange,
        newPlan: selectedTargetPlan,
        purchasedAt: h.purchasedAt || ''     
      };

      try {
        const updatedHistories = { ...clientHistories };
        const existing = updatedHistories[selectedClientKey] || [];
        updatedHistories[selectedClientKey] = [newHistoryItem, ...existing];

        setClientHistories(updatedHistories);
        localStorage.setItem('azotrace_client_histories_v8', JSON.stringify(updatedHistories));
      } catch (e) {
        console.error(e);
      }

      alert(`✅ Sucesso! Plano alterado de ${oldPlanBeforeChange} para ${selectedTargetPlan}.`);
      await fetchRealSubscriptions();
    } catch (err) {
      alert('❌ Erro inesperado ao comunicar com o Supabase.');
    } finally {
      setLoadingDb(false);
    }
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* TÍTULO E PESQUISA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: textColor, margin: 0 }}>
            Gestão de Subscrições Anuais
          </h1>
          <p style={{ fontSize: '12px', color: subTextColor, marginTop: '2px' }}>
            Registo restrito a um NIF e email único por cliente.
          </p>
        </div>

        <input
          type="text"
          placeholder="Pesquisar por cliente, NIF ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            background: isDark ? '#111827' : '#f9fafb',
            color: textColor,
            fontSize: '13px',
            width: '280px',
            outline: 'none'
          }}
        />
      </div>

      {/* TABELA DE CLIENTES */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, background: cardBg, zIndex: 1 }}>
              <tr style={{ color: subTextColor, fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${borderColor}` }}>
                <th style={{ padding: '12px 16px' }}>Cód.</th>
                <th style={{ padding: '12px 16px' }}>Subscritor / Email</th>
                <th style={{ padding: '12px 16px' }}>NIF</th>
                <th style={{ padding: '12px 16px' }}>Plano Atual</th>
                <th style={{ padding: '12px 16px' }}>Data Início</th>
                <th style={{ padding: '12px 16px' }}>Novo Plano</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((sub) => {
                const isSelected = sub.id === selectedSubId;
                return (
                  <tr 
                    key={sub.id} 
                    onClick={() => setSelectedSubId(sub.id)}
                    style={{ 
                      borderBottom: `1px solid ${borderColor}`, 
                      color: textColor,
                      cursor: 'pointer',
                      background: isSelected ? (isDark ? '#37415144' : '#eff6ff') : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#3b82f6' }}>{sub.clientCode}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '500' }}>{sub.name}</div>
                      <div style={{ fontSize: '11px', color: subTextColor }}>{sub.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '500', fontFamily: 'monospace' }}>{sub.nif}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{sub.currentPlan}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: subTextColor }}>{sub.startDate}</td>
                    <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={targetPlansMap[sub.id] || 'Pro'}
                        onChange={(e) => handleTargetPlanChange(sub.id, e.target.value)}
                        style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${borderColor}`, background: isDark ? '#111827' : '#f9fafb', color: textColor, fontSize: '12px' }}
                      >
                        <option value="Base">Base (€239.88)</option>
                        <option value="Essential">Essential (€371.88)</option>
                        <option value="Pro">Pro (€851.88)</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHECKOUT & HISTÓRICO ISOLADO */}
      <div style={{ background: cardBg, border: `2px solid ${calculation.isUpgrade ? '#10b981' : '#ef4444'}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, color: textColor }}>
            🧾 CHECKOUT & HISTÓRICO EXCLUSIVO — {selectedSub.clientCode} (NIF: {selectedSub.nif})
          </h2>
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: calculation.isUpgrade ? '#10b98122' : '#ef444422', color: calculation.isUpgrade ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
            {calculation.isUpgrade ? 'UPGRADE PROPORCIONAL' : 'DOWNGRADE DE PLANO'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: '16px' }}>
          
         {/* DADOS DO CLIENTE COM O NOME DA TABELA 'nome' */}
          <div style={{ background: isDark ? '#111827' : '#f9fafb', padding: '14px', borderRadius: '8px', border: `1px solid ${borderColor}`, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', margin: '0 0 4px 0' }}>🏢 Dados do Cliente Único</h3>
            <div><strong>Nome / Subscritor:</strong> <span style={{ color: textColor, fontWeight: 'bold' }}>{selectedSub.name}</span></div>
            <div><strong>Email:</strong> {selectedSub.email}</div>
            <div><strong>NIF:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedSub.nif}</span></div>
            <div><strong>Empresa:</strong> {selectedSub.companyName || 'N/A'}</div>
            <div><strong>Morada:</strong> {selectedSub.morada || 'N/A'}</div>
          </div>

          {/* HISTÓRICO EXCLUSIVO DESTE NIF/EMAIL */}
          <div style={{ background: isDark ? '#111827' : '#f9fafb', padding: '14px', borderRadius: '8px', border: `1px solid ${borderColor}`, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', margin: '0 0 4px 0' }}>📅 Histórico de Transações (NIF: {selectedSub.nif})</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${borderColor}`, paddingBottom: '4px' }}>
              <span>Plano Atual:</span>
              <strong style={{ color: '#3b82f6' }}>{selectedSub.currentPlan}</strong>
            </div>

            <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 'bold', color: subTextColor, textTransform: 'uppercase' }}>
              Registo de Alterações:
            </div>
            
            <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {currentClientHistory && currentClientHistory.length > 0 ? (
                currentClientHistory.map((h: SubscriptionHistoryItem, i: number) => (
                  <div key={i} style={{ background: isDark ? '#37415144' : '#e5e7eb66', padding: '6px', borderRadius: '6px', fontSize: '11px' }}>
                    <div><strong>Data:</strong> {h.purchasedAt || ''}</div>
                    <div>Plano Anterior: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{h.oldPlan}</span></div>
                    <div>Novo Plano: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{h.newPlan}</span></div>
            </div>
            ))
    ) : (
  <div style={{ color: subTextColor }}>Sem histórico registado para este cliente.</div>
)}
            </div>
          </div>

          {/* PRÓ-RATA */}
          <div style={{ background: isDark ? '#111827' : '#f9fafb', padding: '14px', borderRadius: '8px', border: `1px solid ${borderColor}`, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', margin: '0 0 4px 0' }}>🧮 Pró-Rata ({selectedSub.startDate})</h3>
            <div><strong>Início da Subscrição:</strong> {selectedSub.startDate}</div>
              <div><strong>Renovação da Subscrição:</strong> {selectedSub.renewalDate}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Dias Usados:</span>
              <span>{calculation.daysUsed} dias</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Dias Restantes:</span>
              <span>{calculation.daysRemaining} dias</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Crédito não usado:</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{calculation.unusedCredit} €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Custo novo plano:</span>
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>-{calculation.targetCost} €</span>
            </div>
            <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '5px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
              <span>{calculation.isUpgrade ? 'Total a Pagar:' : 'Crédito a Conceder:'}</span>
              <span style={{ color: calculation.isUpgrade ? '#10b981' : '#ef4444' }}>{calculation.difference} €</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', borderTop: `1px solid ${borderColor}`, paddingTop: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, fontSize: '12px', color: subTextColor }}>
            Entidade <strong>12345</strong> | Referência <strong>987 654 321</strong>
          </div>

          <button
            onClick={handleSendEmailNotification}
            style={{ padding: '10px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
          >
            Enviar Email ({calculation.difference} €)
          </button>

          <button
            disabled={loadingDb}
            onClick={handleConfirmChange}
            style={{ padding: '10px 16px', background: loadingDb ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loadingDb ? 'not-allowed' : 'pointer', fontSize: '12px' }}
          >
            {loadingDb ? 'A atualizar...' : 'Confirmar e Efetivar Alteração'}
          </button>
        </div>
      </div>
    </div>
  );
}