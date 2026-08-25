'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Pricing() {
  const router = useRouter();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const plans = [
    { 
      id: 'base',
      nome: 'Base',
      price: '19.99€',
      priceAnnual: '19.99€',
      description: 'Valor mensal com subscrição anual',
      popular: false,
      features: [
        '1 Utilizador',
        'Rastreabilidade Básica de Produtos',
        'QR Codes Limitados',
        'Actualizações Gratuitas',
        '1 Mês de Suporte',
        '2 meses de suporte'
      ]
    },
    { 
      id: 'essential',
      nome: 'Essential',
      price: '30.99€',
      priceAnnual: '30.99€',
      description: 'Valor mensal com subscrição anual',
      popular: true,
      features: [
        '5 Utilizadores',
        'Todos os Recursos Avançados',
        'QR Codes Limitados',
        'Actualizações Gratuitas',
        'Utilização de um só projeto',
        '4 Meses de Suporte'
      ]
    },
    { 
      id: 'pro',
      nome: 'Pro',
      price: '70.99€',
      priceAnnual: '70.99€',
      description: 'Valor mensal com subscrição anual',
      popular: false,
      features: [
        'Utilizadores Ilimitados',
        'Recursos Premium e Prioritários',
        'Lifetime access',
        'Actualizações Gratuitas',
        'Múltiplos projetos',
        'Suporte Prioritário 24/7'
      ]
    },
  ];

  const handleBuyClick = (planId: string) => {
    localStorage.setItem('selectedPlan', planId);
    router.push('/checkout');
  };

  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-title text-center">
              <span>Preçário</span>
              <h2>Nosso plano de preços</h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                IVA a incluir à taxa legal em vigor
              </p>
            </div>
          </div>
        </div>
        <div className="row g-4 align-items-center justify-content-center">
          {plans.map((plan, i) => {
            const isHovered = hoveredIndex === i;

            return (
              <div key={i} className="col-lg-4 col-md-6">
                <div className={`single-pricing ${plan.popular ? 'active' : ''}`}>
                  {plan.popular && <span className="popular-tag">MAIS POPULAR</span>}
                  <div className="pricing-header">
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#234D87' }}>
                      {plan.nome}
                    </h3>
                    <h4 style={{ fontSize: '32px', fontWeight: '700', color: '#234D87', margin: '10px 0' }}>
                      {plan.price}
                      <span style={{ fontSize: '16px', fontWeight: '400', color: '#6b7280', display: 'block' }}>
                        {plan.description}
                      </span>
                    </h4>
                  </div>
                  <div className="pricing-body">
                    <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0' }}>
                      {plan.features.map((feature, idx) => (
                        <li key={idx} style={{ 
                          padding: '8px 0', 
                          color: '#555', 
                          borderBottom: '1px dashed #eee',
                          fontSize: '14px'
                        }}>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pricing-footer">
                    <button
                      onClick={() => handleBuyClick(plan.id)}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`
                        pricing-btn
                        ${plan.popular ? 'popular' : ''}
                        ${isHovered ? 'hovered' : ''}
                      `}
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ CSS para controlar o hover corretamente */}
      <style jsx>{`
        .pricing-btn {
          width: 100%;
          padding: 12px 25px;
          border-radius: 6px;
          font-weight: 600;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
          border: 2px solid #234D87;
          background: transparent;
          color: #234D87;
        }

        /* ✅ Plano Popular - Normal */
        .pricing-btn.popular {
          background: #234D87;
          color: white;
        }

        /* ✅ Plano Popular - Hover (rato por cima) */
        .pricing-btn.popular.hovered {
          background: white !important;
          color: #234D87 !important;
        }

        /* ✅ Plano Normal - Hover (rato por cima) */
        .pricing-btn:not(.popular).hovered {
          background: #234D87 !important;
          color: white !important;
        }
      `}</style>
    </section>
  );
}