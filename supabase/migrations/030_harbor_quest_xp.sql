-- Add XP to Harbor Quest global leaderboard; rank by XP first.
alter table public.harbor_quest_leaderboard
  add column if not exists xp integer not null default 0 check (xp >= 0);

drop index if exists harbor_quest_leaderboard_rank_idx;
create index harbor_quest_leaderboard_rank_idx
  on public.harbor_quest_leaderboard (
    xp desc,
    gold desc,
    correct_count desc,
    cleared_count desc,
    updated_at asc
  );

-- Backfill XP from progress blobs when present.
update public.harbor_quest_leaderboard lb
set xp = greatest(
  lb.xp,
  coalesce((p.progress ->> 'xp')::int, 0)
)
from public.harbor_quest_progress p
where p.user_id = lb.user_id;
