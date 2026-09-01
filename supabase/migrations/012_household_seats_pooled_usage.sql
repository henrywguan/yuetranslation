-- Family / Max household seats with pooled monthly usage.
-- One subscription → one household → shared meters (not per-seat quotas).

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('family', 'max')),
  seat_limit integer not null check (seat_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id)
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role text not null check (member_role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

create index if not exists household_members_household_idx
  on public.household_members (household_id);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_user_id uuid references public.profiles (id) on delete set null
);

create unique index if not exists household_invites_pending_email_idx
  on public.household_invites (household_id, lower(email))
  where status = 'pending';

create index if not exists household_invites_token_idx
  on public.household_invites (token);

create table if not exists public.household_usage_months (
  household_id uuid not null references public.households (id) on delete cascade,
  month text not null,
  live_seconds integer not null default 0,
  tts_chars integer not null default 0,
  translate_count integer not null default 0,
  camera_seconds integer not null default 0,
  camera_translate_count integer not null default 0,
  docs_pages integer not null default 0,
  ai_vision_count integer not null default 0,
  primary key (household_id, month)
);

create or replace function public.increment_household_usage(
  p_household_id uuid,
  p_month text,
  p_live_seconds integer default 0,
  p_tts_chars integer default 0,
  p_translate_count integer default 0,
  p_camera_seconds integer default 0,
  p_camera_translate_count integer default 0,
  p_docs_pages integer default 0,
  p_ai_vision_count integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_household_id is null or p_month is null or p_month = '' then
    return;
  end if;

  insert into public.household_usage_months as u (
    household_id,
    month,
    live_seconds,
    tts_chars,
    translate_count,
    camera_seconds,
    camera_translate_count,
    docs_pages,
    ai_vision_count
  )
  values (
    p_household_id,
    p_month,
    greatest(0, coalesce(p_live_seconds, 0)),
    greatest(0, coalesce(p_tts_chars, 0)),
    greatest(0, coalesce(p_translate_count, 0)),
    greatest(0, coalesce(p_camera_seconds, 0)),
    greatest(0, coalesce(p_camera_translate_count, 0)),
    greatest(0, coalesce(p_docs_pages, 0)),
    greatest(0, coalesce(p_ai_vision_count, 0))
  )
  on conflict (household_id, month) do update set
    live_seconds = u.live_seconds + greatest(0, coalesce(excluded.live_seconds, 0)),
    tts_chars = u.tts_chars + greatest(0, coalesce(excluded.tts_chars, 0)),
    translate_count = u.translate_count + greatest(0, coalesce(excluded.translate_count, 0)),
    camera_seconds = u.camera_seconds + greatest(0, coalesce(excluded.camera_seconds, 0)),
    camera_translate_count =
      u.camera_translate_count + greatest(0, coalesce(excluded.camera_translate_count, 0)),
    docs_pages = u.docs_pages + greatest(0, coalesce(excluded.docs_pages, 0)),
    ai_vision_count = u.ai_vision_count + greatest(0, coalesce(excluded.ai_vision_count, 0));
end;
$$;

revoke all on function public.increment_household_usage(
  uuid, text, integer, integer, integer, integer, integer, integer, integer
) from public;
grant execute on function public.increment_household_usage(
  uuid, text, integer, integer, integer, integer, integer, integer, integer
) to service_role;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.household_usage_months enable row level security;
