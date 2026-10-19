begin;
-- Required for concurrent Stripe retries to refer to the same checkout row.
-- Existing duplicate sessions need review; do not silently delete financial rows.
do $$ begin
  if exists(select stripe_session_id from public.checkouts where stripe_session_id is not null group by stripe_session_id having count(*)>1) then
    raise exception 'Há checkouts duplicados para a mesma sessão Stripe. Rever antes de aplicar a migração.';
  end if;
end $$;
create unique index if not exists az_checkouts_stripe_session_unique on public.checkouts(stripe_session_id);
commit;
