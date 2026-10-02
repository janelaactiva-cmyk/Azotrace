'use client';

import { useMemo, useTransition } from 'react';

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
import { WebsiteTemplatePicker } from './template-picker';

type Props = {
  businessId: string;
  initialTemplateId?: WebsiteTemplateId;
  initialContent?: WebsiteTemplateContent;
  initialAssetBaseUrl?: string;
  onSave: (value: SaveWebsiteTemplateInput) => Promise<unknown>;
};

function TextField(props: {
  form: UseFormReturn<SaveWebsiteTemplateInput>;
  name: any;
  label: string;
}) {
  return (
    <FormField
      control={props.form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function LongTextField(props: {
  form: UseFormReturn<SaveWebsiteTemplateInput>;
  name: any;
  label: string;
}) {
  return (
    <FormField
      control={props.form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <Textarea rows={4} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function WebsiteTemplateEditor(props: Props) {
  const [pending, startTransition] = useTransition();
  const initialTemplateId = props.initialTemplateId ?? 'template-1';

  const form = useForm<SaveWebsiteTemplateInput>({
    resolver: zodResolver(SaveWebsiteTemplateSchema),
    defaultValues: {
      businessId: props.businessId,
      templateId: initialTemplateId,
      assetBaseUrl: props.initialAssetBaseUrl ?? '',
      status: 'draft',
      content:
        props.initialContent ?? cloneTemplateDefaults(initialTemplateId),
    },
    mode: 'onBlur',
  });

  const templateId = form.watch('templateId');
  const content = form.watch('content');
  const assetBaseUrl = form.watch('assetBaseUrl');

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

  const changeTemplate = (next: WebsiteTemplateId) => {
    form.setValue('templateId', next, { shouldDirty: true });
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

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-6">
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Template</h2>
            <p className="text-muted-foreground text-sm">
              Escolhe um dos três HTML/CSS originais.
            </p>
          </div>

          <WebsiteTemplatePicker value={templateId} onChange={changeTemplate} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="max-h-[78vh] space-y-4 overflow-y-auto pr-2">
            <details open className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">Geral</summary>
              <div className="mt-4 space-y-4">
                <TextField form={form} name="content.seo.title" label="Título da página" />
                <TextField form={form} name="assetBaseUrl" label="Pasta/base dos assets" />
              </div>
            </details>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">Navegação</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField form={form} name="content.navigation.home" label="Início" />
                <TextField form={form} name="content.navigation.features" label="Características" />
                <TextField form={form} name="content.navigation.history" label="História" />
                <TextField form={form} name="content.navigation.production" label="Produção" />
                <TextField form={form} name="content.navigation.recipes" label="Receitas" />
                {templateId === 'template-2' && (
                  <TextField form={form} name="content.navigation.gallery" label="Galeria" />
                )}
                {templateId !== 'template-1' && (
                  <TextField form={form} name="content.navigation.contact" label="Contacto" />
                )}
              </div>
            </details>

            <details open className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">Hero</summary>
              <div className="mt-4 space-y-4">
                {isTemplate3 ? (
                  heroSlides.fields.map((field, index) => (
                    <div key={field.id} className="space-y-3 rounded-md border p-3">
                      <strong className="text-sm">Slide {index + 1}</strong>
                      <TextField form={form} name={`content.hero.slides.${index}.title`} label="Título" />
                      <LongTextField form={form} name={`content.hero.slides.${index}.subtitle`} label="Texto" />
                      <TextField form={form} name={`content.hero.slides.${index}.image`} label="Imagem" />
                    </div>
                  ))
                ) : (
                  <>
                    <TextField form={form} name="content.hero.title" label="Título" />
                    <LongTextField form={form} name="content.hero.subtitle" label="Subtítulo" />
                    <TextField form={form} name="content.hero.image" label="Imagem" />
                  </>
                )}
              </div>
            </details>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">Características</summary>
              <div className="mt-4 space-y-4">
                <TextField form={form} name="content.features.title" label="Título" />
                <TextField form={form} name="content.features.subtitle" label="Subtítulo" />
                {content.features.items.map((_, index) => (
                  <div key={index} className="space-y-3 rounded-md border p-3">
                    <TextField form={form} name={`content.features.items.${index}.title`} label={`Campo ${index + 1}`} />
                    {templateId === 'template-3' && (
                      <LongTextField form={form} name={`content.features.items.${index}.description`} label="Descrição" />
                    )}
                  </div>
                ))}
                {content.features.images.map((_, index) => (
                  <TextField key={`feature-image-${index}`} form={form} name={`content.features.images.${index}`} label={`Imagem ${index + 1}`} />
                ))}
              </div>
            </details>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">História</summary>
              <div className="mt-4 space-y-4">
                <TextField form={form} name="content.history.title" label="Título" />
                <TextField form={form} name="content.history.subtitle" label="Subtítulo" />
                <TextField form={form} name="content.history.heading" label="Destaque" />
                <LongTextField form={form} name="content.history.text" label="Texto" />
                <TextField form={form} name="content.history.image" label="Imagem" />
                {content.history.highlights.map((_, index) => (
                  <div key={index} className="space-y-3 rounded-md border p-3">
                    <TextField form={form} name={`content.history.highlights.${index}.title`} label={`Destaque ${index + 1}`} />
                    <LongTextField form={form} name={`content.history.highlights.${index}.description`} label="Descrição" />
                  </div>
                ))}
              </div>
            </details>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">Produção</summary>
              <div className="mt-4 space-y-4">
                <TextField form={form} name="content.production.title" label="Título" />
                <TextField form={form} name="content.production.subtitle" label="Subtítulo" />
                {production.fields.map((field, index) => (
                  <div key={field.id} className="space-y-3 rounded-md border p-3">
                    <strong className="text-sm">Item {index + 1}</strong>
                    <TextField form={form} name={`content.production.items.${index}.title`} label="Título" />
                    <LongTextField form={form} name={`content.production.items.${index}.description`} label="Descrição" />
                    <TextField form={form} name={`content.production.items.${index}.image`} label="Imagem" />
                  </div>
                ))}
              </div>
            </details>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">Receitas</summary>
              <div className="mt-4 space-y-4">
                <TextField form={form} name="content.recipes.title" label="Título" />
                <TextField form={form} name="content.recipes.subtitle" label="Subtítulo" />
                {recipes.fields.map((field, index) => (
                  <div key={field.id} className="space-y-3 rounded-md border p-3">
                    <strong className="text-sm">Receita {index + 1}</strong>
                    <TextField form={form} name={`content.recipes.items.${index}.title`} label="Título" />
                    <TextField form={form} name={`content.recipes.items.${index}.category`} label="Categoria" />
                    <LongTextField form={form} name={`content.recipes.items.${index}.description`} label="Descrição" />
                    <TextField form={form} name={`content.recipes.items.${index}.image`} label="Imagem" />
                  </div>
                ))}
              </div>
            </details>

            {templateId === 'template-2' && (
              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer font-semibold">Galeria</summary>
                <div className="mt-4 space-y-4">
                  <TextField form={form} name="content.gallery.title" label="Título" />
                  <TextField form={form} name="content.gallery.subtitle" label="Subtítulo" />
                  {content.gallery.images.map((_, index) => (
                    <TextField key={index} form={form} name={`content.gallery.images.${index}`} label={`Imagem ${index + 1}`} />
                  ))}
                </div>
              </details>
            )}

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">Contacto</summary>
              <div className="mt-4 space-y-4">
                <TextField form={form} name="content.contact.addressLine1" label="Morada" />
                <TextField form={form} name="content.contact.addressLine2" label="Localidade" />
                <TextField form={form} name="content.contact.phone" label="Telefone" />
                <TextField form={form} name="content.contact.email" label="Email" />
                <TextField form={form} name="content.contact.hoursWeek" label="Horário semanal" />
                <TextField form={form} name="content.contact.hoursSunday" label="Domingo" />
              </div>
            </details>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">Rodapé</summary>
              <div className="mt-4 space-y-4">
                <TextField form={form} name="content.footer.brand" label="Marca" />
                <TextField form={form} name="content.footer.copyright" label="Copyright" />
              </div>
            </details>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">Cores</summary>
              <div className="mt-4 grid grid-cols-2 gap-3">
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
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input type="color" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </details>
          </div>

          <div className="min-w-0">
            <WebsiteTemplatePreview
              templateId={templateId}
              content={previewContent}
              assetBaseUrl={assetBaseUrl}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              form.setValue('status', 'draft');
              void submit();
            }}
          >
            Guardar rascunho
          </Button>

          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              form.setValue('status', 'published');
              void submit();
            }}
          >
            {pending ? 'A guardar…' : 'Publicar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
