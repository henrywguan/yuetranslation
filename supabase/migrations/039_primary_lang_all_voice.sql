-- Allow every voice-capable language as Account Hub primary language.
-- Text-only langs (ceb / ilo / bcl) stay out — no Conversation / STT / TTS.
alter table public.profiles
  drop constraint if exists profiles_primary_lang_check;

alter table public.profiles
  add constraint profiles_primary_lang_check
  check (primary_lang in (
    'en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi',
    'th', 'lo', 'ko', 'ja', 'id', 'ms', 'pt', 'fr', 'hi', 'km', 'my', 'jv', 'it', 'de', 'nl'
  ));
