/**
 * Unified dictionary entry for Details — lexicon + phrase memory + optional LLM + keyless visuals (emoji / Wikipedia).
 * Lang-agnostic contract; prompts parameterized by DETAIL_ENRICH_META (server mirror of pedagogy).
 */
import { z } from 'zod'
import { env, llmChatExtras } from './env.js'
import { openaiClientWithKey } from './openaiClient.js'
import { hasHan } from './canto/han.js'
import { resolveDictionaryMedia, type DictionaryMedia } from './detailsMedia.js'

export const DetailLangSchema = z.enum([
  'en',
  'yue',
  'cmn',
  'wuu',
  'sichuan',
  'tl',
  'es',
  'eses',
  'vi',
  'th',
  'lo',
  'ko',
  'ja',
  'id',
  'ms',
  'pt',
  'fr',
  'hi',
  'km',
  'my',
  'jv',
  'it',
  'de',
  'nl',
  'ar',
  'arsa',
  'ta',
  'ptpt',
  'tr',
  'bn',
  'te',
  'gu',
  'kn',
  'pl',
  'ro',
  'cs',
  'el',
  'hu',
  'sv',
  'ru',
  'uk',
  'he',
  'fa',
  'ur',
  'ml',
  'mr',
  'pa',
  'or',
  'si',
  'ne',
  'da',
  'nb',
  'fi',
  'sk',
  'hr',
  'ca',
  'az',
  'kk',
  'uz',
  'bg',
  'sr',
  'sw',
  'af',
  'ceb',
  'ilo',
  'bcl',
])
export type DetailLang = z.infer<typeof DetailLangSchema>

const EnrichBody = z.object({
  text: z.string().min(1).max(500),
  lang: DetailLangSchema,
  /** Paired pane text (source or translation) for context-aware senses. */
  contextText: z.string().max(500).optional(),
  contextLang: DetailLangSchema.optional(),
  /**
   * Learner gloss language — Account Hub primary language.
   * Senses / examples / usage are written in this language (not the lemma language).
   */
  glossLang: DetailLangSchema.optional(),
  /** Prefer illustrative media (emoji offline + keyless Wikipedia thumb). */
  wantMedia: z.boolean().optional(),
})

export type DictionarySense = {
  gloss: string
  pos?: string
  note?: string
}

export type DictionaryExample = {
  text: string
  translation?: string
  note?: string
}

export type { DictionaryMedia }

export type DictionaryEntry = {
  lemma: string
  lang: DetailLang
  /** Language senses/examples/usage were written in (Account Hub primary). */
  glossLang?: DetailLang
  pronunciation?: string
  senses: DictionarySense[]
  examples: DictionaryExample[]
  usageNotes: string[]
  media: DictionaryMedia[]
  provenance: string[]
  engine: 'offline' | 'openai' | 'mixed'
}

/**
 * Writing-language meta for senses/examples/usage.
 * `lang` = lemma language; `glossLang` (Account Hub primary) selects this row for output.
 * Keep in sync with web `DETAIL_PEDAGOGY` / primary langs.
 */
const ENRICH_META: Record<
  DetailLang,
  { label: string; glossLangHint: string; exampleIn: string }
> = {
  en: {
    label: 'English',
    glossLangHint: 'clear English',
    exampleIn: 'natural English',
  },
  yue: {
    label: 'Hong Kong Cantonese (粵語)',
    glossLangHint: 'Hong Kong Cantonese (粵語) — write glosses and notes in 粵語 Chinese characters (Jyutping is added by the client)',
    exampleIn: 'natural 粵語 (Chinese characters)',
  },
  cmn: {
    label: 'Mandarin Chinese',
    glossLangHint: 'Mandarin Chinese (普通话) — Chinese characters (pinyin is added by the client)',
    exampleIn: 'natural Mandarin (Chinese characters)',
  },
  wuu: {
    label: 'Shanghainese (吳語)',
    glossLangHint: 'Shanghainese (吳語) — Chinese characters',
    exampleIn: 'natural Shanghainese (Chinese characters)',
  },
  sichuan: {
    label: 'Sichuanese / Chengdu dialect (四川話)',
    glossLangHint: 'Chengdu Sichuanese (四川話) — Chinese characters',
    exampleIn: 'natural Chengdu Sichuanese (Chinese characters)',
  },
  tl: {
    label: 'Tagalog / Filipino',
    glossLangHint: 'Tagalog / Filipino',
    exampleIn: 'natural Tagalog',
  },
  es: {
    label: 'Mexican Spanish',
    glossLangHint: 'Mexican Spanish',
    exampleIn: 'natural Mexican Spanish',
  },
  eses: {
    label: 'Peninsular Spanish (Spain)',
    glossLangHint: 'Peninsular / Castilian Spanish (Spain) — not Mexican',
    exampleIn: 'natural Peninsular Spanish (Spain)',
  },
  vi: {
    label: 'Vietnamese',
    glossLangHint: 'Vietnamese',
    exampleIn: 'natural Vietnamese',
  },
  th: {
    label: 'Central Thai (ภาษาไทย)',
    glossLangHint: 'Central Thai (ภาษาไทย) — native Thai script only, never RTGS',
    exampleIn: 'natural Central Thai (Thai script)',
  },
  lo: {
    label: 'Vientiane Lao (ພາສາລາວ)',
    glossLangHint: 'Vientiane Lao (ພາສາລາວ) — native Lao script only',
    exampleIn: 'natural Vientiane Lao (Lao script)',
  },
  ko: {
    label: 'Korean (한국어)',
    glossLangHint: 'Korean (한국어) — Hangul only; Revised Romanization is added by the client',
    exampleIn: 'natural Korean (Hangul)',
  },
  ja: {
    label: 'Japanese (日本語 / 共通語)',
    glossLangHint:
      'Japanese (日本語) — natural kanji + kana; optional kana/romaji readings for lemmas; note です・ます vs plain when relevant',
    exampleIn: 'natural modern Japanese (kanji + kana, colloquial unless formal)',
  },
  id: {
    label: 'Indonesian (Bahasa Indonesia)',
    glossLangHint:
      'colloquial Bahasa Indonesia (Jakarta/media everyday) — Latin orthography; note informal vs formal pronouns (kamu/Anda, aku/saya) and casual particles (dong/deh/sih) when relevant; never Chao/IPA/tone digits',
    exampleIn: 'natural colloquial Indonesian (Latin script)',
  },
  ms: {
    label: 'Malay (Bahasa Melayu / Malaysia)',
    glossLangHint:
      'colloquial Bahasa Melayu (Malaysia / ms-MY everyday) — Latin orthography; note informal vs formal pronouns (kau/anda, aku/saya) and casual particles (lah/je/kan) when relevant; never Chao/IPA/tone digits; not Indonesian',
    exampleIn: 'natural colloquial Malay (Latin script, Malaysia)',
  },
  pt: {
    label: 'Brazilian Portuguese (português do Brasil)',
    glossLangHint:
      'Brazilian Portuguese (pt-BR) — Latin orthography with correct accents; not European Portuguese',
    exampleIn: 'natural Brazilian Portuguese (pt-BR)',
  },
  fr: {
    label: 'Metropolitan French (France)',
    glossLangHint:
      'Metropolitan French (France / fr-FR) — correct orthography with accents; colloquial everyday, not Quebec-primary',
    exampleIn: 'natural Metropolitan French (France)',
  },
  hi: {
    label: 'Hindi (हिन्दी)',
    glossLangHint:
      'Modern Standard Hindi (हिन्दी) — Devanagari only; IAST romanization is added by the client in Details',
    exampleIn: 'natural Modern Standard Hindi (Devanagari)',
  },
  km: {
    label: 'Cambodian Khmer (ភាសាខ្មែរ)',
    glossLangHint: 'Cambodian Khmer (ភាសាខ្មែរ) — native Khmer script only; never Latin romanization or tone digits',
    exampleIn: 'natural Cambodian Khmer (Khmer script)',
  },
  my: {
    label: 'Standard Burmese (မြန်မာ)',
    glossLangHint:
      'Standard Burmese (မြန်မာ) — native Myanmar script only; MLCTS is added by the client — never invent ASCII tone digits',
    exampleIn: 'natural colloquial Burmese (Myanmar script)',
  },
  jv: {
    label: 'Javanese (Basa Jawa)',
    glossLangHint:
      'colloquial Latin Javanese (Central/East Java media, ngoko by default) — note undha-usuk speech level (ngoko / madya / krama) when detectable; never Indonesian wording by default; never Chao/IPA/tone digits or Hanacaraka',
    exampleIn: 'natural colloquial Latin Javanese',
  },
  it: {
    label: 'Standard Italian (Italia)',
    glossLangHint:
      'Standard Italian (Italia / it-IT) — correct orthography with accents; colloquial everyday, not regional dialect by default',
    exampleIn: 'natural standard Italian (Italia)',
  },
  de: {
    label: 'Standard German (Deutschland)',
    glossLangHint:
      'Standard German (Deutschland / de-DE) — correct orthography with umlauts and ß; colloquial everyday, not Swiss- or Austrian-primary',
    exampleIn: 'natural standard German (Deutschland)',
  },
  nl: {
    label: 'Standard Dutch (Netherlands)',
    glossLangHint:
      'Standard Dutch (Netherlands / nl-NL) — correct orthography; colloquial everyday, not Flemish-primary',
    exampleIn: 'natural Netherlands Dutch',
  },
  ar: {
    label: 'Egyptian Arabic (عامية مصرية)',
    glossLangHint:
      'Egyptian Arabic colloquial (Cairene, ar-EG) — Arabic script only; everyday spoken wording (ده / مش / عايز), not فصحى or Gulf/Levantine; no Arabizi, no full tashkeel',
    exampleIn: 'natural colloquial Egyptian Arabic (Arabic script)',
  },
  arsa: {
    label: 'Modern Standard Arabic (العربية الفصحى)',
    glossLangHint:
      'Modern Standard Arabic (فصحى, ar-SA speech) — Arabic script only; formal written pan-Arab register, not Egyptian or Gulf colloquial; no Arabizi, no full tashkeel',
    exampleIn: 'natural Modern Standard Arabic (Arabic script)',
  },
  ta: {
    label: 'Tamil (தமிழ்)',
    glossLangHint:
      'colloquial spoken Tamil (தமிழ், ta-IN) — Tamil script only; ISO 15919 is added by the client in Details — never Latin/Tanglish as the main line',
    exampleIn: 'natural colloquial Tamil (Tamil script)',
  },
  ptpt: {
    label: 'European Portuguese (português de Portugal)',
    glossLangHint:
      'European Portuguese (pt-PT) — Latin orthography with correct accents (AO90 Portugal spelling) and European lexicon (autocarro, telemóvel, "estar a"); not Brazilian Portuguese',
    exampleIn: 'natural European Portuguese (pt-PT)',
  },
  tr: {
    label: 'Turkish (Türkçe)',
    glossLangHint:
      'colloquial Turkish (Türkiye / tr-TR) — correct orthography with ı İ ğ ş ç ö ü and vowel harmony; never ASCII-folded',
    exampleIn: 'natural colloquial Turkish',
  },
  bn: {
    label: 'Bengali (বাংলা)',
    glossLangHint:
      'Standard Colloquial Bengali (চলিত বাংলা, bn-IN) — Bangla script only; ISO 15919 is added by the client in Details — never Devanagari or Latin/Banglish as the main line',
    exampleIn: 'natural colloquial Bengali (Bangla script)',
  },
  te: {
    label: 'Telugu (తెలుగు)',
    glossLangHint:
      'colloquial spoken Telugu (తెలుగు, te-IN) — Telugu script only; ISO 15919 is added by the client in Details — never Latin, Kannada, Tamil, or Devanagari as the main line',
    exampleIn: 'natural colloquial Telugu (Telugu script)',
  },
  gu: {
    label: 'Gujarati (ગુજરાતી)',
    glossLangHint:
      'colloquial spoken Gujarati (ગુજરાતી, gu-IN) — Gujarati script only; ISO 15919 is added by the client in Details — never Devanagari / Hindi or Latin as the main line',
    exampleIn: 'natural colloquial Gujarati (Gujarati script)',
  },
  kn: {
    label: 'Kannada (ಕನ್ನಡ)',
    glossLangHint:
      'colloquial spoken Kannada (ಕನ್ನಡ, kn-IN) — Kannada script only; ISO 15919 is added by the client in Details — never Latin, Telugu, Tamil, or Devanagari as the main line',
    exampleIn: 'natural colloquial Kannada (Kannada script)',
  },
  pl: {
    label: 'Polish (polski)',
    glossLangHint:
      'Standard Polish (pl-PL) — correct orthography with ą ć ę ł ń ó ś ź ż; note ty vs Pan/Pani address when relevant; never ASCII-folded',
    exampleIn: 'natural everyday Polish',
  },
  ro: {
    label: 'Romanian (română)',
    glossLangHint:
      'Standard Romanian (ro-RO) — correct orthography with ă â î and comma-below ș ț; note tu vs dumneavoastră when relevant; never ASCII-folded',
    exampleIn: 'natural everyday Romanian',
  },
  cs: {
    label: 'Czech (čeština)',
    glossLangHint:
      'Standard Czech (cs-CZ) — correct orthography with háčky and čárky (ě ř ů); note ty vs Vy when relevant; not Slovak',
    exampleIn: 'natural everyday Czech',
  },
  el: {
    label: 'Modern Greek (Ελληνικά)',
    glossLangHint:
      'Modern Greek (el-GR) — Greek alphabet only, monotonic accents; note εσύ vs εσείς when relevant; never Greeklish as the main line',
    exampleIn: 'natural everyday Modern Greek (Greek script)',
  },
  hu: {
    label: 'Hungarian (magyar)',
    glossLangHint:
      'Standard Hungarian (hu-HU) — correct orthography with ö ő ü ű and long vowels; note te vs Ön/Maga when relevant; never ASCII-folded',
    exampleIn: 'natural everyday Hungarian',
  },
  sv: {
    label: 'Swedish (svenska)',
    glossLangHint:
      'Standard Swedish (sv-SE) — correct orthography with å ä ö; du by default (ni for plural / rare formal); not Norwegian or Danish',
    exampleIn: 'natural everyday Swedish',
  },
  ru: {
    label: 'Russian (русский)',
    glossLangHint:
      'Standard Russian (ru-RU) — Cyrillic only, no stress marks; note ты vs Вы when relevant; never Ukrainian wording or Latin translit as the main line',
    exampleIn: 'natural everyday Russian (Cyrillic)',
  },
  uk: {
    label: 'Ukrainian (українська)',
    glossLangHint:
      'Standard Ukrainian (uk-UA) — Ukrainian Cyrillic (і ї є ґ) only, no stress marks; note ти vs Ви when relevant; never Russian wording, surzhyk, or Latin translit',
    exampleIn: 'natural everyday Ukrainian (Cyrillic)',
  },
  he: {
    label: 'Modern Hebrew (עברית)',
    glossLangHint:
      'Modern Israeli Hebrew (he-IL) — Hebrew script without niqqud; never Latin transliteration, Arabic, or Yiddish as the main line',
    exampleIn: 'natural everyday Modern Hebrew (unpointed Hebrew script)',
  },
  fa: {
    label: 'Persian / Farsi (فارسی)',
    glossLangHint:
      'colloquial Iranian Persian (fa-IR) — Persian script with Persian ی ک and ZWNJ; note شما vs تو when relevant; this is Persian, NOT Arabic — never Arabic grammar or Finglish',
    exampleIn: 'natural everyday Persian (Persian script)',
  },
  ur: {
    label: 'Urdu (اردو)',
    glossLangHint:
      'colloquial Urdu (ur-IN / ur-PK) — Perso-Arabic Nastaliq script only; note آپ vs تم vs تو when relevant; this is Urdu, NOT Hindi — never Devanagari or Roman Urdu',
    exampleIn: 'natural everyday Urdu (Urdu script)',
  },
  ml: {
    label: 'Malayalam (മലയാളം)',
    glossLangHint:
      'colloquial spoken Malayalam (ml-IN) — Malayalam script only; romanization is added by the client in Details; note നീ vs നിങ്ങൾ address when relevant — never Latin, Tamil, Telugu, Kannada, or Devanagari as the main line',
    exampleIn: 'natural colloquial Malayalam (Malayalam script)',
  },
  mr: {
    label: 'Marathi (मराठी)',
    glossLangHint:
      'colloquial spoken Marathi (mr-IN) — Devanagari script with Marathi spelling and grammar; romanization is added by the client in Details; note तू vs तुम्ही vs आपण when relevant; this is Marathi, NOT Hindi — never Hindi or Nepali wording, never Latin as the main line',
    exampleIn: 'natural colloquial Marathi (Devanagari)',
  },
  pa: {
    label: 'Punjabi (ਪੰਜਾਬੀ)',
    glossLangHint:
      'colloquial spoken Punjabi (pa-IN) — Gurmukhi script only; romanization is added by the client in Details; note ਤੂੰ vs ਤੁਸੀਂ vs ਆਪ when relevant — never Shahmukhi (Arabic script), Devanagari / Hindi, or Latin as the main line',
    exampleIn: 'natural colloquial Punjabi (Gurmukhi)',
  },
  or: {
    label: 'Odia (ଓଡ଼ିଆ)',
    glossLangHint:
      'colloquial spoken Odia (or-IN) — Odia script only; romanization is added by the client in Details; note ତୁ vs ତୁମେ vs ଆପଣ when relevant — never Latin, Bengali, Devanagari, or Telugu as the main line',
    exampleIn: 'natural colloquial Odia (Odia script)',
  },
  si: {
    label: 'Sinhala (සිංහල)',
    glossLangHint:
      'colloquial spoken Sinhala (si-LK) — Sinhala script only; romanization is added by the client in Details; prefer spoken කතා සිංහල over stiff literary written Sinhala; note ඔයා vs ඔබ when relevant — never Latin, Tamil, or Devanagari as the main line',
    exampleIn: 'natural colloquial Sinhala (Sinhala script)',
  },
  ne: {
    label: 'Nepali (नेपाली)',
    glossLangHint:
      'colloquial spoken Nepali (ne-NP) — Devanagari script with Nepali spelling and grammar; romanization is added by the client in Details; note तँ vs तिमी vs तपाईं when relevant; this is Nepali, NOT Hindi — never Hindi or Marathi wording, never Latin as the main line',
    exampleIn: 'natural colloquial Nepali (Devanagari)',
  },
  da: {
    label: 'Danish (dansk)',
    glossLangHint:
      'Standard Danish (da-DK) — correct orthography with æ ø å; note du vs De address when relevant; never Norwegian or Swedish wording; never ASCII-folded',
    exampleIn: 'natural everyday Danish',
  },
  nb: {
    label: 'Norwegian Bokmål (norsk bokmål)',
    glossLangHint:
      'Norwegian Bokmål (nb-NO) — correct orthography with æ ø å; note du vs De address when relevant; never Nynorsk, Danish, or Swedish wording; never ASCII-folded',
    exampleIn: 'natural everyday Norwegian Bokmål',
  },
  fi: {
    label: 'Finnish (suomi)',
    glossLangHint:
      'Standard Finnish (fi-FI) — correct orthography with ä ö; note sinä vs te address and relevant case endings when helpful; never Swedish or Estonian wording; never ASCII-folded',
    exampleIn: 'natural everyday Finnish',
  },
  sk: {
    label: 'Slovak (slovenčina)',
    glossLangHint:
      'Standard Slovak (sk-SK) — correct orthography with á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž; note ty vs vy address when relevant; never Czech wording or letters (ě ř ů); never ASCII-folded',
    exampleIn: 'natural everyday Slovak',
  },
  hr: {
    label: 'Croatian (hrvatski)',
    glossLangHint:
      'Standard Croatian (hr-HR) — Latin script with č ć đ š ž; note ti vs Vi address when relevant; standard ijekavian — never Cyrillic, Serbian ekavian, or Bosnian-specific wording; never ASCII-folded',
    exampleIn: 'natural everyday Croatian',
  },
  ca: {
    label: 'Catalan (català)',
    glossLangHint:
      'Standard Central Catalan (ca-ES) — correct orthography with à è é í ï ò ó ú ü ç and l·l; note tu vs vostè address when relevant; never Spanish (Castilian), French, or Occitan wording; never ASCII-folded',
    exampleIn: 'natural everyday Catalan',
  },
  az: {
    label: 'Azerbaijani (Azərbaycan dili)',
    glossLangHint:
      'Standard Azerbaijani (az-AZ) in Latin script — correct letters ə ç ş ğ ı ö ü (capital Ə İ); note sən vs siz address when relevant; never Turkish (Türkiye), Cyrillic, or Arabic-script wording; never ASCII-folded',
    exampleIn: 'natural everyday Azerbaijani',
  },
  kk: {
    label: 'Kazakh (қазақ тілі)',
    glossLangHint:
      'Standard Kazakh (kk-KZ) in Cyrillic — correct letters ә ғ қ ң ө ұ ү һ і; note сен vs сіз address and vowel harmony when helpful; never Russian wording where a Kazakh word exists; never Latin transliteration',
    exampleIn: 'natural everyday Kazakh',
  },
  uz: {
    label: 'Uzbek (oʻzbek tili)',
    glossLangHint:
      'Standard Uzbek (uz-UZ) in Latin script — oʻ gʻ sh ch with tutuq belgisi ʼ; note sen vs siz address when relevant; never Cyrillic or Arabic-script Uzbek; never Kazakh, Kyrgyz, or Turkish wording',
    exampleIn: 'natural everyday Uzbek',
  },
  bg: {
    label: 'Bulgarian (български)',
    glossLangHint:
      'Standard Bulgarian (bg-BG) in Cyrillic — postfixed definite article (-ът, -та, -то, -те), no noun cases; note ти vs Вие address when relevant; never Russian wording or letters (ы э ё), never Serbian or Macedonian letters; never Latin transliteration',
    exampleIn: 'natural everyday Bulgarian',
  },
  sr: {
    label: 'Serbian (српски)',
    glossLangHint:
      'Standard Serbian (sr-RS) in Cyrillic only — includes ђ ј љ њ ћ џ; note ти vs Ви address when relevant; standard ekavian — never Latin script (Latinica), Croatian or Bosnian wording, nor Russian or Bulgarian letters',
    exampleIn: 'natural everyday Serbian',
  },
  sw: {
    label: 'Swahili (Kiswahili)',
    glossLangHint:
      'Standard Kiswahili (sw-KE) in Latin script — note noun classes and verb prefixes when helpful; polite forms (tafadhali, naomba) when relevant; never Arabic script, Sheng slang as the main line, or other Bantu wording',
    exampleIn: 'natural everyday Swahili',
  },
  af: {
    label: 'Afrikaans',
    glossLangHint:
      'Standard Afrikaans (af-ZA) in Latin script — correct diacritics ê é è ë ï ô ö û ü; note jy vs u address when relevant; never Dutch (Nederlands) spelling or wording, never German; never ASCII-folded',
    exampleIn: 'natural everyday Afrikaans',
  },
  ceb: {
    label: 'Cebuano / Bisaya',
    glossLangHint: 'Cebuano',
    exampleIn: 'natural Cebuano',
  },
  ilo: {
    label: 'Ilocano / Ilokano',
    glossLangHint: 'Ilocano',
    exampleIn: 'natural Ilocano',
  },
  bcl: {
    label: 'Central Bikol / Bikol Naga',
    glossLangHint: 'Central Bikol',
    exampleIn: 'natural Central Bikol',
  },
}

function uniqueStrings(items: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of items) {
    const t = raw.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

/**
 * Offline senses stay in the Details panel language only.
 * Never promote CONTEXT / paired-pane text into senses (header translation covers that).
 * Cross-language lexicon glosses (e.g. EN→粵) are omitted so Solo EN↔Sichuanese cannot share a dict.
 * Monolingual senses come from the AI enrich path when available.
 */
function offlineSenses(_text: string, _lang: DetailLang): DictionarySense[] {
  return []
}

/** Drop senses that merely echo the paired CONTEXT string. */
function withoutPairedLeak(senses: DictionarySense[], contextText?: string): DictionarySense[] {
  const ctx = (contextText || '').trim().toLowerCase()
  if (!ctx) return senses
  return senses.filter((s) => s.gloss.trim().toLowerCase() !== ctx)
}


function parseModelEntry(raw: string): {
  pronunciation?: string
  senses: DictionarySense[]
  examples: DictionaryExample[]
  usageNotes: string[]
} {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const senses: DictionarySense[] = []
    if (Array.isArray(parsed.senses)) {
      for (const item of parsed.senses) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        const gloss = typeof row.gloss === 'string' ? row.gloss.trim() : ''
        if (!gloss) continue
        senses.push({
          gloss,
          pos: typeof row.pos === 'string' ? row.pos.trim() : undefined,
          note: typeof row.note === 'string' ? row.note.trim() : undefined,
        })
      }
    }
    const examples: DictionaryExample[] = []
    if (Array.isArray(parsed.examples)) {
      for (const item of parsed.examples) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        const text = typeof row.text === 'string' ? row.text.trim() : ''
        if (!text) continue
        examples.push({
          text,
          translation: typeof row.translation === 'string' ? row.translation.trim() : undefined,
          note: typeof row.note === 'string' ? row.note.trim() : undefined,
        })
      }
    }
    const usageNotes = Array.isArray(parsed.usageNotes)
      ? uniqueStrings(parsed.usageNotes.filter((n): n is string => typeof n === 'string'))
      : []
    const pronunciation =
      typeof parsed.pronunciation === 'string' && parsed.pronunciation.trim()
        ? parsed.pronunciation.trim()
        : undefined
    return { pronunciation, senses, examples, usageNotes }
  } catch {
    return { senses: [], examples: [], usageNotes: [] }
  }
}

async function modelEnrich(input: {
  text: string
  lang: DetailLang
  glossLang: DetailLang
  contextText?: string
  contextLang?: DetailLang
}): Promise<{
  pronunciation?: string
  senses: DictionarySense[]
  examples: DictionaryExample[]
  usageNotes: string[]
} | null> {
  if (!env.openaiApiKey) return null
  const lemmaMeta = ENRICH_META[input.lang]
  const glossMeta = ENRICH_META[input.glossLang]
  const client = openaiClientWithKey()
  const system = [
    `You are a learner dictionary for JyutTranslate.`,
    `Lemma language: ${lemmaMeta.label}. Learner primary (gloss) language: ${glossMeta.label}.`,
    'Synthesize ONE unified dictionary entry: explain the LEMMA for a learner whose primary language is the gloss language.',
    'Return ONLY valid JSON:',
    '{"pronunciation":"<lemma pronunciation: ipa or romanization or empty>","senses":[{"gloss":"...","pos":"noun|verb|…","note":"optional"}],"examples":[{"text":"...","translation":"...","note":"optional"}],"usageNotes":["..."]}',
    'Rules:',
    `- Every sense gloss, usage note, and example "text" MUST be written in: ${glossMeta.glossLangHint}.`,
    `- Example "text" in ${glossMeta.exampleIn} — illustrate the lemma’s meaning for that learner.`,
    `- When gloss language ≠ lemma language, optional example "translation" may briefly show a lemma-language surface form; never put CONTEXT / paired-pane text into glosses.`,
    '- CONTEXT (when provided) is ONLY for sense disambiguation (e.g. Apple fruit vs company). NEVER copy CONTEXT into gloss, examples, or usageNotes.',
    '- Do not write senses in the lemma language when a different gloss language was requested.',
    '- For Cantonese (yue) lemmas: pronunciation MUST be "" — the client shows LSHK Jyutping + Chao tone letters; never invent IPA or Mandarin pinyin.',
    '- Never use Mandarin pinyin for a Cantonese lemma.',
    '- 1–4 senses, 1–3 examples, 0–3 usage notes. Be concise. No markdown.',
  ].join('\n')
  const user = [
    `Lemma (${input.lang}): ${input.text}`,
    `Gloss language (${input.glossLang}): write senses/examples/usage in this language only.`,
    input.contextText
      ? `CONTEXT for disambiguation only (${input.contextLang || 'paired'}): ${input.contextText}`
      : 'CONTEXT: (none)',
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.35,
      max_tokens: 900,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    return parseModelEntry(raw)
  } catch {
    return null
  }
}

export async function enrichDictionaryEntry(input: unknown): Promise<DictionaryEntry> {
  const parsed = EnrichBody.parse(input)
  const lemma = parsed.text.trim()
  const lang = parsed.lang || (hasHan(lemma) ? 'yue' : 'en')
  const provenance: string[] = []
  const offline = withoutPairedLeak(offlineSenses(lemma, lang), parsed.contextText)
  if (offline.length) provenance.push('lexicon')

  const glossLang = parsed.glossLang || lang
  const model = await modelEnrich({
    text: lemma,
    lang,
    glossLang,
    contextText: parsed.contextText,
    contextLang: parsed.contextLang,
  })

  let senses = offline
  let examples: DictionaryExample[] = []
  let usageNotes: string[] = []
  let pronunciation: string | undefined
  let engine: DictionaryEntry['engine'] = 'offline'

  if (model) {
    provenance.push('ai-synthesis')
    engine = offline.length ? 'mixed' : 'openai'
    // Cantonese: strip AI pronunciation — client Jyutping + Chao tone letters is authoritative.
    pronunciation = lang === 'yue' ? undefined : model.pronunciation
    // Prefer model senses when present; keep offline glosses that add something new.
    const modelGlosses = withoutPairedLeak(model.senses, parsed.contextText)
    if (modelGlosses.length) {
      senses = [
        ...modelGlosses,
        ...offline.filter(
          (o) => !modelGlosses.some((m) => m.gloss.toLowerCase() === o.gloss.toLowerCase()),
        ),
      ].slice(0, 6)
    }
    examples = model.examples.slice(0, 4)
    usageNotes = model.usageNotes.slice(0, 4)
  }
  senses = withoutPairedLeak(senses, parsed.contextText)

  const mediaPack = await resolveDictionaryMedia({
    lemma,
    contextText: parsed.contextText,
    // Remote Wikipedia thumb is keyless; still skip when caller opts out.
    wantRemote: parsed.wantMedia !== false,
  })
  const media = mediaPack.media
  if (mediaPack.provenance.length) {
    provenance.push(...mediaPack.provenance)
  }
  // Do not flip engine for Wikipedia/emoji — only LLM synthesis is metered.

  return {
    lemma,
    lang,
    glossLang,
    pronunciation,
    senses,
    examples,
    usageNotes,
    media,
    provenance: uniqueStrings(provenance),
    engine,
  }
}
