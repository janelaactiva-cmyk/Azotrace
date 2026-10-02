'use client';

import type { WebsiteTemplateId } from '../schema';
import { WEBSITE_TEMPLATE_REGISTRY } from '../templates/registry';

export type TemplateEditTarget = {
  templateId: WebsiteTemplateId;
  tab: 'content' | 'images' | 'style';
  field?: string;
};

type EditableArea = {
  id: string;
  label: string;
  tab: TemplateEditTarget['tab'];
  field?: string;
  readonly?: boolean;
  top: number;
  left: number;
  width: number;
  height: number;
};

const PREVIEW_IMAGE: Record<WebsiteTemplateId, string> = {
  'template-1': '/website-assets/previews/template-1.png',
  'template-2': '/website-assets/previews/template-2.png',
  'template-3': '/website-assets/previews/template-3.png',
};

const EDITABLE_AREAS: Record<WebsiteTemplateId, EditableArea[]> = {
  'template-1': [
    { id: 'hero-title', label: 'Título', tab: 'content', field: 'content.hero.title', top: 12, left: 7, width: 39, height: 10 },
    { id: 'hero-image', label: 'Imagem principal', tab: 'images', field: 'content.hero.image', top: 8, left: 52, width: 40, height: 25 },
    { id: 'features', label: 'Características', tab: 'content', field: 'content.features.title', top: 41, left: 15, width: 70, height: 17 },
    { id: 'fixed-graphs', label: 'Gráficos (fixo)', tab: 'content', readonly: true, top: 48, left: 37, width: 56, height: 14 },
    { id: 'history', label: 'História', tab: 'content', field: 'content.history.title', top: 67, left: 15, width: 70, height: 13 },
    { id: 'production', label: 'Produção', tab: 'content', field: 'content.production.title', top: 84, left: 29, width: 42, height: 13 },
  ],
  'template-2': [
    { id: 'hero-title', label: 'Título', tab: 'content', field: 'content.hero.title', top: 11, left: 7, width: 44, height: 18 },
    { id: 'hero-image', label: 'Imagem principal', tab: 'images', field: 'content.hero.image', top: 8, left: 60, width: 33, height: 26 },
    { id: 'features', label: 'Características', tab: 'content', field: 'content.features.title', top: 42, left: 9, width: 82, height: 18 },
    { id: 'fixed-graphs', label: 'Gráficos (fixo)', tab: 'content', readonly: true, top: 52, left: 12, width: 76, height: 12 },
    { id: 'history', label: 'História', tab: 'content', field: 'content.history.title', top: 68, left: 18, width: 64, height: 11 },
    { id: 'production', label: 'Produção', tab: 'content', field: 'content.production.title', top: 84, left: 10, width: 80, height: 14 },
  ],
  'template-3': [
    { id: 'hero-title', label: 'Título do slide', tab: 'content', field: 'content.hero.slides.0.title', top: 20, left: 6, width: 54, height: 15 },
    { id: 'hero-image', label: 'Imagem do slide', tab: 'images', field: 'content.hero.slides.0.image', top: 7, left: 58, width: 36, height: 29 },
    { id: 'features', label: 'Características', tab: 'content', field: 'content.features.title', top: 43, left: 9, width: 82, height: 18 },
    { id: 'fixed-graphs', label: 'Gráficos (fixo)', tab: 'content', readonly: true, top: 55, left: 12, width: 76, height: 10 },
    { id: 'history', label: 'História', tab: 'content', field: 'content.history.title', top: 65, left: 7, width: 54, height: 18 },
    { id: 'history-image', label: 'Imagem', tab: 'images', field: 'content.history.image', top: 66, left: 60, width: 34, height: 18 },
    { id: 'production', label: 'Produção', tab: 'content', field: 'content.production.title', top: 88, left: 12, width: 76, height: 10 },
  ],
};

function StaticTemplateImage(props: {
  templateId: WebsiteTemplateId;
  editable?: boolean;
  onEditArea?: (target: TemplateEditTarget) => void;
}) {
  return (
    <div data-template-thumbnail data-edit-mode={props.editable ? 'true' : 'false'} data-static-template-image={props.editable ? 'edit-map' : 'selector'}>
      <img
        data-template-preview-image
        src={PREVIEW_IMAGE[props.templateId]}
        alt={`Imagem do ${props.templateId.replace('template-', 'Template ')}`}
        loading={props.editable ? 'lazy' : 'eager'}
      />

      {props.editable ? (
        <div data-editable-overlay>
          {EDITABLE_AREAS[props.templateId].map((area) => (
            area.readonly ? (
              <div
                key={area.id}
                data-fixed-area
                style={{
                  top: `${area.top}%`,
                  left: `${area.left}%`,
                  width: `${area.width}%`,
                  height: `${area.height}%`,
                }}
                title={`${area.label} — não editável`}
              >
                <span>{area.label}</span>
              </div>
            ) : (
              <button
                key={area.id}
                type="button"
                data-editable-area
                data-edit-tab={area.tab}
                style={{
                  top: `${area.top}%`,
                  left: `${area.left}%`,
                  width: `${area.width}%`,
                  height: `${area.height}%`,
                }}
                title={`Editar ${area.label}`}
                onClick={() =>
                  props.onEditArea?.({
                    templateId: props.templateId,
                    tab: area.tab,
                    field: area.field,
                  })
                }
              >
                <span>{area.label}</span>
              </button>
            )
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WebsiteTemplateEditMap(props: {
  templateId: WebsiteTemplateId;
  onEditArea: (target: TemplateEditTarget) => void;
}) {
  return (
    <section data-edit-map>
      <div data-edit-map-header>
        <div>
          <strong>Mapa de campos editáveis</strong>
          <p>Clica numa caixa para abrir diretamente o campo correspondente.</p>
        </div>
        <span>{props.templateId.replace('template-', 'Template ')}</span>
      </div>
      <div data-edit-map-image>
        <StaticTemplateImage
          templateId={props.templateId}
          editable
          onEditArea={props.onEditArea}
        />
      </div>
      <div data-edit-map-legend>
        <span><i data-legend-text /> Texto / conteúdo</span>
        <span><i data-legend-image /> Imagem</span>
        <span><i data-legend-fixed /> Zona fixa</span>
      </div>
    </section>
  );
}

export function WebsiteTemplatePicker(props: {
  value: WebsiteTemplateId;
  onChange: (value: WebsiteTemplateId) => void;
}) {
  return (
    <div data-template-picker>
      {(Object.values(WEBSITE_TEMPLATE_REGISTRY) as Array<
        (typeof WEBSITE_TEMPLATE_REGISTRY)[WebsiteTemplateId]
      >).map((template, index) => {
        const selected = template.id === props.value;

        return (
          <article
            key={template.id}
            data-template-card
            data-selected={selected ? 'true' : 'false'}
          >
            <div data-template-card-inner>
              <StaticTemplateImage templateId={template.id} />

              <div data-template-card-body>
                <div data-template-card-head>
                  <div>
                    <div>
                      <span data-template-number>0{index + 1}</span>
                      {selected ? <span data-template-selected-label>Selecionado</span> : null}
                    </div>
                    <h3>{template.name}</h3>
                    <p>{template.description}</p>
                  </div>

                  <div data-template-check>{selected ? '✓' : '→'}</div>
                </div>

                <button
                  type="button"
                  data-template-select
                  onClick={() => props.onChange(template.id)}
                >
                  {selected ? 'Selecionado' : 'Selecionar'}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
