import Breadcrumb from '../_components/Breadcrumb';
import TabsNegocios from '../_components/TabsNegocios';
import PageClient from './PageClient';

export const instant = false;

export default function Page() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(16px, 3vw, 34px)' }}>
      <Breadcrumb
        items={[
          
          { label: 'Configurações', href: '/dashboard/administracao' },
          { label: 'Negócio', href: '/dashboard/administracao/negocios' },
          { label: 'Formulário do Negócio' },
        ]}
      />

      <header style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>
          📝 Formulário do Negócio
        </h1>
        <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '13px' }}>
          Preenche os dados para criar um novo negócio.
        </p>
      </header>

      <TabsNegocios />

      <PageClient />
    </div>
  );
}