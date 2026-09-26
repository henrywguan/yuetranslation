-- Global Practice Partner leaderboard (denormalized for ranked reads).
-- Scores are written only by the API (service role) when a signed-in player syncs.
-- Anyone may read ranks; clients never write this table directly.
-- Rank: lifetime XP, then best streak, then total passes.

create table if not exists public.practice_partner_leaderboard (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null default 'Partner',
  xp integer not null default 0 check (xp >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  total_passes integer not null default 0 check (total_passes >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists practice_partner_leaderboard_rank_idx
  on public.practice_partner_leaderboard (xp desc, best_streak desc, total_passes desc, updated_at asc);

alter table public.practice_partner_leaderboard enable row level security;

drop policy if exists "Anyone can read practice partner leaderboard"
  on public.practice_partner_leaderboard;
create policy "Anyone can read practice partner leaderboard"
  on public.practice_partner_leaderboard for select
  using (true);

-- No insert/update/delete policies for authenticated clients — service role only.
