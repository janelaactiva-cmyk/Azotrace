begin;
create table if not exists public.azotrace_platform_privacy (
 company_id text primary key check(company_id='azotrace-platform'),
 draft_content text not null default '' check(char_length(draft_content)<=100000),
 published_content text check(char_length(published_content)<=100000),
 version bigint not null default 1 check(version>0),
 updated_at timestamptz not null default now(),published_at timestamptz,
 updated_by uuid references auth.users(id) on delete set null,
 check((published_content is null and published_at is null) or (published_content is not null and length(trim(published_content))>0 and published_at is not null))
);
alter table public.azotrace_platform_privacy enable row level security;
revoke all on public.azotrace_platform_privacy from public,anon,authenticated;
grant select,insert,update on public.azotrace_platform_privacy to service_role;
insert into public.azotrace_platform_privacy(company_id,draft_content,published_content,published_at)
values('azotrace-platform','A sua privacidade é uma prioridade para nós. Esta Política de Privacidade explica como a Azotrace recolhe, utiliza, processa e protege os seus dados pessoais em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD).

1. Responsável pelo Tratamento de Dados

Empresa: Janela Activa, Lda.
Projeto: Azotrace
E-mail: geral@azotrace.pt

2. Dados que Recolhemos

Nome e endereço de e-mail.
Dados de faturação processados pela Stripe.
Endereço público da carteira digital (Wallet Address).
Endereço IP, navegador e cookies (mediante consentimento).

3. Finalidade e Base Legal

Execução de contrato: criação de conta, pagamentos e utilização dos serviços.
Consentimento: newsletters e cookies opcionais.
Interesse legítimo: segurança da plataforma e prevenção de fraude.

4. Partilha de Dados

Os dados podem ser partilhados com a Stripe Payments Europe Ltd., fornecedores de alojamento compatíveis com o RGPD e redes blockchain públicas quando necessário para a execução do serviço.

5. Retenção de Dados

Os dados são conservados enquanto a conta estiver ativa ou pelo período exigido por lei. Os registos em blockchain pública são tecnicamente imutáveis e não podem ser apagados.

6. Direitos do Titular dos Dados

Tem direito de acesso, retificação, apagamento, limitação e oposição ao tratamento dos seus dados. Para exercer estes direitos contacte geral@azotrace.pt.

7. Alterações a esta Política

Poderemos atualizar esta Política de Privacidade periodicamente. A versão mais recente estará sempre disponível nesta página.','A sua privacidade é uma prioridade para nós. Esta Política de Privacidade explica como a Azotrace recolhe, utiliza, processa e protege os seus dados pessoais em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD).

1. Responsável pelo Tratamento de Dados

Empresa: Janela Activa, Lda.
Projeto: Azotrace
E-mail: geral@azotrace.pt

2. Dados que Recolhemos

Nome e endereço de e-mail.
Dados de faturação processados pela Stripe.
Endereço público da carteira digital (Wallet Address).
Endereço IP, navegador e cookies (mediante consentimento).

3. Finalidade e Base Legal

Execução de contrato: criação de conta, pagamentos e utilização dos serviços.
Consentimento: newsletters e cookies opcionais.
Interesse legítimo: segurança da plataforma e prevenção de fraude.

4. Partilha de Dados

Os dados podem ser partilhados com a Stripe Payments Europe Ltd., fornecedores de alojamento compatíveis com o RGPD e redes blockchain públicas quando necessário para a execução do serviço.

5. Retenção de Dados

Os dados são conservados enquanto a conta estiver ativa ou pelo período exigido por lei. Os registos em blockchain pública são tecnicamente imutáveis e não podem ser apagados.

6. Direitos do Titular dos Dados

Tem direito de acesso, retificação, apagamento, limitação e oposição ao tratamento dos seus dados. Para exercer estes direitos contacte geral@azotrace.pt.

7. Alterações a esta Política

Poderemos atualizar esta Política de Privacidade periodicamente. A versão mais recente estará sempre disponível nesta página.','2026-07-23T00:00:00Z')
on conflict(company_id) do nothing;
commit;
