'use client';

import { useSearchParams } from 'next/navigation';

import ProducerOnboarding from './ProducerOnboarding';

export default function OnboardingPageClient() {
  const searchParams = useSearchParams();
  const forceNew = searchParams.get('new') === '1';

  return <ProducerOnboarding forceNew={forceNew} />;
}
