import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termos e Condições | Azotrace',
  description: 'Termos e Condições da Azotrace',
};

export default function TermsPage() {
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
            Termos e Condições
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
            Bem-vindo à <strong>Azotrace</strong>. Ao utilizar a nossa plataforma, concorda com os presentes
            Termos e Condições. Leia-os atentamente antes de utilizar os nossos serviços.
          </p>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            1. Objeto
          </h3>
          <p style={{ marginBottom: '16px' }}>
            A Azotrace é uma plataforma de rastreabilidade inteligente para produtos dos Açores,
            permitindo a criação de QR Codes únicos para produtos e acesso a informações detalhadas.
          </p>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            2. Aceitação dos Termos
          </h3>
          <p style={{ marginBottom: '16px' }}>
            Ao criar uma conta ou utilizar a plataforma, o utilizador aceita integralmente estes Termos e Condições.
          </p>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            3. Criação de Conta
          </h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <li>O utilizador deve fornecer informações verdadeiras e atualizadas.</li>
            <li>É responsável pela segurança das suas credenciais.</li>
            <li>A Azotrace reserva-se o direito de suspender contas em caso de violação.</li>
          </ul>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            4. Serviços Prestados
          </h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <li>Geração de QR Codes para rastreabilidade.</li>
            <li>Armazenamento de dados dos produtos.</li>
            <li>Registo de rastreabilidade e autenticidade.</li>
            <li>Estatísticas e analytics.</li>
          </ul>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            5. Pagamentos
          </h3>
          <p style={{ marginBottom: '16px' }}>
            Os pagamentos são processados pela Stripe. Todos os preços são apresentados em euros e incluem IVA.
          </p>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            6. Propriedade Intelectual
          </h3>
          <p style={{ marginBottom: '16px' }}>
            Todo o conteúdo da plataforma é propriedade da Azotrace e está protegido por direitos de autor.
          </p>

          <h3 style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            7. Alterações
          </h3>
          <p>
            A Azotrace reserva-se o direito de atualizar estes Termos e Condições. A versão mais recente
            estará sempre disponível nesta página.
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
