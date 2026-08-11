import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = 'pt';
  
  // Carrega as mensagens em português
  const messages = (await import(`../messages/${locale}.json`)).default;
  
  // Opcional: carrega também o inglês como fallback
  // const englishMessages = (await import(`../messages/en.json`)).default;
  // const mergedMessages = { ...englishMessages, ...messages };

  return {
    locale,
    messages,
    // Se quiseres fallback para inglês, usa mergedMessages
  };
});
