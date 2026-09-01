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
