-- Per-user Tagalog Azure Neural TTS voice preference (cross-device via Account Hub).
alter table public.profiles
  add column if not exists tts_voice_tl text
  check (
    tts_voice_tl is null
    or tts_voice_tl in (
      'fil-PH-BlessicaNeural',
      'fil-PH-AngeloNeural'
    )
  );
