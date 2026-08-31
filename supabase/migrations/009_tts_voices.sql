-- Per-user Azure Neural TTS voice preferences (cross-device via Account Hub).
alter table public.profiles
  add column if not exists tts_voice_yue text
  check (
    tts_voice_yue is null
    or tts_voice_yue in (
      'zh-HK-HiuMaanNeural',
      'zh-HK-HiuGaaiNeural',
      'zh-HK-WanLungNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_en text
  check (
    tts_voice_en is null
    or tts_voice_en in (
      'en-US-JennyNeural',
      'en-US-GuyNeural',
      'en-US-AriaNeural',
      'en-GB-SoniaNeural',
      'en-GB-RyanNeural',
      'en-AU-NatashaNeural'
    )
  );
