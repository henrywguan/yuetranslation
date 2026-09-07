-- Per-user Vietnamese Azure Neural TTS voice preference (cross-device via Account Hub).
alter table public.profiles
  add column if not exists tts_voice_vi text
  check (
    tts_voice_vi is null
    or tts_voice_vi in (
      'vi-VN-HoaiMyNeural',
      'vi-VN-NamMinhNeural'
    )
  );
