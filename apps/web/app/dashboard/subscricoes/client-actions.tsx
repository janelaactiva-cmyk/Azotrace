'use client';

import { useState } from 'react';

// Define aqui os teus planos disponíveis e os respetivos IDs do Stripe
const PLANOS_DISPONIVEIS = [
  { id: 'price_1NxBaseIdDoStripe', name: 'Base' },
  { id: 'price_1NxEssentialIdDoStripe', name: 'Essential' },
  { id: 'price_1NxProIdDoStripe', name: 'Pro' },
];

interface ClientActionsProps {
  stripeSessionId: string;
  currentPlanName: string;
}

export default function ClientActions({ stripeSessionId, currentPlanName }: ClientActionsProps) {
  const [selectedPlan, setSelectedPlan] = useState(PLANOS_DISPONIVEIS[0].id);
  const [loading, setLoading] = useState(false);

  const handleAlterarPlano = async () => {
    if (!confirm(`Pretendes alterar o plano deste cliente para o plano selecionado?`)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripeSessionId,
          newPriceId: selectedPlan,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Plano alterado com sucesso!');
        window.location.reload();
      } else {
        alert('❌ Erro: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error(err);
      alert('❌ Erro de ligação ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <select
        value={selectedPlan}
        onChange={(e) => setSelectedPlan(e.target.value)}
        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {PLANOS_DISPONIVEIS.map((plano) => (
          <option key={plano.id} value={plano.id}>
            {plano.name}
          </option>
        ))}
      </select>

      <button
        onClick={handleAlterarPlano}
        disabled={loading}
        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium transition disabled:opacity-50"
      >
        {loading ? 'A alterar...' : 'Alterar'}
      </button>
    </div>
  );
}