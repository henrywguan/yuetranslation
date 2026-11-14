-- Per-user DeepSeek Chat plugin / generation API keys (BYOK).
-- Ciphertext is AES-256-GCM from the API (service role only). Never expose via anon RLS.

create table if not exists public.chat_plugin_keys (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null default now()
);

alter table public.chat_plugin_keys enable row level security;

-- No policies for authenticated/anon — API uses service role only.

comment on table public.chat_plugin_keys is
  'Encrypted BYOK secrets for #/chat plugins (OpenAI Images, Higgsfield/Adobe/Cursor MCP).';
