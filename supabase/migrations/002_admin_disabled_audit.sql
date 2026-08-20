-- Admin panel: ban flag + audit trail
-- Run in Supabase SQL editor or via supabase db push

alter table public.profiles
  add column if not exists disabled boolean not null default false;

create table if not exists public.admin_audit_log (
  id bigserial primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,
  target_user_id uuid,
  target_email text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;
-- No client policies: only the service role (API) reads/writes audit rows.
