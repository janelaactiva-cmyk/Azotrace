import { PageBody, PageHeader } from '@kit/ui/page';

import { DashboardContent } from '~/app/dashboard/_components/dashboard-content';



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
