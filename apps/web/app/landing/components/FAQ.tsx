'use client';

import { useState } from 'react';
import { landingProducerFaq as produtores, landingConsumerFaq as consumidores } from '~/lib/landing-content';

export default function FAQ() {
  const [openProd, setOpenProd] = useState<string | null>(null);
  const [openCons, setOpenCons] = useState<string | null>(null);

return (
    <section id="faq" style={{ padding: '80px 0', background: '#fff' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <span style={{ color: '#234D87', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>
            Perguntas Frequentes
          </span>
          <h2 style={{ color: '#234D87', fontSize: '2.2rem', fontWeight: '700', marginTop: '10px' }}>
            Tudo o que precisa de saber
          </h2>
          <p style={{ color: '#666', marginTop: '15px' }}>
            Esclareça as principais dúvidas sobre a plataforma Azotrace.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          
          {/* Coluna Esquerda - Produtores */}
          <div>
            <h4 style={{ color: '#234D87', fontSize: '1.4rem', fontWeight: '700', marginBottom: '25px' }}>
              Para Produtores
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {produtores.map((item) => {
                const isOpen = openProd === item.id;
                return (
                  <div key={item.id} style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' }}>
                    <button
                      onClick={() => setOpenProd(isOpen ? null : item.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: '#234D87',
                        fontSize: '18px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '10px 0'
                      }}
                    >
                      <span>{item.q}</span>
                      <span>{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div style={{ color: '#666', marginTop: '10px', lineHeight: '1.8' }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita - Consumidores */}
          <div>
            <h4 style={{ color: '#234D87', fontSize: '1.4rem', fontWeight: '700', marginBottom: '25px' }}>
              Para Consumidores
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {consumidores.map((item) => {
                const isOpen = openCons === item.id;
                return (
                  <div key={item.id} style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' }}>
                    <button
                      onClick={() => setOpenCons(isOpen ? null : item.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: '#234D87',
                        fontSize: '18px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '10px 0'
                      }}
                    >
                      <span>{item.q}</span>
                      <span>{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div style={{ color: '#666', marginTop: '10px', lineHeight: '1.8' }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}