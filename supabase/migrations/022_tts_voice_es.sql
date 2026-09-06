-- Per-user Mexican Spanish Azure Neural TTS voice preference (cross-device via Account Hub).
alter table public.profiles
  add column if not exists tts_voice_es text
  check (
    tts_voice_es is null
    or tts_voice_es in (
      'es-MX-DaliaNeural',
      'es-MX-JorgeNeural'
    )
  );
