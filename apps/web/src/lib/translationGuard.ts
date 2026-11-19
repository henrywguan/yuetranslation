/**
 * Client-side translation sanitizers — gloss-dump detection lives in `@jyut/shared`.
 */
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './charGloss'

/**
 * Accept only clean translation text for pane display.
 * Returns null when the string must not be shown as a translation.
 */
function sanitizeTranslationText(text: string | null | undefined): string | null {
  const t = (text || '').trim()
  if (!t) return null
  if (looksLikeGlossDump(t)) return null
  return t
}

/** Reject EN→粵 payloads that never produced Cantonese characters. */
export function sanitizeYueTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (!hasHan(t)) return null
  return t
}

/** Reject 粵→EN payloads that still contain Cantonese characters (source echo). */
export function sanitizeEnTranslation(
  text: string | null | undefined,
  sourceYue?: string | null,
): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  const src = (sourceYue || '').trim()
  if (src && t === src) return null
  return t
}


/** Reject EN→Tagalog payloads that are empty, glossy, or still Chinese. */
export function sanitizeTlTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\p{L}]/u.test(t)) return null
  return t
}


/** Reject EN→Mexican Spanish payloads that are empty, glossy, or still Chinese. */
export function sanitizeEsTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\p{L}]/u.test(t)) return null
  return t
}

/** Reject EN→Vietnamese payloads that are empty, glossy, or still Chinese. */
export function sanitizeViTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\p{L}]/u.test(t)) return null
  return t
}

/** Reject EN→Thai payloads that are empty, glossy, Han, or missing Thai script. */
export function sanitizeThTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u0E00-\u0E7F]/.test(t)) return null
  return t
}

/** Reject EN→Lao payloads that are empty, glossy, Han, or missing Lao script. */
export function sanitizeLoTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u0E80-\u0EFF]/.test(t)) return null
  return t
}

/** Reject EN→Korean payloads that are empty, glossy, Han, or missing Hangul. */
export function sanitizeKoTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\uAC00-\uD7A3]/.test(t)) return null
  return t
}

/** Reject EN→Cebuano / Ilocano / Central Bikol Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeCebTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeIloTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeBclTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→Japanese payloads that are empty, glossy, romaji-only, or long Chinese-only. */
export function sanitizeJaTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  const hasKana = /[\u3040-\u309F\u30A0-\u30FF\uFF66-\uFF9D]/.test(t)
  if (hasKana) return t
  const kanji = t.replace(/[^\u3400-\u9FFF\uF900-\uFAFF]/g, '')
  // Short kanji compounds (出口, 東京) OK; long Han-only lines are usually Chinese.
  if (kanji.length > 0 && kanji.length <= 12) return t
  return null
}

export function sanitizeHiTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u0900-\u097F]/.test(t)) return null
  return t
}

export function sanitizeKmTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u1780-\u17FF]/.test(t)) return null
  return t
}

export function sanitizeMyTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u1000-\u109F]/.test(t)) return null
  return t
}


/** Reject EN→id Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeIdTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→ms Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeMsTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→Brazilian Portuguese payloads that are empty, glossy, or still Chinese. */
export function sanitizePtTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\p{L}]/u.test(t)) return null
  return t
}

/** Reject EN→fr Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeFrTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→jv Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeJvTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→it Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeItTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→de Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeDeTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→nl Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeNlTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→Arabic payloads (Egyptian `ar` and MSA `arsa`) that are empty, glossy, Han, or missing Arabic script. */
export function sanitizeArTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u0600-\u06FF]/.test(t)) return null
  return t
}

/** Reject EN→Tamil payloads that are empty, glossy, Han, or missing Tamil script (no Tanglish main line). */
export function sanitizeTaTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u0B80-\u0BFF]/.test(t)) return null
  return t
}

/** Reject EN→Bengali payloads that are empty, glossy, Han, or missing Bangla script (no Banglish main line). */
export function sanitizeBnTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u0980-\u09FF]/.test(t)) return null
  return t
}

function sanitizeScriptGated(
  text: string | null | undefined,
  require: RegExp,
  reject?: RegExp,
): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!require.test(t)) return null
  if (reject && reject.test(t)) return null
  return t
}

/** Reject EN→Telugu payloads missing Telugu script (no Latin / Kannada main line). */
export function sanitizeTeTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0C00-\u0C7F]/)
}

/** Reject EN→Gujarati payloads missing Gujarati script or written in Devanagari. */
export function sanitizeGuTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0A80-\u0AFF]/, /[\u0900-\u097F]/)
}

/** Reject EN→Kannada payloads missing Kannada script (no Latin / Telugu main line). */
export function sanitizeKnTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0C80-\u0CFF]/)
}

export function sanitizePlTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeRoTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeCsTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→Greek payloads missing Greek script (no Greeklish main line). */
export function sanitizeElTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0370-\u03FF\u1F00-\u1FFF]/)
}

export function sanitizeHuTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeSvTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→Russian payloads missing Cyrillic or carrying Ukrainian-only letters (і ї є ґ). */
export function sanitizeRuTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0400-\u04FF]/, /[ІіЇїЄєҐґ]/)
}

/** Reject EN→Ukrainian payloads missing Cyrillic or carrying Russian-only letters (ы э ъ ё). */
export function sanitizeUkTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0400-\u04FF]/, /[ЫыЭэЪъЁё]/)
}

/** Reject EN→Hebrew payloads missing Hebrew script. */
export function sanitizeHeTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0590-\u05FF]/)
}

/** Reject EN→Persian payloads missing Perso-Arabic script or carrying Urdu-only letters. */
export function sanitizeFaTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0600-\u06FF]/, /[\u0679\u0688\u0691\u06BA\u06D2\u06D3\u06BE]/)
}

/** Reject EN→Urdu payloads missing Perso-Arabic script or written in Devanagari (Hindi). */
export function sanitizeUrTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0600-\u06FF]/, /[\u0900-\u097F]/)
}

/** Reject EN→Malayalam payloads missing Malayalam script (no Latin / Tamil main line). */
export function sanitizeMlTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0D00-\u0D7F]/)
}

/** Reject EN→Marathi payloads missing Devanagari. */
export function sanitizeMrTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0900-\u097F]/)
}

/** Reject EN→Punjabi (India) payloads missing Gurmukhi or written in Shahmukhi (Perso-Arabic). */
export function sanitizePaTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0A00-\u0A7F]/, /[\u0600-\u06FF]/)
}

/** Reject EN→Odia payloads missing Odia script. */
export function sanitizeOrTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0B00-\u0B7F]/)
}

/** Reject EN→Sinhala payloads missing Sinhala script. */
export function sanitizeSiTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0D80-\u0DFF]/)
}

/** Reject EN→Nepali payloads missing Devanagari. */
export function sanitizeNeTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0900-\u097F]/)
}

export function sanitizeDaTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeNbTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeFiTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeSkTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeHrTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeCaTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→Azerbaijani payloads that are not Latin-script (no Cyrillic / Arabic-script main line). */
export function sanitizeAzTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[A-Za-z\u00C0-\u024F]/, /[\u0400-\u04FF\u0600-\u06FF]/)
}

/** Reject EN→Kazakh payloads missing Cyrillic (no Latin / Arabic-script main line). */
export function sanitizeKkTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0400-\u04FF]/, /[\u0600-\u06FF]/)
}

/** Reject EN→Uzbek payloads that are not Latin-script (no Cyrillic / Arabic-script main line). */
export function sanitizeUzTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[A-Za-z\u00C0-\u024F]/, /[\u0400-\u04FF\u0600-\u06FF]/)
}

/** Reject EN→Bulgarian payloads missing Cyrillic or carrying Russian-only letters (ы э ё). */
export function sanitizeBgTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0400-\u04FF]/, /[ЫыЭэЁё]/)
}

/** Reject EN→Serbian payloads missing Cyrillic — Latin Serbian (č ć š ž đ) is never the main line. */
export function sanitizeSrTranslation(text: string | null | undefined): string | null {
  return sanitizeScriptGated(text, /[\u0400-\u04FF]/, /[ЫыЭэЁёЪъЇїЄєҐґčćšžđČĆŠŽĐ]/)
}

export function sanitizeSwTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeAfTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→Turkish Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeTrTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

/** Reject EN→European Portuguese payloads that are empty, glossy, or still Chinese. */
export function sanitizePtptTranslation(text: string | null | undefined): string | null {
  return sanitizePtTranslation(text)
}

export function sanitizeScaffoldLatinTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}
