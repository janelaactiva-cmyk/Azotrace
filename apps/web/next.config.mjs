import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  cacheComponents: true,
  typescript: {
    ignoreBuildErrors: true, // <-- Ignora erros de TS no build da Vercel
  },
  eslint: {
    ignoreDuringBuilds: true, // <-- Ignora avisos/erros de linting no build
  },
};

export default withNextIntl(nextConfig);