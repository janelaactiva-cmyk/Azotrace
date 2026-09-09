export default function EmConstrucaoPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      fontFamily: 'sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '550px',
        background: 'white',
        padding: '40px 30px',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        {/* 🚧 Ícone ou Espaço para Imagem */}
        <div style={{ fontSize: '56px', marginBottom: '20px' }}>
          
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>
          Plataforma em Construção
        </h1>

        <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.6', marginBottom: '24px' }}>
          Estamos a finalizar os últimos detalhes da nossa plataforma para lhe trazer a melhor experiência. O acesso público estará disponível em breve.
        </p>

        <div style={{
          background: '#f9fafb',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          <p style={{ margin: 0 }}>
            🔒 <strong>Área restrita:</strong> Se tem o link direto para testes (ex: checkout ou painel), pode continuar a utilizá-lo normalmente.
          </p>
        </div>
      </div>
    </main>
  );
}