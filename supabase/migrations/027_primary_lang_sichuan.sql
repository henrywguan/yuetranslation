-- Allow Sichuanese as Account Hub primary language.
alter table public.profiles
  drop constraint if exists profiles_primary_lang_check;

alter table public.profiles
  add constraint profiles_primary_lang_check
  check (primary_lang in ('yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'vi'));
