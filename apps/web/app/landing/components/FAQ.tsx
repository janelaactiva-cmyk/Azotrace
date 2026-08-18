'use client';

export default function FAQ() {
  return (
    <section id="faq">
      <div className="container">
        <div className="section-title text-center">
          <span>Perguntas Frequentes</span>
          <h2>Tudo o que precisa de saber</h2>
          <p className="faq-subtitle">
            Esclareça as principais dúvidas sobre a plataforma Azotrace.
          </p>
        </div>
        <div className="row g-4">
          {/* Coluna Esquerda - Produtores */}
          <div className="col-lg-6">
            <div className="section-title mb-4">
              <h4>Para Produtores</h4>
            </div>
            <div className="accordion faq-accordion" id="faqProdutores">
              {[
                { id: 'prod1', q: 'O que é a AzoTrace?', a: 'A AzoTrace é uma plataforma de rastreabilidade digital que permite gerir e valorizar os seus produtos através de QR Codes únicos.' },
                { id: 'prod2', q: 'Como funciona a plataforma?', a: 'Registe os produtos, gere QR Codes exclusivos e disponibilize aos consumidores toda a informação sobre a origem e autenticidade.' },
                { id: 'prod3', q: 'Posso gerir vários produtos ou marcas?', a: 'Sim. A plataforma permite gerir vários produtos, lotes e marcas a partir de uma única conta.' },
              ].map((item) => (
                <div key={item.id} className="accordion-item">
                  <h2 className="accordion-header">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#${item.id}`}>
                      {item.q}
                    </button>
                  </h2>
                  <div id={item.id} className="accordion-collapse collapse" data-bs-parent="#faqProdutores">
                    <div className="accordion-body">{item.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna Direita - Consumidores */}
          <div className="col-lg-6">
            <div className="section-title mb-4">
              <h4>Para Consumidores</h4>
            </div>
            <div className="accordion faq-accordion" id="faqConsumidores">
              {[
                { id: 'cons1', q: 'Como posso consultar um produto?', a: 'Basta apontar a câmara do telemóvel para o QR Code presente no produto.' },
                { id: 'cons2', q: 'Que informação posso consultar?', a: 'Pode consultar a origem, autenticidade, processo de produção, certificações e outras informações disponibilizadas pelo produtor.' },
                { id: 'cons3', q: 'Preciso de instalar alguma aplicação?', a: 'Não. Basta utilizar a câmara do seu smartphone ou qualquer leitor de QR Codes.' },
              ].map((item) => (
                <div key={item.id} className="accordion-item">
                  <h2 className="accordion-header">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={`#${item.id}`}>
                      {item.q}
                    </button>
                  </h2>
                  <div id={item.id} className="accordion-collapse collapse" data-bs-parent="#faqConsumidores">
                    <div className="accordion-body">{item.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
