-- Harbor Quest progress: service-role (API) writes only.
-- Keeps SELECT so signed-in clients can read own row if needed; removes
-- direct PostgREST insert/update/delete that bypassed API sanitize.

drop policy if exists "Users insert own harbor quest progress"
  on public.harbor_quest_progress;
drop policy if exists "Users update own harbor quest progress"
  on public.harbor_quest_progress;
drop policy if exists "Users delete own harbor quest progress"
  on public.harbor_quest_progress;

notify pgrst, 'reload schema';
