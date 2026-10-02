import type { WebsiteTemplateId } from '../schema';
import * as Template1 from './template-1.source';
import * as Template2 from './template-2.source';
import * as Template3 from './template-3.source';

export type TemplateSource = {
  id: WebsiteTemplateId;
  name: string;
  description: string;
  html: string;
  css: string;
};

export const WEBSITE_TEMPLATE_REGISTRY: Record<
  WebsiteTemplateId,
  TemplateSource
> = {
  'template-1': {
    id: 'template-1',
    name: 'Template 1',
    description: 'Hero fotográfico, timeline de produção e receitas em modal.',
    html: Template1.html,
    css: Template1.css,
  },
  'template-2': {
    id: 'template-2',
    name: 'Template 2',
    description: 'Layout editorial com produção, receitas, galeria e contacto.',
    html: Template2.html,
    css: Template2.css,
  },
  'template-3': {
    id: 'template-3',
    name: 'Template 3',
    description: 'Layout agrícola com carrossel hero, serviços e receitas.',
    html: Template3.html,
    css: Template3.css,
  },
};
