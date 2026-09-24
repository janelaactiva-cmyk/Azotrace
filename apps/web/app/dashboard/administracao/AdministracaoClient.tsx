'use client';

export default function AdministracaoClient() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>⚙️ Administração</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Gere configurações, produtos, utilizadores, privacidade e segurança a partir da barra lateral.
          </p>
        </div>
      </div>

      <section
        aria-labelledby="administracao-navegacao-title"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: '28px',
          minHeight: '260px',
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <span aria-hidden="true" style={{ fontSize: '42px', display: 'block', marginBottom: '12px' }}>🧭</span>
          <h2
            id="administracao-navegacao-title"
            style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}
          >
            Navegação da Administração
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Abre <strong>Administração</strong> na barra lateral e escolhe a área pretendida. Os grupos podem ser
            expandidos por clique, Enter ou Espaço e a opção atual fica identificada automaticamente.
          </p>
        </div>
      </section>
    </div>
  );
}
