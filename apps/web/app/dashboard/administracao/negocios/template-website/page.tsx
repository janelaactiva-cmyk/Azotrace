'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useBusiness } from '~/lib/business-context';
import { supabase } from '~/lib/supabase';

import { TraceabilityShell } from '../../../_components/TraceabilityShell';
import traceStyles from '../../../_components/traceability.module.css';
import { WebsiteTemplateEditor } from './_lib/components/website-template-editor';
import {
  SaveWebsiteTemplateSchema,
  type SaveWebsiteTemplateInput,
  type WebsiteTemplateContent,
  type WebsiteTemplateId,
} from './_lib/schema';

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

function safeSegment(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'image';
}

function extensionForFile(file: File) {
  const known: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return known[file.type] ?? safeSegment(file.name.split('.').pop() ?? 'bin');
}

function storagePathFromPublicUrl(value: string) {
  const index = value.indexOf(STORAGE_PUBLIC_MARKER);
  if (index < 0) return null;
  const raw = value.slice(index + STORAGE_PUBLIC_MARKER.length).split('?')[0] ?? '';
  try { return decodeURIComponent(raw); } catch { return raw; }
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
        console.warn('Website guardado no Supabase inválido:', parsed.error);
        setLoadError('Os dados do Website guardados no Supabase não correspondem ao formato atual. Foi carregado o template inicial.');
        setWebsite(defaultWebsite());
        return;
      }

      setWebsite({
        templateId: parsed.data.templateId,
        content: parsed.data.content,
        assetBaseUrl: parsed.data.assetBaseUrl,
        status: parsed.data.status,
      });
    } catch (cause) {
      console.error(cause);
      setLoadError(cause instanceof Error ? cause.message : 'Não foi possível carregar o Website do Supabase.');
      setWebsite(defaultWebsite());
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { void loadWebsite(); }, [loadWebsite]);

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

    if (error) throw new Error(error.message || 'Não foi possível guardar o Website no Supabase.');

    setWebsite({
      templateId: parsed.templateId,
      content: parsed.content,
      assetBaseUrl: parsed.assetBaseUrl,
      status: parsed.status,
    });
    setSaveMessage(parsed.status === 'published' ? 'Website publicado com sucesso.' : 'Rascunho guardado com sucesso.');
    window.setTimeout(() => setSaveMessage(''), 3500);
    return { success: true };
  };

  const removeStoredImage = useCallback(async (currentValue: string) => {
    const path = storagePathFromPublicUrl(currentValue);
    if (!path) return;
    const { error } = await (supabase as any).storage.from(STORAGE_BUCKET).remove([path]);
    if (error) throw new Error(error.message || 'Não foi possível remover a imagem.');
  }, []);

  const uploadImage = useCallback(async (file: File, fieldName: string, currentValue?: string) => {
    if (!businessId) throw new Error('Seleciona primeiro um negócio.');
    if (!file.type.startsWith('image/')) throw new Error('Seleciona um ficheiro de imagem.');
    if (file.size > 10 * 1024 * 1024) throw new Error('A imagem não pode ultrapassar 10 MB.');

    const objectPath = `${safeSegment(businessId)}/${safeSegment(fieldName)}/${crypto.randomUUID()}.${extensionForFile(file)}`;
    const { data, error } = await (supabase as any).storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
    if (error) throw new Error(error.message || 'Não foi possível carregar a imagem.');

    const publicUrl = (supabase as any).storage.from(STORAGE_BUCKET).getPublicUrl(data.path).data?.publicUrl as string | undefined;
    if (!publicUrl) throw new Error('O Supabase não devolveu o endereço público da imagem.');

    if (currentValue) {
      const oldPath = storagePathFromPublicUrl(currentValue);
      if (oldPath && oldPath !== data.path) {
        const { error: removeError } = await (supabase as any).storage.from(STORAGE_BUCKET).remove([oldPath]);
        if (removeError) console.warn('A imagem antiga não foi removida:', removeError);
      }
    }

    return publicUrl;
  }, [businessId]);

  if (!businessId) {
    return (
      <TraceabilityShell eyebrow="Rastreabilidade · Website" title="Template do Website">
        <div className={traceStyles.notice}>Seleciona primeiro um negócio no Dashboard.</div>
      </TraceabilityShell>
    );
  }

  if (loading) {
    return (
      <TraceabilityShell eyebrow="Rastreabilidade · Website" title="Template do Website">
        <div className={traceStyles.cardPad}>A carregar o Website…</div>
      </TraceabilityShell>
    );
  }

  const initial = website ?? defaultWebsite();

  return (
    <TraceabilityShell
      eyebrow="Rastreabilidade · Website"
      title="Template do Website"
      description={selectedBusinessName ? `Configura a página pública de ${selectedBusinessName}.` : 'Configura a página pública do negócio selecionado.'}
    >
      {loadError ? <div className={traceStyles.error} style={{ marginBottom: 14 }}>{loadError}</div> : null}
      {saveMessage ? <div className={traceStyles.success} style={{ marginBottom: 14 }}>{saveMessage}</div> : null}
      <div className={traceStyles.notice} style={{ marginBottom: 14 }}>
        Supabase ativo: template, conteúdo, cores e imagens ficam guardados por negócio.
      </div>

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
    </TraceabilityShell>
  );
}
