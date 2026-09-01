-- Rename paid plan id `pro` → `family` (display name: Family / 家庭版).
-- Drop the check constraint BEFORE updating rows (old check only allows free/pro/max).

alter table public.profiles drop constraint if exists profiles_plan_check;

update public.profiles
set plan = 'family'
where plan = 'pro';

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'family', 'max'));
