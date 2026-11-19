-- Batch 2 Azure STT∩TTS voice languages (Account Hub primaries + per-lang voice prefs):
--   te = Telugu (te-IN)
--   gu = Gujarati (gu-IN)
--   kn = Kannada (kn-IN)
--   pl = Polish (pl-PL)
--   ro = Romanian (ro-RO)
--   cs = Czech (cs-CZ)
--   el = Greek (el-GR)
--   hu = Hungarian (hu-HU)
--   sv = Swedish (sv-SE)
--   ru = Russian (ru-RU)
--   uk = Ukrainian (uk-UA)
--   he = Hebrew (he-IL)
--   fa = Persian (fa-IR)
--   ur = Urdu (ur-IN)
-- ru / uk never share voices; fa never uses an Arabic voice; ur never uses a Hindi voice.

alter table public.profiles
  add column if not exists tts_voice_te text
  check (
    tts_voice_te is null
    or tts_voice_te in (
      'te-IN-ShrutiNeural',
      'te-IN-MohanNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_gu text
  check (
    tts_voice_gu is null
    or tts_voice_gu in (
      'gu-IN-DhwaniNeural',
      'gu-IN-NiranjanNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_kn text
  check (
    tts_voice_kn is null
    or tts_voice_kn in (
      'kn-IN-SapnaNeural',
      'kn-IN-GaganNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_pl text
  check (
    tts_voice_pl is null
    or tts_voice_pl in (
      'pl-PL-AgnieszkaNeural',
      'pl-PL-MarekNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ro text
  check (
    tts_voice_ro is null
    or tts_voice_ro in (
      'ro-RO-AlinaNeural',
      'ro-RO-EmilNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_cs text
  check (
    tts_voice_cs is null
    or tts_voice_cs in (
      'cs-CZ-VlastaNeural',
      'cs-CZ-AntoninNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_el text
  check (
    tts_voice_el is null
    or tts_voice_el in (
      'el-GR-AthinaNeural',
      'el-GR-NestorasNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_hu text
  check (
    tts_voice_hu is null
    or tts_voice_hu in (
      'hu-HU-NoemiNeural',
      'hu-HU-TamasNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_sv text
  check (
    tts_voice_sv is null
    or tts_voice_sv in (
      'sv-SE-SofieNeural',
      'sv-SE-MattiasNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ru text
  check (
    tts_voice_ru is null
    or tts_voice_ru in (
      'ru-RU-SvetlanaNeural',
      'ru-RU-DmitryNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_uk text
  check (
    tts_voice_uk is null
    or tts_voice_uk in (
      'uk-UA-PolinaNeural',
      'uk-UA-OstapNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_he text
  check (
    tts_voice_he is null
    or tts_voice_he in (
      'he-IL-HilaNeural',
      'he-IL-AvriNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_fa text
  check (
    tts_voice_fa is null
    or tts_voice_fa in (
      'fa-IR-DilaraNeural',
      'fa-IR-FaridNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ur text
  check (
    tts_voice_ur is null
    or tts_voice_ur in (
      'ur-IN-GulNeural',
      'ur-IN-SalmanNeural'
    )
  );

-- Allow the fourteen new codes as Account Hub primary language.
alter table public.profiles
  drop constraint if exists profiles_primary_lang_check;

alter table public.profiles
  add constraint profiles_primary_lang_check
  check (primary_lang in (
    'en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi',
    'th', 'lo', 'ko', 'ja', 'id', 'ms', 'pt', 'fr', 'hi', 'km', 'my', 'jv', 'it', 'de', 'nl',
    'ar', 'arsa',
    'ta', 'ptpt', 'tr', 'bn',
    'te', 'gu', 'kn', 'pl', 'ro', 'cs', 'el', 'hu', 'sv', 'ru', 'uk', 'he', 'fa', 'ur'
  ));
