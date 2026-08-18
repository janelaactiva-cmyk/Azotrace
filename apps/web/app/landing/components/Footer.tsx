'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="row gy-4">
          <div className="col-lg-4">
            <Image
              src="/assets/images/logo_white.png"
              alt="Azotrace"
              width={73}
              height={70}
              style={{ display: 'block', margin: '0 auto 20px' }}
            />
            <p>
              Plataforma de rastreabilidade inteligente para produtos
              dos Açores através de QR Codes únicos.
            </p>
          </div>
          <div className="col-lg-4">
            <h5>Contactos</h5>
            <p className="mb-2">
              <i className="bi bi-envelope-fill me-2"></i>
              geral@azotrace.pt
            </p>
            <p className="mb-2">
              <i className="bi bi-telephone-fill me-2"></i>
              +351 296 286 288
            </p>
            <p>
              <i className="bi bi-geo-alt-fill me-2"></i>
              Rua Eng. Deodato Magalhaes, 12 - 1Esq <br />
              9500-786 Ponta Delgada <br />
              São Miguel, Açores, Portugal
            </p>
          </div>
          <div className="col-lg-4">
            <a href="https://janelaactiva.net" target="_blank" rel="noopener noreferrer">
              <Image
                src="/assets/images/logo_janac.png"
                alt="Janela Activa"
                width={268}
                height={70}
                style={{ marginBottom: '20px' }}
              />
            </a>
            <p>
              A Janela Activa apresenta-se como uma empresa dinâmica, pró-activa
              que fornece, implementa e dá assistência em solução “chave-na-mão”
              de Tecnologias de Informação para o seu negócio.
            </p>
          </div>
        </div>

        <div className="text-center mb-3 footer-legal">
          <Link href="/privacy">Política de Privacidade</Link>
          <span className="mx-2">|</span>
          <Link href="/terms">Termos e Condições</Link>
          <span className="mx-2">|</span>
          <Link href="/cookies">Política de Cookies</Link>
        </div>

        <hr className="my-4 text-white-50" />
        <div className="text-center">
          © 2026 Janela Activa. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
