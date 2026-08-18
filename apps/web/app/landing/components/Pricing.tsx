export default function Pricing() {
  const plans = [
    { price: '19.99€', popular: false },
    { price: '30.99€', popular: true },
    { price: '70.99€', popular: false },
  ];

  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-title text-center">
              <span>Preçário</span>
              <h2>Nosso plano de preços</h2>
            </div>
          </div>
        </div>
        <div className="row g-4 align-items-center justify-content-center">
          {plans.map((plan, i) => (
            <div key={i} className="col-lg-4 col-md-6">
              <div className={`single-pricing ${plan.popular ? 'active' : ''}`}>
                {plan.popular && <span className="popular-tag">MAIS POPULAR</span>}
                <div className="pricing-header">
                  <h3>Apartir de</h3>
                  <h4>{plan.price}<span style={{ fontSize: '16px', fontWeight: '400', color: '#6b7280' }}>/mês</span></h4>
                </div>
                <div className="pricing-body">
                  <ul>
                    <li>5 Utilizadores</li>
                    <li>Todos os UI componentes</li>
                    <li>Lifetime access</li>
                    <li>Actualizações Gratuitas</li>
                    <li>Utilização de um só projecto</li>
                    <li>4 Meses de Suporte</li>
                  </ul>
                </div>
                <div className="pricing-footer">
                  <a href="javascript:void(0)" className={`main-btn ${plan.popular ? 'white-btn' : 'border-btn'}`}>
                    Comprar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
