import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  cacheComponents: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/manutencao',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);