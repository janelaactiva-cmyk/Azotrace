import { landingBenefits } from '~/lib/landing-content';

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
            <ul>{landingBenefits.producers.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
          </div>
          <div className="divider"></div>
          <div className="advantages-column right">
            <h3>Para Consumidores</h3>
            <ul>{landingBenefits.consumers.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}
