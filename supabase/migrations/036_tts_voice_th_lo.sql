-- Per-user Thai + Lao Azure Neural TTS voice preference (cross-device via Account Hub).
alter table public.profiles
  add column if not exists tts_voice_th text
  check (
    tts_voice_th is null
    or tts_voice_th in (
      'th-TH-PremwadeeNeural',
      'th-TH-NiwatNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_lo text
  check (
    tts_voice_lo is null
    or tts_voice_lo in (
      'lo-LA-KeomanyNeural',
      'lo-LA-ChanthavongNeural'
    )
  );
