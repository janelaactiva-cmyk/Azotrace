import { Suspense } from 'react';

import OnboardingPageClient from './_components/OnboardingPageClient';

function OnboardingLoading() {
  return (
    <div
      style={{
        minHeight: '320px',
        display: 'grid',
        placeItems: 'center',
        color: '#6b7280',
        fontSize: '14px',
      }}
    >
      A carregar configuração do negócio…
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingPageClient />
    </Suspense>
  );
}
