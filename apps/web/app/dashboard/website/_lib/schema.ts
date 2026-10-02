import * as z from 'zod';

const ColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor HEX inválida');

const ImagePathSchema = z.string().max(500).default('');

const NavSchema = z.object({
  home: z.string().min(1).max(40),
  features: z.string().min(1).max(40),
  history: z.string().min(1).max(40),
  production: z.string().min(1).max(40),
  recipes: z.string().min(1).max(40),
  gallery: z.string().max(40).default('Galeria'),
  contact: z.string().max(40).default('Contacto'),
});

const ContentItemSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(1200).default(''),
  image: ImagePathSchema,
});

const RecipeItemSchema = ContentItemSchema.extend({
  category: z.string().max(80).default(''),
});

const HeroSlideSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(500).default(''),
  image: ImagePathSchema,
});

const HighlightSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(500).default(''),
});

export const WebsiteTemplateContentSchema = z.object({
  seo: z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(300).default(''),
  }),

  navigation: NavSchema,

  hero: z.object({
    title: z.string().max(180).default(''),
    subtitle: z.string().max(600).default(''),
    image: ImagePathSchema,
    slides: z.array(HeroSlideSchema).max(5).default([]),
  }),

  features: z.object({
    title: z.string().min(1).max(140),
    subtitle: z.string().max(300).default(''),
    items: z.array(ContentItemSchema.omit({ image: true })).max(8),
    images: z.array(ImagePathSchema).max(2).default([]),
  }),

  history: z.object({
    title: z.string().min(1).max(140),
    subtitle: z.string().max(300).default(''),
    heading: z.string().max(180).default(''),
    text: z.string().max(4000).default(''),
    image: ImagePathSchema,
    highlights: z.array(HighlightSchema).max(3).default([]),
  }),

  production: z.object({
    title: z.string().min(1).max(140),
    subtitle: z.string().max(300).default(''),
    items: z.array(ContentItemSchema).max(7),
  }),

  recipes: z.object({
    title: z.string().min(1).max(140),
    subtitle: z.string().max(300).default(''),
    items: z.array(RecipeItemSchema).max(3),
  }),

  gallery: z.object({
    title: z.string().max(140).default('Galeria'),
    subtitle: z.string().max(300).default(''),
    images: z.array(ImagePathSchema).max(8).default([]),
  }),

  contact: z.object({
    addressLine1: z.string().max(180).default(''),
    addressLine2: z.string().max(180).default(''),
    phone: z.string().max(60).default(''),
    email: z.union([z.literal(''), z.email()]).default(''),
    hoursWeek: z.string().max(120).default(''),
    hoursSunday: z.string().max(120).default(''),
  }),

  footer: z.object({
    brand: z.string().max(120).default(''),
    copyright: z.string().max(220).default(''),
  }),

  theme: z.object({
    primaryColor: ColorSchema,
    secondaryColor: ColorSchema,
    backgroundColor: ColorSchema,
    textColor: ColorSchema,
    headingColor: ColorSchema,
    surfaceColor: ColorSchema,
    accentColor: ColorSchema,
  }),
});

export const WebsiteTemplateIdSchema = z.enum([
  'template-1',
  'template-2',
  'template-3',
]);

export const SaveWebsiteTemplateSchema = z.object({
  businessId: z.string().min(1),
  templateId: WebsiteTemplateIdSchema,
  assetBaseUrl: z.string().max(500).default(''),
  status: z.enum(['draft', 'published']).default('draft'),
  content: WebsiteTemplateContentSchema,
});

export type WebsiteTemplateId = z.infer<typeof WebsiteTemplateIdSchema>;
export type WebsiteTemplateContent = z.infer<
  typeof WebsiteTemplateContentSchema
>;
export type SaveWebsiteTemplateInput = z.infer<typeof SaveWebsiteTemplateSchema>;
