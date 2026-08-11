import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      background: '#f3f4f6'
    }}>
      <div style={{
        background: 'white',
        padding: '48px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '8px' }}>🏢</h1>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Azotrace</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Sistema de Gestão de Negócios
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link href="/login" style={{
            padding: '12px',
            background: '#2563eb',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: '500'
          }}>
            🔐 Entrar
          </Link>
          <Link href="/dashboard" style={{
            padding: '12px',
            background: '#6b7280',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: '500'
          }}>
            📊 Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
