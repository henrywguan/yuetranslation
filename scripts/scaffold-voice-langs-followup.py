#!/usr/bin/env python3
"""
Finish VoiceLang scaffold wiring the first script left incomplete.
Idempotent: safe to re-run.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LANGS = [
    ("ja", "Japanese", "日本語", "Ja", "🇯🇵", "ja-JP", "ja",
     "ja-JP-NanamiNeural", "ja-JP-KeitaNeural", "Nanami", "Keita"),
    ("id", "Indonesian", "Bahasa Indonesia", "Id", "🇮🇩", "id-ID", "id",
     "id-ID-GadisNeural", "id-ID-ArdiNeural", "Gadis", "Ardi"),
    ("ms", "Malay", "Bahasa Melayu", "Ms", "🇲🇾", "ms-MY", "ms",
     "ms-MY-YasminNeural", "ms-MY-OsmanNeural", "Yasmin", "Osman"),
    ("pt", "Portuguese (BR)", "Português (BR)", "Pt", "🇧🇷", "pt-BR", "pt-BR",
     "pt-BR-FranciscaNeural", "pt-BR-AntonioNeural", "Francisca", "Antonio"),
    ("fr", "French", "Français", "Fr", "🇫🇷", "fr-FR", "fr-FR",
     "fr-FR-DeniseNeural", "fr-FR-HenriNeural", "Denise", "Henri"),
    ("hi", "Hindi", "हिन्दी", "Hi", "🇮🇳", "hi-IN", "hi",
     "hi-IN-AnanyaNeural", "hi-IN-AaravNeural", "Ananya", "Aarav"),
    ("km", "Khmer", "ភាសាខ្មែរ", "Km", "🇰🇭", "km-KH", "km",
     "km-KH-SreymomNeural", "km-KH-PisethNeural", "Sreymom", "Piseth"),
    ("my", "Burmese", "မြန်မာ", "My", "🇲🇲", "my-MM", "my",
     "my-MM-NilarNeural", "my-MM-ThihaNeural", "Nilar", "Thiha"),
    ("jv", "Javanese", "Basa Jawa", "Jv", "🇮🇩", "jv-ID", "jv",
     "jv-ID-SitiNeural", "jv-ID-DimasNeural", "Siti", "Dimas"),
    ("it", "Italian", "Italiano", "It", "🇮🇹", "it-IT", "it-IT",
     "it-IT-ElsaNeural", "it-IT-DiegoNeural", "Elsa", "Diego"),
    ("de", "German", "Deutsch", "De", "🇩🇪", "de-DE", "de-DE",
     "de-DE-KatjaNeural", "de-DE-ConradNeural", "Katja", "Conrad"),
    ("nl", "Dutch", "Nederlands", "Nl", "🇳🇱", "nl-NL", "nl-NL",
     "nl-NL-FennaNeural", "nl-NL-MaartenNeural", "Fenna", "Maarten"),
]

CODES = [L[0] for L in LANGS]
LOCALE = {L[0]: L[5] for L in LANGS}
EN = {L[0]: L[1] for L in LANGS}
NATIVE = {L[0]: L[2] for L in LANGS}
MARK = {L[0]: L[3] for L in LANGS}
ZH = {
    "ja": "日文", "id": "印尼話", "ms": "馬來話", "pt": "巴西葡文",
    "fr": "法文", "hi": "印地話", "km": "高棉話", "my": "緬甸話",
    "jv": "爪哇話", "it": "意大利文", "de": "德文", "nl": "荷蘭文",
}
JP = {
    "ja": "jat6 man2", "id": "jan3 nei4 waa2", "ms": "maa5 loi4 waa2",
    "pt": "baa1 sai1 pou4 man2", "fr": "faat3 man2", "hi": "jan3 dei6 waa2",
    "km": "gou1 min4 waa2", "my": "min5 din6 waa2", "jv": "zaau2 waa1 waa2",
    "it": "ji1 daai6 lei6 man2", "de": "dak1 man2", "nl": "ho4 laan4 man2",
}
PLACEHOLDER = {
    "ja": "日本語で入力するか話す",
    "id": "Ketik atau bicara Bahasa Indonesia…",
    "ms": "Taip atau bercakap Bahasa Melayu…",
    "pt": "Digite ou fale em português (BR)…",
    "fr": "Tapez ou parlez en français…",
    "hi": "हिन्दी में टाइप करें या बोलें…",
    "km": "វាយ ឬនិយា�lez en français…",
    "hi": "हिन्दी में टाइप करें या बोलें…",
    "km": "វាយ ឬនិយាយភាសាខ្មែរ…",
    "my": "မြန်မာလို ရိုက်ပါ သို့မဟုတ် ပြောပါ…",
    "jv": "Ketik utawa ngomong Basa Jawa…",
    "it": "Digita o parla in italiano…",
    "de": "Auf Deutsch tippen oder sprechen…",
    "nl": "Typ of spreek Nederlands…",
}
ARIA = {
    "ja": "Speak Japanese with the mic",
    "id": "Speak Indonesian with the mic",
    "ms": "Speak Malay with the mic",
    "pt": "Speak Portuguese (BR) with the mic",
    "fr": "Speak French with the mic",
    "hi": "Speak Hindi with the mic",
    "km": "Speak Khmer with the mic",
    "my": "Speak Burmese with the mic",
    "jv": "Speak Javanese with the mic",
    "it": "Speak Italian with the mic",
    "de": "Speak German with the mic",
    "nl": "Speak Dutch with the mic",
}


def pascal(code: str) -> str:
    return {"pt": "Pt", "id": "Id", "ms": "Ms", "my": "My"}.get(code, code[:1].upper() + code[1:])


def text_comp(code: str) -> str:
    return f"{pascal(code)}Text"


def ensure_after(text: str, anchor: str, insert: str) -> str:
    if insert.strip() in text:
        return text
    if anchor not in text:
        raise SystemExit(f"MISSING anchor: {anchor[:100]!r}")
    return text.replace(anchor, anchor + insert, 1)


def ensure_contains(path: Path, needle: str) -> bool:
    return needle in path.read_text()


def patch_file(path: Path, fn) -> None:
    text = path.read_text()
    new = fn(text)
    if new != text:
        path.write_text(new)
        print("patched", path.relative_to(ROOT))
    else:
        print("unchanged", path.relative_to(ROOT))


def expand_union(text: str, after_ko: bool = True) -> str:
    """Insert new codes after 'ko' in common union/enum patterns."""
    # z.enum / array style: ..., 'ko', 'ceb'
    text = text.replace(
        "'ko',\n  'ceb'",
        "'ko',\n" + "".join(f"  '{c}',\n" for c in CODES) + "  'ceb'",
    )
    text = text.replace(
        "'ko',\n    'ceb'",
        "'ko',\n" + "".join(f"    '{c}',\n" for c in CODES) + "    'ceb'",
    )
    text = text.replace(
        "| 'ko'\n  | 'ceb'",
        "| 'ko'\n" + "".join(f"  | '{c}'\n" for c in CODES) + "  | 'ceb'",
    )
    text = text.replace(
        "| 'ko'\n        | 'ceb'",
        "| 'ko'\n" + "".join(f"        | '{c}'\n" for c in CODES) + "        | 'ceb'",
    )
    # single-line
    old = "'th' | 'lo' | 'ko' | 'ceb'"
    new = "'th' | 'lo' | 'ko'" + "".join(f" | '{c}'" for c in CODES) + " | 'ceb'"
    text = text.replace(old, new)
    old2 = "'th', 'lo', 'ko', 'ceb'"
    new2 = "'th', 'lo', 'ko'" + "".join(f", '{c}'" for c in CODES) + ", 'ceb'"
    text = text.replace(old2, new2)
    # camera from/to with zh and without new langs
    old3 = "'th' | 'lo' | 'ko' | 'ceb' | 'ilo' | 'bcl'"
    new3 = "'th' | 'lo' | 'ko'" + "".join(f" | '{c}'" for c in CODES) + " | 'ceb' | 'ilo' | 'bcl'"
    text = text.replace(old3, new3)
    old4 = "'en' | 'zh' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ceb' | 'ilo' | 'bcl'"
    new4 = (
        "'en' | 'zh' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko'"
        + "".join(f" | '{c}'" for c in CODES)
        + " | 'ceb' | 'ilo' | 'bcl'"
    )
    text = text.replace(old4, new4)
    # cameraScan enum
    old5 = "'en', 'zh', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi', 'th', 'lo', 'ko', 'ceb', 'ilo', 'bcl'"
    new5 = (
        "'en', 'zh', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi', 'th', 'lo', 'ko'"
        + "".join(f", '{c}'" for c in CODES)
        + ", 'ceb', 'ilo', 'bcl'"
    )
    text = text.replace(old5, new5)
    return text


# ---------- shared package index ----------
def patch_shared_index(text: str) -> str:
    if "DEFAULT_JA_VOICE" in text:
        return text
    # Replace entire export block from ttsVoices with a fuller one keeping th/lo/ko + scaffold
    # Simpler: insert after DEFAULT_VI_VOICE / VI_VOICES / etc. — index is stale vs ttsVoices.
    # Rewrite the ttsVoices re-export section completely.
    start = text.find("export {\n  DEFAULT_YUE_VOICE,")
    end = text.find('} from "./ttsVoices.js";')
    if start < 0 or end < 0:
        raise SystemExit("shared index export block missing")
    end = end + len('} from "./ttsVoices.js";')
    block = '''export {
  DEFAULT_YUE_VOICE,
  DEFAULT_EN_VOICE,
  DEFAULT_CMN_VOICE,
  DEFAULT_WUU_VOICE,
  DEFAULT_SICHUAN_VOICE,
  DEFAULT_TL_VOICE,
  DEFAULT_ES_VOICE,
  DEFAULT_ESES_VOICE,
  DEFAULT_VI_VOICE,
  DEFAULT_TH_VOICE,
  DEFAULT_LO_VOICE,
  DEFAULT_KO_VOICE,
''' + "".join(f"  DEFAULT_{c.upper()}_VOICE,\n" for c in CODES) + '''  YUE_VOICES,
  EN_VOICES,
  CMN_VOICES,
  WUU_VOICES,
  SICHUAN_VOICES,
  TL_VOICES,
  ES_VOICES,
  ES_ES_VOICES,
  VI_VOICES,
  TH_VOICES,
  LO_VOICES,
  KO_VOICES,
''' + "".join(f"  {c.upper()}_VOICES,\n" for c in CODES) + '''  PREVIEW_YUE,
  PREVIEW_EN,
  PREVIEW_CMN,
  PREVIEW_WUU,
  PREVIEW_SICHUAN,
  PREVIEW_TL,
  PREVIEW_ES,
  PREVIEW_ESES,
  PREVIEW_VI,
  PREVIEW_TH,
  PREVIEW_LO,
  PREVIEW_KO,
''' + "".join(f"  PREVIEW_{c.upper()},\n" for c in CODES) + '''  isYueVoice,
  isEnVoice,
  isCmnVoice,
  isWuuVoice,
  isSichuanVoice,
  isTlVoice,
  isEsVoice,
  isEsesVoice,
  isViVoice,
  isThVoice,
  isLoVoice,
  isKoVoice,
''' + "".join(f"  is{pascal(c)}Voice,\n" for c in CODES) + '''  resolveYueVoice,
  resolveEnVoice,
  resolveCmnVoice,
  resolveWuuVoice,
  resolveSichuanVoice,
  resolveTlVoice,
  resolveEsVoice,
  resolveEsesVoice,
  resolveViVoice,
  resolveThVoice,
  resolveLoVoice,
  resolveKoVoice,
''' + "".join(f"  resolve{pascal(c)}Voice,\n" for c in CODES) + '''  voiceMeta,
  resolveSpeakVoice,
  type YueVoiceId,
  type EnVoiceId,
  type CmnVoiceId,
  type WuuVoiceId,
  type SichuanVoiceId,
  type TlVoiceId,
  type EsVoiceId,
  type EsesVoiceId,
  type ViVoiceId,
  type ThVoiceId,
  type LoVoiceId,
  type KoVoiceId,
''' + "".join(f"  type {pascal(c)}VoiceId,\n" for c in CODES) + '''  type TtsVoiceId,
  type TtsVoiceOption,
} from "./ttsVoices.js";'''
    return text[:start] + block + text[end:]


# ---------- web/api ttsVoices re-exports ----------
def patch_reexport(text: str, is_api: bool) -> str:
    if "DEFAULT_JA_VOICE" in text:
        return text
    # Insert after DEFAULT_KO_VOICE
    text = text.replace(
        "  DEFAULT_KO_VOICE,\n",
        "  DEFAULT_KO_VOICE,\n" + "".join(f"  DEFAULT_{c.upper()}_VOICE,\n" for c in CODES),
    )
    text = text.replace(
        "  KO_VOICES,\n",
        "  KO_VOICES,\n" + "".join(f"  {c.upper()}_VOICES,\n" for c in CODES),
    )
    if "PREVIEW_KO" in text:
        text = text.replace(
            "  PREVIEW_KO,\n",
            "  PREVIEW_KO,\n" + "".join(f"  PREVIEW_{c.upper()},\n" for c in CODES),
        )
    text = text.replace(
        "  resolveKoVoice,\n",
        "  resolveKoVoice,\n" + "".join(f"  resolve{pascal(c)}Voice,\n" for c in CODES),
    )
    text = text.replace(
        "  isKoVoice,\n",
        "  isKoVoice,\n" + "".join(f"  is{pascal(c)}Voice,\n" for c in CODES),
    )
    text = text.replace(
        "  type KoVoiceId,\n",
        "  type KoVoiceId,\n" + "".join(f"  type {pascal(c)}VoiceId,\n" for c in CODES),
    )
    return text


def patch_web_tts_local(text: str) -> str:
    if "STORAGE_JA" in text:
        return text
    # extend re-export import used for local helpers
    text = text.replace(
        "  DEFAULT_KO_VOICE,\n",
        "  DEFAULT_KO_VOICE,\n" + "".join(f"  DEFAULT_{c.upper()}_VOICE,\n" for c in CODES),
        1,
    )
    # second import block
    text = text.replace(
        "  resolveKoVoice,\n",
        "  resolveKoVoice,\n" + "".join(f"  resolve{pascal(c)}Voice,\n" for c in CODES),
        1,
    )
    text = text.replace(
        "  type KoVoiceId,\n",
        "  type KoVoiceId,\n" + "".join(f"  type {pascal(c)}VoiceId,\n" for c in CODES),
        1,
    )
    text = text.replace(
        "const STORAGE_KO = 'yue-tts-voice-ko'\n",
        "const STORAGE_KO = 'yue-tts-voice-ko'\n"
        + "".join(f"const STORAGE_{c.upper()} = 'yue-tts-voice-{c}'\n" for c in CODES),
    )
    helpers = []
    for c in CODES:
        P, U = pascal(c), c.upper()
        helpers.append(
            f"""
export function readLocal{P}Voice(): {P}VoiceId {{
  if (typeof window === 'undefined') return DEFAULT_{U}_VOICE
  try {{
    return resolve{P}Voice(localStorage.getItem(STORAGE_{U}))
  }} catch {{
    return DEFAULT_{U}_VOICE
  }}
}}

export function writeLocal{P}Voice(id: {P}VoiceId) {{
  try {{
    localStorage.setItem(STORAGE_{U}, resolve{P}Voice(id))
  }} catch {{
    /* ignore */
  }}
}}
"""
        )
    text = text.replace(
        """export function writeLocalKoVoice(id: KoVoiceId) {
  try {
    localStorage.setItem(STORAGE_KO, resolveKoVoice(id))
  } catch {
    /* ignore */
  }
}
""",
        """export function writeLocalKoVoice(id: KoVoiceId) {
  try {
    localStorage.setItem(STORAGE_KO, resolveKoVoice(id))
  } catch {
    /* ignore */
  }
}
"""
        + "".join(helpers),
    )
    return text


# ---------- azureSpeech / webSpeech / tts ----------
def patch_azure_speech(text: str) -> str:
    if "l.startsWith('ja')" in text:
        return text
    text = text.replace(
        "  if (l.startsWith('ko')) return 'ko'\n",
        "  if (l.startsWith('ko')) return 'ko'\n"
        + "".join(
            f"  if (l.startsWith('{c}')) return '{c}'\n"
            if c != "pt"
            else "  if (l.startsWith('pt')) return 'pt'\n"
            for c in CODES
        ),
    )
    # pt-BR starts with pt — fine
    text = text.replace(
        "  if (lang === 'ko') return 'ko-KR'\n",
        "  if (lang === 'ko') return 'ko-KR'\n"
        + "".join(f"  if (lang === '{c}') return '{LOCALE[c]}'\n" for c in CODES),
    )
    return text


def patch_web_speech(text: str) -> str:
    if "jaLocaleIndex" in text:
        return text
    text = text.replace(
        "  let koLocaleIndex = 0\n",
        "  let koLocaleIndex = 0\n"
        + "".join(f"  let {c}LocaleIndex = 0\n" for c in CODES),
    )
    text = text.replace(
        "  const koLocales = ['ko-KR', 'ko']\n",
        "  const koLocales = ['ko-KR', 'ko']\n"
        + "".join(
            f"  const {c}Locales = ['{LOCALE[c]}', '{c}']\n" for c in CODES
        ),
    )
    text = text.replace(
        "  const koLocale = () => koLocales[koLocaleIndex % koLocales.length]\n",
        "  const koLocale = () => koLocales[koLocaleIndex % koLocales.length]\n"
        + "".join(
            f"  const {c}Locale = () => {c}Locales[{c}LocaleIndex % {c}Locales.length]\n"
            for c in CODES
        ),
    )
    text = text.replace(
        "    if (activeLang === 'ko') return koLocale()\n",
        "    if (activeLang === 'ko') return koLocale()\n"
        + "".join(f"    if (activeLang === '{c}') return {c}Locale()\n" for c in CODES),
    )
    reject_block = "".join(
        f"""      if (localeRejected && activeLang === '{c}' && {c}LocaleIndex < {c}Locales.length - 1) {{
        {c}LocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }}
"""
        for c in CODES
    )
    text = text.replace(
        """      if (localeRejected && activeLang === 'ko' && koLocaleIndex < koLocales.length - 1) {
        koLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
""",
        """      if (localeRejected && activeLang === 'ko' && koLocaleIndex < koLocales.length - 1) {
        koLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
"""
        + reject_block,
    )
    # reset indexes in start() — also add missing ko reset
    text = text.replace(
        "      loLocaleIndex = 0\n      startOne()",
        "      loLocaleIndex = 0\n"
        "      koLocaleIndex = 0\n"
        + "".join(f"      {c}LocaleIndex = 0\n" for c in CODES)
        + "      startOne()",
    )
    return text


def patch_tts_client(text: str) -> str:
    if "readLocalJaVoice" in text:
        return text
    text = text.replace(
        "readLocalKoVoice, readLocalYueVoice",
        "readLocalKoVoice, "
        + ", ".join(f"readLocal{pascal(c)}Voice" for c in CODES)
        + ", readLocalYueVoice",
    )
    text = text.replace(
        "  if (lang === 'ko') return 'ko-KR'\n",
        "  if (lang === 'ko') return 'ko-KR'\n"
        + "".join(f"  if (lang === '{c}') return '{LOCALE[c]}'\n" for c in CODES),
    )
    text = text.replace(
        "  if (lang === 'ko') return readLocalKoVoice()\n",
        "  if (lang === 'ko') return readLocalKoVoice()\n"
        + "".join(
            f"  if (lang === '{c}') return readLocal{pascal(c)}Voice()\n" for c in CODES
        ),
    )
    return text


# ---------- translate router ----------
def patch_translate_router(text: str) -> str:
    if "translateScaffoldLang" in text:
        return text
    # add import
    # find a nearby import
    if "from './translateScaffold.js'" not in text:
        # insert after last translate* import or near top after zod imports
        m = re.search(r"from '\./translateKorean\.js'\n", text)
        if m:
            text = text[: m.end()] + "import { isScaffoldLang, translateScaffoldLang } from './translateScaffold.js'\n" + text[m.end() :]
        else:
            # try after translateLao
            m = re.search(r"from '\./translateLao\.js'\n", text)
            if m:
                text = text[: m.end()] + "import { isScaffoldLang, translateScaffoldLang } from './translateScaffold.js'\n" + text[m.end() :]
            else:
                text = "import { isScaffoldLang, translateScaffoldLang } from './translateScaffold.js'\n" + text
    router = """
  if (isScaffoldLang(to) || (isScaffoldLang(from) && to === 'en')) {
    return translateScaffoldLang({ from, to, text, stage, wantAlts, fallbackDefinition })
  }

"""
    text = text.replace(
        """  if (to === 'ko' || (from === 'ko' && to === 'en')) {
    return translateKorean({ from, to, text, stage, wantAlts, fallbackDefinition })
  }

""",
        """  if (to === 'ko' || (from === 'ko' && to === 'en')) {
    return translateKorean({ from, to, text, stage, wantAlts, fallbackDefinition })
  }
"""
        + router,
    )
    return text


# ---------- detailsEnrich / docs / camera ----------
def patch_details_enrich(text: str) -> str:
    text = expand_union(text)
    if "  ja: {" in text and "label: 'Japanese'" in text:
        return text
    rows = []
    for c in CODES:
        rows.append(
            f"""  {c}: {{
    label: {EN[c]!r},
    glossLangHint: {EN[c]!r},
    exampleIn: 'natural {EN[c]}',
  }},
"""
        )
    text = text.replace("  ceb: {", "".join(rows) + "  ceb: {", 1)
    return text


def patch_camera_scan(text: str) -> str:
    text = expand_union(text)
    if "preferred === 'ja'" in text:
        return text
    block = "".join(
        f"""  if (preferred === '{c}') {{
    return looksChinese ? {{ from: 'yue', to: '{c}' }} : {{ from: 'en', to: '{c}' }}
  }}
"""
        for c in CODES
    )
    text = text.replace(
        """  if (preferred === 'ko') {
    return looksChinese ? { from: 'yue', to: 'ko' } : { from: 'en', to: 'ko' }
  }
""",
        """  if (preferred === 'ko') {
    return looksChinese ? { from: 'yue', to: 'ko' } : { from: 'en', to: 'ko' }
  }
"""
        + block,
    )
    return text


def patch_translate_camera(text: str) -> str:
    if "isScaffoldCameraTarget" in text:
        return text
    # helper after isKoreanTarget
    text = text.replace(
        """function isKoreanTarget(to: CameraLang): boolean {
  return to === 'ko'
}
""",
        """function isKoreanTarget(to: CameraLang): boolean {
  return to === 'ko'
}

function isScaffoldCameraTarget(to: CameraLang): boolean {
  return (
"""
        + " ||\n".join(f"    to === '{c}'" for c in CODES)
        + """
  )
}
""",
    )
    # prompt branch — insert before Korean prompt or after
    # Find Korean prompt block start and add scaffold after Korean
    # Simpler: add generic scaffold prompt after ko block using a marker
    scaffold_prompt = """
  if (isScaffoldCameraTarget(to)) {
    const label =
""" + "\n".join(
        f"      to === '{c}' ? {EN[c]!r} :" for c in CODES
    ) + """
      'the target language'
    return [
      `You translate signs, menus, forms, and short labels into natural colloquial ${label}.`,
      'Write for travelers/readers: everyday spoken register, not stiff formal writing.',
      'Never leave the translation empty. Never copy Chinese characters unless the target is Japanese.',
      wantDefinition
        ? 'Return ONLY valid JSON: {"translation":"<target>","definition":"<short English gloss>"}'
        : 'Return ONLY valid JSON: {"translation":"<target>"}',
    ].join('\\n')
  }
"""
    # Find a good insertion point — after Korean prompt function returns
    # Look for isKoreanTarget usage in prompt builder
    if "if (to === 'ko')" in text and "isScaffoldCameraTarget" not in text:
        # insert after Korean-specific prompt return inside getCameraPrompt or similar
        pass
    # Add lang label
    text = text.replace(
        "  if (lang === 'ko') return 'Korean (Hangul, ko-KR)'\n",
        "  if (lang === 'ko') return 'Korean (Hangul, ko-KR)'\n"
        + "".join(
            f"  if (lang === '{c}') return '{EN[c]} ({LOCALE[c]})'\n" for c in CODES
        ),
    )
    # normalizeCameraLang
    text = text.replace(
        "  if (lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr') return 'ko'\n",
        "  if (lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr') return 'ko'\n"
        + "".join(
            f"  if (lang === '{c}' || lang === '{LOCALE[c]}' || lang === '{LOCALE[c].lower()}') return '{c}'\n"
            for c in CODES
        ),
    )
    # Insert scaffold prompt near Korean prompt — find exact block
    ko_prompt_marker = "  if (to === 'ko') {\n"
    if ko_prompt_marker in text and "isScaffoldCameraTarget(to)" not in text.split("if (to === 'ko')")[1][:800]:
        # After the whole Korean if-block is hard; inject before `if (to === 'ko')` in prompt section
        # Find second occurrence related to prompts - use first prompt-like
        idx = text.find("  if (to === 'ko') {\n      'You translate signs")
        if idx < 0:
            idx = text.find("  if (to === 'ko') {\n")
            # walk to find the signs one
            while idx >= 0:
                snippet = text[idx : idx + 80]
                if "You translate" in text[idx : idx + 200] or "Korean" in text[idx : idx + 200]:
                    break
                idx = text.find("  if (to === 'ko') {\n", idx + 1)
        if idx >= 0:
            text = text[:idx] + scaffold_prompt + "\n" + text[idx:]
    # validation branches — soft: treat scaffold like Korean for empty/Han checks for latin langs only
    # Add after isKoreanTarget checks using isScaffoldCameraTarget for non-ja
    text = text.replace(
        "              : isKoreanTarget(to)\n",
        "              : isScaffoldCameraTarget(to)\n                ? 'scaffold'\n              : isKoreanTarget(to)\n",
    )
    # might break — leave validation soft. Revert if too risky.
    # Actually that replacement might be wrong. Let me check later with tsc.
    return text


# ---------- uiCopy ----------
def patch_ui_copy(text: str) -> str:
    if "camTargetJa:" in text:
        return text
    cam = "".join(
        f"  camTarget{pascal(c)}: {{ en: 'To {EN[c]}', zh: '譯成{ZH[c]}', jp: 'jik6 sing4 {JP[c]}' }},\n"
        for c in CODES
    )
    text = text.replace(
        "  camTargetKo: { en: 'To Korean', zh: '譯成韓文', jp: 'jik6 sing4 hon4 man4' },\n",
        "  camTargetKo: { en: 'To Korean', zh: '譯成韓文', jp: 'jik6 sing4 hon4 man4' },\n" + cam,
    )
    dirs = "".join(
        f"  dir{pascal(c) if c not in ('pt',) else 'Portuguese'}: {{ en: '{EN[c]}', zh: '{ZH[c]}', jp: '{JP[c]}' }},\n"
        if False
        else f"  dir{ {'ja':'Japanese','id':'Indonesian','ms':'Malay','pt':'Portuguese','fr':'French','hi':'Hindi','km':'Khmer','my':'Burmese','jv':'Javanese','it':'Italian','de':'German','nl':'Dutch'}[c] }: {{ en: '{EN[c]}', zh: '{ZH[c]}', jp: '{JP[c]}' }},\n"
        for c in CODES
    )
    text = text.replace(
        "  dirKorean: { en: 'Korean', zh: '韓文', jp: 'hon4 man4' },\n",
        "  dirKorean: { en: 'Korean', zh: '韓文', jp: 'hon4 man4' },\n" + dirs,
    )
    tts = "".join(
        f"  accountTts{pascal(c)}: {{ en: '{EN[c]}', zh: '{ZH[c]}', jp: '{JP[c]}' }},\n"
        for c in CODES
    )
    text = text.replace(
        "  accountTtsKo: { en: 'Korean', zh: '韓文', jp: 'hon4 man4' },\n",
        "  accountTtsKo: { en: 'Korean', zh: '韓文', jp: 'hon4 man4' },\n" + tts,
    )
    return text


DIR_KEY = {
    "ja": "dirJapanese",
    "id": "dirIndonesian",
    "ms": "dirMalay",
    "pt": "dirPortuguese",
    "fr": "dirFrench",
    "hi": "dirHindi",
    "km": "dirKhmer",
    "my": "dirBurmese",
    "jv": "dirJavanese",
    "it": "dirItalian",
    "de": "dirGerman",
    "nl": "dirDutch",
}


# ---------- UI components ----------
def patch_lang_label_button(text: str) -> str:
    if "id: 'ja'" in text:
        return text
    rows = "".join(
        f"  {{ id: '{c}', copy: ui.{DIR_KEY[c]}, mark: '{MARK[c]}' }},\n" for c in CODES
    )
    return text.replace(
        "  { id: 'ko', copy: ui.dirKorean, mark: 'Ko' },\n",
        "  { id: 'ko', copy: ui.dirKorean, mark: 'Ko' },\n" + rows,
    )


def patch_cam_target_picker(text: str) -> str:
    if "id: 'ja'" in text:
        return text
    to_rows = "".join(
        f"  {{ id: '{c}', copy: ui.camTarget{pascal(c)}, mark: '{MARK[c]}' }},\n" for c in CODES
    )
    plain_rows = "".join(
        f"  {{ id: '{c}', copy: ui.{DIR_KEY[c]}, mark: '{MARK[c]}' }},\n" for c in CODES
    )
    text = text.replace(
        "  { id: 'ko', copy: ui.camTargetKo, mark: 'Ko' },\n",
        "  { id: 'ko', copy: ui.camTargetKo, mark: 'Ko' },\n" + to_rows,
    )
    text = text.replace(
        "  { id: 'ko', copy: ui.dirKorean, mark: 'Ko' },\n",
        "  { id: 'ko', copy: ui.dirKorean, mark: 'Ko' },\n" + plain_rows,
    )
    return text


def patch_result_with_def(text: str) -> str:
    if "JaText" in text:
        return text
    imports = "".join(f"import {{ {text_comp(c)} }} from './{text_comp(c)}'\n" for c in CODES)
    text = text.replace(
        "import { KoreanText } from './KoreanText'\n",
        "import { KoreanText } from './KoreanText'\n" + imports,
    )
    branches = "".join(
        f"""            ) : chineseLang === '{c}' ? (
              <{text_comp(c)}
                text={{trimmed}}
                className={{textClassName || 'result-text'}}
                onActivate={{onActivate}}
              />
"""
        for c in CODES
    )
    text = text.replace(
        """            ) : chineseLang === 'ko' ? (
              <KoreanText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'ceb'""",
        """            ) : chineseLang === 'ko' ? (
              <KoreanText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
"""
        + branches
        + "            ) : chineseLang === 'ceb'",
    )
    return text


def patch_conversation_view(text: str) -> str:
    if "JaText" in text:
        return text
    imports = "".join(f"import {{ {text_comp(c)} }} from './{text_comp(c)}'\n" for c in CODES)
    text = text.replace(
        "import { KoreanText } from './KoreanText'\n",
        "import { KoreanText } from './KoreanText'\n" + imports,
    )
    placeholders = "".join(
        f"  if (lang === '{c}') return ui.{DIR_KEY[c]}.en\n" for c in CODES
    )
    text = text.replace(
        "  if (lang === 'ko') return ui.dirKorean.en\n",
        "  if (lang === 'ko') return ui.dirKorean.en\n" + placeholders,
    )
    branches = "".join(
        f"""    if (lang === '{c}') {{
      return <{text_comp(c)} text={{text}} className={{className}} onActivate={{onActivate}} />
    }}
"""
        for c in CODES
    )
    text = text.replace(
        """    if (lang === 'ko') {
      return <KoreanText text={text} className={className} onActivate={onActivate} />
    }
""",
        """    if (lang === 'ko') {
      return <KoreanText text={text} className={className} onActivate={onActivate} />
    }
"""
        + branches,
    )
    return text


def patch_history_card(text: str) -> str:
    if "JaText" in text:
        return text
    imports = "".join(f"import {{ {text_comp(c)} }} from './{text_comp(c)}'\n" for c in CODES)
    text = text.replace(
        "import { KoreanText } from './KoreanText'\n",
        "import { KoreanText } from './KoreanText'\n" + imports,
    )
    shorts = "".join(f"  if (lang === '{c}') return '{MARK[c]}'\n" for c in CODES)
    text = text.replace(
        "  if (lang === 'ko') return 'Ko'\n",
        "  if (lang === 'ko') return 'Ko'\n" + shorts,
    )
    lines = "".join(
        f"""  if (lang === '{c}') {{
    return <{text_comp(c)} text={{text}} className="history-card-line" onActivate={{onBreakdown}} />
  }}
"""
        for c in CODES
    )
    text = text.replace(
        """  if (lang === 'ko') {
    return <KoreanText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
""",
        """  if (lang === 'ko') {
    return <KoreanText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
"""
        + lines,
    )
    labels = "".join(
        f"  if (lang === '{c}') return <BiText copy={{ui.{DIR_KEY[c]}}} size=\"sm\" />\n"
        for c in CODES
    )
    text = text.replace(
        "  if (lang === 'ko') return <BiText copy={ui.dirKorean} size=\"sm\" />\n",
        "  if (lang === 'ko') return <BiText copy={ui.dirKorean} size=\"sm\" />\n" + labels,
    )
    # alternatives KoreanText branch if present
    if "lang === 'ko'" in text and "KoreanText text={alt}" in text:
        alt_branches = "".join(
            f"""                      ) : lang === '{c}' ? (
                        <{text_comp(c)} text={{alt}} className="history-card-line" onActivate={{onBreakdown}} />
"""
            for c in CODES
        )
        text = text.replace(
            """                      <KoreanText text={alt} className="history-card-line" onActivate={onBreakdown} />
""",
            """                      <KoreanText text={alt} className="history-card-line" onActivate={onBreakdown} />
"""
            # won't auto wrap ternary — leave HistoryCard alts if structure differs
        )
        # Try ternary wrap after ko
        text = text.replace(
            """                      ) : lang === 'ko' ? (
                      <KoreanText text={alt} className="history-card-line" onActivate={onBreakdown} />
""",
            """                      ) : lang === 'ko' ? (
                      <KoreanText text={alt} className="history-card-line" onActivate={onBreakdown} />
"""
            + alt_branches.replace(") : lang", ") : lang", 1),
        )
    return text


def patch_translation_alts(text: str) -> str:
    if "JaText" in text:
        return text
    imports = "".join(f"import {{ {text_comp(c)} }} from './{text_comp(c)}'\n" for c in CODES)
    text = text.replace(
        "import { KoreanText } from './KoreanText'\n",
        "import { KoreanText } from './KoreanText'\n" + imports,
    )
    branches = "".join(
        f"""              ) : lang === '{c}' ? (
                <{text_comp(c)}
                  text={{alt}}
                  className="result-text"
                  onActivate={{onActivate}}
                />
"""
        for c in CODES
    )
    # Match Korean ternary pattern
    marker = ") : lang === 'ko' ? ("
    if marker in text:
        # find KoreanText block after marker and insert after it ends before next ) :
        idx = text.find(marker)
        # find end of KoreanText component usage
        end = text.find("/>", idx)
        if end > 0:
            end = end + 2
            text = text[:end] + "\n" + branches + text[end:]
    return text


def patch_char_breakdown(text: str) -> str:
    if "JaText" in text:
        return text
    imports = "".join(f"import {{ {text_comp(c)} }} from './{text_comp(c)}'\n" for c in CODES)
    text = text.replace(
        "import { KoreanText } from './KoreanText'\n",
        "import { KoreanText } from './KoreanText'\n" + imports,
    )
    # find KoreanText usage for topLabel
    if "<KoreanText text={topLabel}" in text:
        # wrap with conditionals is complex; add after Korean branch if ternary
        # Search for lang === 'ko' near KoreanText
        pass
    # Common pattern: lang === 'ko' ? <KoreanText .../> : ...
    branches = "".join(
        f"""          ) : lang === '{c}' ? (
            <{text_comp(c)} text={{topLabel}} showDetail />
"""
        for c in CODES
    )
    text = text.replace(
        """            <KoreanText text={topLabel} showDetail />
""",
        """            <KoreanText text={topLabel} showDetail />
"""
        # leave; try ternary insert
    )
    text = text.replace(
        """          ) : lang === 'ko' ? (
            <KoreanText text={topLabel} showDetail />
""",
        """          ) : lang === 'ko' ? (
            <KoreanText text={topLabel} showDetail />
"""
        + branches,
    )
    return text


def patch_solo_view(text: str) -> str:
    if "lang === 'ja'" in text:
        return text
    ph = "".join(f"  if (lang === '{c}') return {PLACEHOLDER[c]!r}\n" for c in CODES)
    text = text.replace(
        "  if (lang === 'ko') return '한국어로 입력하거나 말하기'\n",
        "  if (lang === 'ko') return '한국어로 입력하거나 말하기'\n" + ph,
    )
    ruby = "".join(f"    lang === '{c}' ||\n" for c in CODES)
    text = text.replace(
        "    lang === 'ko' ||\n",
        "    lang === 'ko' ||\n" + ruby,
    )
    aria = "".join(f"  if (lang === '{c}') return {ARIA[c]!r}\n" for c in CODES)
    text = text.replace(
        "  if (lang === 'ko') return 'Speak Korean with the mic'\n",
        "  if (lang === 'ko') return 'Speak Korean with the mic'\n" + aria,
    )
    return text


def patch_history_pane(text: str) -> str:
    # HistoryPane may only pass lang through HistoryCard — check for KoreanText
    if "KoreanText" not in text or "JaText" in text:
        return text
    return patch_history_card(text)  # same patterns if mirrored


# ---------- store / api prefs ----------
def patch_store(text: str) -> str:
    if "ttsVoiceJa" in text and "writeLocalJaVoice" in text:
        return text
    # live lang check
    text = text.replace(
        "lang === 'th' || lang === 'lo' || lang === 'ko'\n",
        "lang === 'th' || lang === 'lo' || lang === 'ko'"
        + "".join(f" || lang === '{c}'" for c in CODES)
        + "\n",
    )
    # also the single-line form
    text = text.replace(
        "lang === 'th' || lang === 'lo' || lang === 'ko'",
        "lang === 'th' || lang === 'lo' || lang === 'ko'"
        + "".join(f" || lang === '{c}'" for c in CODES),
    )
    # avoid double expansion
    while "|| lang === 'ja' || lang === 'ja'" in text:
        text = text.replace("|| lang === 'ja' || lang === 'ja'", "|| lang === 'ja'")
    # import write/resolve — find writeLocalKoVoice import
    if "writeLocalJaVoice" not in text:
        # store may import from ttsVoices
        if "writeLocalKoVoice" in text:
            text = text.replace(
                "writeLocalKoVoice",
                "writeLocalKoVoice, " + ", ".join(f"writeLocal{pascal(c)}Voice" for c in CODES),
                1,
            )
        if "resolveKoVoice" in text:
            text = text.replace(
                "resolveKoVoice",
                "resolveKoVoice, " + ", ".join(f"resolve{pascal(c)}Voice" for c in CODES),
                1,
            )
    sync = "".join(
        f"""        if (ent.prefs?.ttsVoice{pascal(c)}) writeLocal{pascal(c)}Voice(resolve{pascal(c)}Voice(ent.prefs.ttsVoice{pascal(c)}))
"""
        for c in CODES
    )
    text = text.replace(
        "        if (ent.prefs?.ttsVoiceKo) writeLocalKoVoice(resolveKoVoice(ent.prefs.ttsVoiceKo))\n",
        "        if (ent.prefs?.ttsVoiceKo) writeLocalKoVoice(resolveKoVoice(ent.prefs.ttsVoiceKo))\n"
        + sync,
    )
    return text


def patch_store_translate(text: str) -> str:
    if "sanitizeScaffoldTranslation" in text or "to === 'ja'" in text:
        return text
    # Use Vi-like sanitize for latin; custom light for others
    text = text.replace(
        "sanitizeKoTranslation, sanitizeCebTranslation",
        "sanitizeKoTranslation, sanitizeViTranslation as sanitizeScaffoldLatin, sanitizeCebTranslation",
    )
    # If that import rename is awkward, add dedicated mapping instead
    # Revert bad import approach — add functions in translationGuard instead
    return text


def patch_translation_guard(text: str) -> str:
    if "sanitizeJaTranslation" in text:
        return text
    extra = """
/** Scaffold VoiceLang sanitizers — reject empty/glossy; script checks are light until polish. */
export function sanitizeJaTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  // Japanese may include kanji (Han) — allow kana/kanji/Latin.
  if (!/[\\u3040-\\u30FF\\u3400-\\u9FFF\\uFF66-\\uFF9D]/.test(t) && !/[\\p{L}]/u.test(t)) return null
  return t
}

export function sanitizeHiTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\\u0900-\\u097F]/.test(t)) return null
  return t
}

export function sanitizeKmTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\\u1780-\\u17FF]/.test(t)) return null
  return t
}

export function sanitizeMyTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\\u1000-\\u109F]/.test(t)) return null
  return t
}

export function sanitizeScaffoldLatinTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}
"""
    return text + extra


def patch_store_translate2(text: str) -> str:
    if "sanitizeJaTranslation" in text:
        return text
    text = text.replace(
        "sanitizeKoTranslation, sanitizeCebTranslation, sanitizeIloTranslation, sanitizeBclTranslation",
        "sanitizeKoTranslation, sanitizeJaTranslation, sanitizeHiTranslation, sanitizeKmTranslation, sanitizeMyTranslation, sanitizeScaffoldLatinTranslation, sanitizeCebTranslation, sanitizeIloTranslation, sanitizeBclTranslation",
    )
    # undo any bad prior rename
    text = text.replace(
        "sanitizeViTranslation as sanitizeScaffoldLatin, ",
        "",
    )
    branches = """  if (to === 'ja') return sanitizeJaTranslation(text)
  if (to === 'hi') return sanitizeHiTranslation(text)
  if (to === 'km') return sanitizeKmTranslation(text)
  if (to === 'my') return sanitizeMyTranslation(text)
  if (to === 'id' || to === 'ms' || to === 'pt' || to === 'fr' || to === 'jv' || to === 'it' || to === 'de' || to === 'nl') {
    return sanitizeScaffoldLatinTranslation(text)
  }
"""
    text = text.replace(
        "  if (to === 'ko') return sanitizeKoTranslation(text)\n",
        "  if (to === 'ko') return sanitizeKoTranslation(text)\n" + branches,
    )
    return text


def patch_api_prefs(text: str) -> str:
    text = expand_union(text)
    if "ttsVoiceJa" in text and "ttsVoiceJa?:" in text:
        # still may need camera unions — expand_union handled
        pass
    if "ttsVoiceJa?: string" not in text:
        text = text.replace(
            "  ttsVoiceKo?: string\n",
            "  ttsVoiceKo?: string\n"
            + "".join(f"  ttsVoice{pascal(c)}?: string\n" for c in CODES),
        )
    return text


# ---------- entitlements / supabase / app / azure ----------
def patch_entitlements(text: str) -> str:
    if "DEFAULT_JA_VOICE" in text and "ttsVoiceJa:" in text:
        return text
    text = text.replace(
        "  DEFAULT_KO_VOICE,\n",
        "  DEFAULT_KO_VOICE,\n" + "".join(f"  DEFAULT_{c.upper()}_VOICE,\n" for c in CODES),
    )
    text = text.replace(
        "  resolveKoVoice,\n",
        "  resolveKoVoice,\n" + "".join(f"  resolve{pascal(c)}Voice,\n" for c in CODES),
    )
    text = text.replace(
        "    ttsVoiceKo: string\n",
        "    ttsVoiceKo: string\n"
        + "".join(f"    ttsVoice{pascal(c)}: string\n" for c in CODES),
    )
    text = text.replace(
        "    ttsVoiceKo?: string | null\n",
        "    ttsVoiceKo?: string | null\n"
        + "".join(f"    ttsVoice{pascal(c)}?: string | null\n" for c in CODES),
    )
    text = text.replace(
        "    ttsVoiceKo: resolveKoVoice(opts.ttsVoiceKo),\n",
        "    ttsVoiceKo: resolveKoVoice(opts.ttsVoiceKo),\n"
        + "".join(
            f"    ttsVoice{pascal(c)}: resolve{pascal(c)}Voice(opts.ttsVoice{pascal(c)}),\n"
            for c in CODES
        ),
    )
    # guest/open defaults — two places
    text = text.replace(
        "        ttsVoiceKo: DEFAULT_KO_VOICE,\n",
        "        ttsVoiceKo: DEFAULT_KO_VOICE,\n"
        + "".join(f"        ttsVoice{pascal(c)}: DEFAULT_{c.upper()}_VOICE,\n" for c in CODES),
    )
    text = text.replace(
        "    ttsVoiceKo: profile?.tts_voice_ko,\n",
        "    ttsVoiceKo: profile?.tts_voice_ko,\n"
        + "".join(f"    ttsVoice{pascal(c)}: profile?.tts_voice_{c},\n" for c in CODES),
    )
    return text


def patch_supabase(text: str) -> str:
    if "tts_voice_ja:" in text:
        return text
    text = text.replace(
        "  tts_voice_ko: string | null\n",
        "  tts_voice_ko: string | null\n"
        + "".join(f"  tts_voice_{c}: string | null\n" for c in CODES),
    )
    text = text.replace(
        "    tts_voice_ko?: string | null\n",
        "    tts_voice_ko?: string | null\n"
        + "".join(f"    tts_voice_{c}?: string | null\n" for c in CODES),
    )
    text = text.replace(
        "    tts_voice_ko: typeof row.tts_voice_ko === 'string' ? row.tts_voice_ko : null,\n",
        "    tts_voice_ko: typeof row.tts_voice_ko === 'string' ? row.tts_voice_ko : null,\n"
        + "".join(
            f"    tts_voice_{c}: typeof row.tts_voice_{c} === 'string' ? row.tts_voice_{c} : null,\n"
            for c in CODES
        ),
    )
    text = text.replace(
        "      | 'tts_voice_ko'\n",
        "      | 'tts_voice_ko'\n" + "".join(f"      | 'tts_voice_{c}'\n" for c in CODES),
    )
    return text


def patch_app_tts(text: str) -> str:
    if "preferredJa:" in text and "ttsVoiceJa" in text:
        return text
    # imports for is*Voice
    if "isKoVoice" in text and "isJaVoice" not in text:
        text = text.replace(
            "isKoVoice",
            "isKoVoice, " + ", ".join(f"is{pascal(c)}Voice" for c in CODES),
            1,
        )
    # azureLang chain — insert before zh-HK fallback
    chain = "".join(
        f"                          : lang === '{c}' || lang === '{LOCALE[c]}' || lang === '{LOCALE[c].lower()}'\n"
        f"                            ? '{LOCALE[c]}'\n"
        for c in CODES
    )
    text = text.replace(
        """                          : lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr'
                            ? 'ko-KR'
                          : 'zh-HK'""",
        """                          : lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr'
                            ? 'ko-KR'
"""
        + chain
        + "                          : 'zh-HK'",
    )
    prefs = "".join(f"      preferred{pascal(c)}: ent.prefs?.ttsVoice{pascal(c)},\n" for c in CODES)
    text = text.replace(
        "      preferredKo: ent.prefs?.ttsVoiceKo,\n",
        "      preferredKo: ent.prefs?.ttsVoiceKo,\n" + prefs,
    )
    # PATCH body type
    text = text.replace(
        "    tts_voice_ko?: string\n",
        "    tts_voice_ko?: string\n"
        + "".join(f"    tts_voice_{c}?: string\n" for c in CODES),
    )
    validators = "".join(
        f"""  if (body.ttsVoice{pascal(c)} != null) {{
    const v = String(body.ttsVoice{pascal(c)}).trim()
    if (!is{pascal(c)}Voice(v)) {{
      res.status(400).json({{ message: 'Invalid {EN[c]} voice.' }})
      return
    }}
    patch.tts_voice_{c} = v
  }}
"""
        for c in CODES
    )
    text = text.replace(
        """  if (body.ttsVoiceKo != null) {
    const v = String(body.ttsVoiceKo).trim()
    if (!isKoVoice(v)) {
      res.status(400).json({ message: 'Invalid Korean voice.' })
      return
    }
    patch.tts_voice_ko = v
  }
""",
        """  if (body.ttsVoiceKo != null) {
    const v = String(body.ttsVoiceKo).trim()
    if (!isKoVoice(v)) {
      res.status(400).json({ message: 'Invalid Korean voice.' })
      return
    }
    patch.tts_voice_ko = v
  }
"""
        + validators,
    )
    open_prefs = "".join(
        f"        ttsVoice{pascal(c)}: patch.tts_voice_{c} || ent.prefs.ttsVoice{pascal(c)},\n"
        for c in CODES
    )
    text = text.replace(
        "        ttsVoiceKo: patch.tts_voice_ko || ent.prefs.ttsVoiceKo,\n",
        "        ttsVoiceKo: patch.tts_voice_ko || ent.prefs.ttsVoiceKo,\n" + open_prefs,
    )
    return text


def patch_azure_opts(text: str) -> str:
    if "preferredJa?" in text:
        return text
    text = text.replace(
        "  preferredKo?: string | null\n",
        "  preferredKo?: string | null\n"
        + "".join(f"  preferred{pascal(c)}?: string | null\n" for c in CODES),
    )
    # resolveSpeakVoice call — append args after preferredKo
    text = text.replace(
        "    opts.preferredKo,\n  )",
        "    opts.preferredKo,\n"
        + "".join(f"    opts.preferred{pascal(c)},\n" for c in CODES)
        + "  )",
    )
    return text


# ---------- PlanChip / AccountHubVoice (mechanical) ----------
def patch_planchip(text: str) -> str:
    if "PREVIEW_JA" in text and "readLocalJaVoice" in text:
        return text
    # imports PREVIEW
    text = text.replace(
        "  PREVIEW_KO,\n",
        "  PREVIEW_KO,\n" + "".join(f"  PREVIEW_{c.upper()},\n" for c in CODES),
    )
    text = text.replace(
        "  readLocalKoVoice,\n",
        "  readLocalKoVoice,\n" + "".join(f"  readLocal{pascal(c)}Voice,\n" for c in CODES),
    )
    text = text.replace(
        "  resolveKoVoice,\n",
        "  resolveKoVoice,\n" + "".join(f"  resolve{pascal(c)}Voice,\n" for c in CODES),
    )
    text = text.replace(
        "  writeLocalKoVoice,\n",
        "  writeLocalKoVoice,\n" + "".join(f"  writeLocal{pascal(c)}Voice,\n" for c in CODES),
    )
    text = text.replace(
        "  type KoVoiceId,\n",
        "  type KoVoiceId,\n" + "".join(f"  type {pascal(c)}VoiceId,\n" for c in CODES),
    )
    # state — find useState for koVoice
    # These are trickier; use regex
    m = re.search(r"const \[koVoice, setKoVoice\] = useState[^\n]+\n", text)
    if m and "jaVoice" not in text:
        insert = "".join(
            f"  const [{c}Voice, set{pascal(c)}Voice] = useState<{pascal(c)}VoiceId>(() => readLocal{pascal(c)}Voice())\n"
            for c in CODES
        )
        text = text[: m.end()] + insert + text[m.end() :]
    # prefs hydrate
    hydrate = "".join(
        f"""    if (prefs?.ttsVoice{pascal(c)}) {{
      const v = resolve{pascal(c)}Voice(prefs.ttsVoice{pascal(c)})
      set{pascal(c)}Voice(v)
      writeLocal{pascal(c)}Voice(v)
    }}
"""
        for c in CODES
    )
    text = text.replace(
        """    if (prefs?.ttsVoiceKo) {
      const v = resolveKoVoice(prefs.ttsVoiceKo)
      setKoVoice(v)
      writeLocalKoVoice(v)
    }
""",
        """    if (prefs?.ttsVoiceKo) {
      const v = resolveKoVoice(prefs.ttsVoiceKo)
      setKoVoice(v)
      writeLocalKoVoice(v)
    }
"""
        + hydrate,
    )
    deps = "".join(f"    entitlement?.prefs?.ttsVoice{pascal(c)},\n" for c in CODES)
    text = text.replace(
        "    entitlement?.prefs?.ttsVoiceKo,\n",
        "    entitlement?.prefs?.ttsVoiceKo,\n" + deps,
    )
    # persistVoices next type is in AccountHubVoice; PlanChip persistVoices function
    # extend next.ko pattern
    for c in CODES:
        P = pascal(c)
        if f"const {c} = next.{c}" not in text:
            text = text.replace(
                "    const ko = next.ko ?? koVoice\n",
                "    const ko = next.ko ?? koVoice\n"
                + f"    const {c} = next.{c} ?? {c}Voice\n",
            )
            text = text.replace(
                "    writeLocalKoVoice(ko)\n",
                "    writeLocalKoVoice(ko)\n" + f"    writeLocal{P}Voice({c})\n",
            )
            text = text.replace(
                "    setKoVoice(ko)\n",
                "    setKoVoice(ko)\n" + f"    set{P}Voice({c})\n",
            )
            text = text.replace(
                "        ttsVoiceKo: ko,\n",
                "        ttsVoiceKo: ko,\n" + f"        ttsVoice{P}: {c},\n",
            )
            text = text.replace(
                "              ttsVoiceKo: entitlement.prefs?.ttsVoiceKo || koVoice,\n",
                "              ttsVoiceKo: entitlement.prefs?.ttsVoiceKo || koVoice,\n"
                + f"              ttsVoice{P}: entitlement.prefs?.ttsVoice{P} || {c}Voice,\n",
            )
    # previewBusy / onPreview kind union
    kinds = " | ".join(f"'{c}'" for c in CODES)
    text = text.replace(
        "'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'wuu' | 'sichuan'",
        f"'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | {kinds} | 'wuu' | 'sichuan'",
    )
    preview_branches = "".join(
        f"      else if (kind === '{c}') await speakText(PREVIEW_{c.upper()}, '{c}', {c}Voice)\n"
        for c in CODES
    )
    text = text.replace(
        "      else if (kind === 'ko') await speakText(PREVIEW_KO, 'ko', koVoice)\n",
        "      else if (kind === 'ko') await speakText(PREVIEW_KO, 'ko', koVoice)\n"
        + preview_branches,
    )
    # Pass props to AccountHubVoice — find koVoice={koVoice}
    props = "".join(f"          {c}Voice={{{c}Voice}}\n" for c in CODES)
    text = text.replace(
        "          koVoice={koVoice}\n",
        "          koVoice={koVoice}\n" + props,
    )
    return text


def patch_account_hub_voice(text: str) -> str:
    if "JA_VOICES" in text and "jaVoice:" in text:
        return text
    text = text.replace(
        "  KO_VOICES,\n",
        "  KO_VOICES,\n" + "".join(f"  {c.upper()}_VOICES,\n" for c in CODES),
    )
    text = text.replace(
        "  resolveKoVoice,\n",
        "  resolveKoVoice,\n" + "".join(f"  resolve{pascal(c)}Voice,\n" for c in CODES),
    )
    text = text.replace(
        "  type KoVoiceId,\n",
        "  type KoVoiceId,\n" + "".join(f"  type {pascal(c)}VoiceId,\n" for c in CODES),
    )
    text = text.replace(
        "  koVoice: KoVoiceId\n",
        "  koVoice: KoVoiceId\n" + "".join(f"  {c}Voice: {pascal(c)}VoiceId\n" for c in CODES),
    )
    kinds = " | ".join(f"'{c}'" for c in CODES)
    text = text.replace(
        "'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'wuu' | 'sichuan'",
        f"'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | {kinds} | 'wuu' | 'sichuan'",
    )
    # persistVoices next
    text = text.replace(
        "    ko?: KoVoiceId\n",
        "    ko?: KoVoiceId\n" + "".join(f"    {c}?: {pascal(c)}VoiceId\n" for c in CODES),
    )
    # destructure props — find koVoice,
    text = text.replace(
        "  koVoice,\n",
        "  koVoice,\n" + "".join(f"  {c}Voice,\n" for c in CODES),
        1,
    )
    # UI rows after Korean row, before Wuu
    rows = []
    for c in CODES:
        P = pascal(c)
        rows.append(
            f"""
                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={{ui.accountTts{P}}} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={{markSelectInteraction}}
                      onFocus={{markSelectInteraction}}
                      value={{{c}Voice}}
                      disabled={{voiceBusy}}
                      onChange={{(e) => {{
                        markSelectInteraction()
                        void persistVoices({{ {c}: resolve{P}Voice(e.target.value) }})
                      }}}}
                      aria-label={{biPlain(ui.accountTts{P})}}
                    >
                      {{{c.upper()}_VOICES.map((v) => (
                        <option key={{v.id}} value={{v.id}}>
                          {{v.labelEn}} · {{v.labelZh}}
                        </option>
                      ))}}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={{previewBusy !== null || !ttsOk}}
                    onClick={{() => void onPreview('{c}')}}
                  >
                    <BiText copy={{ui.accountTtsPreview}} size="sm" hideJp />
                  </button>
                </div>
"""
        )
    marker = """                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsWuu} size="sm" hideJp />
"""
    if "accountTtsJa" not in text and marker in text:
        text = text.replace(marker, "".join(rows) + "\n" + marker, 1)
    return text


def patch_history_sync(text: str) -> str:
    if "v === 'ja'" in text:
        return text
    # expand isLang to cover full Lang union
    text = text.replace(
        """function isLang(v: unknown): v is Lang {
  return (
    v === 'en' ||
    v === 'yue' ||
    v === 'cmn' ||
    v === 'wuu' ||
    v === 'tl' ||
    v === 'es' ||
    v === 'eses' ||
    v === 'vi' ||
    v === 'th' ||
    v === 'lo' ||
    v === 'ko'
  )
}
""",
        """function isLang(v: unknown): v is Lang {
  return (
    v === 'en' ||
    v === 'yue' ||
    v === 'cmn' ||
    v === 'wuu' ||
    v === 'sichuan' ||
    v === 'tl' ||
    v === 'es' ||
    v === 'eses' ||
    v === 'vi' ||
    v === 'th' ||
    v === 'lo' ||
    v === 'ko' ||
"""
        + " ||\n".join(f"    v === '{c}'" for c in CODES)
        + """ ||
    v === 'ceb' ||
    v === 'ilo' ||
    v === 'bcl'
  )
}
""",
    )
    return text


def patch_smoke_lang_picker(text: str) -> str:
    text = text.replace(
        "/'th'[\\s\\S]*'lo'[\\s\\S]*'ko'[\\s\\S]*'ceb'/",
        "/'th'[\\s\\S]*'lo'[\\s\\S]*'ko'[\\s\\S]*'ja'[\\s\\S]*'nl'[\\s\\S]*'ceb'/",
    )
    return text


def main() -> None:
    patch_file(ROOT / "packages/yue-shared/src/index.ts", patch_shared_index)
    patch_file(ROOT / "apps/web/src/lib/ttsVoices.ts", lambda t: patch_web_tts_local(patch_reexport(t, False)))
    patch_file(ROOT / "apps/api/src/ttsVoices.ts", lambda t: patch_reexport(t, True))
    patch_file(ROOT / "apps/web/src/lib/azureSpeech.ts", patch_azure_speech)
    patch_file(ROOT / "apps/web/src/lib/webSpeech.ts", patch_web_speech)
    patch_file(ROOT / "apps/web/src/lib/tts.ts", patch_tts_client)
    patch_file(ROOT / "apps/api/src/translate.ts", patch_translate_router)
    patch_file(ROOT / "apps/api/src/detailsEnrich.ts", patch_details_enrich)
    patch_file(ROOT / "apps/api/src/cameraScan.ts", patch_camera_scan)
    patch_file(ROOT / "apps/api/src/translateCamera.ts", patch_translate_camera)
    patch_file(ROOT / "apps/api/src/docs/handler.ts", expand_union)
    patch_file(ROOT / "apps/api/src/docs/shared.ts", expand_union)
    patch_file(ROOT / "apps/web/src/lib/docsApi.ts", expand_union)
    patch_file(ROOT / "apps/web/src/lib/detailTypes.ts", expand_union)
    patch_file(ROOT / "apps/web/src/lib/historySync.ts", patch_history_sync)
    patch_file(ROOT / "apps/web/src/lib/uiCopy.ts", patch_ui_copy)
    patch_file(ROOT / "apps/web/src/components/LangLabelButton.tsx", patch_lang_label_button)
    patch_file(ROOT / "apps/web/src/components/CamTargetPicker.tsx", patch_cam_target_picker)
    patch_file(ROOT / "apps/web/src/components/ResultWithDefinition.tsx", patch_result_with_def)
    patch_file(ROOT / "apps/web/src/components/ConversationView.tsx", patch_conversation_view)
    patch_file(ROOT / "apps/web/src/components/HistoryCard.tsx", patch_history_card)
    patch_file(ROOT / "apps/web/src/components/TranslationAlternatives.tsx", patch_translation_alts)
    patch_file(ROOT / "apps/web/src/components/CharacterBreakdownHost.tsx", patch_char_breakdown)
    patch_file(ROOT / "apps/web/src/components/SoloView.tsx", patch_solo_view)
    patch_file(ROOT / "apps/web/src/lib/translationGuard.ts", patch_translation_guard)
    patch_file(ROOT / "apps/web/src/lib/storeTranslate.ts", patch_store_translate2)
    patch_file(ROOT / "apps/web/src/lib/store.ts", patch_store)
    patch_file(ROOT / "apps/web/src/lib/api.ts", patch_api_prefs)
    patch_file(ROOT / "apps/api/src/entitlements.ts", patch_entitlements)
    patch_file(ROOT / "apps/api/src/supabase.ts", patch_supabase)
    patch_file(ROOT / "apps/api/src/app.ts", patch_app_tts)
    patch_file(ROOT / "apps/api/src/azure.ts", patch_azure_opts)
    patch_file(ROOT / "apps/web/src/components/PlanChip.tsx", patch_planchip)
    patch_file(ROOT / "apps/web/src/components/AccountHubVoice.tsx", patch_account_hub_voice)
    patch_file(ROOT / "apps/web/src/components/langPickerModal.smoke.ts", patch_smoke_lang_picker)
    print("follow-up done")


if __name__ == "__main__":
    main()
