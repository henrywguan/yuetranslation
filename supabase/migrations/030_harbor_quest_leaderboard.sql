-- Global Harbor Quest player leaderboard (denormalized for ranked reads).
-- Scores are written only by the API (service role) when progress syncs.
-- Anyone may read ranks; clients never write this table directly.

create table if not exists public.harbor_quest_leaderboard (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null default 'Sailor',
  gold integer not null default 0 check (gold >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  cleared_count integer not null default 0 check (cleared_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists harbor_quest_leaderboard_rank_idx
  on public.harbor_quest_leaderboard (gold desc, correct_count desc, cleared_count desc, updated_at asc);

alter table public.harbor_quest_leaderboard enable row level security;

-- Public read (guest Learn hub can show the board).
drop policy if exists "Anyone can read harbor quest leaderboard"
  on public.harbor_quest_leaderboard;
create policy "Anyone can read harbor quest leaderboard"
  on public.harbor_quest_leaderboard for select
  using (true);

-- No insert/update/delete policies for authenticated clients — service role only.

-- Backfill from existing progress blobs (safe to re-run).
insert into public.harbor_quest_leaderboard (
  user_id,
  display_name,
  gold,
  correct_count,
  cleared_count,
  updated_at
)
select
  p.user_id,
  coalesce(nullif(trim(pr.username), ''), 'Sailor'),
  greatest(coalesce((p.progress ->> 'gold')::int, 0), 0),
  greatest(coalesce((p.progress ->> 'correctCount')::int, 0), 0),
  greatest(coalesce(jsonb_array_length(p.progress -> 'cleared'), 0), 0),
  p.updated_at
from public.harbor_quest_progress p
left join public.profiles pr on pr.id = p.user_id
on conflict (user_id) do update set
  display_name = excluded.display_name,
  gold = greatest(public.harbor_quest_leaderboard.gold, excluded.gold),
  correct_count = greatest(public.harbor_quest_leaderboard.correct_count, excluded.correct_count),
  cleared_count = greatest(public.harbor_quest_leaderboard.cleared_count, excluded.cleared_count),
  updated_at = greatest(public.harbor_quest_leaderboard.updated_at, excluded.updated_at);
