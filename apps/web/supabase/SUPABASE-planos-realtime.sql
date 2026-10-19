-- Ativar notificações só para o catálogo público de planos.
-- Executar depois da migração SUPABASE-catalogo-planos.sql.
begin;
do $block$
begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
  create publication supabase_realtime;
 end if;
 if not exists(select 1 from pg_publication where pubname='supabase_realtime' and puballtables)
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='azotrace_plan_catalog') then
  alter publication supabase_realtime add table public.azotrace_plan_catalog;
 end if;
end $block$;
commit;
