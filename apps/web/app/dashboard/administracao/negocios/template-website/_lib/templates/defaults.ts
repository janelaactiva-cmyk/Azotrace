import type { WebsiteTemplateContent, WebsiteTemplateId } from '../schema';

export const WEBSITE_TEMPLATE_DEFAULTS = {
  "template-1": {
    "seo": {
      "title": "Software",
      "description": ""
    },
    "navigation": {
      "home": "Início",
      "features": "Características",
      "history": "História",
      "production": "Produção",
      "recipes": "Receita",
      "gallery": "Galeria",
      "contact": "Contacto"
    },
    "hero": {
      "title": "Bem-vindos",
      "subtitle": "",
      "image": "images/estufa.jpg",
      "slides": []
    },
    "features": {
      "title": "Características de Produção",
      "subtitle": "Dados de Estufa",
      "items": [
        {
          "title": "Data de cultivo",
          "description": ""
        },
        {
          "title": "Data de colheita",
          "description": ""
        },
        {
          "title": "Humidade",
          "description": ""
        },
        {
          "title": "Temperatura",
          "description": ""
        },
        {
          "title": "Lorem ipsum",
          "description": ""
        }
      ],
      "images": [
        "images/grafico/1.jpg",
        "images/grafico/2.jpg"
      ]
    },
    "history": {
      "title": "História",
      "subtitle": "",
      "heading": "",
      "text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "image": "images/estufa2.jpeg",
      "highlights": []
    },
    "production": {
      "title": "Produção",
      "subtitle": "",
      "items": [
        {
          "title": "Lorem ipsum",
          "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit,",
          "image": "images/about/1.jpg"
        },
        {
          "title": "Lorem ipsum",
          "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit,",
          "image": "images/about/2.jpg"
        },
        {
          "title": "Lorem ipsum",
          "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit,",
          "image": "images/about/3.jpg"
        },
        {
          "title": "Lorem ipsum",
          "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit,",
          "image": "images/about/4.jpg"
        },
        {
          "title": "Lorem ipsum",
          "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit,",
          "image": "images/about/5.jpg"
        }
      ]
    },
    "recipes": {
      "title": "Receitas",
      "subtitle": "",
      "items": [
        {
          "title": "Receita 1",
          "category": "",
          "description": "Uma breve descrição da receita.",
          "image": "images/receitas/ananas1.jpg"
        },
        {
          "title": "Receita 2",
          "category": "",
          "description": "Uma breve descrição da receita.",
          "image": "images/receitas/ananas2.jpg"
        },
        {
          "title": "Receita 3",
          "category": "",
          "description": "Uma breve descrição da receita.",
          "image": "images/receitas/ananas3.jpg"
        }
      ]
    },
    "gallery": {
      "title": "Galeria",
      "subtitle": "",
      "images": []
    },
    "contact": {
      "addressLine1": "",
      "addressLine2": "",
      "phone": "",
      "email": "",
      "hoursWeek": "",
      "hoursSunday": ""
    },
    "footer": {
      "brand": "Quinta de Ananases",
      "copyright": "© 2026 Quinta de Ananases. Todos os direitos reservados."
    },
    "theme": {
      "primaryColor": "#81B29A",
      "secondaryColor": "#3D405B",
      "backgroundColor": "#ffffff",
      "textColor": "#717275",
      "headingColor": "#000000",
      "surfaceColor": "#F4F1DE",
      "accentColor": "#F2CC8F"
    }
  },
  "template-2": {
    "seo": {
      "title": "QR Code",
      "description": ""
    },
    "navigation": {
      "home": "Inicio",
      "features": "Caracteristicas",
      "history": "Historia",
      "production": "Produção",
      "recipes": "Receitas",
      "gallery": "Galeria",
      "contact": "Contacto"
    },
    "hero": {
      "title": "Quinta Dos Ananases",
      "subtitle": "Cada momento tem o sabor doce da tradição e o aroma inesquecível dos Açores.",
      "image": "assets/img/hero-img.png",
      "slides": []
    },
    "features": {
      "title": "Caracteristicas",
      "subtitle": "Aprenda mais Caracteristicas",
      "items": [
        {
          "title": "Data de cultivo",
          "description": ""
        },
        {
          "title": "Data de colheita",
          "description": ""
        },
        {
          "title": "Humidade",
          "description": ""
        },
        {
          "title": "Temperatura",
          "description": ""
        },
        {
          "title": "Lorem ipsum",
          "description": ""
        }
      ],
      "images": [
        "assets/img/grafico/1.jpg",
        "assets/img/grafico/2.jpg"
      ]
    },
    "history": {
      "title": "Historia",
      "subtitle": "Aprenda a nossa Historia",
      "heading": "Sobre na nossa História",
      "text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "image": "assets/img/stats-bg.jpg",
      "highlights": []
    },
    "production": {
      "title": "Produção",
      "subtitle": "A nossa Produção",
      "items": [
        {
          "title": "Fase 1",
          "description": "Lorem, deren, trataro, filede, nerada",
          "image": "assets/img/producao/1.jpg"
        },
        {
          "title": "Fase 2",
          "description": "Lorem, deren, trataro, filede, nerada",
          "image": "assets/img/producao/2.jpg"
        },
        {
          "title": "Fase 3",
          "description": "Lorem, deren, trataro, filede, nerada",
          "image": "assets/img/producao/2.1.jpg"
        },
        {
          "title": "Fase 4",
          "description": "Lorem, deren, trataro, filede, nerada",
          "image": "assets/img/producao/3.jpg"
        },
        {
          "title": "Fase 5",
          "description": "Lorem, deren, trataro, filede, nerada",
          "image": "assets/img/producao/4.jpg"
        },
        {
          "title": "Fase 6",
          "description": "Lorem, deren, trataro, filede, nerada",
          "image": "assets/img/producao/5.jpg"
        }
      ]
    },
    "recipes": {
      "title": "Receitas",
      "subtitle": "Nossas Receitas",
      "items": [
        {
          "title": "Receita 1",
          "category": "Bebida",
          "description": "Uma breve descrição da receita.",
          "image": "assets/img/receitas/ananas1.jpg"
        },
        {
          "title": "Receita 2",
          "category": "Sobremesa",
          "description": "Uma breve descrição da receita.",
          "image": "assets/img/receitas/ananas2.jpg"
        },
        {
          "title": "Receita 3",
          "category": "Sobremesa",
          "description": "Uma breve descrição da receita.",
          "image": "assets/img/receitas/ananas3.jpg"
        }
      ]
    },
    "gallery": {
      "title": "Galeria",
      "subtitle": "A nossa Galeria",
      "images": [
        "assets/img/gallery/gallery-1.jpg",
        "assets/img/gallery/gallery-2.jpg",
        "assets/img/gallery/gallery-3.jpg",
        "assets/img/gallery/gallery-4.jpg",
        "assets/img/gallery/gallery-5.jpg",
        "assets/img/gallery/gallery-6.jpg",
        "assets/img/gallery/gallery-7.jpg",
        "assets/img/gallery/gallery-8.jpg"
      ]
    },
    "contact": {
      "addressLine1": "Rua das Camelias, Ponta Delgada",
      "addressLine2": "Açores",
      "phone": "+351 961 123 456",
      "email": "info@example.com",
      "hoursWeek": "11h - 23h",
      "hoursSunday": "Fechado"
    },
    "footer": {
      "brand": "Janela Activa",
      "copyright": "Todos os direitos reservados"
    },
    "theme": {
      "primaryColor": "#ce1212",
      "secondaryColor": "#37373f",
      "backgroundColor": "#ffffff",
      "textColor": "#212529",
      "headingColor": "#37373f",
      "surfaceColor": "#ffffff",
      "accentColor": "#ce1212"
    }
  },
  "template-3": {
    "seo": {
      "title": "Quinta 3",
      "description": ""
    },
    "navigation": {
      "home": "Inicio",
      "features": "Caracteristicas",
      "history": "História",
      "production": "Produção",
      "recipes": "Receitas",
      "gallery": "Galeria",
      "contact": "Contacto"
    },
    "hero": {
      "title": "",
      "subtitle": "",
      "image": "",
      "slides": [
        {
          "title": "Do campo direto para o seu paladar.",
          "subtitle": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          "image": "assets/img/hero_1.jpg"
        },
        {
          "title": "Sabor tropical, qualidade natural.",
          "subtitle": "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.",
          "image": "assets/img/hero_2.jpg"
        },
        {
          "title": "A terra oferece, o tempo transforma.",
          "subtitle": "Beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.",
          "image": "assets/img/hero_3.jpg"
        },
        {
          "title": "Cresce com sol, desaparece na sobremesa.",
          "subtitle": "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.",
          "image": "assets/img/hero_4.jpg"
        },
        {
          "title": "Doce, fresco e pronto a conquistar.",
          "subtitle": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          "image": "assets/img/hero_5.jpg"
        }
      ]
    },
    "features": {
      "title": "Caracteristicas",
      "subtitle": "Caracteristicas de Produção",
      "items": [
        {
          "title": "Planting",
          "description": "Gravida sodales condimentum pellen tesq accumsan orci quam sagittis sapie"
        },
        {
          "title": "Mulching",
          "description": "Gravida sodales condimentum pellen tesq accumsan orci quam sagittis sapie"
        },
        {
          "title": "Plowing",
          "description": "Gravida sodales condimentum pellen tesq accumsan orci quam sagittis sapie"
        },
        {
          "title": "Mowing",
          "description": "Gravida sodales condimentum pellen tesq accumsan orci quam sagittis sapie"
        },
        {
          "title": "Seeding",
          "description": "Gravida sodales condimentum pellen tesq accumsan orci quam sagittis sapie"
        },
        {
          "title": "Fresh Vegetables",
          "description": "Gravida sodales condimentum pellen tesq accumsan orci quam sagittis sapie"
        },
        {
          "title": "Watering",
          "description": "Gravida sodales condimentum pellen tesq accumsan orci quam sagittis sapie"
        },
        {
          "title": "Vegetable selling",
          "description": "Gravida sodales condimentum pellen tesq accumsan orci quam sagittis sapie"
        }
      ],
      "images": []
    },
    "history": {
      "title": "História",
      "subtitle": "",
      "heading": "Mais de 50 anos de experiência produção de ananás",
      "text": "Num campo banhado pelo sol, numa ilha de clima quente, nasceu um pequeno ananás diferente dos outros.",
      "image": "assets/img/img_long_5.jpg",
      "highlights": [
        {
          "title": "Lorem ipsum dolor sit amet",
          "description": "Lorem ipsum dolor sit amet."
        },
        {
          "title": "Lorem ipsum dolor sit amet",
          "description": "Lorem ipsum dolor sit amet."
        },
        {
          "title": "Lorem ipsum dolor sit amet",
          "description": "Lorem ipsum dolor sit amet."
        }
      ]
    },
    "production": {
      "title": "Produção",
      "subtitle": "Produzir ananás é respeitar o tempo da natureza.",
      "items": [
        {
          "title": "cada detalhe faz a diferença.",
          "description": "",
          "image": "assets/img/img_sq_1.jpg"
        },
        {
          "title": "sabor autêntico.",
          "description": "",
          "image": "assets/img/img_sq_3.jpg"
        },
        {
          "title": "é respeitar o tempo da natureza.",
          "description": "",
          "image": "assets/img/img_sq_8.jpg"
        },
        {
          "title": "produzir é confiar na natureza.",
          "description": "",
          "image": "assets/img/img_sq_4.jpg"
        },
        {
          "title": "sabor que se sente.",
          "description": "",
          "image": "assets/img/img_sq_5.jpg"
        },
        {
          "title": "é transformar tempo em doçura.",
          "description": "",
          "image": "assets/img/img_sq_6.jpg"
        },
        {
          "title": "com qualidade garantida.",
          "description": "",
          "image": "assets/img/img_sq_8.jpg"
        }
      ]
    },
    "recipes": {
      "title": "Receitas",
      "subtitle": "Experimente uma das nossas receitas",
      "items": [
        {
          "title": "Eum ad dolor et. Autem aut fugiat debitis",
          "category": "",
          "description": "Aqui vai a descrição detalhada da receita...",
          "image": "assets/img/blog/receita1.jpg"
        },
        {
          "title": "Et repellendus molestiae qui est sed omnis",
          "category": "",
          "description": "Aqui vai a descrição detalhada da receita...",
          "image": "assets/img/blog/receita2.jpg"
        },
        {
          "title": "Quia assumenda est et veritati tirana ploder",
          "category": "",
          "description": "Aqui vai a descrição detalhada da receita...",
          "image": "assets/img/blog/receita3.jpg"
        }
      ]
    },
    "gallery": {
      "title": "Galeria",
      "subtitle": "",
      "images": []
    },
    "contact": {
      "addressLine1": "Rua da quinta",
      "addressLine2": "9500 Ponta Delgada, Açores",
      "phone": "+351 912 123 123",
      "email": "info@example.com",
      "hoursWeek": "",
      "hoursSunday": ""
    },
    "footer": {
      "brand": "Quinta 3",
      "copyright": "Todos os direitos reservados"
    },
    "theme": {
      "primaryColor": "#116530",
      "secondaryColor": "#2d465e",
      "backgroundColor": "#ffffff",
      "textColor": "#212529",
      "headingColor": "#2d465e",
      "surfaceColor": "#ffffff",
      "accentColor": "#116530"
    }
  }
} as const satisfies Record<WebsiteTemplateId, WebsiteTemplateContent>;

export function cloneTemplateDefaults(
  templateId: WebsiteTemplateId,
): WebsiteTemplateContent {
  return structuredClone(WEBSITE_TEMPLATE_DEFAULTS[templateId]) as WebsiteTemplateContent;
}
