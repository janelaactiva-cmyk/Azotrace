export default function Vantagens() {
  return (
    <section id="vantagens" className="advantages-section">
      <div className="container">
        <div className="section-title text-center">
          <span>Vantagens</span>
          <h2>Benefícios para Todos</h2>
          <p>
            A Azotrace cria valor para toda a cadeia de produção, desde o produtor
            até ao consumidor final.
          </p>
        </div>
        <div className="advantages-wrapper">
          <div className="advantages-column left">
            <h3>Para Produtores</h3>
            <ul>
              <li>Valoriza a origem e autenticidade dos produtos.</li>
              <li>Rastreabilidade completa de cada lote.</li>
              <li>Geração automática de QR Codes únicos.</li>
              <li>Maior proteção contra falsificações.</li>
              <li>Estatísticas de visualizações e digitalizações.</li>
              <li>Maior confiança e visibilidade no mercado.</li>
            </ul>
          </div>
          <div className="divider"></div>
          <div className="advantages-column right">
            <h3>Para Consumidores</h3>
            <ul>
              <li>Acesso imediato à informação através do QR Code.</li>
              <li>Confirmação da origem e autenticidade do produto.</li>
              <li>Conhecimento da história e do processo de produção.</li>
              <li>Maior transparência e confiança na compra.</li>
              <li>Decisões de compra mais informadas.</li>
              <li>Ligação direta aos produtores locais.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
