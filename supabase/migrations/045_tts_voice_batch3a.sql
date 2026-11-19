-- Batch 3a Azure STT∩TTS voice languages (Account Hub primaries + per-lang voice prefs):
--   ml = Malayalam (ml-IN)
--   mr = Marathi (mr-IN)
--   pa = Punjabi (pa-IN)
--   or = Odia (or-IN)
--   si = Sinhala (si-LK)
--   ne = Nepali (ne-NP)
--   da = Danish (da-DK)
--   nb = Norwegian Bokmål (nb-NO)
--   fi = Finnish (fi-FI)
--   sk = Slovak (sk-SK)
--   hr = Croatian (hr-HR)
--   ca = Catalan (ca-ES)
-- si (Sinhala) is never sichuan; mr / ne are Devanagari but never share voices with hi.

alter table public.profiles
  add column if not exists tts_voice_ml text
  check (
    tts_voice_ml is null
    or tts_voice_ml in (
      'ml-IN-SobhanaNeural',
      'ml-IN-MidhunNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_mr text
  check (
    tts_voice_mr is null
    or tts_voice_mr in (
      'mr-IN-AarohiNeural',
      'mr-IN-ManoharNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_pa text
  check (
    tts_voice_pa is null
    or tts_voice_pa in (
      'pa-IN-VaaniNeural',
      'pa-IN-OjasNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_or text
  check (
    tts_voice_or is null
    or tts_voice_or in (
      'or-IN-SubhasiniNeural',
      'or-IN-SukantNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_si text
  check (
    tts_voice_si is null
    or tts_voice_si in (
      'si-LK-ThiliniNeural',
      'si-LK-SameeraNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ne text
  check (
    tts_voice_ne is null
    or tts_voice_ne in (
      'ne-NP-HemkalaNeural',
      'ne-NP-SagarNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_da text
  check (
    tts_voice_da is null
    or tts_voice_da in (
      'da-DK-ChristelNeural',
      'da-DK-JeppeNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_nb text
  check (
    tts_voice_nb is null
    or tts_voice_nb in (
      'nb-NO-PernilleNeural',
      'nb-NO-FinnNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_fi text
  check (
    tts_voice_fi is null
    or tts_voice_fi in (
      'fi-FI-SelmaNeural',
      'fi-FI-HarriNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_sk text
  check (
    tts_voice_sk is null
    or tts_voice_sk in (
      'sk-SK-ViktoriaNeural',
      'sk-SK-LukasNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_hr text
  check (
    tts_voice_hr is null
    or tts_voice_hr in (
      'hr-HR-GabrijelaNeural',
      'hr-HR-SreckoNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ca text
  check (
    tts_voice_ca is null
    or tts_voice_ca in (
      'ca-ES-JoanaNeural',
      'ca-ES-EnricNeural'
    )
  );

-- Allow the twelve new codes as Account Hub primary language.
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
    'da', 'nb', 'fi', 'sk', 'hr', 'ca'
  ));
