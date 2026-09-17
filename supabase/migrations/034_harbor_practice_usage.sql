-- Harbor Quest + Practice Partner engagement meters (admin view-only; no hard caps).

alter table public.usage_months
  add column if not exists harbor_quest_count integer not null default 0;

alter table public.usage_months
  add column if not exists practice_partner_count integer not null default 0;

alter table public.household_usage_months
  add column if not exists harbor_quest_count integer not null default 0;

alter table public.household_usage_months
  add column if not exists practice_partner_count integer not null default 0;

create or replace function public.increment_usage(
  p_user_id uuid,
  p_month text,
  p_live_seconds integer default 0,
  p_tts_chars integer default 0,
  p_translate_count integer default 0,
  p_camera_seconds integer default 0,
  p_camera_translate_count integer default 0,
  p_docs_pages integer default 0,
  p_ai_vision_count integer default 0,
  p_harbor_quest_count integer default 0,
  p_practice_partner_count integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_month is null or p_month = '' then
    return;
  end if;

  insert into public.profiles (id, plan)
  values (p_user_id, 'free')
  on conflict (id) do nothing;

  insert into public.usage_months as u (
    user_id,
    month,
    live_seconds,
    tts_chars,
    translate_count,
    camera_seconds,
    camera_translate_count,
    docs_pages,
    ai_vision_count,
    harbor_quest_count,
    practice_partner_count
  )
  values (
    p_user_id,
    p_month,
    greatest(0, coalesce(p_live_seconds, 0)),
    greatest(0, coalesce(p_tts_chars, 0)),
    greatest(0, coalesce(p_translate_count, 0)),
    greatest(0, coalesce(p_camera_seconds, 0)),
    greatest(0, coalesce(p_camera_translate_count, 0)),
    greatest(0, coalesce(p_docs_pages, 0)),
    greatest(0, coalesce(p_ai_vision_count, 0)),
    greatest(0, coalesce(p_harbor_quest_count, 0)),
    greatest(0, coalesce(p_practice_partner_count, 0))
  )
  on conflict (user_id, month) do update set
    live_seconds = u.live_seconds + greatest(0, coalesce(excluded.live_seconds, 0)),
    tts_chars = u.tts_chars + greatest(0, coalesce(excluded.tts_chars, 0)),
    translate_count = u.translate_count + greatest(0, coalesce(excluded.translate_count, 0)),
    camera_seconds = u.camera_seconds + greatest(0, coalesce(excluded.camera_seconds, 0)),
    camera_translate_count =
      u.camera_translate_count + greatest(0, coalesce(excluded.camera_translate_count, 0)),
    docs_pages = u.docs_pages + greatest(0, coalesce(excluded.docs_pages, 0)),
    ai_vision_count = u.ai_vision_count + greatest(0, coalesce(excluded.ai_vision_count, 0)),
    harbor_quest_count =
      u.harbor_quest_count + greatest(0, coalesce(excluded.harbor_quest_count, 0)),
    practice_partner_count =
      u.practice_partner_count + greatest(0, coalesce(excluded.practice_partner_count, 0));
end;
$$;

revoke all on function public.increment_usage(uuid, text, integer, integer, integer) from public;
revoke all on function public.increment_usage(uuid, text, integer, integer, integer, integer, integer) from public;
revoke all on function public.increment_usage(uuid, text, integer, integer, integer, integer, integer, integer) from public;
revoke all on function public.increment_usage(uuid, text, integer, integer, integer, integer, integer, integer, integer) from public;
revoke all on function public.increment_usage(
  uuid, text, integer, integer, integer, integer, integer, integer, integer, integer, integer
) from public;
grant execute on function public.increment_usage(
  uuid, text, integer, integer, integer, integer, integer, integer, integer, integer, integer
) to service_role;

create or replace function public.increment_household_usage(
  p_household_id uuid,
  p_month text,
  p_live_seconds integer default 0,
  p_tts_chars integer default 0,
  p_translate_count integer default 0,
  p_camera_seconds integer default 0,
  p_camera_translate_count integer default 0,
  p_docs_pages integer default 0,
  p_ai_vision_count integer default 0,
  p_harbor_quest_count integer default 0,
  p_practice_partner_count integer default 0
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
    ai_vision_count,
    harbor_quest_count,
    practice_partner_count
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
    greatest(0, coalesce(p_ai_vision_count, 0)),
    greatest(0, coalesce(p_harbor_quest_count, 0)),
    greatest(0, coalesce(p_practice_partner_count, 0))
  )
  on conflict (household_id, month) do update set
    live_seconds = u.live_seconds + greatest(0, coalesce(excluded.live_seconds, 0)),
    tts_chars = u.tts_chars + greatest(0, coalesce(excluded.tts_chars, 0)),
    translate_count = u.translate_count + greatest(0, coalesce(excluded.translate_count, 0)),
    camera_seconds = u.camera_seconds + greatest(0, coalesce(excluded.camera_seconds, 0)),
    camera_translate_count =
      u.camera_translate_count + greatest(0, coalesce(excluded.camera_translate_count, 0)),
    docs_pages = u.docs_pages + greatest(0, coalesce(excluded.docs_pages, 0)),
    ai_vision_count = u.ai_vision_count + greatest(0, coalesce(excluded.ai_vision_count, 0)),
    harbor_quest_count =
      u.harbor_quest_count + greatest(0, coalesce(excluded.harbor_quest_count, 0)),
    practice_partner_count =
      u.practice_partner_count + greatest(0, coalesce(excluded.practice_partner_count, 0));
end;
$$;

revoke all on function public.increment_household_usage(
  uuid, text, integer, integer, integer, integer, integer, integer, integer
) from public;
revoke all on function public.increment_household_usage(
  uuid, text, integer, integer, integer, integer, integer, integer, integer, integer, integer
) from public;
grant execute on function public.increment_household_usage(
  uuid, text, integer, integer, integer, integer, integer, integer, integer, integer, integer
) to service_role;

comment on column public.usage_months.harbor_quest_count is
  'Harbor Quest correct-answer increments this month (admin view-only).';
comment on column public.usage_months.practice_partner_count is
  'Practice Partner LLM chat turns this month (admin view-only).';
