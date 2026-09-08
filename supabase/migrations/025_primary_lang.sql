-- Cross-device primary language preference (Account Hub).
-- Non-English language paired with English in Solo / Conversation / Cam.
alter table public.profiles
  add column if not exists primary_lang text not null default 'yue';

alter table public.profiles
  drop constraint if exists profiles_primary_lang_check;

alter table public.profiles
  add constraint profiles_primary_lang_check
  check (primary_lang in ('yue', 'cmn', 'wuu', 'tl', 'es', 'vi'));

comment on column public.profiles.primary_lang is
  'User preference: primary non-English language for Solo lower, Conversation partner, Cam target, and brand tag.';
