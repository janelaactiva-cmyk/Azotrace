import { connection } from 'next/server'; // 👈 1. Importe o connection

import { PageBody, PageHeader } from '@kit/ui/page';

import { DashboardContent } from '~/app/dashboard/_components/dashboard-content';



export default async function HomePage() {
await connection(); // 👈 2. Aguarde pela conexão para forçar o comportamento dinâmico

  return (
    <>
      <PageHeader description={'Your SaaS at a glance'} />

      <PageBody>
        <DashboardContent />
      </PageBody>
    </>
  );
}
