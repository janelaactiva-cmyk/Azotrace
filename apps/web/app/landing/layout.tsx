'use client';

import { Inter } from 'next/font/google';
import './landing.css';
import Script from 'next/script';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Carregar Bootstrap CSS
    const bootstrapCss = document.createElement('link');
    bootstrapCss.rel = 'stylesheet';
    bootstrapCss.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
    document.head.appendChild(bootstrapCss);

    // Carregar Bootstrap Icons
    const iconsCss = document.createElement('link');
    iconsCss.rel = 'stylesheet';
    iconsCss.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
    document.head.appendChild(iconsCss);

    return () => {
      if (bootstrapCss.parentNode) bootstrapCss.parentNode.removeChild(bootstrapCss);
      if (iconsCss.parentNode) iconsCss.parentNode.removeChild(iconsCss);
    };
  }, []);

  return (
    <>
      <div className={inter.className}>
        {children}
      </div>
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
      <Script src="/assets/js/main.js" strategy="afterInteractive" />
    </>
  );
}
