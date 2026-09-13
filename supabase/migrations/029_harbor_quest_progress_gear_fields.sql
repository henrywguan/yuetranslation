-- Ensure every harbor_quest_progress.progress jsonb blob carries the full
-- Harbor Quest shape (coins / owned / look / lastSavedAt) for Save Shack + Outfitter.
-- The column is already jsonb; this only backfills missing keys on existing rows.

update public.harbor_quest_progress
set progress = progress
  || jsonb_build_object(
    'coins',
    case
      when jsonb_typeof(progress -> 'coins') = 'number' then progress -> 'coins'
      else '40'::jsonb
    end,
    'owned',
    case
      when jsonb_typeof(progress -> 'owned') = 'array' then progress -> 'owned'
      else '["hat-straw","top-harbor","bottom-travel","shoes-leather","hand-none"]'::jsonb
    end,
    'look',
    case
      when jsonb_typeof(progress -> 'look') = 'object' then progress -> 'look'
      else '{"hat":"hat-straw","top":"top-harbor","bottom":"bottom-travel","shoes":"shoes-leather","hand":"hand-none"}'::jsonb
    end,
    'lastSavedAt',
    case
      when jsonb_typeof(progress -> 'lastSavedAt') = 'number' then progress -> 'lastSavedAt'
      else '0'::jsonb
    end
  ),
  updated_at = now()
where
  jsonb_typeof(progress -> 'coins') is distinct from 'number'
  or jsonb_typeof(progress -> 'owned') is distinct from 'array'
  or jsonb_typeof(progress -> 'look') is distinct from 'object'
  or jsonb_typeof(progress -> 'lastSavedAt') is distinct from 'number';

comment on column public.harbor_quest_progress.progress is
  'Harbor Quest blob: cleared, stepCursor, correctCount, coins, owned, look, lastSavedAt';
