-- Cloud-synced Solo / Conversation translation history (signed-in accounts).
create table if not exists public.translation_history (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  turns jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.translation_history enable row level security;

-- Service-role API uses the admin client; still lock down direct user access.
create policy "Users read own translation history"
  on public.translation_history for select
  using (auth.uid() = user_id);

create policy "Users upsert own translation history"
  on public.translation_history for insert
  with check (auth.uid() = user_id);

create policy "Users update own translation history"
  on public.translation_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own translation history"
  on public.translation_history for delete
  using (auth.uid() = user_id);
