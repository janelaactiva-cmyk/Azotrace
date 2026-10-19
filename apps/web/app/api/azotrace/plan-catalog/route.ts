import { verifiedOnlineUser } from '../_lib/online-auth';
import { getSupabaseAdminClient } from '~/lib/supabase-admin';
import { CatalogDataSchema } from '~/lib/plan-catalog';
import { getPlanCatalog } from '~/lib/plan-catalog-server';

async function authorize(request: Request) {
  try {
    const user = await verifiedOnlineUser(request);
    if (user.role !== 'superadmin' || !user.active) {
      return { response: Response.json({ error: 'Só o Super Admin pode gerir os planos.' }, { status: 403 }) };
    }
    return { user };
  } catch {
    return { response: Response.json({ error: 'Inicia sessão para gerir os planos.' }, { status: 401 }) };
  }
}

export async function GET(request: Request) {
  const authorization = await authorize(request);
  if (authorization.response) return authorization.response;

  try {
    return Response.json(await getPlanCatalog(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { error: 'O catálogo de planos não está disponível. Conclui a configuração do preçário e tenta novamente.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function PATCH(request: Request) {
  const authorization = await authorize(request);
  if (authorization.response) return authorization.response;

  try {
    const body = await request.json();
    if (!Number.isSafeInteger(body.version) || body.version < 1) throw new Error('Versão inválida.');
    const data = CatalogDataSchema.parse(body.data);
    const result = await getSupabaseAdminClient().rpc('az_update_plan_catalog', {
      input: data,
      expected_version: body.version,
      actor_id: authorization.user.id,
    });
    if (result.error) {
      if (result.error.code === '40001') {
        return Response.json({ error: 'Outro administrador alterou os planos. Atualiza antes de guardar.' }, { status: 409 });
      }
      throw new Error(result.error.message);
    }
    return Response.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Não foi possível guardar os planos.' }, { status: 400 });
  }
}
