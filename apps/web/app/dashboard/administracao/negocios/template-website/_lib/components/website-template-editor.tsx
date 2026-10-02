'use client';

import { useMemo, useRef, useState, useTransition, type ChangeEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type UseFormReturn } from 'react-hook-form';

import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';

import {
  SaveWebsiteTemplateSchema,
  type SaveWebsiteTemplateInput,
  type WebsiteTemplateContent,
  type WebsiteTemplateId,
} from '../schema';
import { cloneTemplateDefaults } from '../templates/defaults';
import { WebsiteTemplatePreview } from './template-preview';
import {
  WebsiteTemplateEditMap,
  WebsiteTemplatePicker,
  type TemplateEditTarget,
} from './template-picker';
import styles from './website-template-editor.module.css';

type Props = {
  businessId: string;
  initialTemplateId?: WebsiteTemplateId;
  initialContent?: WebsiteTemplateContent;
  initialAssetBaseUrl?: string;
  initialStatus?: 'draft' | 'published';
  onSave: (value: SaveWebsiteTemplateInput) => Promise<unknown>;
  onUploadImage?: (file: File, fieldName: string, currentValue?: string) => Promise<string>;
  onRemoveImage?: (currentValue: string) => Promise<void>;
};

type EditorTab = 'template' | 'content' | 'images' | 'style' | 'publish';

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: 'template', label: 'Template' },
  { id: 'content', label: 'Conteúdo' },
  { id: 'images', label: 'Imagens' },
  { id: 'style', label: 'Cores e estilo' },
  { id: 'publish', label: 'Publicação' },
];

function TextField(props: {
  form: UseFormReturn<SaveWebsiteTemplateInput>;
  name: any;
  label: string;
  placeholder?: string;
}) {
  return (
    <div data-field-name={String(props.name)}>
      <FormField
        control={props.form.control}
        name={props.name}
        render={({ field }) => (
          <FormItem>
          <FormLabel className="text-xs font-semibold">{props.label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ''}
              placeholder={props.placeholder}
              className="h-11 rounded-sm border-slate-200 bg-white shadow-sm focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </FormControl>
          <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}


function resolveEditorImageSrc(value: unknown, assetBaseUrl: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^(?:https?:|data:|blob:|\/)/i.test(raw)) return raw;

  const root = assetBaseUrl.replace(/\/$/, '');
  const clean = raw.replace(/^\.\//, '').replace(/^\.\.\//, '');
  return root ? `${root}/${clean}` : clean;
}

async function optimizeImageForLocalStorage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Seleciona um ficheiro de imagem.');
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error('A imagem não pode ultrapassar 12 MB.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível processar a imagem.');

    context.drawImage(image, 0, 0, width, height);

    let dataUrl = canvas.toDataURL('image/webp', 0.76);

    if (dataUrl.length > 550_000) {
      const smallerScale = Math.min(1, 900 / Math.max(width, height));
      const smaller = document.createElement('canvas');
      smaller.width = Math.max(1, Math.round(width * smallerScale));
      smaller.height = Math.max(1, Math.round(height * smallerScale));
      const smallerContext = smaller.getContext('2d');
      if (!smallerContext) throw new Error('Não foi possível processar a imagem.');
      smallerContext.drawImage(canvas, 0, 0, smaller.width, smaller.height);
      dataUrl = smaller.toDataURL('image/webp', 0.68);

      if (dataUrl.length > 320_000) {
        const compactScale = Math.min(1, 700 / Math.max(smaller.width, smaller.height));
        const compact = document.createElement('canvas');
        compact.width = Math.max(1, Math.round(smaller.width * compactScale));
        compact.height = Math.max(1, Math.round(smaller.height * compactScale));
        const compactContext = compact.getContext('2d');
        if (!compactContext) throw new Error('Não foi possível processar a imagem.');
        compactContext.drawImage(smaller, 0, 0, compact.width, compact.height);
        dataUrl = compact.toDataURL('image/webp', 0.58);
      }
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function ImageUploadField(props: {
  form: UseFormReturn<SaveWebsiteTemplateInput>;
  name: any;
  label: string;
  assetBaseUrl: string;
  onUploadImage?: (file: File, fieldName: string, currentValue?: string) => Promise<string>;
  onRemoveImage?: (currentValue: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [processing, setProcessing] = useState(false);

  return (
    <div data-field-name={String(props.name)}>
      <FormField
        control={props.form.control}
        name={props.name}
        render={({ field }) => {
          const previewSrc = resolveEditorImageSrc(field.value, props.assetBaseUrl);
          const hasImage = Boolean(String(field.value ?? '').trim());

          const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;

            setUploadError('');
            setProcessing(true);

            try {
              const currentValue = String(field.value ?? '').trim();
              const value = props.onUploadImage
                ? await props.onUploadImage(file, String(props.name), currentValue || undefined)
                : await optimizeImageForLocalStorage(file);
              field.onChange(value);
              props.form.setValue(props.name, value, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            } catch (error) {
              setUploadError(error instanceof Error ? error.message : 'Não foi possível carregar a imagem.');
            } finally {
              setProcessing(false);
            }
          };

          return (
            <FormItem>
              <FormLabel className="text-xs font-semibold">{props.label}</FormLabel>
              <FormControl>
                <div data-image-upload>
                  {previewSrc ? (
                    <div data-image-upload-preview>
                      <img src={previewSrc} alt={`Pré-visualização: ${props.label}`} />
                    </div>
                  ) : (
                    <div data-image-upload-empty>Sem imagem</div>
                  )}

                  <div data-image-upload-actions>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFile}
                      data-image-file-input
                    />
                    <button
                      type="button"
                      data-image-upload-button
                      disabled={processing}
                      onClick={() => inputRef.current?.click()}
                    >
                      {processing ? 'A processar…' : hasImage ? 'Substituir imagem' : 'Carregar imagem'}
                    </button>
                    {hasImage ? (
                      <button
                        type="button"
                        data-image-remove-button
                        onClick={async () => {
                          const currentValue = String(field.value ?? '').trim();
                          setUploadError('');
                          setProcessing(true);
                          try {
                            if (currentValue && props.onRemoveImage) {
                              await props.onRemoveImage(currentValue);
                            }
                            field.onChange('');
                            props.form.setValue(props.name, '', {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            });
                          } catch (error) {
                            setUploadError(error instanceof Error ? error.message : 'Não foi possível remover a imagem.');
                          } finally {
                            setProcessing(false);
                          }
                        }}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>

                  <div data-image-upload-help>
                    JPG, PNG ou WebP. A imagem é guardada no Supabase Storage do negócio.
                  </div>
                  {uploadError ? <div data-image-upload-error>{uploadError}</div> : null}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
}

function LongTextField(props: {
  form: UseFormReturn<SaveWebsiteTemplateInput>;
  name: any;
  label: string;
  placeholder?: string;
}) {
  return (
    <div data-field-name={String(props.name)}>
      <FormField
        control={props.form.control}
        name={props.name}
        render={({ field }) => (
          <FormItem>
          <FormLabel className="text-xs font-semibold">{props.label}</FormLabel>
          <FormControl>
            <Textarea
              rows={4}
              {...field}
              value={field.value ?? ''}
              placeholder={props.placeholder}
              className="resize-y rounded-sm border-slate-200 bg-white leading-6 shadow-sm focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </FormControl>
          <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function EditorSection(props: {
  title: string;
  description: string;
  children: ReactNode;
  open?: boolean;
  badge?: string;
}) {
  return (
    <details
      data-editor-section
      open={props.open}
      className="group overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div data-editor-section-title-row className="flex items-center gap-2">
            <span data-editor-section-title className="text-sm font-semibold text-slate-900 dark:text-slate-100">{props.title}</span>
            {props.badge ? (
              <span data-editor-section-badge className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                {props.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] leading-4 text-slate-500 dark:text-slate-400">{props.description}</p>
        </div>
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
      </summary>

      <div data-editor-section-body className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30">
        {props.children}
      </div>
    </details>
  );
}

function ItemCard(props: { title: string; children: ReactNode }) {
  return (
    <div data-item-card className="space-y-3 rounded-sm border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div data-item-card-title className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{props.title}</div>
      {props.children}
    </div>
  );
}

function Workspace(props: { children: ReactNode; preview: ReactNode }) {
  return (
    <div data-workspace className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-3">{props.children}</aside>
      <div className="min-w-0 xl:sticky xl:top-4">{props.preview}</div>
    </div>
  );
}

export function WebsiteTemplateEditor(props: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EditorTab>('template');
  const [pending, startTransition] = useTransition();
  const initialTemplateId = props.initialTemplateId ?? 'template-1';

  const form = useForm<SaveWebsiteTemplateInput>({
    resolver: zodResolver(SaveWebsiteTemplateSchema),
    defaultValues: {
      businessId: props.businessId,
      templateId: initialTemplateId,
      assetBaseUrl: props.initialAssetBaseUrl ?? '',
      status: props.initialStatus ?? 'draft',
      content: props.initialContent ?? cloneTemplateDefaults(initialTemplateId),
    },
    mode: 'onBlur',
  });

  const templateId = form.watch('templateId');
  const content = form.watch('content');
  const assetBaseUrl = form.watch('assetBaseUrl');
  const status = form.watch('status');

  const production = useFieldArray({
    control: form.control,
    name: 'content.production.items',
  });

  const recipes = useFieldArray({
    control: form.control,
    name: 'content.recipes.items',
  });

  const heroSlides = useFieldArray({
    control: form.control,
    name: 'content.hero.slides',
  });

  const isTemplate3 = templateId === 'template-3';
  const previewContent = useMemo(() => content, [content]);

  const preview = (
    <WebsiteTemplatePreview
      templateId={templateId}
      content={previewContent}
      assetBaseUrl={assetBaseUrl}
    />
  );

  const changeTemplate = (next: WebsiteTemplateId) => {
    if (next === templateId) return;

    form.setValue('templateId', next, { shouldDirty: true });
    form.setValue('assetBaseUrl', `/website-assets/${next}`, { shouldDirty: true });
    form.setValue('content', cloneTemplateDefaults(next), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const submit = form.handleSubmit((value) => {
    startTransition(async () => {
      await props.onSave(value);
    });
  });

  const saveAs = (nextStatus: 'draft' | 'published') => {
    form.setValue('status', nextStatus, { shouldDirty: true });
    void submit();
  };

  const openEditTarget = (target: TemplateEditTarget) => {
    if (target.templateId !== templateId) {
      changeTemplate(target.templateId);
    }

    setActiveTab(target.tab);

    if (!target.field) return;

    window.setTimeout(() => {
      const root = document.querySelector(`[data-field-name="${target.field}"]`);
      if (!(root instanceof HTMLElement)) return;

      const details = root.closest('details');
      if (details instanceof HTMLDetailsElement) details.open = true;

      root.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const control = root.querySelector('input, textarea, select, button');
      if (control instanceof HTMLElement) control.focus();
    }, 120);
  };

  return (
    <Form {...form}>
      <form onSubmit={submit} className={styles.editorRoot}>
        <div data-editor-shell>
          <header data-editor-header>
            <div data-editor-title>
              <h1 className="text-[24px] font-bold text-slate-950 dark:text-white">
                Empresa - Template do website
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Escolhe o template e preenche os dados do website da empresa.
              </p>
            </div>

            <div data-editor-meta>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Empresa selecionada</div>
              <div className="mt-1">Editor do website com separadores no topo.</div>
            </div>

            <div data-editor-actions>
              <Button
                type="button"
                disabled={pending}
                onClick={() => saveAs('draft')}
                className="h-9 min-w-24 rounded-sm bg-[#2fa8df] px-4 text-sm font-semibold text-white hover:bg-[#228fc0]"
              >
                {pending ? 'A guardar…' : 'Guardar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-9 min-w-24 rounded-sm border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                Voltar
              </Button>
            </div>
          </header>

          <nav data-editor-tabs-wrap aria-label="Secções do editor">
            <div data-editor-tabs>
              {TABS.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    data-editor-tab
                    data-active={active ? 'true' : 'false'}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative shrink-0 rounded-t-sm border border-transparent border-b-0 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide transition-colors ${
                      active
                        ? 'border-slate-300 bg-white text-slate-900 dark:bg-slate-950'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {tab.label}
                    
                  </button>
                );
              })}
            </div>
          </nav>

          <main data-editor-main>
            {activeTab === 'template' ? (
              <section>
                <div data-section-heading>
                  <div>
                    <h2 className="text-xl font-bold text-slate-950 dark:text-white">Escolher template</h2>
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                      Escolha um dos templates disponíveis para o website.
                    </p>
                  </div>
                  <span data-status-badge>
                    {status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>

                <WebsiteTemplatePicker value={templateId} onChange={changeTemplate} />
              </section>
            ) : null}

            {activeTab === 'content' ? (
              <section>
                <div data-section-heading>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Conteúdo</h2>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    Usa o mapa do template para localizar os campos editáveis e altera o conteúdo ao lado.
                  </p>
                </div>

                <div data-content-layout>
                  <WebsiteTemplateEditMap
                    templateId={templateId}
                    onEditArea={openEditTarget}
                  />

                  <div data-content-fields>
                  <EditorSection title="Geral" description="Título da página e descrição para motores de pesquisa." open>
                    <div className="space-y-4">
                      <TextField form={form} name="content.seo.title" label="Título da página" placeholder="Nome apresentado no separador do browser" />
                      <LongTextField form={form} name="content.seo.description" label="Descrição SEO" placeholder="Descrição curta para motores de pesquisa" />
                    </div>
                  </EditorSection>

                  <EditorSection title="Navegação" description="Textos apresentados no menu principal." open>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                      <TextField form={form} name="content.navigation.home" label="Início" />
                      <TextField form={form} name="content.navigation.features" label="Características" />
                      <TextField form={form} name="content.navigation.history" label="História" />
                      <TextField form={form} name="content.navigation.production" label="Produção" />
                      <TextField form={form} name="content.navigation.recipes" label="Receitas" />
                      {templateId === 'template-2' ? <TextField form={form} name="content.navigation.gallery" label="Galeria" /> : null}
                      {templateId !== 'template-1' ? <TextField form={form} name="content.navigation.contact" label="Contacto" /> : null}
                    </div>
                  </EditorSection>

                  <EditorSection
                    title="Hero"
                    description={isTemplate3 ? 'Textos dos slides de abertura.' : 'Título e subtítulo principal do website.'}
                    badge={isTemplate3 ? `${heroSlides.fields.length} slides` : undefined}
                  >
                    <div className="space-y-3">
                      {isTemplate3 ? (
                        heroSlides.fields.map((field, index) => (
                          <ItemCard key={field.id} title={`Slide ${index + 1}`}>
                            <TextField form={form} name={`content.hero.slides.${index}.title`} label="Título" />
                            <LongTextField form={form} name={`content.hero.slides.${index}.subtitle`} label="Texto" />
                          </ItemCard>
                        ))
                      ) : (
                        <div className="space-y-4">
                          <TextField form={form} name="content.hero.title" label="Título" />
                          <LongTextField form={form} name="content.hero.subtitle" label="Subtítulo" />
                        </div>
                      )}
                    </div>
                  </EditorSection>

                  <EditorSection title="Características" description="Informação principal sobre o produto ou produção." badge={`${content.features.items.length} campos`}>
                    <div className="space-y-4">
                      <TextField form={form} name="content.features.title" label="Título" />
                      <TextField form={form} name="content.features.subtitle" label="Subtítulo" />
                      {content.features.items.map((_, index) => (
                        <ItemCard key={index} title={`Característica ${index + 1}`}>
                          <TextField form={form} name={`content.features.items.${index}.title`} label="Título" />
                          {templateId === 'template-3' ? (
                            <LongTextField form={form} name={`content.features.items.${index}.description`} label="Descrição" />
                          ) : null}
                        </ItemCard>
                      ))}
                    </div>
                  </EditorSection>

                  <EditorSection title="História" description="Conta a origem e os destaques da empresa." badge={`${content.history.highlights.length} destaques`}>
                    <div className="space-y-4">
                      <TextField form={form} name="content.history.title" label="Título" />
                      <TextField form={form} name="content.history.subtitle" label="Subtítulo" />
                      <TextField form={form} name="content.history.heading" label="Destaque" />
                      <LongTextField form={form} name="content.history.text" label="Texto" />
                      {content.history.highlights.map((_, index) => (
                        <ItemCard key={index} title={`Destaque ${index + 1}`}>
                          <TextField form={form} name={`content.history.highlights.${index}.title`} label="Título" />
                          <LongTextField form={form} name={`content.history.highlights.${index}.description`} label="Descrição" />
                        </ItemCard>
                      ))}
                    </div>
                  </EditorSection>

                  <EditorSection title="Produção" description="Fases, produtos ou momentos da produção." badge={`${production.fields.length} itens`}>
                    <div className="space-y-4">
                      <TextField form={form} name="content.production.title" label="Título" />
                      <TextField form={form} name="content.production.subtitle" label="Subtítulo" />
                      {production.fields.map((field, index) => (
                        <ItemCard key={field.id} title={`Item ${index + 1}`}>
                          <TextField form={form} name={`content.production.items.${index}.title`} label="Título" />
                          <LongTextField form={form} name={`content.production.items.${index}.description`} label="Descrição" />
                        </ItemCard>
                      ))}
                    </div>
                  </EditorSection>

                  <EditorSection title="Receitas" description="Receitas ou sugestões associadas ao produto." badge={`${recipes.fields.length} receitas`}>
                    <div className="space-y-4">
                      <TextField form={form} name="content.recipes.title" label="Título" />
                      <TextField form={form} name="content.recipes.subtitle" label="Subtítulo" />
                      {recipes.fields.map((field, index) => (
                        <ItemCard key={field.id} title={`Receita ${index + 1}`}>
                          <TextField form={form} name={`content.recipes.items.${index}.title`} label="Título" />
                          <TextField form={form} name={`content.recipes.items.${index}.category`} label="Categoria" />
                          <LongTextField form={form} name={`content.recipes.items.${index}.description`} label="Descrição" />
                        </ItemCard>
                      ))}
                    </div>
                  </EditorSection>

                  {templateId === 'template-2' ? (
                    <EditorSection title="Galeria" description="Título e subtítulo da galeria do Template 2.">
                      <div className="space-y-4">
                        <TextField form={form} name="content.gallery.title" label="Título" />
                        <TextField form={form} name="content.gallery.subtitle" label="Subtítulo" />
                      </div>
                    </EditorSection>
                  ) : null}

                  <EditorSection title="Contacto" description="Dados de contacto e horários.">
                    <div className="space-y-4">
                      <TextField form={form} name="content.contact.addressLine1" label="Morada" />
                      <TextField form={form} name="content.contact.addressLine2" label="Localidade" />
                      <TextField form={form} name="content.contact.phone" label="Telefone" />
                      <TextField form={form} name="content.contact.email" label="Email" />
                      <TextField form={form} name="content.contact.hoursWeek" label="Horário semanal" />
                      <TextField form={form} name="content.contact.hoursSunday" label="Domingo" />
                    </div>
                  </EditorSection>

                  <EditorSection title="Rodapé" description="Marca e texto legal no final da página.">
                    <div className="space-y-4">
                      <TextField form={form} name="content.footer.brand" label="Marca" />
                      <TextField form={form} name="content.footer.copyright" label="Copyright" />
                    </div>
                  </EditorSection>
                                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'images' ? (
              <section>
                <div data-section-heading>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Imagens</h2>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    Define as imagens utilizadas nas diferentes áreas do template.
                  </p>
                </div>

                <div data-fields-only>
                  <EditorSection title="Pasta dos ficheiros" description="Caminho base onde estão as imagens e outros assets." open>
                    <TextField form={form} name="assetBaseUrl" label="Pasta/base dos assets" placeholder={`/website-assets/${templateId}`} />
                  </EditorSection>

                  <EditorSection title="Hero" description={isTemplate3 ? 'Imagens dos slides principais.' : 'Imagem principal do website.'} open>
                    <div className="space-y-4">
                      {isTemplate3 ? (
                        heroSlides.fields.map((field, index) => (
                          <ImageUploadField key={field.id} form={form} name={`content.hero.slides.${index}.image`} label={`Imagem do slide ${index + 1}`} assetBaseUrl={assetBaseUrl} onUploadImage={props.onUploadImage} onRemoveImage={props.onRemoveImage} />
                        ))
                      ) : (
                        <ImageUploadField form={form} name="content.hero.image" label="Imagem principal" assetBaseUrl={assetBaseUrl} onUploadImage={props.onUploadImage} onRemoveImage={props.onRemoveImage} />
                      )}
                    </div>
                  </EditorSection>

                  <div data-fixed-graph-notice>
                    <strong>Gráficos de produção</strong>
                    <span>Esta zona existe nos 3 templates e é fixa. Os gráficos não são editáveis pelo utilizador.</span>
                  </div>

                  <EditorSection title="História" description="Imagem utilizada na história da empresa.">
                    <ImageUploadField form={form} name="content.history.image" label="Imagem da história" assetBaseUrl={assetBaseUrl} onUploadImage={props.onUploadImage} onRemoveImage={props.onRemoveImage} />
                  </EditorSection>

                  <EditorSection title="Produção" description="Imagens dos itens/fases da produção." badge={`${production.fields.length} imagens`}>
                    <div className="space-y-4">
                      {production.fields.map((field, index) => (
                        <ImageUploadField key={field.id} form={form} name={`content.production.items.${index}.image`} label={`Imagem do item ${index + 1}`} assetBaseUrl={assetBaseUrl} onUploadImage={props.onUploadImage} onRemoveImage={props.onRemoveImage} />
                      ))}
                    </div>
                  </EditorSection>

                  <EditorSection title="Receitas" description="Imagens apresentadas nas receitas." badge={`${recipes.fields.length} imagens`}>
                    <div className="space-y-4">
                      {recipes.fields.map((field, index) => (
                        <ImageUploadField key={field.id} form={form} name={`content.recipes.items.${index}.image`} label={`Imagem da receita ${index + 1}`} assetBaseUrl={assetBaseUrl} onUploadImage={props.onUploadImage} onRemoveImage={props.onRemoveImage} />
                      ))}
                    </div>
                  </EditorSection>

                  {templateId === 'template-2' ? (
                    <EditorSection title="Galeria" description="Imagens adicionais apresentadas no Template 2." badge={`${content.gallery.images.length} imagens`}>
                      <div className="space-y-4">
                        {content.gallery.images.map((_, index) => (
                          <ImageUploadField key={index} form={form} name={`content.gallery.images.${index}`} label={`Imagem ${index + 1}`} assetBaseUrl={assetBaseUrl} onUploadImage={props.onUploadImage} onRemoveImage={props.onRemoveImage} />
                        ))}
                      </div>
                    </EditorSection>
                  ) : null}
                </div>
              </section>
            ) : null}

            {activeTab === 'style' ? (
              <section>
                <div data-section-heading>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Cores e estilo</h2>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    Personaliza a identidade visual sem editar diretamente o CSS.
                  </p>
                </div>

                <div data-fields-only>
                  <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Paleta de cores</h3>
                      <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">As alterações serão verificadas no preview final no separador Publicação.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      {[
                        ['primaryColor', 'Primária'],
                        ['secondaryColor', 'Secundária'],
                        ['accentColor', 'Destaque'],
                        ['backgroundColor', 'Fundo'],
                        ['textColor', 'Texto'],
                        ['headingColor', 'Títulos'],
                        ['surfaceColor', 'Superfície'],
                      ].map(([key, label]) => (
                        <FormField
                          key={key}
                          control={form.control}
                          name={`content.theme.${key}` as any}
                          render={({ field }) => (
                            <FormItem data-field-name={`content.theme.${key}`}>
                              <FormLabel className="text-xs font-semibold">{label}</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                                  <Input type="color" {...field} className="h-8 w-10 cursor-pointer border-0 p-0" />
                                  <span className="truncate font-mono text-[12px] text-slate-500 dark:text-slate-400">{field.value}</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'publish' ? (
              <section>
                <div data-section-heading>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Publicação</h2>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    Revê o website e escolhe se queres guardar como rascunho ou publicar.
                  </p>
                </div>

                <Workspace preview={preview}>
                  <div className="space-y-4 rounded-sm border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Estado atual</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${status === 'published' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {status === 'published' ? 'Publicado' : 'Rascunho'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Template</div>
                      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {templateId.replace('template-', 'Template ')}
                      </div>
                    </div>

                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Alterações</div>
                      <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        {form.formState.isDirty ? 'Existem alterações por guardar.' : 'Tudo guardado.'}
                      </div>
                    </div>

                    <div data-publish-actions className="grid gap-2 pt-2 sm:grid-cols-2 xl:grid-cols-1">
                      <Button type="button" variant="outline" disabled={pending} onClick={() => saveAs('draft')}>
                        Guardar rascunho
                      </Button>
                      <Button type="button" disabled={pending} onClick={() => saveAs('published')} className="bg-[#2fa8df] text-white hover:bg-[#228fc0]">
                        {pending ? 'A guardar…' : 'Publicar website'}
                      </Button>
                    </div>
                  </div>
                </Workspace>
              </section>
            ) : null}
          </main>

          <footer data-editor-footer>
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {form.formState.isDirty ? 'Existem alterações por guardar' : 'Website atualizado'}
              </div>
              <div className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                {status === 'published' ? 'Estado atual: publicado' : 'Estado atual: rascunho'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => saveAs('draft')}>
                Guardar rascunho
              </Button>
              <Button type="button" disabled={pending} onClick={() => saveAs('published')} className="bg-[#2fa8df] text-white hover:bg-[#228fc0]">
                {pending ? 'A guardar…' : 'Publicar website'}
              </Button>
            </div>
          </footer>
        </div>
      </form>
    </Form>
  );
}
