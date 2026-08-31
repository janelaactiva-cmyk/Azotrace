import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !['pt', 'en'].includes(locale)) {
    locale = 'pt';
  }

  const auth = (await import(`./messages/${locale}/auth.json`).catch(() => ({}))).default;
  const account = (await import(`./messages/${locale}/account.json`).catch(() => ({}))).default;
  const common = (await import(`./messages/${locale}/common.json`).catch(() => ({}))).default;
  const teams = (await import(`./messages/${locale}/teams.json`).catch(() => ({}))).default;

  return {
    locale,
    messages: {
      auth,
      account,
      common,
      teams,
    },
  };
});