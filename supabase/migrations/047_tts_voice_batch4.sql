-- Batch 4 Azure STT∩TTS voice languages (Account Hub primaries + per-lang voice prefs):
--   et = Estonian (et-EE)
--   lv = Latvian (lv-LV)
--   lt = Lithuanian (lt-LT)
--   ga = Irish (ga-IE)
--   cy = Welsh (cy-GB)
--   eu = Basque (eu-ES)
--   gl = Galician (gl-ES)
--   mt = Maltese (mt-MT)
--   is = Icelandic (is-IS)
--   bs = Bosnian, Latin script only (bs-BA)
--   sq = Albanian (sq-AL)
--   zu = Zulu (zu-ZA)
--   so = Somali (so-SO)
--   as = Assamese, Bengali-Assamese script (as-IN)
--   mk = Macedonian, Cyrillic (mk-MK)
--   mn = Mongolian, Mongolian Cyrillic (mn-MN)
--   hy = Armenian script (hy-AM)
--   ka = Georgian script (ka-GE)
--   am = Amharic, Ethiopic script (am-ET)
--   ps = Pashto, Arabic script RTL (ps-AF)

alter table public.profiles
  add column if not exists tts_voice_et text
  check (
    tts_voice_et is null
    or tts_voice_et in (
      'et-EE-AnuNeural',
      'et-EE-KertNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_lv text
  check (
    tts_voice_lv is null
    or tts_voice_lv in (
      'lv-LV-EveritaNeural',
      'lv-LV-NilsNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_lt text
  check (
    tts_voice_lt is null
    or tts_voice_lt in (
      'lt-LT-OnaNeural',
      'lt-LT-LeonasNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ga text
  check (
    tts_voice_ga is null
    or tts_voice_ga in (
      'ga-IE-OrlaNeural',
      'ga-IE-ColmNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_cy text
  check (
    tts_voice_cy is null
    or tts_voice_cy in (
      'cy-GB-NiaNeural',
      'cy-GB-AledNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_eu text
  check (
    tts_voice_eu is null
    or tts_voice_eu in (
      'eu-ES-AinhoaNeural',
      'eu-ES-AnderNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_gl text
  check (
    tts_voice_gl is null
    or tts_voice_gl in (
      'gl-ES-SabelaNeural',
      'gl-ES-RoiNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_mt text
  check (
    tts_voice_mt is null
    or tts_voice_mt in (
      'mt-MT-GraceNeural',
      'mt-MT-JosephNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_is text
  check (
    tts_voice_is is null
    or tts_voice_is in (
      'is-IS-GudrunNeural',
      'is-IS-GunnarNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_bs text
  check (
    tts_voice_bs is null
    or tts_voice_bs in (
      'bs-BA-VesnaNeural',
      'bs-BA-GoranNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_sq text
  check (
    tts_voice_sq is null
    or tts_voice_sq in (
      'sq-AL-AnilaNeural',
      'sq-AL-IlirNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_zu text
  check (
    tts_voice_zu is null
    or tts_voice_zu in (
      'zu-ZA-ThandoNeural',
      'zu-ZA-ThembaNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_so text
  check (
    tts_voice_so is null
    or tts_voice_so in (
      'so-SO-UbaxNeural',
      'so-SO-MuuseNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_as text
  check (
    tts_voice_as is null
    or tts_voice_as in (
      'as-IN-YashicaNeural',
      'as-IN-PriyomNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_mk text
  check (
    tts_voice_mk is null
    or tts_voice_mk in (
      'mk-MK-MarijaNeural',
      'mk-MK-AleksandarNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_mn text
  check (
    tts_voice_mn is null
    or tts_voice_mn in (
      'mn-MN-YesuiNeural',
      'mn-MN-BataaNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_hy text
  check (
    tts_voice_hy is null
    or tts_voice_hy in (
      'hy-AM-AnahitNeural',
      'hy-AM-HaykNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ka text
  check (
    tts_voice_ka is null
    or tts_voice_ka in (
      'ka-GE-EkaNeural',
      'ka-GE-GiorgiNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_am text
  check (
    tts_voice_am is null
    or tts_voice_am in (
      'am-ET-MekdesNeural',
      'am-ET-AmehaNeural'
    )
  );

alter table public.profiles
  add column if not exists tts_voice_ps text
  check (
    tts_voice_ps is null
    or tts_voice_ps in (
      'ps-AF-LatifaNeural',
      'ps-AF-GulNawazNeural'
    )
  );

-- Allow the twenty new codes as Account Hub primary language.
alter table public.profiles
  drop constraint if exists profiles_primary_lang_check;

alter table public.profiles
  add constraint profiles_primary_lang_check
  check (primary_lang in (
    'en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi',
    'th', 'lo', 'ko', 'ja', 'id', 'ms', 'pt', 'fr', 'hi', 'km', 'my', 'jv', 'it', 'de', 'nl',
    'ar', 'arsa',
    'ta', 'ptpt', 'tr', 'bn',
    'te', 'gu', 'kn', 'pl', 'ro', 'cs', 'el', 'hu', 'sv', 'ru', 'uk', 'he', 'fa', 'ur',
    'ml', 'mr', 'pa', 'or', 'si', 'ne',
    'da', 'nb', 'fi', 'sk', 'hr', 'ca',
    'az', 'kk', 'uz', 'bg', 'sr', 'sw', 'af',
    'et', 'lv', 'lt', 'ga', 'cy', 'eu', 'gl',
    'mt', 'is', 'bs', 'sq', 'zu', 'so', 'as',
    'mk', 'mn', 'hy', 'ka', 'am', 'ps'
  ));
