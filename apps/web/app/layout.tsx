import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '~/lib/theme-context';
import { BusinessProvider } from '~/lib/business-context';
import { AuthProvider } from '~/lib/auth-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Azotrace',
  description: 'Gestão de Negócios',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <BusinessProvider>
              {children}
            </BusinessProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
