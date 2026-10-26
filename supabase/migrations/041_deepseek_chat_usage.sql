-- DeepSeek general chat turn meter (Family/Business). Isolated from translate/usage_months RPCs.

create table if not exists public.deepseek_chat_months (
  user_id uuid not null references public.profiles (id) on delete cascade,
  month text not null,
  turn_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month),
  constraint deepseek_chat_months_month_check check (month ~ '^\d{4}_\d{2}$'),
  constraint deepseek_chat_months_turn_count_check check (turn_count >= 0)
);

create index if not exists deepseek_chat_months_month_idx
  on public.deepseek_chat_months (month);

comment on table public.deepseek_chat_months is
  'Monthly DeepSeek general-chat turns per user (Family/Business #/chat).';

create or replace function public.increment_deepseek_chat(
  p_user_id uuid,
  p_month text,
  p_turns integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_user_id is null or p_month is null or p_month = '' then
    return 0;
  end if;

  insert into public.profiles (id, plan)
  values (p_user_id, 'free')
  on conflict (id) do nothing;

  insert into public.deepseek_chat_months as u (user_id, month, turn_count, updated_at)
  values (
    p_user_id,
    p_month,
    greatest(0, coalesce(p_turns, 0)),
    now()
  )
  on conflict (user_id, month) do update set
    turn_count = u.turn_count + greatest(0, coalesce(excluded.turn_count, 0)),
    updated_at = now()
  returning turn_count into v_count;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.increment_deepseek_chat(uuid, text, integer) from public;
grant execute on function public.increment_deepseek_chat(uuid, text, integer) to service_role;
