import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Cookies | Azotrace',
  description: 'Política de Cookies da Azotrace',
};

export default function CookiesPage() {
  return (
    <main style={{ 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      background: '#EEF5FC',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ 
            display: 'inline-block',
            color: '#234D87',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: '0.9rem',
            letterSpacing: '1px'
          }}>
            Legal
          </span>
          <h1 style={{ 
            fontSize: '2.3rem',
            fontWeight: 700,
            color: '#1f2937',
            marginTop: '10px',
            marginBottom: '8px'
          }}>
            Política de Cookies
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            Última atualização: 23 de julho de 2026
          </p>
        </div>

        <div style={{
          background: '#fff',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
          color: '#4b5563',
          lineHeight: '1.8'
        }}>
          <p style={{ marginBottom: '20px' }}>
            A Azotrace utiliza cookies e tecnologias semelhantes para garantir o funcionamento do site,
            melhorar a experiência do utilizador e analisar a utilização da plataforma.
          </p>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            1. O que são Cookies?
          </h3>
          <p style={{ marginBottom: '16px' }}>
            Cookies são pequenos ficheiros de texto armazenados no seu dispositivo quando visita um site.
          </p>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            2. Tipos de Cookies Utilizados
          </h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>Essenciais:</strong> necessários para o funcionamento do site e autenticação.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Analíticos:</strong> ajudam-nos a compreender a utilização do site.
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Marketing:</strong> utilizados apenas com o seu consentimento.
            </li>
          </ul>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            3. Base Legal
          </h3>
          <p style={{ marginBottom: '16px' }}>
            Os cookies essenciais são utilizados com base no interesse legítimo.
            Os cookies analíticos e de marketing dependem do seu consentimento prévio.
          </p>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            4. Gestão de Preferências
          </h3>
          <p style={{ marginBottom: '16px' }}>
            Pode aceitar, rejeitar ou configurar os cookies através do banner de consentimento e das
            definições do seu navegador.
          </p>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            5. Contacto
          </h3>
          <p>
            Para questões relacionadas com cookies contacte
            <a href="mailto:geral@azotrace.pt" style={{ color: '#234D87', textDecoration: 'none' }}>
              geral@azotrace.pt
            </a>.
          </p>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link href="/landing" style={{ color: '#234D87', textDecoration: 'none' }}>
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
