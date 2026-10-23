import type { Catalog } from './plan-catalog';
import { azoiaAnswer, normalizeQuestion } from './azoia-answers';
import { landingProducerFaq, landingConsumerFaq, landingAbout, landingBenefits, landingContact } from './landing-content';
export type ChatbotQuestion = { id: number; question: string; answer: string; category: string; is_active: boolean; order_position: number };
export const CHATBOT_CHANGED_EVENT = 'azotrace:chatbot-changed';
export const CHATBOT_CHANGED_KEY = 'azotrace:chatbot-questions-changed';
export const landingChatbotQuestions = [
  ...landingProducerFaq.map(item => ({ question: item.q, answer: item.a, category: 'Produto' })),
  { question: 'Quais são os preços?', answer: '{{precos_atuais}}', category: 'Faturação' },
  ...landingConsumerFaq.map(item => ({ question: item.q, answer: item.a, category: 'Produto' })),
  { question: 'Qual é o horário e como posso contactar a Azotrace?', answer: '{{contactos_atuais}}', category: 'Geral' },
  { question: 'Qual é a missão da Azotrace?', answer: landingAbout.mission, category: 'Geral' },
  { question: 'Qual é a visão da Azotrace?', answer: landingAbout.vision, category: 'Geral' },
  { question: 'Quais são os valores da Azotrace?', answer: landingAbout.values, category: 'Geral' },
  { question: 'Quais são as vantagens da Azotrace?', answer: 'Para produtores:\n' + landingBenefits.producers.join('\n') + '\n\nPara consumidores:\n' + landingBenefits.consumers.join('\n'), category: 'Produto' },
  { question: 'Como nasceu a Azotrace?', answer: landingAbout.summary, category: 'Geral' },
].map((question, order_position) => ({ ...question, is_active: true, order_position }));
export function notifyChatbotChanged() {
  window.dispatchEvent(new Event(CHATBOT_CHANGED_EVENT));
  try { localStorage.setItem(CHATBOT_CHANGED_KEY, String(Date.now())); } catch { /* Current tab still refreshes. */ }
}
const stopWords = new Set(['a','as','o','os','de','da','das','do','dos','e','que','qual','quais','como','um','uma','uns','umas','para','por','na','nas','no','nos','se','eu','me','meu','minha','posso','pode','poderia','favor','queria','saber','sao','ao','aos','sobre','ter','tem']);
const keywords = (text: string) => new Set(normalizeQuestion(text).split(' ').filter(word => word && !stopWords.has(word)).map(word => /^(preco|precos|custo|custos)$/.test(word) ? 'precos' : word));
export function findChatbotQuestion(text: string, rows: ChatbotQuestion[]): ChatbotQuestion | null {
  const active = rows.filter(row => row.is_active);
  const exact = active.find(row => normalizeQuestion(row.question) === normalizeQuestion(text));
  if (exact) return exact;
  const input = keywords(text);
  if (!input.size) return null;
  const ranked = active.map(row => {
    const tokens = keywords(row.question);
    const matches = [...input].filter(word => tokens.has(word)).length;
    return { row, matches, score: matches / Math.max(input.size, tokens.size) };
  }).filter(item => item.matches >= Math.min(2, input.size) && item.score >= 0.4).sort((a,b) => b.score-a.score);
  if (!ranked[0] || (ranked[1] && ranked[0].score === ranked[1].score)) return null;
  return ranked[0].row;
}
export function renderChatbotAnswer(answer: string, catalog: Catalog | null) {
  return answer.replaceAll('{{precos_atuais}}', azoiaAnswer('preços', 'help', catalog))
    .replaceAll('{{contactos_atuais}}', 'Pode contactar a Azotrace pelo email ' + landingContact.email + ' ou pelo telefone ' + landingContact.phone + '. ' + landingContact.hours)
    .replace(/\p{Extended_Pictographic}(?:[\uFE0F\u200D]\p{Extended_Pictographic})*\uFE0F?/gu, '').trim();
}
