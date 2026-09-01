-- ============================================================================
-- ONE-SHOT: apply household + plan renames + usage backfill (migrations 011–015)
-- Paste into Supabase Dashboard → SQL Editor → Run
-- Safe to re-run (IF NOT EXISTS / idempotent updates).
-- IMPORTANT: plan check constraints are dropped BEFORE renaming pro→family / max→business.
-- ============================================================================

-- >>> 011_rename_pro_plan_to_family.sql
-- Rename paid plan id `pro` → `family` (display name: Family / 家庭版).
-- Drop the check constraint BEFORE updating rows (old check only allows free/pro/max).

alter table public.profiles drop constraint if exists profiles_plan_check;

update public.profiles
set plan = 'family'
where plan = 'pro';

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'family', 'max'));

-- >>> 012_household_seats_pooled_usage.sql
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

-- >>> 013_profiles_username.sql
-- Account Hub username (unique, once-per-hour change cooldown).
alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists username_changed_at timestamptz;

-- Case-insensitive uniqueness; null usernames allowed (not yet set).
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or (
      char_length(username) between 3 and 24
      and username ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
    )
  );

-- >>> 014_rename_max_plan_to_business.sql
-- Rename Max plan → Business (keep existing paid users on the top tier).
-- Legacy checkout / env aliases for `max` remain in application code.
-- Drop check constraints BEFORE updating rows.

alter table public.profiles drop constraint if exists profiles_plan_check;

update public.profiles
set plan = 'business'
where plan = 'max';

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'family', 'business'));

alter table public.households drop constraint if exists households_plan_check;

update public.households
set plan = 'business'
where plan = 'max';

alter table public.households
  add constraint households_plan_check check (plan in ('family', 'business'));

-- >>> 015_backfill_household_usage_from_legacy.sql
-- Fold legacy per-user usage_months into household_usage_months for Family/Business seats.
-- Safe to re-run: merges pool + personal sums, then clears folded personal rows.

-- Ensure plan ids are current (idempotent with 011 / 014).
-- Drop checks first so renames cannot violate free/pro/max or free/family/max.
alter table public.profiles drop constraint if exists profiles_plan_check;

update public.profiles
set plan = 'family'
where plan = 'pro';

update public.profiles
set plan = 'business'
where plan = 'max';

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'family', 'business'));

alter table public.households drop constraint if exists households_plan_check;

update public.households
set plan = 'business'
where plan = 'max';

alter table public.households
  add constraint households_plan_check check (plan in ('family', 'business'));

-- Create households for paid owners who predate pooling.
insert into public.households (owner_user_id, plan, seat_limit)
select
  p.id,
  p.plan,
  case when p.plan = 'business' then 10 else 4 end
from public.profiles p
where p.plan in ('family', 'business')
  and not exists (
    select 1
    from public.household_members hm
    where hm.user_id = p.id
  )
on conflict (owner_user_id) do nothing;

-- Ensure each household has an owner membership row.
insert into public.household_members (household_id, user_id, member_role)
select h.id, h.owner_user_id, 'owner'
from public.households h
where not exists (
  select 1
  from public.household_members hm
  where hm.household_id = h.id
    and hm.user_id = h.owner_user_id
);

-- Merge pooled + summed personal usage for every household/month.
with member_usage as (
  select
    hm.household_id,
    um.month,
    sum(um.live_seconds) as live_seconds,
    sum(um.tts_chars) as tts_chars,
    sum(um.translate_count) as translate_count,
    sum(um.camera_seconds) as camera_seconds,
    sum(um.camera_translate_count) as camera_translate_count,
    sum(um.docs_pages) as docs_pages,
    sum(um.ai_vision_count) as ai_vision_count
  from public.household_members hm
  inner join public.usage_months um on um.user_id = hm.user_id
  group by hm.household_id, um.month
),
merged as (
  select
    coalesce(mu.household_id, hu.household_id) as household_id,
    coalesce(mu.month, hu.month) as month,
    coalesce(hu.live_seconds, 0) + coalesce(mu.live_seconds, 0) as live_seconds,
    coalesce(hu.tts_chars, 0) + coalesce(mu.tts_chars, 0) as tts_chars,
    coalesce(hu.translate_count, 0) + coalesce(mu.translate_count, 0) as translate_count,
    coalesce(hu.camera_seconds, 0) + coalesce(mu.camera_seconds, 0) as camera_seconds,
    coalesce(hu.camera_translate_count, 0) + coalesce(mu.camera_translate_count, 0)
      as camera_translate_count,
    coalesce(hu.docs_pages, 0) + coalesce(mu.docs_pages, 0) as docs_pages,
    coalesce(hu.ai_vision_count, 0) + coalesce(mu.ai_vision_count, 0) as ai_vision_count
  from member_usage mu
  full outer join public.household_usage_months hu
    on hu.household_id = mu.household_id
   and hu.month = mu.month
  where
    coalesce(mu.live_seconds, 0)
    + coalesce(mu.tts_chars, 0)
    + coalesce(mu.translate_count, 0)
    + coalesce(mu.camera_seconds, 0)
    + coalesce(mu.camera_translate_count, 0)
    + coalesce(mu.docs_pages, 0)
    + coalesce(mu.ai_vision_count, 0)
    + coalesce(hu.live_seconds, 0)
    + coalesce(hu.tts_chars, 0)
    + coalesce(hu.translate_count, 0)
    + coalesce(hu.camera_seconds, 0)
    + coalesce(hu.camera_translate_count, 0)
    + coalesce(hu.docs_pages, 0)
    + coalesce(hu.ai_vision_count, 0) > 0
)
insert into public.household_usage_months (
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
select
  household_id,
  month,
  live_seconds,
  tts_chars,
  translate_count,
  camera_seconds,
  camera_translate_count,
  docs_pages,
  ai_vision_count
from merged
on conflict (household_id, month) do update set
  live_seconds = excluded.live_seconds,
  tts_chars = excluded.tts_chars,
  translate_count = excluded.translate_count,
  camera_seconds = excluded.camera_seconds,
  camera_translate_count = excluded.camera_translate_count,
  docs_pages = excluded.docs_pages,
  ai_vision_count = excluded.ai_vision_count;

-- Clear personal rows that were folded into the household pool.
-- Note: Postgres forbids referencing the UPDATE target alias inside FROM/JOIN ON;
-- match month in WHERE instead.
update public.usage_months um
set
  live_seconds = 0,
  tts_chars = 0,
  translate_count = 0,
  camera_seconds = 0,
  camera_translate_count = 0,
  docs_pages = 0,
  ai_vision_count = 0
from public.household_members hm
inner join public.household_usage_months hu
  on hu.household_id = hm.household_id
where um.user_id = hm.user_id
  and um.month = hu.month
  and (
    um.live_seconds > 0
    or um.tts_chars > 0
    or um.translate_count > 0
    or um.camera_seconds > 0
    or um.camera_translate_count > 0
    or um.docs_pages > 0
    or um.ai_vision_count > 0
  );

-- Notify PostgREST to reload schema cache (clears 'schema cache' errors).
notify pgrst, 'reload schema';
