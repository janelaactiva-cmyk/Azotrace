import { WebsiteTemplateContentSchema } from '../schema';
import { renderWebsiteTemplateDocument } from '../templates/render-template';

type WebsiteRow = {
  template_id: 'template-1' | 'template-2' | 'template-3';
  content: unknown;
  asset_base_url: string | null;
  status: string;
};

/**
 * Renderizador público sem dependências MakerKit.
 * Usa a REST API do Supabase apenas se este helper vier a ser utilizado.
 */
export async function renderPublishedBusinessWebsite(businessId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return new Response('Website não configurado', { status: 404 });
  }

  const params = new URLSearchParams({
    select: 'template_id,content,asset_base_url,status',
    business_id: `eq.${businessId}`,
    status: 'eq.published',
    limit: '1',
  });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/business_websites?${params.toString()}`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    return new Response('Website não encontrado', { status: 404 });
  }

  const rows = (await response.json()) as WebsiteRow[];
  const data = rows[0];

  if (!data) {
    return new Response('Website não encontrado', { status: 404 });
  }

  const content = WebsiteTemplateContentSchema.parse(data.content);
  const html = renderWebsiteTemplateDocument({
    templateId: data.template_id,
    content,
    assetBaseUrl: data.asset_base_url ?? '',
  });

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
