import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { ThemeProvider } from '~/lib/theme-context';
import { BusinessProvider } from '~/lib/business-context';
import { AuthProvider } from '~/lib/auth-context';
import { Providers } from './providers';
import CookieConsent from '~/components/CookieConsent';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Azotrace',
  description: 'Sistema de gestão de negócios agrícolas',
  icons: {
    icon: '/assets/images//favicon.png', // Podes alterar para o caminho do teu ícone se estiver na pasta public
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className={inter.className}>
        <Suspense fallback={null}>
          <ThemeProvider>
            <AuthProvider>
              <BusinessProvider>
                <Providers>
                  {children}
                  <CookieConsent />
                </Providers>
              </BusinessProvider>
            </AuthProvider>
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}