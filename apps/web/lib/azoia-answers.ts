import { landingProducerFaq, landingConsumerFaq, landingSteps, landingAbout, landingContact, landingBenefits } from './landing-content';
import type { Catalog } from './plan-catalog';
import { planFeatures } from './plan-catalog';

export const azoiaSuggestions = ['O que é a Azotrace?', 'Como funciona a plataforma?', 'Quais são os preços?', 'Como consultar um produto?'];
export const normalizeQuestion = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function azoiaAnswer(text: string, mode: 'help' | 'tickets', catalog: Catalog | null): string {
  const query = normalizeQuestion(text);
  const faq = [...landingProducerFaq, ...landingConsumerFaq];
  const exact = faq.find(item => normalizeQuestion(item.q) === query);
  if (exact) return exact.a;
  if (/\b(missao|visao|valores|essencia|sobre|nasceu|origem da azotrace)\b/.test(query) && !/\b(preco|precos|plano|planos)\b/.test(query)) {
    if (/\bmissao\b/.test(query)) return landingAbout.mission;
    if (/\bvisao\b/.test(query)) return landingAbout.vision;
    if (/\bvalores\b/.test(query)) return landingAbout.values;
    return landingAbout.summary;
  }
  if (/\b(contacto|contactos|contato|email|telefone|morada|horario)\b/.test(query)) {
    return 'Pode contactar a Azotrace pelo email ' + landingContact.email + ' ou pelo telefone ' + landingContact.phone + '. ' + landingContact.hours + ' Os contactos estão disponíveis na secção Contactos da landing. Para outras informações, utilize o formulário de ajuda.';
  }
  if (/\b(preco|precos|custo|custos|valor|valores dos planos|plano|planos|base|essential|pro|licenca|licencas|pagamento|iva|mensal|anual|desconto|gratis|gratuito)\b/.test(query)) {
    if (!catalog) return 'Os planos e os preços atuais estão disponíveis na secção Preçário da landing. Neste momento, não foi possível confirmar o catálogo; consulte essa secção antes de escolher um plano.';
    const money = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
    const selected = catalog.plans.find(plan => query.split(' ').includes(plan.id.toLowerCase()));
    if (selected) return selected.id + ': ' + money(selected.annualCents / 100) + ' por ano + IVA. ' + selected.description + '\n\n' + planFeatures(selected).join('\n');
    return 'O preçário atual apresenta os seguintes planos:\n' + catalog.plans.map(plan => plan.id + ': ' + money(plan.annualCents / 100) + ' por ano + IVA.').join('\n') + '\n\nO pagamento é anual. O valor mensal apresentado na landing é o equivalente do preço anual. Consulte o Preçário para conhecer o que está incluído em cada plano.';
  }
  if (/\b(vantagem|vantagens|beneficio|beneficios)\b/.test(query)) return 'Para produtores:\n' + landingBenefits.producers.join('\n') + '\n\nPara consumidores:\n' + landingBenefits.consumers.join('\n');
  if (/\b(instalar|instalacao|aplicacao|app)\b/.test(query)) return landingConsumerFaq[2]!.a;
  if (/\b(varios|varias|marca|marcas|gerir)\b/.test(query)) return landingProducerFaq[2]!.a + ' Os limites de cada plano estão indicados no Preçário.';
  if (/\b(informacao|informacoes|autenticidade|certificacao|certificacoes|consumidor|consumidores|dados do produto|origem do produto)\b/.test(query)) return landingConsumerFaq[1]!.a;
  if (/\b(qr|codigo|codigos|consultar|digitalizar|ler|camara|telemovel)\b/.test(query)) {
    if (/\b(criar|gerar|imprimir|aplicar|produto|lote)\b/.test(query) && !/\b(consultar|digitalizar|ler)\b/.test(query)) return landingSteps.map(step => step.title + ': ' + step.desc).join('\n');
    return landingConsumerFaq[0]!.a + ' ' + landingConsumerFaq[2]!.a;
  }
  if (/\b(funciona|funcionamento|passos|comecar)\b/.test(query)) return landingSteps.map(step => step.title + ': ' + step.desc).join('\n');
  if (/\b(azotrace|plataforma|rastreabilidade)\b/.test(query)) return landingProducerFaq[0]!.a;
  if (/\b(ajuda|suporte|problema|problemas|erro|erros|ticket|tickets)\b/.test(query)) return mode === 'tickets'
    ? 'Para contactar a equipa de suporte, selecione «Ajuda técnica · Criar ticket» e descreva o problema. Pode acompanhar as respostas nessa conversa.'
    : 'Para enviar uma questão à equipa, selecione «Precisa de ajuda? · Formulário». Não precisa de iniciar sessão. A resposta será enviada para o email que indicar no formulário.';
  if (/\b(obrigado|obrigada)\b/.test(query)) return 'De nada. Se precisar de mais alguma informação sobre a Azotrace, estou disponível para ajudar.';
  if (/^(ola|oi|bom dia|boa tarde|boa noite)( tudo bem)?$/.test(query)) return 'Olá! Sou o AZOIA. Como posso ajudar? Pode colocar questões sobre a plataforma, os planos ou os QR Codes.';
  return 'Não encontrei essa informação na landing. Pode colocar questões sobre a Azotrace, o funcionamento da plataforma, os planos, os QR Codes ou os contactos. Para outras questões, utilize ' + (mode === 'tickets' ? 'o suporte de tickets.' : 'o formulário de ajuda.');
}
