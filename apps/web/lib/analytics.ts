'use client';

declare global {
  interface Window {
    gtag: any;
    dataLayer: any[];
  }
}

export function initGoogleAnalytics(measurementId: string) {
  if (typeof window === 'undefined') return;

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
}

export function updateAnalyticsConsent(accepted: boolean) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'update', {
    analytics_storage: accepted ? 'granted' : 'denied'
  });
}
