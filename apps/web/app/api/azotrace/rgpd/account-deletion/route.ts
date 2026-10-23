import { NextResponse } from "next/server";
import { rgpdActor, rgpdBody, RgpdError } from "~/lib/rgpd-server";
import { getSupabaseAdminClient } from "~/lib/supabase-admin";

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

function normalizeEmail(value: unknown) {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (email.length > 320 || !/^\S+@\S+\.\S+$/.test(email))
    throw new RgpdError("Indica um endereço de email válido.");
  return email;
}

async function authorizeTarget(request: Request, email: string, action: "preview" | "delete") {
  const { user } = await rgpdActor(request);
  const db = getSupabaseAdminClient();
  if (!user.active || !["admin", "superadmin"].includes(user.role))
    throw new RgpdError("Não tens permissão para tratar pedidos de apagamento.", 403);
  if (user.role === "superadmin" && action === "delete")
    throw new RgpdError(
      "O Super Admin pode consultar os dados, mas não executar o apagamento.",
      403,
    );
  if (user.role === "admin" && !user.companyId)
    throw new RgpdError(
      "Só um Admin associado a uma empresa pode consultar ou apagar os dados da própria conta.",
      403,
    );

  const { data: profile, error } = await db
    .from("profiles")
    .select("id,email,name,platform_role,active")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new RgpdError("Não foi encontrada uma conta com esse email.", 404);
  if (profile.platform_role === "superadmin")
    throw new RgpdError("Uma conta Super Admin não pode ser apagada por este formulário.", 403);
  if (user.role === "admin" && profile.id !== user.id)
    throw new RgpdError("O Admin só pode consultar e apagar os dados da própria conta.", 403);
  if (user.role === "superadmin" && profile.id === user.id)
    throw new RgpdError(
      "O Super Admin pode consultar contas de clientes, mas não a própria conta por esta página.",
      403,
    );

  const { data: memberships, error: membershipError } = await db
    .from("azotrace_company_members")
    .select("company_id,role")
    .eq("user_id", profile.id);
  if (membershipError) throw membershipError;
  const companyIds = [...new Set((memberships || []).map((row: any) => String(row.company_id)))];
  if (user.role === "admin") {
    if (companyIds.length !== 1)
      throw new RgpdError(
        "Esta conta tem acessos a mais do que uma empresa. Contacta o Super Admin para rever o pedido.",
        403,
      );
    if (!user.companyId || !companyIds.includes(user.companyId))
      throw new RgpdError("Só podes tratar contas da tua própria empresa.", 403);
  } else if (user.role !== "superadmin") {
    throw new RgpdError("Não tens permissão para tratar este pedido.", 403);
  }
  const { data: authResult, error: authError } = await db.auth.admin.getUserById(
    String(profile.id),
  );
  if (authError || !authResult.user)
    throw new RgpdError("A conta de autenticação não está disponível.", 404);
  return { user, db, profile, authUser: authResult.user, companyIds };
}

async function removePersonalStorage(
  db: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
) {
  const { data: buckets, error } = await db.storage.listBuckets();
  if (error) throw error;
  let removed = 0;
  for (const bucket of buckets || []) {
    const walk = async (prefix: string): Promise<void> => {
      let offset = 0;
      const files: string[] = [];
      while (true) {
        const { data, error: listError } = await db.storage.from(bucket.name).list(prefix, {
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (listError) throw listError;
        if (!data?.length) break;
        for (const entry of data) {
          const path = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.id === null) await walk(path);
          else files.push(path);
        }
        if (data.length < 100) break;
        offset += data.length;
      }
      for (let index = 0; index < files.length; index += 100) {
        const { error: removeError } = await db.storage
          .from(bucket.name)
          .remove(files.slice(index, index + 100));
        if (removeError) throw removeError;
        removed += Math.min(100, files.length - index);
      }
    };
    // Apenas ficheiros colocados na pasta cujo nome é exatamente o UUID da conta.
    // Recursos partilhados da empresa (business_id/...) não são tocados.
    await walk(userId);
  }
  return removed;
}

export async function POST(request: Request) {
  try {
    const input = await rgpdBody(request);
    if (
      Object.keys(input).some(
        (key) => !["action", "email", "confirmation", "auditId"].includes(key),
      )
    )
      throw new RgpdError("O pedido contém campos não permitidos.", 400);
    const email = normalizeEmail(input.email);
    if (input.action !== "preview" && input.action !== "delete")
      throw new RgpdError("Ação inválida.");
    const context = await authorizeTarget(request, email, input.action);
    if (input.action === "preview") {
      const { data, error } = await context.db.rpc("az_rgpd_account_deletion_inventory", {
        p_user_id: context.profile.id,
        p_email: email,
      });
      if (error) throw error;
      const { data: memberships, error: memberError } = await context.db
        .from("azotrace_company_members")
        .select("company_id,role,app_role,active")
        .eq("user_id", context.profile.id);
      if (memberError) throw memberError;
      const companies = context.companyIds.length
        ? await context.db
            .from("azotrace_companies")
            .select("id,name,active")
            .in("id", context.companyIds)
        : { data: [], error: null };
      if (companies.error) throw companies.error;
      const { data: accessRows, error: accessError } = await context.db
        .from("azotrace_business_access")
        .select("business_id")
        .eq("user_id", context.profile.id);
      if (accessError) throw accessError;
      const businessIds = [
        ...new Set((accessRows || []).map((row: any) => String(row.business_id))),
      ];
      const workspaceQueries = await Promise.all([
        context.db
          .from("producer_workspaces")
          .select("business_id,business_name,business_kind,company_id")
          .eq("owner_user_id", context.profile.id),
        businessIds.length
          ? context.db
              .from("producer_workspaces")
              .select("business_id,business_name,business_kind,company_id")
              .in("business_id", businessIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      for (const result of workspaceQueries) if (result.error) throw result.error;
      const businesses = [
        ...new Map(
          workspaceQueries
            .flatMap((result: any) => result.data || [])
            .map((row: any) => [String(row.business_id), row]),
        ).values(),
      ];
      const ticketQueries = await Promise.all([
        context.db
          .from("azotrace_support_tickets")
          .select(
            "id,ticket_number,subject,status,priority,requester_name,requester_email,created_at",
          )
          .eq("created_by_user_id", context.profile.id),
        context.db
          .from("azotrace_support_tickets")
          .select(
            "id,ticket_number,subject,status,priority,requester_name,requester_email,created_at",
          )
          .eq("requester_email", email),
      ]);
      for (const result of ticketQueries) if (result.error) throw result.error;
      const tickets = [
        ...new Map(
          ticketQueries
            .flatMap((result: any) => result.data || [])
            .map((row: any) => [String(row.id), row]),
        ).values(),
      ];
      const subscriptionQueries = await Promise.all([
        context.db
          .from("subscriptions")
          .select("id,company_id,plan_name,status,started_at,expires_at,nome,email")
          .eq("email", email),
        context.companyIds.length
          ? context.db
              .from("subscriptions")
              .select("id,company_id,plan_name,status,started_at,expires_at,nome,email")
              .in("company_id", context.companyIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      for (const result of subscriptionQueries) if (result.error) throw result.error;
      const emailSubscriptionIds = new Set(
        (subscriptionQueries[0].data || []).map((row: any) => String(row.id)),
      );
      const subscriptions = [
        ...new Map(
          subscriptionQueries
            .flatMap((result: any) => result.data || [])
            .map((row: any) => [
              String(row.id),
              {
                ...row,
                linkedByEmail: emailSubscriptionIds.has(String(row.id)),
              },
            ]),
        ).values(),
      ];
      return reply({
        preview: data,
        account: {
          name: context.profile.name || context.authUser.user_metadata?.name || email.split("@")[0],
          email,
          companyCount: context.companyIds.length,
          companies: companies.data || [],
          memberships: memberships || [],
          businesses,
          tickets,
          subscriptions,
        },
      });
    }
    if (input.action === "delete") {
      if (context.user.role !== "admin")
        throw new RgpdError("Só o Admin pode apagar os dados pessoais da própria conta.", 403);
      if (
        String(input.confirmation || "")
          .trim()
          .toLowerCase() !== email
      )
        throw new RgpdError("Escreve novamente o email completo para confirmar.");
      const { data: execution, error: executionError } = await context.db.rpc(
        "az_rgpd_execute_account_deletion",
        {
          p_user_id: context.profile.id,
          p_email: email,
          p_actor_id: context.user.id,
          p_company_ids: context.companyIds,
        },
      );
      if (executionError) throw executionError;
      let storageObjects = 0;
      try {
        storageObjects = await removePersonalStorage(context.db, String(context.profile.id));
      } catch (cause: any) {
        return reply(
          {
            error:
              "A base de dados foi preparada, mas não foi possível terminar de remover os ficheiros pessoais. A conta ainda existe; corrige o acesso ao Storage e volta a tentar.",
            prepared: true,
            details: cause?.message,
          },
          503,
        );
      }
      let deleteError: { message: string } | null = null;
      try {
        const result = await context.db.auth.admin.deleteUser(String(context.profile.id));
        deleteError = result.error;
      } catch (cause: any) {
        deleteError = {
          message: cause?.message || "Erro de rede no Supabase Auth.",
        };
      }
      if (deleteError)
        return reply(
          {
            error:
              "Os dados pessoais foram preparados e os ficheiros pessoais removidos, mas o Supabase não concluiu a eliminação da conta. A conta ainda existe; volta a tentar a eliminação.",
            prepared: true,
            details: deleteError.message,
          },
          503,
        );
      const { error: finalizeError } = await context.db.rpc("az_rgpd_finalize_account_deletion", {
        p_audit_id: execution.audit_id,
        p_storage_objects: storageObjects,
      });
      if (finalizeError)
        return reply({
          ok: true,
          warning:
            "A conta e os dados pessoais foram apagados. O registo técnico de conclusão não foi atualizado.",
        });
      return reply({ ok: true, summary: execution.summary, storageObjects });
    }
    throw new RgpdError("Ação inválida.");
  } catch (error: any) {
    const status = error instanceof RgpdError ? error.status : 400;
    return reply(
      {
        error:
          error instanceof RgpdError
            ? error.message
            : error?.message || "Não foi possível concluir o pedido.",
      },
      status,
    );
  }
}
