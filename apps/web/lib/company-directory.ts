export type CompanyRow = { id: string; name: string; active: boolean; owner_admin_user_id: string | null; created_at: string; updated_at: string; nif?: string; legal_name?: string; contact_name?: string; contact_email?: string };
export type CompanyMemberRow = { company_id: string; user_id: string; role: string; app_role: string; active: boolean; created_at: string; updated_at: string };
export type CompanyProfileRow = { id: string; name: string | null; email: string | null; active: boolean };
export type CompanyBusinessRow = { company_id: string | null; business_id: string; business_name: string | null; business_kind: string | null; completed: boolean; created_at: string; updated_at: string };
export type CompanyBillingRow = { id: string; company_id: string | null; plan_name: string | null; nome_empresa: string | null; nome: string | null; email: string | null; nif_empresa: string | null; nif: string | null; morada: string | null; created_at: string };
export type CompanyState = 'Ativa' | 'Suspensa' | 'Em onboarding';
export type DirectoryUser = { id: string; name: string; email: string; role: string; active: boolean; owner: boolean; joinedAt: string };
export type DirectoryCompany = {
  id: string; name: string; state: CompanyState; createdAt: string; updatedAt: string; nif?: string; legalName?: string; contactName?: string; contactEmail?: string;
  owner: { name: string; email: string } | null;
  billing: { id: string; legalName: string; name: string; email: string; nif: string; address: string; plan: string } | null;
  businesses: { id: string; name: string; kind: string; completed: boolean; createdAt: string; updatedAt: string }[];
  users: DirectoryUser[];
  events: { id: string; date: string; label: string }[];
};

const text = (value: string | null | undefined) => value?.trim() || '';
const dateNumber = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
export function buildCompanyDirectory(input: {
  companies: CompanyRow[]; members: CompanyMemberRow[]; profiles: CompanyProfileRow[];
  businesses: CompanyBusinessRow[]; subscriptions: CompanyBillingRow[];
}): DirectoryCompany[] {
  const profiles = new Map(input.profiles.map(profile => [profile.id, profile]));
  const members = new Map<string, CompanyMemberRow[]>(), businesses = new Map<string, CompanyBusinessRow[]>(), billing = new Map<string, CompanyBillingRow>();
  for (const row of input.members) members.set(row.company_id, [...(members.get(row.company_id) || []), row]);
  for (const row of input.businesses) if (row.company_id) businesses.set(row.company_id, [...(businesses.get(row.company_id) || []), row]);
  for (const row of input.subscriptions) {
    if (!row.company_id) continue; // An unassociated purchase is never assigned by matching an email.
    const previous = billing.get(row.company_id);
    if (!previous || dateNumber(row.created_at) > dateNumber(previous.created_at) || row.created_at === previous.created_at && row.id > previous.id) billing.set(row.company_id, row);
  }
  return input.companies.map(company => {
    const owner = company.owner_admin_user_id ? profiles.get(company.owner_admin_user_id) : null;
    const rows = [...new Map((businesses.get(company.id) || []).map(row => [row.business_id, row])).values()];
    const memberships = [...new Map((members.get(company.id) || []).map(row => [row.user_id, row])).values()];
    const subscription = billing.get(company.id);
    const users = memberships.map(member => {
      const profile = profiles.get(member.user_id);
      return { id: member.user_id, name: text(profile?.name) || text(profile?.email) || 'Perfil indisponível', email: text(profile?.email), role: member.role === 'admin' ? 'admin' : member.app_role || 'viewer', active: company.active && member.active && profile?.active === true, owner: member.user_id === company.owner_admin_user_id, joinedAt: member.created_at };
    }).sort((a, b) => Number(b.owner) - Number(a.owner) || a.name.localeCompare(b.name, 'pt'));
    const events = [
      { id: 'created', date: company.created_at, label: 'Empresa criada' },
      ...(company.updated_at !== company.created_at ? [{ id: 'updated', date: company.updated_at, label: 'Última atualização do registo da empresa' }] : []),
      ...users.map(user => ({ id: 'member-' + user.id, date: user.joinedAt, label: `${user.name} associado à empresa` })),
      ...rows.map(row => ({ id: 'business-' + row.business_id, date: row.created_at, label: `Negócio criado: ${text(row.business_name) || 'Sem nome'}` })),
    ].filter(event => dateNumber(event.date)).sort((a, b) => dateNumber(b.date) - dateNumber(a.date));
    return {
      id: company.id, name: text(company.name) || 'Empresa sem nome', state: !company.active ? 'Suspensa' as const : rows.some(row => row.completed) ? 'Ativa' as const : 'Em onboarding' as const,
      createdAt: company.created_at, updatedAt: company.updated_at,
      nif: company.nif !== undefined ? text(company.nif) : text(subscription?.nif_empresa) || text(subscription?.nif),
      legalName: text(company.legal_name), contactName: text(company.contact_name), contactEmail: text(company.contact_email),
      owner: owner ? { name: text(owner.name) || text(owner.email) || 'Sem nome', email: text(owner.email) } : null,
      billing: subscription ? { id: subscription.id, legalName: text(subscription.nome_empresa), name: text(subscription.nome), email: text(subscription.email), nif: text(subscription.nif_empresa) || text(subscription.nif), address: text(subscription.morada), plan: text(subscription.plan_name) } : null,
      businesses: rows.map(row => ({ id: row.business_id, name: text(row.business_name) || 'Negócio sem nome', kind: text(row.business_kind), completed: row.completed, createdAt: row.created_at, updatedAt: row.updated_at })).sort((a, b) => a.name.localeCompare(b.name, 'pt')),
      users, events,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
}

export function filterCompanies(companies: DirectoryCompany[], query: string, state: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const needle = normalize(query.trim());
  return companies.filter(company => (state === 'all' || company.state === state) && normalize([company.name, company.nif, company.legalName, company.contactName, company.contactEmail, company.owner?.name, company.owner?.email, company.billing?.legalName, company.billing?.name, company.billing?.email, company.billing?.nif].filter(Boolean).join(' ')).includes(needle));
}

export function companyBillingHref(company: Pick<DirectoryCompany, 'id' | 'billing'>) {
  const query = new URLSearchParams({ empresa: company.id });
  if (company.billing) query.set('subscricao', company.billing.id);
  return '/dashboard/subscricoes?' + query;
}

export function linkedCompanySubscription<T extends { id: string; companyId: string }>(rows: T[], companyId: string, subscriptionId?: string | null) {
  return rows.find(row => row.companyId === companyId && row.id === subscriptionId) || rows.find(row => row.companyId === companyId) || null;
}
