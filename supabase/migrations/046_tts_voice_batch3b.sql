-- Batch 3b Azure STT∩TTS voice languages (Account Hub primaries + per-lang voice prefs):
--   az = Azerbaijani, Latin script (az-AZ)
--   kk = Kazakh, Cyrillic (kk-KZ)
--   uz = Uzbek, Latin script (uz-UZ)
--   bg = Bulgarian, Cyrillic (bg-BG)
--   sr = Serbian, Cyrillic only — never sr-Latn (sr-RS)
--   sw = Swahili (sw-KE)
--   af = Afrikaans (af-ZA)

alter table public.profiles
  add column if not exists tts_voice_az text
  check (
    tts_voice_az is null
    or tts_voice_az in (
      'az-AZ-BanuNeural',
      'az-AZ-BabekNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_kk text
  check (
    tts_voice_kk is null
    or tts_voice_kk in (
      'kk-KZ-AigulNeural',
      'kk-KZ-DauletNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_uz text
  check (
    tts_voice_uz is null
    or tts_voice_uz in (
      'uz-UZ-MadinaNeural',
      'uz-UZ-SardorNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_bg text
  check (
    tts_voice_bg is null
    or tts_voice_bg in (
      'bg-BG-KalinaNeural',
      'bg-BG-BorislavNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_sr text
  check (
    tts_voice_sr is null
    or tts_voice_sr in (
      'sr-RS-SophieNeural',
      'sr-RS-NicholasNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_sw text
  check (
    tts_voice_sw is null
    or tts_voice_sw in (
      'sw-KE-ZuriNeural',
      'sw-KE-RafikiNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_af text
  check (
    tts_voice_af is null
    or tts_voice_af in (
      'af-ZA-AdriNeural',
      'af-ZA-WillemNeural'
    )
  );

-- Allow the seven new codes as Account Hub primary language.
alter table public.profiles
  drop constraint if exists profiles_primary_lang_check;

alter table public.profiles
  add constraint profiles_primary_lang_check
  check (primary_lang in (
    'en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi',
    'th', 'lo', 'ko', 'ja', 'id', 'ms', 'pt', 'fr', 'hi', 'km', 'my', 'jv', 'it', 'de', 'nl',
    'ar', 'arsa',
    'ta', 'ptpt', 'tr', 'bn',
    'te', 'gu', 'kn', 'pl', 'ro', 'cs', 'el', 'hu', 'sv', 'ru', 'uk', 'he', 'fa', 'ur',
    'ml', 'mr', 'pa', 'or', 'si', 'ne',
    'da', 'nb', 'fi', 'sk', 'hr', 'ca',
    'az', 'kk', 'uz', 'bg', 'sr', 'sw', 'af'
  ));
