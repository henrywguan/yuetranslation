-- Arabic as two peer VoiceLangs (like es / eses):
--   ar   = Egyptian Arabic colloquial (ar-EG)
--   arsa = Modern Standard Arabic / فصحى (ar-SA speech)
-- Voices are never shared between the two columns.
alter table public.profiles
  add column if not exists tts_voice_ar text
  check (
    tts_voice_ar is null
    or tts_voice_ar in (
      'ar-EG-SalmaNeural',
      'ar-EG-ShakirNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_arsa text
  check (
    tts_voice_arsa is null
    or tts_voice_arsa in (
      'ar-SA-ZariyahNeural',
      'ar-SA-HamedNeural'
    )
  );

-- Allow both Arabic codes as Account Hub primary language.
alter table public.profiles
  drop constraint if exists profiles_primary_lang_check;

alter table public.profiles
  add constraint profiles_primary_lang_check
  check (primary_lang in (
    'en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi',
    'th', 'lo', 'ko', 'ja', 'id', 'ms', 'pt', 'fr', 'hi', 'km', 'my', 'jv', 'it', 'de', 'nl',
    'ar', 'arsa'
  ));
