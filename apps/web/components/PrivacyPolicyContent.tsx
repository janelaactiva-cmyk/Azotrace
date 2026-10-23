export const privacyLastUpdated = "23 de julho de 2026";
export const privacySections = [
  {
    "id": "privacy-section-1",
    "title": "1. Responsável pelo Tratamento de Dados"
  },
  {
    "id": "privacy-section-2",
    "title": "2. Dados que Recolhemos"
  },
  {
    "id": "privacy-section-3",
    "title": "3. Finalidade e Base Legal"
  },
  {
    "id": "privacy-section-4",
    "title": "4. Partilha de Dados"
  },
  {
    "id": "privacy-section-5",
    "title": "5. Retenção de Dados"
  },
  {
    "id": "privacy-section-6",
    "title": "6. Direitos do Titular dos Dados"
  },
  {
    "id": "privacy-section-7",
    "title": "7. Alterações a esta Política"
  }
];
export default function PrivacyPolicyContent(){return (<div style={{
          background: '#fff',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
          color: '#4b5563',
          lineHeight: '1.8'
        }}>
          <p style={{ marginBottom: '20px' }}>
            A sua privacidade é uma prioridade para nós. Esta Política de Privacidade explica como a
            <strong> Azotrace</strong> recolhe, utiliza, processa e protege os seus dados pessoais em conformidade
            com o Regulamento Geral sobre a Proteção de Dados (RGPD).
          </p>

          <h3 id="privacy-section-1" style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            1. Responsável pelo Tratamento de Dados
          </h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <li><strong>Empresa:</strong> Janela Activa, Lda.</li>
            <li><strong>Projeto:</strong> Azotrace</li>
            <li><strong>E-mail:</strong> geral@azotrace.pt</li>
          </ul>

          <h3 id="privacy-section-2" style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            2. Dados que Recolhemos
          </h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <li>Nome e endereço de e-mail.</li>
            <li>Dados de faturação processados pela Stripe.</li>
            <li>Endereço público da carteira digital (Wallet Address).</li>
            <li>Endereço IP, navegador e cookies (mediante consentimento).</li>
          </ul>

          <h3 id="privacy-section-3" style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            3. Finalidade e Base Legal
          </h3>
          <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
            <li><strong>Execução de contrato:</strong> criação de conta, pagamentos e utilização dos serviços.</li>
            <li><strong>Consentimento:</strong> newsletters e cookies opcionais.</li>
            <li><strong>Interesse legítimo:</strong> segurança da plataforma e prevenção de fraude.</li>
          </ul>

          <h3 id="privacy-section-4" style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            4. Partilha de Dados
          </h3>
          <p style={{ marginBottom: '16px' }}>
            Os dados podem ser partilhados com a Stripe Payments Europe Ltd., fornecedores de alojamento
            compatíveis com o RGPD e redes blockchain públicas quando necessário para a execução do serviço.
          </p>

          <h3 id="privacy-section-5" style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            5. Retenção de Dados
          </h3>
          <p style={{ marginBottom: '16px' }}>
            Os dados são conservados enquanto a conta estiver ativa ou pelo período exigido por lei.
            Os registos em blockchain pública são tecnicamente imutáveis e não podem ser apagados.
          </p>

          <h3 id="privacy-section-6" style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            6. Direitos do Titular dos Dados
          </h3>
          <p style={{ marginBottom: '16px' }}>
            Tem direito de acesso, retificação, apagamento, limitação e oposição ao tratamento dos seus dados.
            Para exercer estes direitos contacte <a href="mailto:geral@azotrace.pt" style={{ color: '#234D87', textDecoration: 'none' }}>geral@azotrace.pt</a>.
          </p>

          <h3 id="privacy-section-7" style={{ color: '#234D87', marginTop: '24px', marginBottom: '12px', fontSize: '1.3rem' }}>
            7. Alterações a esta Política
          </h3>
          <p>
            Poderemos atualizar esta Política de Privacidade periodicamente. A versão mais recente estará
            sempre disponível nesta página.
          </p>
        </div>);}
