export default function InserirDadosPage() {
  return (
    <section
      style={{
        width: '100%',
        maxWidth: '980px',
        margin: '0 auto',
        padding: '8px 0 32px',
      }}
    >
      <div
        style={{
          background: 'var(--background, #ffffff)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 8px 28px rgba(15, 23, 42, 0.08)',
          border: '1px solid rgba(148, 163, 184, 0.24)',
        }}
      >
        <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748b' }}>
          Produção
        </p>
        <h1 style={{ margin: '0 0 10px', fontSize: '28px', lineHeight: 1.2 }}>
          Inserir dados
        </h1>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Área preparada para o registo de dados de produção e rastreabilidade.
        </p>
      </div>
    </section>
  );
}
