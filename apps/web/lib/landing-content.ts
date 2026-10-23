// Shared by the landing page and AZOIA. Keep public facts in one place.
export const landingProducerFaq = [
    { id: 'prod1', q: 'O que é a Azotrace?', a: 'A Azotrace é uma plataforma de rastreabilidade digital que permite gerir e valorizar os seus produtos através de QR Codes únicos.' },
    { id: 'prod2', q: 'Como funciona a plataforma?', a: 'Registe os produtos, gere QR Codes exclusivos e disponibilize aos consumidores toda a informação sobre a origem e autenticidade.' },
    { id: 'prod3', q: 'Posso gerir vários produtos ou marcas?', a: 'Sim. A plataforma permite gerir vários produtos, lotes e marcas a partir de uma única conta.' },
  ];
export const landingConsumerFaq = [
    { id: 'cons1', q: 'Como posso consultar um produto?', a: 'Basta apontar a câmara do telemóvel para o QR Code presente no produto.' },
    { id: 'cons2', q: 'Que informação posso consultar?', a: 'Pode consultar a origem, autenticidade, processo de produção, certificações e outras informações disponibilizadas pelo produtor.' },
    { id: 'cons3', q: 'Preciso de instalar alguma aplicação?', a: 'Não. Basta utilizar a câmara do seu smartphone ou qualquer leitor de QR Codes.' },
  ];
export const landingSteps = [
    { icon: 'bi-box-seam', title: '1. Registar o Produto', desc: 'Adicione os seus produtos na plataforma.' },
    { icon: 'bi-qr-code', title: '2. Gerar QR Code', desc: 'Gerar QR Codes únicos para cada lote ou produto.' },
    { icon: 'bi-tag', title: '3. Aplicar no Produto', desc: 'Imprima e aplique os códigos nas embalagens.' },
    { icon: 'bi-phone', title: '4. Cliente descobre', desc: 'O consumidor digitaliza o código e acede a informações detalhadas.' },
  ];
export const landingContact = { email: 'geral@azotrace.pt', phone: '296 286 288 - 965 042 695', hours: 'De segunda a sexta-feira, das 09h00 às 17h30. Encerrado aos fins de semana.' };
export const landingAbout = {
  summary: 'A Azotrace nasceu nos Açores para valorizar os produtos locais através de soluções de rastreabilidade digital. Garantimos transparência, autenticidade e confiança, ligando produtores, empresas e consumidores com tecnologia inovadora.',
  mission: 'Promover a confiança e a valorização dos produtos através da rastreabilidade digital.',
  vision: 'Ser uma referência em inovação e rastreabilidade para os produtos regionais.',
  values: 'Transparência, inovação, qualidade, sustentabilidade e confiança.',
};

export const landingBenefits = {
  "producers": [
    "Valoriza a origem e autenticidade dos produtos.",
    "Rastreabilidade completa de cada lote.",
    "Geração automática de QR Codes únicos.",
    "Maior proteção contra falsificações.",
    "Estatísticas de visualizações e digitalizações.",
    "Maior confiança e visibilidade no mercado."
  ],
  "consumers": [
    "Acesso imediato à informação através do QR Code.",
    "Confirmação da origem e autenticidade do produto.",
    "Conhecimento da história e do processo de produção.",
    "Maior transparência e confiança na compra.",
    "Decisões de compra mais informadas.",
    "Ligação direta aos produtores locais."
  ]
};
