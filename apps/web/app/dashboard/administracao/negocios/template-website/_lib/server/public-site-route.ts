import { createClient } from '@supabase/supabase-js';

import {
  WebsiteTemplateContentSchema,
  WebsiteTemplateIdSchema,
} from '../schema';
import { renderWebsiteTemplateDocument } from '../templates/render-template';

function htmlMessage(title: string, message: string, status = 404) {
  return new Response(
    `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#f3f4f6;color:#111827;margin:0;padding:40px}main{max-width:720px;margin:8vh auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px;box-shadow:0 16px 40px rgba(15,23,42,.08)}</style></head><body><main><h1>${title}</h1><p>${message}</p></main></body></html>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}

export async function renderPublishedBusinessWebsite(businessId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return htmlMessage(
      'Supabase não configurado',
      'Define NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no projeto.',
      503,
    );
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await client
    .from('business_websites')
    .select('template_id, asset_base_url, content, status')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('Erro ao carregar website publicado:', error);
    return htmlMessage(
      'Erro ao carregar website',
      'Não foi possível carregar este website neste momento.',
      500,
    );
  }

  if (!data) {
    return htmlMessage(
      'Website não publicado',
      'Este negócio ainda não tem um website publicado.',
      404,
    );
  }

  const templateResult = WebsiteTemplateIdSchema.safeParse(data.template_id);
  const contentResult = WebsiteTemplateContentSchema.safeParse(data.content);

  if (!templateResult.success || !contentResult.success) {
    return htmlMessage(
      'Website inválido',
      'Os dados publicados não correspondem ao formato atual do template.',
      500,
    );
  }

  const html = renderWebsiteTemplateDocument({
    templateId: templateResult.data,
    content: contentResult.data,
    assetBaseUrl: data.asset_base_url ?? '',
  });

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300',
    },
  });
}
