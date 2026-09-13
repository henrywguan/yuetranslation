-- Cloud-synced Harbor Quest progress (signed-in accounts).
-- Tiny jsonb blob per user (~hundreds of bytes); same pattern as translation_history.
create table if not exists public.harbor_quest_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.harbor_quest_progress enable row level security;

create policy "Users read own harbor quest progress"
  on public.harbor_quest_progress for select
  using (auth.uid() = user_id);

create policy "Users insert own harbor quest progress"
  on public.harbor_quest_progress for insert
  with check (auth.uid() = user_id);

create policy "Users update own harbor quest progress"
  on public.harbor_quest_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own harbor quest progress"
  on public.harbor_quest_progress for delete
  using (auth.uid() = user_id);
