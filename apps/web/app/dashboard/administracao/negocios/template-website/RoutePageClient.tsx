'use client';

import { useEffect, useMemo, useState } from 'react';

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

const BUCKET = 'website-assets';

function safeSegment(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'asset';
}

function fileExtension(file: File) {
  const byType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return byType[file.type] || safeSegment(file.name.split('.').pop() || 'bin');
}

function storageObjectPathFromPublicUrl(value: string) {
  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index < 0) return '';
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return '';
  }
}

export default function WebsiteEditorPage() {
  const { selectedBusinessId, selectedBusinessName } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [website, setWebsite] = useState<LoadedWebsite | null>(null);

  const businessId = selectedBusinessId ? String(selectedBusinessId) : '';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
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
          .select('template_id, asset_base_url, content, status')
          .eq('business_id', businessId)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        if (!data) {
          setWebsite({
            templateId: 'template-1',
            assetBaseUrl: '/website-assets/template-1',
            status: 'draft',
          });
          return;
        }

        const parsed = SaveWebsiteTemplateSchema.safeParse({
          businessId,
          templateId: data.template_id,
          assetBaseUrl: data.asset_base_url || `/website-assets/${data.template_id || 'template-1'}`,
          content: data.content,
          status: data.status,
        });

        if (!parsed.success) {
          console.warn('Website Supabase inválido:', parsed.error);
          setLoadError('Os dados do Website no Supabase estavam inválidos. Foi carregado o template inicial.');
          setWebsite({
            templateId: 'template-1',
            assetBaseUrl: '/website-assets/template-1',
            status: 'draft',
          });
          return;
        }

        setWebsite({
          templateId: parsed.data.templateId,
          content: parsed.data.content,
          assetBaseUrl: parsed.data.assetBaseUrl,
          status: parsed.data.status,
        });
      } catch (error: any) {
        console.error('Erro ao carregar o Website:', error);
        if (!cancelled) {
          setLoadError(error?.message || 'Não foi possível carregar o Website do Supabase.');
          setWebsite({
            templateId: 'template-1',
            assetBaseUrl: '/website-assets/template-1',
            status: 'draft',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [businessId]);

  const editorKey = useMemo(
    () => `${businessId}:${website?.templateId ?? 'template-1'}`,
    [businessId, website?.templateId],
  );

  const saveWebsite = async (value: SaveWebsiteTemplateInput) => {
    const parsed = SaveWebsiteTemplateSchema.parse(value);

    const { error } = await (supabase as any)
      .from('business_websites')
      .upsert({
        business_id: businessId,
        template_id: parsed.templateId,
        asset_base_url: parsed.assetBaseUrl,
        content: parsed.content,
        status: parsed.status,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id' });

    if (error) throw new Error(error.message || 'Não foi possível guardar o Website.');

    setWebsite({
      templateId: parsed.templateId,
      content: parsed.content,
      assetBaseUrl: parsed.assetBaseUrl,
      status: parsed.status,
    });
    setSaveMessage(parsed.status === 'published'
      ? 'Website publicado. Já pode ser usado pela página do QR Code.'
      : 'Rascunho guardado no Supabase.');

    return { success: true };
  };

  const uploadImage = async (file: File, fieldName: string, currentValue?: string) => {
    if (!file.type.startsWith('image/')) throw new Error('Seleciona uma imagem válida.');
    if (file.size > 10 * 1024 * 1024) throw new Error('A imagem não pode ultrapassar 10 MB.');

    const path = `${safeSegment(businessId)}/${safeSegment(fieldName)}/${crypto.randomUUID()}.${fileExtension(file)}`;
    const { data, error } = await (supabase as any).storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (error) throw new Error(error.message || 'Não foi possível carregar a imagem.');

    const result = (supabase as any).storage.from(BUCKET).getPublicUrl(data.path);
    const publicUrl = result.data?.publicUrl as string | undefined;
    if (!publicUrl) throw new Error('Não foi possível obter o endereço público da imagem.');

    const oldPath = currentValue ? storageObjectPathFromPublicUrl(currentValue) : '';
    if (oldPath) void (supabase as any).storage.from(BUCKET).remove([oldPath]);
    return publicUrl;
  };

  const removeImage = async (currentValue: string) => {
    const path = storageObjectPathFromPublicUrl(currentValue);
    if (!path) return;
    const { error } = await (supabase as any).storage.from(BUCKET).remove([path]);
    if (error) throw new Error(error.message || 'Não foi possível remover a imagem.');
  };

  if (!businessId) {
    return (
      <TraceabilityShell
        eyebrow="Rastreabilidade · Website"
        title="Template do Website"
        description="Escolhe o aspeto da página que será aberta pelo QR Code."
      >
        <div className={traceStyles.notice}>Seleciona primeiro um negócio no Dashboard.</div>
      </TraceabilityShell>
    );
  }

  if (loading) {
    return (
      <TraceabilityShell eyebrow="Rastreabilidade · Website" title="Template do Website">
        <div className={traceStyles.cardPad}>A carregar o Website do Supabase…</div>
      </TraceabilityShell>
    );
  }

  const initial = website ?? {
    templateId: 'template-1' as const,
    assetBaseUrl: '/website-assets/template-1',
    status: 'draft' as const,
  };

  return (
    <TraceabilityShell
      eyebrow="Rastreabilidade · Website"
      title="Template do Website"
      description={selectedBusinessName
        ? `Configura a página pública de ${selectedBusinessName}.`
        : 'Configura a página pública do negócio selecionado.'}
    >
      {loadError ? <div className={traceStyles.error} style={{ marginBottom: 14 }}>{loadError}</div> : null}
      {saveMessage ? <div className={traceStyles.success} style={{ marginBottom: 14 }}>{saveMessage}</div> : null}
      <div className={traceStyles.notice} style={{ marginBottom: 14 }}>
        Supabase ativo: template, conteúdo, cores e imagens ficam associados ao negócio selecionado.
      </div>

      <WebsiteTemplateEditor
        key={editorKey}
        businessId={businessId}
        initialTemplateId={initial.templateId}
        initialContent={initial.content}
        initialAssetBaseUrl={initial.assetBaseUrl}
        initialStatus={initial.status}
        onSave={saveWebsite}
        onUploadImage={uploadImage}
        onRemoveImage={removeImage}
      />
    </TraceabilityShell>
  );
}
