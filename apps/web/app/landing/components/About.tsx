import { landingAbout } from '~/lib/landing-content';

export default function About() {
  return (
    <section id="about" className="about-section">
      <div className="container">
        <span className="section-subtitle">Sobre</span>
        <h2>A Nossa Essência</h2>
        <p>
          {landingAbout.summary}
        </p>
        <div className="about-grid">
          <div className="about-card">
            <h3>Missão</h3>
            <p>{landingAbout.mission}</p>
          </div>
          <div className="about-card">
            <h3>Visão</h3>
            <p>{landingAbout.vision}</p>
          </div>
          <div className="about-card">
            <h3>Valores</h3>
            <p>{landingAbout.values}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
