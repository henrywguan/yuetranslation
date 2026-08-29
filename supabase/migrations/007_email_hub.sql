-- Admin email hub: saved campaign templates + send log (service-role only).
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text not null default '',
  -- Built-in React Email variant key (announcement, product-update, …)
  base_variant text not null default 'announcement',
  subject text not null,
  preview_text text not null default '',
  fields jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  archived boolean not null default false
);

create index if not exists email_templates_updated_at_idx
  on public.email_templates (updated_at desc);
create index if not exists email_templates_archived_idx
  on public.email_templates (archived);

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  mode text not null check (mode in ('recipients', 'audience')),
  subject text not null,
  template_key text,
  recipient_count integer not null default 0,
  resend_id text,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  detail jsonb not null default '{}'::jsonb
);

create index if not exists email_sends_created_at_idx
  on public.email_sends (created_at desc);

alter table public.email_templates enable row level security;
alter table public.email_sends enable row level security;
