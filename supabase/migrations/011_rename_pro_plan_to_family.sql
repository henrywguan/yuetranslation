-- Rename paid plan id `pro` → `family` (display name: Family / 家庭版).
-- Safe to re-run: updates existing rows, then replaces the check constraint.

update public.profiles
set plan = 'family'
where plan = 'pro';

alter table public.profiles drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'family', 'max'));
