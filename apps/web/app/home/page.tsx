import { PageBody, PageHeader } from '@kit/ui/page';

import { DashboardContent } from '~/app/dashboard/_components/dashboard-content';

// Adicione esta linha para forçar o comportamento dinâmico no build
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <PageHeader description={'Your SaaS at a glance'} />

      <PageBody>
        <DashboardContent />
      </PageBody>
    </>
  );
}
