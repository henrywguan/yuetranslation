-- Per-user Mandarin Azure Neural TTS voice preference (cross-device via Account Hub).
alter table public.profiles
  add column if not exists tts_voice_cmn text
  check (
    tts_voice_cmn is null
    or tts_voice_cmn in (
      'zh-CN-XiaoxiaoNeural',
      'zh-CN-YunxiNeural'
    )
  );
