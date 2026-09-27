-- Allow English (`en`) as Account Hub primary language.
-- UI + API already accept `en`; without this check, PATCH /prefs/primary-lang
-- fails on upsert and the next bootstrap snaps back to the DB default `yue`.
alter table public.profiles
  drop constraint if exists profiles_primary_lang_check;

alter table public.profiles
  add constraint profiles_primary_lang_check
  check (primary_lang in ('en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi'));
