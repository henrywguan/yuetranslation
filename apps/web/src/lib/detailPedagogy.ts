/**
 * Per-language details pedagogy — mirror `CONVERSATION_PANE_UI`.
 * Adding a Lang: extend `Lang`, then add a row here (tsc fails until you do).
 */
import type { Lang } from './types'

export type DetailPronField =
  | 'ipa'
  | 'jyutping'
  | 'pinyin'
  | 'accented'
  | 'wugniu'
  | 'sichuanese'
  | 'phakfasu'
  | 'pengim'
  | 'tailo'
  | 'none'

export type DetailPedagogy = {
  /** BCP-47 for title / rows */
  htmlLang: string
  /** Which pronunciation field lives in CharBreakdown.jyutping */
  pronField: DetailPronField
  /** Fallback gloss language when primary is unset; runtime prefers Account Hub primary. */
  defaultGlossLang: Lang
  /** Show Han ruby title when phrase has Han */
  rubyTitle: boolean
  /** Client can build a local offline token list without /api/breakdown */
  localOffline: boolean
  /** Extra panels keyed by stable id (e.g. mx-register) */
  extraPanels: ReadonlyArray<'mx-register' | 'eses-register' | 'yue-register'>
}

export const DETAIL_PEDAGOGY: Record<Lang, DetailPedagogy> = {
  en: {
    htmlLang: 'en',
    pronField: 'ipa',
    // Fallback only — Details enrich uses Account Hub primary as glossLang.
    defaultGlossLang: 'en',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  yue: {
    htmlLang: 'zh-HK',
    pronField: 'jyutping',
    defaultGlossLang: 'yue',
    rubyTitle: true,
    localOffline: true,
    extraPanels: ['yue-register'],
  },
  cmn: {
    htmlLang: 'zh-CN',
    pronField: 'pinyin',
    defaultGlossLang: 'cmn',
    rubyTitle: true,
    localOffline: true,
    extraPanels: [],
  },
  wuu: {
    htmlLang: 'wuu-CN',
    pronField: 'wugniu',
    defaultGlossLang: 'wuu',
    // Title uses ShanghaineseText (phrase Wugniu + sandhi), not JyutRuby.
    // Per-char citation Wugniu is returned in CharBreakdown.jyutping.
    rubyTitle: false,
    localOffline: false,
    extraPanels: [],
  },
  sichuan: {
    htmlLang: 'zh-CN-sichuan',
    pronField: 'sichuanese',
    defaultGlossLang: 'sichuan',
    rubyTitle: true,
    localOffline: false,
    extraPanels: [],
  },
  tl: {
    htmlLang: 'tl',
    pronField: 'accented',
    defaultGlossLang: 'tl',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  es: {
    htmlLang: 'es-MX',
    pronField: 'accented',
    defaultGlossLang: 'es',
    rubyTitle: false,
    localOffline: true,
    extraPanels: ['mx-register'],
  },
  eses: {
    htmlLang: 'es-ES',
    pronField: 'accented',
    defaultGlossLang: 'eses',
    rubyTitle: false,
    localOffline: true,
    extraPanels: ['eses-register'],
  },
  vi: {
    htmlLang: 'vi',
    pronField: 'accented',
    defaultGlossLang: 'vi',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  th: {
    htmlLang: 'th',
    pronField: 'accented',
    defaultGlossLang: 'th',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  lo: {
    htmlLang: 'lo',
    pronField: 'accented',
    defaultGlossLang: 'lo',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ko: {
    htmlLang: 'ko',
    pronField: 'accented',
    defaultGlossLang: 'ko',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ja: {
    htmlLang: 'ja-JP',
    /** Compact stays orthography-only; Details reading/politeness live in JaText. */
    pronField: 'accented',
    defaultGlossLang: 'ja',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  id: {
    htmlLang: 'id-ID',
    pronField: 'accented',
    defaultGlossLang: 'id',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ms: {
    htmlLang: 'ms-MY',
    pronField: 'accented',
    defaultGlossLang: 'ms',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  pt: {
    htmlLang: 'pt-BR',
    /** Orthographic stress (oxítona / paroxítona / proparoxítona) — not tones. */
    pronField: 'accented',
    defaultGlossLang: 'pt',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  fr: {
    htmlLang: 'fr-FR',
    pronField: 'accented',
    defaultGlossLang: 'fr',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  hi: {
    // Devanagari title via HiText; optional IAST + address formality in Details only.
    htmlLang: 'hi-IN',
    pronField: 'accented',
    defaultGlossLang: 'hi',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  km: {
    htmlLang: 'km',
    pronField: 'accented',
    defaultGlossLang: 'km',
    rubyTitle: false,
    localOffline: true,
    /** Compact shows UNGEGN-style reading; Details honesty note via KmText. */
    extraPanels: [],
  },
  my: {
    htmlLang: 'my',
    pronField: 'accented',
    defaultGlossLang: 'my',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  jv: {
    htmlLang: 'jv-ID',
    pronField: 'accented',
    defaultGlossLang: 'jv',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  it: {
    htmlLang: 'it-IT',
    pronField: 'accented',
    defaultGlossLang: 'it',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  de: {
    htmlLang: 'de-DE',
    pronField: 'accented',
    defaultGlossLang: 'de',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  nl: {
    htmlLang: 'nl-NL',
    pronField: 'accented',
    defaultGlossLang: 'nl',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ar: {
    htmlLang: 'ar-EG',
    pronField: 'accented',
    defaultGlossLang: 'ar',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  arsa: {
    htmlLang: 'ar-SA',
    pronField: 'accented',
    defaultGlossLang: 'arsa',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ta: {
    // Tamil script title via TaText; optional ISO 15919 + நீங்கள்/நீ in Details only. Not tonal.
    htmlLang: 'ta-IN',
    pronField: 'accented',
    defaultGlossLang: 'ta',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ptpt: {
    htmlLang: 'pt-PT',
    /** Orthographic stress like `pt` — European norms (AO90), never pt-BR. */
    pronField: 'accented',
    defaultGlossLang: 'ptpt',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  tr: {
    htmlLang: 'tr-TR',
    pronField: 'accented',
    defaultGlossLang: 'tr',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  bn: {
    // Bangla script title via BnText; optional ISO 15919 + আপনি/তুমি/তুই in Details only. Not tonal.
    htmlLang: 'bn-IN',
    pronField: 'accented',
    defaultGlossLang: 'bn',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  te: {
    // Telugu script title via LangFamilyText; optional ISO 15919 + మీరు/నువ్వు in Details only. Not tonal.
    htmlLang: 'te-IN',
    pronField: 'accented',
    defaultGlossLang: 'te',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  gu: {
    // Gujarati script title (never Devanagari); optional ISO 15919 + આપ/તમે/તું in Details only. Not tonal.
    htmlLang: 'gu-IN',
    pronField: 'accented',
    defaultGlossLang: 'gu',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  kn: {
    // Kannada script title; optional ISO 15919 + ನೀವು/ನೀನು in Details only. Not tonal.
    htmlLang: 'kn-IN',
    pronField: 'accented',
    defaultGlossLang: 'kn',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  pl: {
    // Polish orthography; ty / Pan(i) chip + stress honesty in Details.
    htmlLang: 'pl-PL',
    pronField: 'accented',
    defaultGlossLang: 'pl',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ro: {
    // Romanian orthography (ș ț comma-below); tu / dumneavoastră chip in Details.
    htmlLang: 'ro-RO',
    pronField: 'accented',
    defaultGlossLang: 'ro',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  cs: {
    // Czech orthography; ty / Vy chip + length-vs-stress honesty in Details.
    htmlLang: 'cs-CZ',
    pronField: 'accented',
    defaultGlossLang: 'cs',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  el: {
    // Greek script only (no Greeklish); εσύ / εσείς chip + τόνος honesty in Details.
    htmlLang: 'el-GR',
    pronField: 'accented',
    defaultGlossLang: 'el',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  hu: {
    // Hungarian orthography; te / Ön chip + length-vs-stress honesty in Details.
    htmlLang: 'hu-HU',
    pronField: 'accented',
    defaultGlossLang: 'hu',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  sv: {
    // Swedish orthography; du / ni chip + pitch-accent (not lexical tone) honesty in Details.
    htmlLang: 'sv-SE',
    pronField: 'accented',
    defaultGlossLang: 'sv',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ru: {
    // Cyrillic only on compact; BGN/PCGN reading + ты/Вы in Details. Never Ukrainian.
    htmlLang: 'ru-RU',
    pronField: 'accented',
    defaultGlossLang: 'ru',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  uk: {
    // Cyrillic only on compact; national-system reading + ти/Ви in Details. Never Russian.
    htmlLang: 'uk-UA',
    pronField: 'accented',
    defaultGlossLang: 'uk',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  he: {
    // RTL Hebrew (unpointed); niqqud honesty in Details.
    htmlLang: 'he-IL',
    pronField: 'accented',
    defaultGlossLang: 'he',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  fa: {
    // RTL Persian script — not Arabic; شما/تو chip in Details.
    htmlLang: 'fa-IR',
    pronField: 'accented',
    defaultGlossLang: 'fa',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ur: {
    // RTL Urdu Nastaliq — never Devanagari / Hindi; آپ/تم chip in Details.
    htmlLang: 'ur-IN',
    pronField: 'accented',
    defaultGlossLang: 'ur',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ml: {
    // Malayalam script title via LangFamilyText; optional ISO 15919 + താങ്കൾ/നിങ്ങൾ/നീ in Details only. Not tonal.
    htmlLang: 'ml-IN',
    pronField: 'accented',
    defaultGlossLang: 'ml',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  mr: {
    // Marathi Devanagari title (not Hindi); optional ISO 15919 + आपण/तुम्ही/तू in Details only. Not tonal.
    htmlLang: 'mr-IN',
    pronField: 'accented',
    defaultGlossLang: 'mr',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  pa: {
    // Punjabi Gurmukhi title (never Shahmukhi); optional ISO 15919 + ਆਪ/ਤੁਸੀਂ/ਤੂੰ in Details only. Punjabi is tonal — tone is not marked in the reading.
    htmlLang: 'pa-IN',
    pronField: 'accented',
    defaultGlossLang: 'pa',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  or: {
    // Odia script title; optional ISO 15919 + ଆପଣ/ତୁମେ/ତୁ in Details only. Not tonal.
    htmlLang: 'or-IN',
    pronField: 'accented',
    defaultGlossLang: 'or',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  si: {
    // Sinhala script title; optional ISO 15919 + ඔබතුමා/ඔබ/ඔයා in Details only. Not tonal; written vs spoken Sinhala differ.
    htmlLang: 'si-LK',
    pronField: 'accented',
    defaultGlossLang: 'si',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ne: {
    // Nepali Devanagari title (not Hindi); optional ISO 15919 + हजुर/तपाईं/तिमी/तँ in Details only. Not tonal.
    htmlLang: 'ne-NP',
    pronField: 'accented',
    defaultGlossLang: 'ne',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  da: {
    // Danish orthography; du chip + stød / silent-letter honesty in Details.
    htmlLang: 'da-DK',
    pronField: 'accented',
    defaultGlossLang: 'da',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  nb: {
    // Norwegian Bokmål orthography; du / dere chip + pitch-accent honesty in Details.
    htmlLang: 'nb-NO',
    pronField: 'accented',
    defaultGlossLang: 'nb',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  fi: {
    // Finnish orthography; sinä / te chip + vowel-length honesty in Details.
    htmlLang: 'fi-FI',
    pronField: 'accented',
    defaultGlossLang: 'fi',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  sk: {
    // Slovak orthography (dĺžeň ä ô ľ); ty / Vy chip in Details.
    htmlLang: 'sk-SK',
    pronField: 'accented',
    defaultGlossLang: 'sk',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  hr: {
    // Croatian Latin orthography (č ć đ š ž); ti / Vi chip in Details.
    htmlLang: 'hr-HR',
    pronField: 'accented',
    defaultGlossLang: 'hr',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ca: {
    // Catalan orthography (ç l·l ny); tu / vostè chip in Details.
    htmlLang: 'ca-ES',
    pronField: 'accented',
    defaultGlossLang: 'ca',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  az: {
    // Azerbaijani Latin orthography (ə ç ğ ı ö ş ü); sən / siz chip in Details.
    htmlLang: 'az-AZ',
    pronField: 'accented',
    defaultGlossLang: 'az',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  kk: {
    // Kazakh Cyrillic only on compact (ә ғ қ ң ө ұ ү һ і); Latin reading + сен/сіз in Details. Never Russian.
    htmlLang: 'kk-KZ',
    pronField: 'accented',
    defaultGlossLang: 'kk',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  uz: {
    // Uzbek Latin orthography (o‘ g‘ sh ch ng) — never Cyrillic; sen / siz chip in Details.
    htmlLang: 'uz-UZ',
    pronField: 'accented',
    defaultGlossLang: 'uz',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  bg: {
    // Bulgarian Cyrillic only on compact; Streamlined System reading + ти/Вие in Details. Never Russian.
    htmlLang: 'bg-BG',
    pronField: 'accented',
    defaultGlossLang: 'bg',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  sr: {
    // Serbian Cyrillic only (never Latin); ти / Ви chip in Details, no Latin reading line.
    htmlLang: 'sr-Cyrl-RS',
    pronField: 'accented',
    defaultGlossLang: 'sr',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  sw: {
    // Swahili Latin orthography; wewe / nyinyi chip in Details.
    htmlLang: 'sw-KE',
    pronField: 'accented',
    defaultGlossLang: 'sw',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  af: {
    // Afrikaans Latin orthography; jy / u chip in Details.
    htmlLang: 'af-ZA',
    pronField: 'accented',
    defaultGlossLang: 'af',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  et: {
    // Estonian Latin orthography (õ ä ö ü š ž); sina / teie chip in Details.
    htmlLang: 'et-EE',
    pronField: 'accented',
    defaultGlossLang: 'et',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  lv: {
    // Latvian Latin orthography (ā č ē ģ ī ķ ļ ņ š ū ž); tu / jūs chip in Details.
    htmlLang: 'lv-LV',
    pronField: 'accented',
    defaultGlossLang: 'lv',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  lt: {
    // Lithuanian Latin orthography (ą č ę ė į š ų ū ž); tu / jūs chip in Details.
    htmlLang: 'lt-LT',
    pronField: 'accented',
    defaultGlossLang: 'lt',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ga: {
    // Irish Latin orthography with fada (á é í ó ú); tú / sibh chip in Details.
    htmlLang: 'ga-IE',
    pronField: 'accented',
    defaultGlossLang: 'ga',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  cy: {
    // Welsh Latin orthography (ŵ ŷ circumflex); ti / chi chip in Details.
    htmlLang: 'cy-GB',
    pronField: 'accented',
    defaultGlossLang: 'cy',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  eu: {
    // Basque Latin orthography (ñ, tx ts tz); hi / zu / zuek chip in Details.
    htmlLang: 'eu-ES',
    pronField: 'accented',
    defaultGlossLang: 'eu',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  gl: {
    // Galician Latin orthography (ñ, accents); ti / vostede chip in Details.
    htmlLang: 'gl-ES',
    pronField: 'accented',
    defaultGlossLang: 'gl',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  mt: {
    // Maltese Latin orthography (ċ ġ ħ ż, għ); inti / intom chip in Details.
    htmlLang: 'mt-MT',
    pronField: 'accented',
    defaultGlossLang: 'mt',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  is: {
    // Icelandic Latin orthography (þ ð æ ö, acute accents); þú / þið chip in Details.
    htmlLang: 'is-IS',
    pronField: 'accented',
    defaultGlossLang: 'is',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  bs: {
    // Bosnian Latin only (č ć đ š ž) — never Cyrillic; ti / vi chip in Details.
    htmlLang: 'bs-BA',
    pronField: 'accented',
    defaultGlossLang: 'bs',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  sq: {
    // Albanian Latin orthography (ë ç); ti / ju chip in Details.
    htmlLang: 'sq-AL',
    pronField: 'accented',
    defaultGlossLang: 'sq',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  zu: {
    // Zulu Latin orthography (clicks c q x); wena / nina chip in Details. Tone not written.
    htmlLang: 'zu-ZA',
    pronField: 'accented',
    defaultGlossLang: 'zu',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  so: {
    // Somali Latin orthography (x c and apostrophe); adiga / idinka chip in Details.
    htmlLang: 'so-SO',
    pronField: 'accented',
    defaultGlossLang: 'so',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  as: {
    // Assamese in Bengali–Assamese script (ৰ ৱ); ISO 15919 reading + আপুনি/তুমি/তই chips in Details. Never Bengali.
    htmlLang: 'as-IN',
    pronField: 'accented',
    defaultGlossLang: 'as',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  mk: {
    // Macedonian Cyrillic only on compact (ѓ ќ ѕ љ њ џ ј); BGN/PCGN reading + ти/Вие in Details. Never Bulgarian or Serbian.
    htmlLang: 'mk-MK',
    pronField: 'accented',
    defaultGlossLang: 'mk',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  mn: {
    // Mongolian Cyrillic only (ө ү) — never traditional vertical Mongolian script; MNS 5217-style reading + чи/та in Details.
    htmlLang: 'mn-MN',
    pronField: 'accented',
    defaultGlossLang: 'mn',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ps: {
    // Pashto RTL Perso-Arabic script (ټ ډ ړ ږ ښ ڼ ځ څ); honesty + ته/تاسو chips in Details. Never Persian or Dari.
    htmlLang: 'ps-AF',
    pronField: 'accented',
    defaultGlossLang: 'ps',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  hy: {
    // Armenian script (Eastern Armenian); դու / դուք chip + honesty in Details, no Latin reading.
    htmlLang: 'hy-AM',
    pronField: 'accented',
    defaultGlossLang: 'hy',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ka: {
    // Georgian Mkhedruli script; შენ / თქვენ chip + honesty in Details, no Latin reading.
    htmlLang: 'ka-GE',
    pronField: 'accented',
    defaultGlossLang: 'ka',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  am: {
    // Amharic Ethiopic (Ge’ez) script; አንተ / አንቺ / እርስዎ / እናንተ chips + honesty in Details, no Latin reading.
    htmlLang: 'am-ET',
    pronField: 'accented',
    defaultGlossLang: 'am',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ceb: {
    htmlLang: 'ceb',
    pronField: 'accented',
    defaultGlossLang: 'ceb',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ilo: {
    htmlLang: 'ilo',
    pronField: 'accented',
    defaultGlossLang: 'ilo',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  bcl: {
    htmlLang: 'bcl',
    pronField: 'accented',
    defaultGlossLang: 'bcl',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  hak: {
    htmlLang: 'hak',
    pronField: 'phakfasu',
    defaultGlossLang: 'hak',
    rubyTitle: true,
    localOffline: false,
    extraPanels: [],
  },
  teo: {
    htmlLang: 'zh-CN-teo',
    pronField: 'pengim',
    defaultGlossLang: 'teo',
    rubyTitle: true,
    localOffline: false,
    extraPanels: [],
  },
  nan: {
    htmlLang: 'nan-CN',
    pronField: 'tailo',
    defaultGlossLang: 'nan',
    rubyTitle: true,
    localOffline: false,
    extraPanels: [],
  },
}

export function detailPedagogy(lang: Lang): DetailPedagogy {
  return DETAIL_PEDAGOGY[lang]
}
