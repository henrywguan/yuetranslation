-- Per-user Peninsular Spanish Azure Neural TTS voice preference (cross-device via Account Hub).
alter table public.profiles
  add column if not exists tts_voice_eses text
  check (
    tts_voice_eses is null
    or tts_voice_eses in (
      'es-ES-ElviraNeural',
      'es-ES-AlvaroNeural'
    )
  );
