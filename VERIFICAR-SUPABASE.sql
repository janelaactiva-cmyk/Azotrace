-- Verificação de leitura; executar depois da migração do catálogo.
select
 to_regclass('public.azotrace_plan_catalog') is not null as catalogo_existe,
 to_regclass('public.azotrace_plan_catalog_history') is not null as historico_existe,
 to_regprocedure('public.az_update_plan_catalog(jsonb,integer,uuid)') is not null as publicar_disponivel,
 to_regprocedure('public.az_online_context(uuid)') is not null as sessao_disponivel,
 to_regprocedure('public.az_billing_prepare(jsonb,uuid)') is not null as upgrade_disponivel;

select version, data->'plans' as planos
from public.azotrace_plan_catalog where id='azotrace';

select count(*) as superadmins_ativos
from public.profiles where platform_role='superadmin' and active is true;

select public.az_billing_price('Base') as base_sem_iva,
       public.az_billing_price('Essential') as essential_sem_iva,
       public.az_billing_price('Pro') as pro_sem_iva;

select relname, relrowsecurity as rls_ativo
from pg_class where oid in (
 'public.azotrace_plan_catalog'::regclass,
 'public.azotrace_plan_catalog_history'::regclass
);
