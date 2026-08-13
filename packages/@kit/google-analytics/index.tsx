'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    gtag: any;
    dataLayer: any[];
  }
}

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId) return;
    if (typeof window === 'undefined') return;

    // Verificar consentimento
    const consent = localStorage.getItem('cookie-consent');
    const analyticsEnabled = consent === 'accepted';

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    window.gtag('consent', 'default', {
      analytics_storage: analyticsEnabled ? 'granted' : 'denied'
    });

    window.gtag('js', new Date());
    window.gtag('config', measurementId);

    console.log(`📊 Google Analytics: ${analyticsEnabled ? '✅ Ativo' : '❌ Desativado'}`);
  }, [measurementId]);

  useEffect(() => {
    if (!measurementId) return;
    const url = pathname + (searchParams?.toString() ? '?' + searchParams.toString() : '');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', measurementId, { page_path: url });
    }
  }, [pathname, searchParams, measurementId]);

  if (!measurementId) return null;

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}');
          `
        }}
      />
    </>
  );
}
