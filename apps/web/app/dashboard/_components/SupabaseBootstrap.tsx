'use client';

import { useEffect } from 'react';

import {
  hydrateProducerCacheFromSupabase,
  migrateLocalBusinessesToSupabase,
} from '../onboarding/_lib/supabase-store';

/**
 * Hidrata a cache de UI a partir do Supabase e tenta migrar dados locais antigos.
 * A cache local continua a existir apenas para uma UI imediata e como ponte de migração.
 */
export function SupabaseBootstrap() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await migrateLocalBusinessesToSupabase();
        if (!cancelled) await hydrateProducerCacheFromSupabase();
      } catch (error) {
        console.warn('Bootstrap Supabase incompleto.', error);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
