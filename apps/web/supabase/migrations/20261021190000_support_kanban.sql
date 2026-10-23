-- Acrescenta Em tratamento sem alterar os estados nem os tickets existentes.
begin;
alter table public.azotrace_support_tickets
  drop constraint if exists azotrace_support_tickets_status_check;
alter table public.azotrace_support_tickets
  add constraint azotrace_support_tickets_status_check
  check(status in ('open','in_progress','waiting','resolved'));
commit;
