-- Web Push (PWA) subscriptions + admin send history (service-role only).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz,
  user_agent text not null default '',
  locale text not null default '',
  platform text not null default '',
  enabled boolean not null default true
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_enabled_idx
  on public.push_subscriptions (enabled)
  where enabled = true;
create index if not exists push_subscriptions_updated_at_idx
  on public.push_subscriptions (updated_at desc);

create table if not exists public.push_sends (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  title text not null,
  body text not null default '',
  target_mode text not null,
  dry_run boolean not null default false,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  pruned_count integer not null default 0,
  status text not null default 'sent'
    check (status in ('sent', 'failed', 'dry_run', 'partial')),
  payload jsonb not null default '{}'::jsonb,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists push_sends_created_at_idx
  on public.push_sends (created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.push_sends enable row level security;
