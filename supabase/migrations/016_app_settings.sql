-- Ops-controlled site settings (service-role only; read via API).
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.app_settings (key, value)
values (
  'incident_banner',
  '{"enabled":false,"messageEn":"The app is currently experiencing issues and is being worked on.","messageZh":"應用程式目前出現問題，我們正在處理中。"}'::jsonb
)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
