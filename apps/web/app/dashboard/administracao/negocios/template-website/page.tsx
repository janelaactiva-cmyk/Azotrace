'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useBusiness } from '~/lib/business-context';
import { supabase } from '~/lib/supabase';

import { WebsiteTemplateEditor } from './_lib/components/website-template-editor';
import {
  SaveWebsiteTemplateSchema,
  type SaveWebsiteTemplateInput,
  type WebsiteTemplateContent,
  type WebsiteTemplateId,
} from './_lib/schema';
import Breadcrumb from '../_components/Breadcrumb';

type LoadedWebsite = {
  templateId: WebsiteTemplateId;
  content?: WebsiteTemplateContent;
  assetBaseUrl: string;
  status: 'draft' | 'published';
};

const STORAGE_BUCKET = 'website-assets';
const STORAGE_PUBLIC_MARKER = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

function defaultWebsite(): LoadedWebsite {
  return {
    templateId: 'template-1',
    assetBaseUrl: '/website-assets/template-1',
    status: 'draft',
  };
}

function safeStorageSegment(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'image';
}

function extensionForFile(file: File) {
  const byMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };

  return byMime[file.type] ?? safeStorageSegment(file.name.split('.').pop() ?? 'bin');
}

function storagePathFromPublicUrl(value: string) {
  const index = value.indexOf(STORAGE_PUBLIC_MARKER);
  if (index < 0) return null;

  const raw = value.slice(index + STORAGE_PUBLIC_MARKER.length).split('?')[0] ?? '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// ← Wrapper que adiciona o Breadcrumb sempre
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(16px, 3vw, 34px)' }}>
      <Breadcrumb
        items={[
          
          { label: 'Configurações', href: '/dashboard/administracao' },
          { label: 'Negócio', href: '/dashboard/administracao/negocios' },
          { label: 'Template do Website' },
        ]}
      />
      {children}
    </div>
  );
}

export default function WebsiteEditorPage() {
  const { selectedBusinessId, selectedBusinessName } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [website, setWebsite] = useState<LoadedWebsite | null>(null);

  const businessId = selectedBusinessId ? String(selectedBusinessId) : '';

  const loadWebsite = useCallback(async () => {
    if (!businessId) {
      setWebsite(null);
      setLoadError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    setSaveMessage('');

    try {
      const { data, error } = await (supabase as any)
        .from('business_websites')
        .select('business_id, template_id, asset_base_url, content, status')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setWebsite(defaultWebsite());
        return;
      }

      const parsed = SaveWebsiteTemplateSchema.safeParse({
        businessId,
        templateId: data.template_id,
        assetBaseUrl: data.asset_base_url ?? '',
        status: data.status,
        content: data.content,
      });

      if (!parsed.success) {
        console.warn('Website guardado no Supabase é inválido:', parsed.error);
        setLoadError('Os dados guardados no Supabase não correspondem ao formato atual do editor. Foi carregado o template inicial.');
        setWebsite(defaultWebsite());
        return;
      }

      setWebsite({
        templateId: parsed.data.templateId,
        content: parsed.data.content,
        assetBaseUrl: parsed.data.assetBaseUrl,
        status: parsed.data.status,
      });
    } catch (error) {
      console.error('Erro ao carregar website do Supabase:', error);
      const message = error instanceof Error ? error.message : String(error);
      setLoadError(
        message.includes('business_websites')
          ? 'Não foi possível aceder à tabela business_websites. Executa primeiro a migration SQL incluída no pacote.'
          : `Não foi possível carregar o website do Supabase: ${message}`,
      );
      setWebsite(defaultWebsite());
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadWebsite();
  }, [loadWebsite]);

  const editorKey = useMemo(
    () => `${businessId}:${website?.templateId ?? 'template-1'}`,
    [businessId, website?.templateId],
  );

  const saveToSupabase = async (value: SaveWebsiteTemplateInput) => {
    const parsed = SaveWebsiteTemplateSchema.parse(value);

    const { error } = await (supabase as any)
      .from('business_websites')
      .upsert(
        {
          business_id: parsed.businessId,
          template_id: parsed.templateId,
          asset_base_url: parsed.assetBaseUrl,
          content: parsed.content,
          status: parsed.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id' },
      );

    if (error) {
      console.error('Erro ao guardar website no Supabase:', error);
      throw new Error(error.message || 'Não foi possível guardar no Supabase.');
    }

    setWebsite({
      templateId: parsed.templateId,
      content: parsed.content,
      assetBaseUrl: parsed.assetBaseUrl,
      status: parsed.status,
    });

    setSaveMessage(
      parsed.status === 'published'
        ? 'Website publicado no Supabase.'
        : 'Rascunho guardado no Supabase.',
    );

    window.setTimeout(() => setSaveMessage(''), 3500);

    return { success: true };
  };

  const removeStoredImage = useCallback(async (currentValue: string) => {
    const storagePath = storagePathFromPublicUrl(currentValue);
    if (!storagePath) return;

    const { error } = await (supabase as any).storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error('Erro ao remover imagem do Storage:', error);
      throw new Error(error.message || 'Não foi possível remover a imagem do Storage.');
    }
  }, []);

  const uploadImage = useCallback(
    async (file: File, fieldName: string, currentValue?: string) => {
      if (!businessId) throw new Error('Seleciona primeiro uma empresa.');

      if (!file.type.startsWith('image/')) {
        throw new Error('Seleciona um ficheiro de imagem.');
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('A imagem não pode exceder 10 MB.');
      }

      const extension = extensionForFile(file);
      const fieldFolder = safeStorageSegment(fieldName);
      const objectPath = `${businessId}/${fieldFolder}/${crypto.randomUUID()}.${extension}`;

      const { data, error } = await (supabase as any).storage
        .from(STORAGE_BUCKET)
        .upload(objectPath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });

      if (error) {
        console.error('Erro no upload para Supabase Storage:', error);
        throw new Error(error.message || 'Não foi possível carregar a imagem para o Supabase.');
      }

      const publicResult = (supabase as any).storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

      const publicUrl = publicResult.data?.publicUrl as string | undefined;
      if (!publicUrl) {
        await (supabase as any).storage.from(STORAGE_BUCKET).remove([data.path]);
        throw new Error('O Supabase não devolveu o URL público da imagem.');
      }

      if (currentValue) {
        const oldPath = storagePathFromPublicUrl(currentValue);
        if (oldPath && oldPath !== data.path) {
          const { error: deleteError } = await (supabase as any).storage
            .from(STORAGE_BUCKET)
            .remove([oldPath]);

          if (deleteError) {
            console.warn('A imagem antiga não foi removida:', deleteError);
          }
        }
      }

      return publicUrl;
    },
    [businessId],
  );

  if (!businessId) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl py-10">
          <div className="overflow-hidden rounded-3xl border bg-background shadow-sm">
            <div className="bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent p-8 text-center sm:p-12">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl shadow-sm dark:bg-amber-950/50">🏢</div>
              <h1 className="mt-5 text-2xl font-semibold">Seleciona uma empresa</h1>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                O website é configurado por empresa. Volta ao Dashboard, escolhe o negócio que queres editar e regressa a esta página.
              </p>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-5">
          <div className="h-36 animate-pulse rounded-3xl bg-muted" />
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="h-44 animate-pulse rounded-2xl bg-muted" />
            <div className="h-44 animate-pulse rounded-2xl bg-muted" />
            <div className="h-44 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </PageShell>
    );
  }

  const initial = website ?? defaultWebsite();

  return (
    <PageShell>
      <div className="space-y-5 pb-10">
        {loadError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            {loadError}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="fixed right-5 top-5 z-[100] rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-sm font-medium text-emerald-700 shadow-xl backdrop-blur dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">
            ✓ {saveMessage}
          </div>
        ) : null}

        <WebsiteTemplateEditor
          key={editorKey}
          businessId={businessId}
          initialTemplateId={initial.templateId}
          initialContent={initial.content}
          initialAssetBaseUrl={initial.assetBaseUrl}
          initialStatus={initial.status}
          onSave={saveToSupabase}
          onUploadImage={uploadImage}
          onRemoveImage={removeStoredImage}
        />

        <div className="flex items-center justify-between gap-3 rounded-sm border border-slate-300 bg-white px-4 py-3 text-[11px] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <span>Supabase ativo — conteúdo e imagens são guardados por empresa.</span>
          <span className="hidden sm:inline">Empresa: {selectedBusinessName || businessId}</span>
        </div>
      </div>
    </PageShell>
  );
}