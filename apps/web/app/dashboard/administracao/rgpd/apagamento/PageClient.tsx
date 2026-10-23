"use client";
import { confirmMessage } from '~/lib/app-messages';

import { useEffect, useState } from "react";
import { AlertTriangle, Database, HardDrive, ShieldCheck, Trash2, UserRoundX } from "lucide-react";
import { useTheme } from "~/lib/theme-context";
import { supabase } from "~/lib/supabase";
import { useLocalUser } from "../../../_lib/use-local-user";
import styles from "./account-deletion.module.css";

type Inventory = {
  foreignKeyReferences: {
    schema: string;
    table: string;
    column: string;
    rows: number;
    onDelete: string;
  }[];
  directReferences: {
    table: string;
    column: string;
    rows: number;
    nullable: boolean;
  }[];
  emailReferences: { table: string; column: string; rows: number }[];
  embeddedIdReferences: { table: string; column: string; rows: number }[];
  personalStorage: { bucket: string; rows: number }[];
  unhandledStorageReferences: { bucket: string; rows: number }[];
  scope: string[];
  preserved: string[];
  outsideSupabase: string[];
};
type Preview = {
  preview: Inventory;
  account: {
    name: string;
    email: string;
    companyCount: number;
    companies: { id: string; name: string; active: boolean }[];
    memberships: {
      company_id: string;
      role: string;
      app_role: string;
      active: boolean;
    }[];
    businesses: {
      business_id: string;
      business_name: string | null;
      business_kind: string | null;
      company_id: string | null;
    }[];
    tickets: {
      id: string;
      ticket_number: number;
      subject: string;
      status: string;
      priority: string;
      created_at: string;
    }[];
    subscriptions: {
      id: string;
      company_id: string | null;
      plan_name: string;
      status: string;
      started_at: string | null;
      expires_at: string | null;
      nome: string | null;
      linkedByEmail: boolean;
    }[];
  };
};

async function request(body: Record<string, unknown>) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Inicia sessão para continuar.");
  const response = await fetch("/api/azotrace/rgpd/account-deletion", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "Não foi possível concluir o pedido.");
  return result;
}

export default function PageClient() {
  const user = useLocalUser();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dark = theme === "dark";
  const isCompanyAdmin = user.role === "admin";
  const isSuperAdmin = user.role === "superadmin";
  const allowed = user.active && (isSuperAdmin || (isCompanyAdmin && Boolean(user.companyId)));

  useEffect(() => {
    if (isCompanyAdmin && user.email) setEmail(user.email.toLowerCase());
  }, [isCompanyAdmin, user.email]);

  async function loadPreview(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    setPreview(null);
    setConfirmation("");
    try {
      const result = (await request({
        action: "preview",
        email: email.trim().toLowerCase(),
      })) as Preview;
      setPreview(result);
      setEmail(result.account.email);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível preparar a pré-visualização.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function execute() {
    if (!preview || confirmation.trim().toLowerCase() !== preview.account.email.toLowerCase())
      return;
    if (
      !(await confirmMessage(
        `Apagar a conta ${preview.account.email} e os dados pessoais apresentados? Esta ação não pode ser desfeita.`,
      ))
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = (await request({
        action: "delete",
        email: preview.account.email,
        confirmation,
      })) as {
        ok?: boolean;
        warning?: string;
        summary?: Record<string, number>;
        storageObjects?: number;
      };
      setPreview(null);
      setEmail("");
      setConfirmation("");
      setNotice(
        result.warning ||
          "A conta foi eliminada. Os dados pessoais inventariados foram removidos ou anonimizados; os dados partilhados da empresa foram preservados.",
      );
      if (isCompanyAdmin) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        window.location.replace("/");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível terminar a eliminação.");
    } finally {
      setBusy(false);
    }
  }

  if (!user.id) return <p className={styles.loading}>A validar sessão…</p>;
  if (!allowed)
    return (
      <main className={`${styles.page} ${dark ? styles.dark : ""}`}>
        <div className={styles.card}>
          <h1>Sem permissão</h1>
          <p>Esta área está disponível para administradores autorizados.</p>
        </div>
      </main>
    );

  const total = (rows: { rows: number }[]) => rows.reduce((sum, item) => sum + item.rows, 0);
  const canDelete =
    isCompanyAdmin &&
    !!preview &&
    preview.account.email.toLowerCase() === user.email.toLowerCase() &&
    preview.preview.unhandledStorageReferences.length === 0 &&
    preview.preview.directReferences.every((row) => row.nullable) &&
    confirmation.trim().toLowerCase() === preview.account.email.toLowerCase();
  return (
    <main className={`${styles.page} ${dark ? styles.dark : ""}`}>
      <div className={styles.header}>
        <div>
          <h1>Apagamento e anonimização</h1>
          <p className={styles.lead}>
            Consulta primeiro os dados associados à conta. A eliminação só começa depois da
            confirmação final.
          </p>
        </div>
        <span className={styles.scope}>
          {user.role === "superadmin" ? "Super Admin · consulta" : "Admin · dados da própria conta"}
        </span>
      </div>
      <section className={styles.card}>
        <div className={styles.cardTitle}>
          <UserRoundX aria-hidden="true" />
          <div>
            <h2>{isSuperAdmin ? "Consultar conta" : "A tua conta"}</h2>
            <p>
              {isSuperAdmin
                ? "O Super Admin pode consultar os dados associados às contas dos clientes. Esta página não permite apagar contas."
                : "Podes consultar e apagar os dados pessoais associados à tua própria conta. Os dados partilhados da empresa e os registos de faturação são preservados."}
            </p>
          </div>
        </div>
        <form className={styles.search} onSubmit={loadPreview}>
          <label htmlFor="deletion-email">
            {isSuperAdmin ? "Email da conta do cliente" : "Email da tua conta"}
          </label>
          <div className={styles.searchRow}>
            <input
              id="deletion-email"
              type="email"
              autoComplete="off"
              required
              maxLength={320}
              value={email}
              readOnly={isCompanyAdmin}
              onChange={(event) => {
                setEmail(event.target.value);
                setPreview(null);
                setConfirmation("");
              }}
              placeholder="nome@empresa.pt"
            />
            <button type="submit" className={styles.secondary} disabled={loading || busy}>
              {loading
                ? "A consultar…"
                : isSuperAdmin
                  ? "Consultar dados associados"
                  : "Consultar os meus dados"}
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <div className={styles.error} role="alert">
          <AlertTriangle aria-hidden="true" />
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className={styles.success} role="status">
          <ShieldCheck aria-hidden="true" />
          {notice}
        </div>
      ) : null}

      {preview ? (
        <>
          <section className={styles.card}>
            <div className={styles.cardTitle}>
              <Database aria-hidden="true" />
              <div>
                <h2>Pré-visualização da conta</h2>
                <p>
                  {preview.account.name} · {preview.account.email} · associada a{" "}
                  {preview.account.companyCount} empresa(s)
                </p>
              </div>
            </div>
            <div className={styles.metrics}>
              <div>
                <span>Referências ligadas à conta</span>
                <strong>
                  {total(preview.preview.foreignKeyReferences) +
                    total(preview.preview.directReferences)}
                </strong>
              </div>
              <div>
                <span>Referências pessoais em texto/JSON</span>
                <strong>
                  {total(preview.preview.emailReferences) +
                    total(preview.preview.embeddedIdReferences)}
                </strong>
              </div>
              <div>
                <span>Ficheiros pessoais</span>
                <strong>{total(preview.preview.personalStorage)}</strong>
              </div>
            </div>
            <div className={styles.columns}>
              <article>
                <h3>Será removido ou anonimizado</h3>
                <ul>
                  {preview.preview.scope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <details>
                  <summary>Ver referências encontradas</summary>
                  <ul className={styles.references}>
                    {preview.preview.foreignKeyReferences.map((row, i) => (
                      <li key={`fk-${i}`}>
                        {row.table}.{row.column}: {row.rows} · regra {row.onDelete}
                      </li>
                    ))}
                    {preview.preview.directReferences.map((row, i) => (
                      <li key={`direct-${i}`}>
                        {row.table}.{row.column}: {row.rows}
                        {row.nullable ? " · referência anulável" : " · revisão necessária"}
                      </li>
                    ))}
                    {preview.preview.emailReferences.map((row, i) => (
                      <li key={`email-${i}`}>
                        {row.table}.{row.column}: {row.rows} · email
                      </li>
                    ))}
                    {preview.preview.embeddedIdReferences.map((row, i) => (
                      <li key={`embedded-${i}`}>
                        {row.table}.{row.column}: {row.rows} · identificador em conteúdo
                      </li>
                    ))}
                    {preview.preview.personalStorage.map((row, i) => (
                      <li key={`storage-${i}`}>
                        {row.bucket}: {row.rows} ficheiros
                      </li>
                    ))}
                    {preview.preview.unhandledStorageReferences.map((row, i) => (
                      <li key={`storage-review-${i}`}>
                        {row.bucket}: {row.rows} caminhos precisam de revisão; o apagamento fica
                        bloqueado
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
              <article>
                <h3>Será preservado</h3>
                <ul>
                  {preview.preview.preserved.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h3 className={styles.outsideTitle}>Fora do alcance desta aplicação</h3>
                <ul>
                  {preview.preview.outsideSupabase.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.cardTitle}>
              <Database aria-hidden="true" />
              <div>
                <h2>Registos associados a esta conta</h2>
                <p>
                  Estes registos concretos foram encontrados. A empresa e os registos de faturação
                  partilhados são preservados.
                </p>
              </div>
            </div>
            <div className={styles.columns}>
              <article>
                <h3>Empresas e acessos</h3>
                {preview.account.companies.length ? (
                  <ul>
                    {preview.account.companies.map((company) => {
                      const membership = preview.account.memberships.find(
                        (row) => row.company_id === company.id,
                      );
                      return (
                        <li key={company.id}>
                          <strong>{company.name}</strong> · {membership?.role || "membro"}
                          {membership?.app_role ? ` (${membership.app_role})` : ""}
                          {membership?.active === false ? " · inativo" : ""}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={styles.muted}>Sem empresa associada.</p>
                )}
                <h3>Negócios com acesso direto</h3>
                {preview.account.businesses.length ? (
                  <ul>
                    {preview.account.businesses.map((business) => (
                      <li key={business.business_id}>
                        <strong>{business.business_name || business.business_id}</strong>
                        {business.business_kind ? ` · ${business.business_kind}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.muted}>Sem acessos diretos a negócios.</p>
                )}
              </article>
              <article>
                <h3>Tickets de suporte</h3>
                {preview.account.tickets.length ? (
                  <ul>
                    {preview.account.tickets.map((ticket) => (
                      <li key={ticket.id}>
                        #{ticket.ticket_number} · <strong>{ticket.subject}</strong> ·{" "}
                        {ticket.status} · prioridade {ticket.priority}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.muted}>Sem tickets associados.</p>
                )}
                <h3>Subscrições da conta e da empresa</h3>
                {preview.account.subscriptions.length ? (
                  <ul>
                    {preview.account.subscriptions.map((subscription) => (
                      <li key={subscription.id}>
                        <strong>{subscription.plan_name}</strong> · {subscription.status}
                        {subscription.expires_at
                          ? ` · termina ${new Intl.DateTimeFormat("pt-PT").format(new Date(subscription.expires_at))}`
                          : ""}{" "}
                        ·{" "}
                        {subscription.linkedByEmail ? "associada ao email" : "associada à empresa"}·
                        registo de faturação preservado
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.muted}>
                    Sem subscrições associadas diretamente à conta ou à empresa.
                  </p>
                )}
              </article>
            </div>
          </section>
          {isCompanyAdmin ? (
            <section className={`${styles.card} ${styles.dangerCard}`}>
              <div className={styles.cardTitle}>
                <HardDrive aria-hidden="true" />
                <div>
                  <h2>Confirmar eliminação definitiva</h2>
                  <p>
                    Ao apagares a tua conta, deixarás de conseguir iniciar sessão. Os dados
                    operacionais partilhados da empresa e o histórico de faturação serão
                    preservados.
                  </p>
                </div>
              </div>
              {preview.preview.unhandledStorageReferences.length > 0 ||
              preview.preview.directReferences.some((row) => !row.nullable) ? (
                <div className={styles.error} role="alert">
                  <AlertTriangle aria-hidden="true" />
                  Há referências que exigem revisão. A confirmação está bloqueada até serem
                  resolvidas.
                </div>
              ) : null}
              <label htmlFor="confirm-email">
                Para confirmar, escreve <strong>{preview.account.email}</strong>
              </label>
              <div className={styles.confirmRow}>
                <input
                  id="confirm-email"
                  type="email"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Email completo da conta"
                />
                <button
                  type="button"
                  className={styles.danger}
                  disabled={!canDelete || busy}
                  onClick={() => void execute()}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  {busy ? "A apagar…" : "Apagar a minha conta e dados pessoais"}
                </button>
              </div>
            </section>
          ) : (
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <ShieldCheck aria-hidden="true" />
                <div>
                  <h2>Consulta apenas</h2>
                  <p>
                    O Super Admin pode rever os dados associados, mas não pode executar o apagamento
                    nesta área. O pedido de eliminação da conta é iniciado pelo próprio Admin da
                    empresa.
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      ) : null}
      <p className={styles.footnote}>
        A pré-visualização consulta a base atual. Mantém uma cópia de segurança e confirma as
        obrigações legais e de faturação antes de executar. Os backups e os sistemas externos têm
        políticas próprias de retenção.
      </p>
    </main>
  );
}
