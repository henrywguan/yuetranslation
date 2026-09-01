-- Fold legacy per-user usage_months into household_usage_months for Family/Business seats.
-- Safe to re-run: merges pool + personal sums, then clears folded personal rows.

-- Ensure plan ids are current (idempotent with 011 / 014).
update public.profiles
set plan = 'family'
where plan = 'pro';

update public.profiles
set plan = 'business'
where plan = 'max';

update public.households
set plan = 'business'
where plan = 'max';

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
 and hu.month = um.month
where um.user_id = hm.user_id
  and (
    um.live_seconds > 0
    or um.tts_chars > 0
    or um.translate_count > 0
    or um.camera_seconds > 0
    or um.camera_translate_count > 0
    or um.docs_pages > 0
    or um.ai_vision_count > 0
  );
