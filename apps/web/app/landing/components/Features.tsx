import { landingSteps as features } from '~/lib/landing-content';

export default function Features() {
return (
    <section id="feature" className="feature">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-title text-center">
              <span>Como Funciona</span>
              <h2>Funcionamento da plataforma Azotrace</h2>
            </div>
          </div>
        </div>
        <div className="row g-4">
          {features.map((f, i) => (
            <div key={i} className="col-xl-3 col-md-6">
              <div className="single-feature h-100">
                <div className="feature-icon">
                  <i className={`bi ${f.icon}`}></i>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
