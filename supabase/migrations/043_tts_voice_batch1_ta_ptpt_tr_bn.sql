-- Batch 1 Azure STT∩TTS voice languages:
--   ta   = Tamil (ta-IN)
--   ptpt = European Portuguese (pt-PT) — peer to `pt` (pt-BR); voices never shared
--   tr   = Turkish (tr-TR)
--   bn   = Bengali (bn-IN)
alter table public.profiles
  add column if not exists tts_voice_ta text
  check (
    tts_voice_ta is null
    or tts_voice_ta in (
      'ta-IN-PallaviNeural',
      'ta-IN-ValluvarNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ptpt text
  check (
    tts_voice_ptpt is null
    or tts_voice_ptpt in (
      'pt-PT-RaquelNeural',
      'pt-PT-DuarteNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_tr text
  check (
    tts_voice_tr is null
    or tts_voice_tr in (
      'tr-TR-EmelNeural',
      'tr-TR-AhmetNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_bn text
  check (
    tts_voice_bn is null
    or tts_voice_bn in (
      'bn-IN-TanishaaNeural',
      'bn-IN-BashkarNeural'
    )
  );

-- Allow the four new codes as Account Hub primary language.
alter table public.profiles
  drop constraint if exists profiles_primary_lang_check;

alter table public.profiles
  add constraint profiles_primary_lang_check
  check (primary_lang in (
    'en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi',
    'th', 'lo', 'ko', 'ja', 'id', 'ms', 'pt', 'fr', 'hi', 'km', 'my', 'jv', 'it', 'de', 'nl',
    'ar', 'arsa',
    'ta', 'ptpt', 'tr', 'bn'
  ));
