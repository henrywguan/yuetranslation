-- User-submitted bug reports (logged-in only; written via service role API).
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  issue_type text not null check (
    issue_type in ('translation', 'mic', 'tts', 'camera', 'account', 'ui', 'crash', 'other')
  ),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  route text,
  mode text,
  client jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'triaged', 'closed'))
);

create index if not exists bug_reports_created_at_idx on public.bug_reports (created_at desc);
create index if not exists bug_reports_user_id_idx on public.bug_reports (user_id);
create index if not exists bug_reports_status_idx on public.bug_reports (status);

alter table public.bug_reports enable row level security;
