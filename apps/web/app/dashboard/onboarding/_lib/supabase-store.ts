'use client';

import { supabase } from '~/lib/supabase';

import {
  BUSINESSES_UPDATED_EVENT,
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

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Não foi possível validar a sessão: ${error.message}`);
  if (!data.session) throw new Error('A sessão terminou. Inicia sessão novamente.');
  return data.session;
}

export async function loadRemoteProducerState(businessId: string): Promise<ProducerLocalState | null> {
  if (!businessId) return null;
  await requireSession();

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
  await requireSession();

  const { data, error } = await (supabase as any)
    .from('producer_workspaces')
    .select('state, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message || 'Não foi possível carregar os negócios do Supabase.');

  const rows: ProducerLocalState[] = (data ?? [])
    .map((row: any) => normalizeProducerState(row.state))
    .filter((row: ProducerLocalState | null): row is ProducerLocalState => Boolean(row));

  rows.forEach((state) => cacheProducerState(state, { makeCurrent: false, emit: false }));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BUSINESSES_UPDATED_EVENT));
  }
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
  const session = await requireSession();
  const normalized = normalizeProducerState(state);
  if (!normalized) throw new Error('Os dados do negócio são inválidos.');
  if (!normalized.business.companyId) throw new Error('O negócio não está associado a uma empresa.');

  const { error: workspaceError } = await (supabase as any)
    .from('producer_workspaces')
    .upsert(
      {
        business_id: normalized.business.id,
        owner_user_id: session.user.id,
        company_id: normalized.business.companyId,
        business_name: normalized.business.name || 'Novo negócio',
        business_kind: normalized.business.kind || 'Produção',
        accent_color: normalized.business.accentColor || '#47B37D',
        completed: normalized.completed,
        state: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id' },
    );

  if (workspaceError) {
    throw new Error(workspaceError.message || 'Não foi possível guardar os dados de produção no Supabase.');
  }

  cacheProducerState(normalized, { makeCurrent: false, emit: false });
}

export async function deleteRemoteProducerState(businessId: string) {
  await requireSession();
  const { error } = await (supabase as any).from('producer_workspaces').delete().eq('business_id', businessId);
  if (error) throw new Error(error.message || 'Não foi possível eliminar o negócio.');
}

/**
 * Importa para o Supabase os negócios que ainda existem apenas no localStorage.
 * A operação respeita RLS; negócios de outra empresa são simplesmente ignorados.
 */
export async function migrateLocalBusinessesToSupabase() {
  if (typeof window === 'undefined') return;

  const session = await requireSession();

  // Só o Admin da empresa importa dados de testes locais. O Super Admin gere a
  // plataforma e os utilizadores; não é dono direto dos negócios dos clientes.
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('platform_role')
    .eq('id', session.user.id)
    .maybeSingle();
  if (profile?.platform_role === 'superadmin') return;

  const { data: membership } = await (supabase as any)
    .from('azotrace_company_members')
    .select('company_id, role')
    .eq('user_id', session.user.id)
    .eq('active', true)
    .maybeSingle();

  if (!membership || membership.role !== 'admin') return;
  const companyId = String(membership.company_id);

  const businesses = listLocalBusinesses();
  for (const business of businesses) {
    const raw = window.localStorage.getItem(`azotrace:producer-local:state:${business.id}`);
    if (!raw) continue;

    const parsed = normalizeProducerState(JSON.parse(raw));
    if (!parsed) continue;

    // Versões locais antigas usavam company-local-default. Ao fazer a primeira
    // sincronização associamos esses dados à empresa real do Admin autenticado.
    const state: ProducerLocalState = {
      ...parsed,
      business: { ...parsed.business, companyId },
    };

    try {
      const remote = await loadRemoteProducerState(business.id);
      if (!remote) {
        cacheProducerState(state, { makeCurrent: false, emit: false });
        await saveRemoteProducerState(state);
      }
    } catch (error) {
      console.warn('Migração local → Supabase ignorada para', business.id, error);
    }
  }
}

export async function hydrateProducerCacheFromSupabase() {
  try {
    await listRemoteProducerStates();
  } catch (error) {
    console.warn('Não foi possível hidratar os negócios do Supabase.', error);
  }
}

export async function uploadProducerAsset(file: File, businessId: string, folder: string): Promise<string> {
  await requireSession();
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
  const session = await requireSession();
  const now = new Date().toISOString();
  const { error } = await (supabase as any)
    .from('public_trace_pages')
    .upsert(
      {
        business_id: args.businessId,
        batch_id: args.batchId,
        owner_user_id: session.user.id,
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
