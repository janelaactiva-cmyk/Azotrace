import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = 'pt';
  
  // Carrega os vários namespaces em separado para evitar chaves em falta
  const auth = (await import(`../messages/${locale}/auth.json`)).default;
  const account = (await import(`../messages/${locale}/account.json`)).default;
  const common = (await import(`../messages/${locale}/common.json`)).default; // se existir
  const teams = (await import(`../messages/${locale}/teams.json`)).default; // se existir

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