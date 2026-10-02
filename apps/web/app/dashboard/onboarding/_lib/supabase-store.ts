'use client';

import { supabase } from '~/lib/supabase';

import {
  cacheProducerState,
  listLocalBusinesses,
  normalizeProducerState,
  type LocalBusinessSummary,
  type ProducerLocalState,
} from './local-store';

const PRODUCER_BUCKET = 'producer-assets';

function safeSegment(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'item';
}

function extensionForFile(file: File) {
  const known: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return known[file.type] ?? safeSegment(file.name.split('.').pop() || 'bin');
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Não foi possível validar a sessão: ${error.message}`);
  const userId = data.session?.user?.id;
  if (!userId) throw new Error('A sessão terminou. Inicia sessão novamente para guardar os dados.');
  return userId;
}

export async function loadRemoteProducerState(businessId: string): Promise<ProducerLocalState | null> {
  if (!businessId) return null;
  const { data, error } = await (supabase as any)
    .from('producer_workspaces')
    .select('state')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Não foi possível carregar o negócio do Supabase.');
  if (!data?.state) return null;

  const normalized = normalizeProducerState(data.state);
  if (normalized) cacheProducerState(normalized, { makeCurrent: false, emit: false });
  return normalized;
}

export async function listRemoteProducerStates(): Promise<ProducerLocalState[]> {
  const { data, error } = await (supabase as any)
    .from('producer_workspaces')
    .select('state, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message || 'Não foi possível carregar os negócios do Supabase.');

  const rows = (data ?? [])
    .map((row: any) => normalizeProducerState(row.state))
    .filter((row: ProducerLocalState | null): row is ProducerLocalState => Boolean(row));

  rows.forEach((state) => cacheProducerState(state, { makeCurrent: false, emit: false }));
  return rows;
}

export function summaryFromRemoteState(state: ProducerLocalState): LocalBusinessSummary {
  return {
    ...state.business,
    completed: state.completed,
    productTypeName: state.productType?.name,
    unitLabel: state.productType?.unitLabel,
    unitsCount: state.units.length,
    batchesCount: state.batches.length,
    recordsCount: state.records.length,
  };
}

export async function saveRemoteProducerState(state: ProducerLocalState) {
  const ownerUserId = await currentUserId();
  const normalized = normalizeProducerState(state);
  if (!normalized) throw new Error('Os dados do negócio são inválidos.');

  const { error } = await (supabase as any)
    .from('producer_workspaces')
    .upsert(
      {
        business_id: normalized.business.id,
        owner_user_id: ownerUserId,
        business_name: normalized.business.name || null,
        business_kind: normalized.business.kind || null,
        accent_color: normalized.business.accentColor || '#47B37D',
        completed: normalized.completed,
        state: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id' },
    );

  if (error) throw new Error(error.message || 'Não foi possível guardar o negócio no Supabase.');
  cacheProducerState(normalized, { makeCurrent: false, emit: false });
}

export async function deleteRemoteProducerState(businessId: string) {
  const { error } = await (supabase as any)
    .from('producer_workspaces')
    .delete()
    .eq('business_id', businessId);
  if (error) throw new Error(error.message || 'Não foi possível eliminar o negócio.');
}

export async function migrateLocalBusinessesToSupabase() {
  const businesses = listLocalBusinesses();
  for (const business of businesses) {
    const state = normalizeProducerState(
      JSON.parse(window.localStorage.getItem(`azotrace:producer-local:state:${business.id}`) || 'null'),
    );
    if (!state) continue;
    try {
      const remote = await loadRemoteProducerState(business.id);
      if (!remote) await saveRemoteProducerState(state);
    } catch (error) {
      console.warn('Migração local → Supabase ignorada para', business.id, error);
    }
  }
}

export async function uploadProducerAsset(
  file: File,
  businessId: string,
  folder: string,
): Promise<string> {
  if (!businessId) throw new Error('Seleciona primeiro um negócio.');
  if (!file.type.startsWith('image/')) throw new Error('Seleciona um ficheiro de imagem.');
  if (file.size > 10 * 1024 * 1024) throw new Error('A imagem não pode ultrapassar 10 MB.');

  const objectPath = `${safeSegment(businessId)}/${safeSegment(folder)}/${crypto.randomUUID()}.${extensionForFile(file)}`;
  const { data, error } = await (supabase as any).storage
    .from(PRODUCER_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) throw new Error(error.message || 'Não foi possível carregar a imagem.');

  const result = (supabase as any).storage.from(PRODUCER_BUCKET).getPublicUrl(data.path);
  const publicUrl = result.data?.publicUrl as string | undefined;
  if (!publicUrl) throw new Error('O Supabase não devolveu o endereço público da imagem.');
  return publicUrl;
}

export async function getRemoteWebsiteStatus(businessId: string): Promise<'published' | 'draft' | 'missing'> {
  if (!businessId) return 'missing';
  const { data, error } = await (supabase as any)
    .from('business_websites')
    .select('status')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Não foi possível verificar o Website.');
  if (!data) return 'missing';
  return data.status === 'published' ? 'published' : 'draft';
}

export async function savePublicTraceSnapshot(args: {
  businessId: string;
  batchId: string;
  snapshot: unknown;
}) {
  const ownerUserId = await currentUserId();
  const now = new Date().toISOString();
  const { error } = await (supabase as any)
    .from('public_trace_pages')
    .upsert(
      {
        business_id: args.businessId,
        batch_id: args.batchId,
        owner_user_id: ownerUserId,
        status: 'published',
        snapshot: args.snapshot,
        published_at: now,
        updated_at: now,
      },
      { onConflict: 'business_id,batch_id' },
    );
  if (error) throw new Error(error.message || 'Não foi possível publicar a página do lote.');
}

export async function loadPublicTraceSnapshot(businessId: string, batchId: string) {
  const { data, error } = await (supabase as any)
    .from('public_trace_pages')
    .select('snapshot, published_at, updated_at')
    .eq('business_id', businessId)
    .eq('batch_id', batchId)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new Error(error.message || 'Não foi possível carregar a rastreabilidade pública.');
  return data?.snapshot ?? null;
}
