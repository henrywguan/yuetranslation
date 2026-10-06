-- Scaffold TTS voice prefs for 12 new VoiceLang codes.
alter table public.profiles
  add column if not exists tts_voice_ja text
  check (
    tts_voice_ja is null
    or tts_voice_ja in (
      'ja-JP-NanamiNeural',
      'ja-JP-KeitaNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_id text
  check (
    tts_voice_id is null
    or tts_voice_id in (
      'id-ID-GadisNeural',
      'id-ID-ArdiNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ms text
  check (
    tts_voice_ms is null
    or tts_voice_ms in (
      'ms-MY-YasminNeural',
      'ms-MY-OsmanNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_pt text
  check (
    tts_voice_pt is null
    or tts_voice_pt in (
      'pt-BR-FranciscaNeural',
      'pt-BR-AntonioNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_fr text
  check (
    tts_voice_fr is null
    or tts_voice_fr in (
      'fr-FR-DeniseNeural',
      'fr-FR-HenriNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_hi text
  check (
    tts_voice_hi is null
    or tts_voice_hi in (
      'hi-IN-AnanyaNeural',
      'hi-IN-AaravNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_km text
  check (
    tts_voice_km is null
    or tts_voice_km in (
      'km-KH-SreymomNeural',
      'km-KH-PisethNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_my text
  check (
    tts_voice_my is null
    or tts_voice_my in (
      'my-MM-NilarNeural',
      'my-MM-ThihaNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_jv text
  check (
    tts_voice_jv is null
    or tts_voice_jv in (
      'jv-ID-SitiNeural',
      'jv-ID-DimasNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_it text
  check (
    tts_voice_it is null
    or tts_voice_it in (
      'it-IT-ElsaNeural',
      'it-IT-DiegoNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_de text
  check (
    tts_voice_de is null
    or tts_voice_de in (
      'de-DE-KatjaNeural',
      'de-DE-ConradNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_nl text
  check (
    tts_voice_nl is null
    or tts_voice_nl in (
      'nl-NL-FennaNeural',
      'nl-NL-MaartenNeural'
    )
  );
