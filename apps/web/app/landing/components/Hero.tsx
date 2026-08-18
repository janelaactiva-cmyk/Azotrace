'use client';

import Image from 'next/image';

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 text-center">
            <Image
              src="/assets/images/logo.png"
              alt="Azotrace"
              className="hero-logo"
              width={450}
              height={120}
              priority
            />
            <div className="hero-content">
              <h1 className="hero-title">
                Rastreabilidade inteligente para produtos dos Açores
              </h1>
              <p className="hero-desc">
                Crie QR Codes únicos para cada produto e permita que os seus clientes
                descubram a origem, autenticidade e história completa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
