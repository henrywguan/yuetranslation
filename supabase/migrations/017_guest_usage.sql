-- Guest trial metering (anonymous cookie identity).
-- Mirrors usage_months meters without requiring auth.users / profiles.

create table if not exists public.guest_usage_months (
  guest_id uuid not null,
  month text not null,
  live_seconds integer not null default 0,
  tts_chars integer not null default 0,
  translate_count integer not null default 0,
  camera_seconds integer not null default 0,
  camera_translate_count integer not null default 0,
  docs_pages integer not null default 0,
  ai_vision_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (guest_id, month)
);

create index if not exists guest_usage_months_month_idx
  on public.guest_usage_months (month);

alter table public.guest_usage_months enable row level security;
-- Service role only (no anon/authenticated policies).

create or replace function public.increment_guest_usage(
  p_guest_id uuid,
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
  if p_guest_id is null or p_month is null or p_month = '' then
    return;
  end if;

  insert into public.guest_usage_months as g (
    guest_id,
    month,
    live_seconds,
    tts_chars,
    translate_count,
    camera_seconds,
    camera_translate_count,
    docs_pages,
    ai_vision_count,
    updated_at
  )
  values (
    p_guest_id,
    p_month,
    greatest(0, coalesce(p_live_seconds, 0)),
    greatest(0, coalesce(p_tts_chars, 0)),
    greatest(0, coalesce(p_translate_count, 0)),
    greatest(0, coalesce(p_camera_seconds, 0)),
    greatest(0, coalesce(p_camera_translate_count, 0)),
    greatest(0, coalesce(p_docs_pages, 0)),
    greatest(0, coalesce(p_ai_vision_count, 0)),
    now()
  )
  on conflict (guest_id, month) do update set
    live_seconds = g.live_seconds + greatest(0, coalesce(excluded.live_seconds, 0)),
    tts_chars = g.tts_chars + greatest(0, coalesce(excluded.tts_chars, 0)),
    translate_count = g.translate_count + greatest(0, coalesce(excluded.translate_count, 0)),
    camera_seconds = g.camera_seconds + greatest(0, coalesce(excluded.camera_seconds, 0)),
    camera_translate_count = g.camera_translate_count + greatest(0, coalesce(excluded.camera_translate_count, 0)),
    docs_pages = g.docs_pages + greatest(0, coalesce(excluded.docs_pages, 0)),
    ai_vision_count = g.ai_vision_count + greatest(0, coalesce(excluded.ai_vision_count, 0)),
    updated_at = now();
end;
$$;

revoke all on function public.increment_guest_usage(
  uuid, text, integer, integer, integer, integer, integer, integer, integer
) from public;
grant execute on function public.increment_guest_usage(
  uuid, text, integer, integer, integer, integer, integer, integer, integer
) to service_role;

-- Fold guest trial usage into a signed-in user's personal usage_months, then clear guest rows.
create or replace function public.merge_guest_usage_into_user(
  p_guest_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_guest_id is null or p_user_id is null then
    return;
  end if;

  insert into public.profiles (id, plan)
  values (p_user_id, 'free')
  on conflict (id) do nothing;

  for r in
    select *
    from public.guest_usage_months
    where guest_id = p_guest_id
  loop
    perform public.increment_usage(
      p_user_id,
      r.month,
      r.live_seconds,
      r.tts_chars,
      r.translate_count,
      r.camera_seconds,
      r.camera_translate_count,
      r.docs_pages,
      r.ai_vision_count
    );
  end loop;

  delete from public.guest_usage_months where guest_id = p_guest_id;
end;
$$;

revoke all on function public.merge_guest_usage_into_user(uuid, uuid) from public;
grant execute on function public.merge_guest_usage_into_user(uuid, uuid) to service_role;
