'use client';

export default function ProducaoClient() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>🏭 Produção</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Gere lotes, linhas de fabrico, QR codes e parâmetros operacionais a partir da barra lateral.
          </p>
        </div>
      </div>

      <section
        aria-labelledby="producao-navegacao-title"
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
            id="producao-navegacao-title"
            style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}
          >
            Navegação no Módulo de Produção
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Abre as opções de <strong>Produção</strong> na barra lateral e escolhe a secção pretendida (como a gestão e configuração de QR codes). Os grupos podem ser expandidos por clique, Enter ou Espaço e a opção atual fica identificada automaticamente.
          </p>
        </div>
      </section>
    </div>
  );
}