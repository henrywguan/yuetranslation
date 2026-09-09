-- Translation history retention: each turn's `at` (epoch ms) lives 14 days.
-- App GET/PUT /api/history already prune per user; this sweeps dormant accounts.

create or replace function public.prune_stale_translation_history(
  ttl_ms bigint default (14::bigint * 24 * 60 * 60 * 1000)
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff bigint := (extract(epoch from now()) * 1000)::bigint - ttl_ms;
  updated_count integer := 0;
begin
  update public.translation_history th
  set
    turns = coalesce((
      select jsonb_agg(elem order by (elem->>'at')::bigint desc)
      from jsonb_array_elements(coalesce(th.turns, '[]'::jsonb)) elem
      where (elem ? 'at')
        and (elem->>'at') ~ '^[0-9]+(\.[0-9]+)?$'
        and trunc((elem->>'at')::numeric)::bigint >= cutoff
    ), '[]'::jsonb),
    updated_at = now()
  where exists (
    select 1
    from jsonb_array_elements(coalesce(th.turns, '[]'::jsonb)) elem
    where not (
      (elem ? 'at')
      and (elem->>'at') ~ '^[0-9]+(\.[0-9]+)?$'
      and trunc((elem->>'at')::numeric)::bigint >= cutoff
    )
  );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.prune_stale_translation_history(bigint) from public;
grant execute on function public.prune_stale_translation_history(bigint) to service_role;

-- One-shot sweep when this migration is applied.
select public.prune_stale_translation_history();

-- Optional (Supabase Pro + pg_cron): schedule a daily sweep for dormant rows.
-- select cron.schedule(
--   'prune-translation-history-daily',
--   '15 4 * * *',
--   $$select public.prune_stale_translation_history()$$
-- );

notify pgrst, 'reload schema';
