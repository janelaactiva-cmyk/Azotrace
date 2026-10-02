'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useProducerWorkspace } from '../_lib/use-producer-workspace';

export function OnboardingRedirect() {
  const router = useRouter();
  const { store, loading } = useProducerWorkspace();

  useEffect(() => {
    if (!loading && !store?.completed) router.replace('/dashboard/onboarding');
  }, [router, store?.completed, loading]);

  return null;
}
