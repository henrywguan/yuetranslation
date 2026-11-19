import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { hasHan } from './canto/han.js'
import { scrubYueToCmn } from './canto/scrubCmn.js'
import {
  normalizeCamChineseSource,
  polishCamYueOutput,
  toSimplified,
} from './canto/opencc.js'
import {
  ARABIC_SCRIPT_RE,
  ARMENIAN_REJECT_RE,
  ARMENIAN_SCRIPT_RE,
  ASSAMESE_REJECT_RE,
  BENGALI_ASSAMESE_SCRIPT_RE,
  BULGARIAN_REJECT_RE,
  ETHIOPIC_REJECT_RE,
  ETHIOPIC_SCRIPT_RE,
  GEORGIAN_REJECT_RE,
  GEORGIAN_SCRIPT_RE,
  MACEDONIAN_REJECT_RE,
  MONGOLIAN_REJECT_RE,
  CYRILLIC_OR_ARABIC_RE,
  KAZAKH_REJECT_RE,
  SERBIAN_REJECT_RE,
  CYRILLIC_SCRIPT_RE,
  DEVANAGARI_RE,
  GREEK_SCRIPT_RE,
  GUJARATI_SCRIPT_RE,
  GURMUKHI_SCRIPT_RE,
  HEBREW_SCRIPT_RE,
  KANNADA_SCRIPT_RE,
  MALAYALAM_SCRIPT_RE,
  ODIA_SCRIPT_RE,
  RUSSIAN_ONLY_RE,
  SINHALA_SCRIPT_RE,
  TELUGU_SCRIPT_RE,
  UKRAINIAN_ONLY_RE,
  URDU_ONLY_RE,
  rejectOtherIndic,
} from './voiceLangRegister.js'

/** Camera / docs target languages. Prefer yue|cmn|wuu|tl; legacy `zh` maps to yue. */
export type CameraLang = 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'kk' | 'uz' | 'bg' | 'sr' | 'sw' | 'af' | 'et' | 'lv' | 'lt' | 'ga' | 'cy' | 'eu' | 'gl' | 'mt' | 'is' | 'bs' | 'sq' | 'zu' | 'so' | 'as' | 'mk' | 'mn' | 'hy' | 'ka' | 'am' | 'ps' | 'ceb' | 'ilo' | 'bcl' | 'hak' | 'teo' | 'nan'
const CACHE_MAX = 256
const cache = new Map<string, string>()

function remember(key: string, value: string) {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, value)
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

function parseTranslation(raw: string, fallback: string): string {
  let trimmed = raw.trim()
  if (!trimmed) return fallback
  // Strip accidental markdown fences from some OpenAI-compatible backends.
  trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const json = JSON.parse(trimmed) as unknown
      if (typeof json === 'string') {
        trimmed = json.trim()
        continue
      }
      if (json && typeof json === 'object') {
        const obj = json as { translation?: unknown; text?: unknown }
        const t =
          (typeof obj.translation === 'string' && obj.translation.trim()) ||
          (typeof obj.text === 'string' && obj.text.trim()) ||
          ''
        if (t) return t
      }
      break
    } catch {
      break
    }
  }

  const m = trimmed.match(/"translation"\s*:\s*"((?:\\.|[^"\\])*)"/)
  if (m?.[1]) {
    try {
      return JSON.parse(`"${m[1]}"`) as string
    } catch {
      return m[1]
    }
  }

  return trimmed.replace(/^["']|["']$/g, '').trim() || fallback
}

/**
 * Models often echo the prompt's "1. / 2." line markers into each translation.
 * Strip a leading list index only when it looks like a batch marker (not e.g. "50g").
 */
export function stripLeadingListNumber(text: string): string {
  const t = text.trim()
  if (!t) return t
  // "1. 翻譯" / "12) Foo" / "3、文言" — not "50g" or "2017年"
  return t.replace(/^\d{1,3}(?:[\.\)：:]|\u3001)\s*/, '').trim() || t
}

function mapBatchItem(v: unknown, fallback: string): string {
  if (typeof v !== 'string' || !v.trim()) return fallback
  return stripLeadingListNumber(v)
}

export function parseBatchTranslations(raw: string, fallbacks: string[]): string[] {
  let trimmed = raw.trim()
  if (!trimmed) return fallbacks
  trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const json = JSON.parse(trimmed) as unknown
    if (Array.isArray(json)) {
      return json.map((v, i) => mapBatchItem(v, fallbacks[i] || ''))
    }
    if (json && typeof json === 'object') {
      const arr = (json as { translations?: unknown }).translations
      if (Array.isArray(arr)) {
        return arr.map((v, i) => mapBatchItem(v, fallbacks[i] || ''))
      }
    }
  } catch {
    // fall through — plain numbered lines as a last resort
    const lines = trimmed
      .split(/\n+/)
      .map((l) => stripLeadingListNumber(l))
      .filter(Boolean)
    if (lines.length === fallbacks.length) return lines
  }
  return fallbacks
}

function isChineseTarget(to: CameraLang): boolean {
  return (
    to === 'yue' ||
    to === 'cmn' ||
    to === 'wuu' ||
    to === 'sichuan' ||
    to === 'hak' ||
    to === 'teo' ||
    to === 'nan'
  )
}

function isHakkaTarget(to: CameraLang): boolean {
  return to === 'hak'
}

function isTeochewTarget(to: CameraLang): boolean {
  return to === 'teo'
}

function isHokkienTarget(to: CameraLang): boolean {
  return to === 'nan'
}

function isTagalogTarget(to: CameraLang): boolean {
  return to === 'tl'
}

function isMexicanTarget(to: CameraLang): boolean {
  return to === 'es'
}

function isPeninsularTarget(to: CameraLang): boolean {
  return to === 'eses'
}

function isVietnameseTarget(to: CameraLang): boolean {
  return to === 'vi'
}

function isThaiTarget(to: CameraLang): boolean {
  return to === 'th'
}

function isLaoTarget(to: CameraLang): boolean {
  return to === 'lo'
}

function isKoreanTarget(to: CameraLang): boolean {
  return to === 'ko'
}

function isJapaneseTarget(to: CameraLang): boolean {
  return to === 'ja'
}

function isIndonesianTarget(to: CameraLang): boolean {
  return to === 'id'
}

function isMalayTarget(to: CameraLang): boolean {
  return to === 'ms'
}

function isBrazilianPortugueseTarget(to: CameraLang): boolean {
  return to === 'pt'
}

function isFrenchTarget(to: CameraLang): boolean {
  return to === 'fr'
}

function isHindiTarget(to: CameraLang): boolean {
  return to === 'hi'
}

function isKhmerTarget(to: CameraLang): boolean {
  return to === 'km'
}

function isBurmeseTarget(to: CameraLang): boolean {
  return to === 'my'
}

function isJavaneseTarget(to: CameraLang): boolean {
  return to === 'jv'
}

function isItalianTarget(to: CameraLang): boolean {
  return to === 'it'
}

function isGermanTarget(to: CameraLang): boolean {
  return to === 'de'
}

function isDutchTarget(to: CameraLang): boolean {
  return to === 'nl'
}

function isEgyptianArabicTarget(to: CameraLang): boolean {
  return to === 'ar'
}

function isModernStandardArabicTarget(to: CameraLang): boolean {
  return to === 'arsa'
}

const ARABIC_SCRIPT = /[\u0600-\u06FF]/

function isTamilTarget(to: CameraLang): boolean {
  return to === 'ta'
}

/** European Portuguese only — Brazilian stays `isBrazilianPortugueseTarget`. */
function isEuropeanPortugueseTarget(to: CameraLang): boolean {
  return to === 'ptpt'
}

function isTurkishTarget(to: CameraLang): boolean {
  return to === 'tr'
}

function isBengaliTarget(to: CameraLang): boolean {
  return to === 'bn'
}
function isTeluguTarget(to: CameraLang): boolean {
  return to === 'te'
}
function isGujaratiTarget(to: CameraLang): boolean {
  return to === 'gu'
}
function isKannadaTarget(to: CameraLang): boolean {
  return to === 'kn'
}
function isPolishTarget(to: CameraLang): boolean {
  return to === 'pl'
}
function isRomanianTarget(to: CameraLang): boolean {
  return to === 'ro'
}
function isCzechTarget(to: CameraLang): boolean {
  return to === 'cs'
}
function isGreekTarget(to: CameraLang): boolean {
  return to === 'el'
}
function isHungarianTarget(to: CameraLang): boolean {
  return to === 'hu'
}
function isSwedishTarget(to: CameraLang): boolean {
  return to === 'sv'
}
function isRussianTarget(to: CameraLang): boolean {
  return to === 'ru'
}
function isUkrainianTarget(to: CameraLang): boolean {
  return to === 'uk'
}
function isHebrewTarget(to: CameraLang): boolean {
  return to === 'he'
}
function isPersianTarget(to: CameraLang): boolean {
  return to === 'fa'
}
function isUrduTarget(to: CameraLang): boolean {
  return to === 'ur'
}
function isMalayalamTarget(to: CameraLang): boolean {
  return to === 'ml'
}
function isMarathiTarget(to: CameraLang): boolean {
  return to === 'mr'
}
function isPunjabiTarget(to: CameraLang): boolean {
  return to === 'pa'
}
function isOdiaTarget(to: CameraLang): boolean {
  return to === 'or'
}
function isSinhalaTarget(to: CameraLang): boolean {
  return to === 'si'
}
function isNepaliTarget(to: CameraLang): boolean {
  return to === 'ne'
}
function isDanishTarget(to: CameraLang): boolean {
  return to === 'da'
}
function isNorwegianTarget(to: CameraLang): boolean {
  return to === 'nb'
}
function isFinnishTarget(to: CameraLang): boolean {
  return to === 'fi'
}
function isSlovakTarget(to: CameraLang): boolean {
  return to === 'sk'
}
function isCroatianTarget(to: CameraLang): boolean {
  return to === 'hr'
}
function isCatalanTarget(to: CameraLang): boolean {
  return to === 'ca'
}
function isAzerbaijaniTarget(to: CameraLang): boolean {
  return to === 'az'
}
function isKazakhTarget(to: CameraLang): boolean {
  return to === 'kk'
}
function isUzbekTarget(to: CameraLang): boolean {
  return to === 'uz'
}
function isBulgarianTarget(to: CameraLang): boolean {
  return to === 'bg'
}
function isSerbianTarget(to: CameraLang): boolean {
  return to === 'sr'
}
function isSwahiliTarget(to: CameraLang): boolean {
  return to === 'sw'
}
function isAfrikaansTarget(to: CameraLang): boolean {
  return to === 'af'
}
function isEstonianTarget(to: CameraLang): boolean {
  return to === 'et'
}
function isLatvianTarget(to: CameraLang): boolean {
  return to === 'lv'
}
function isLithuanianTarget(to: CameraLang): boolean {
  return to === 'lt'
}
function isIrishTarget(to: CameraLang): boolean {
  return to === 'ga'
}
function isWelshTarget(to: CameraLang): boolean {
  return to === 'cy'
}
function isBasqueTarget(to: CameraLang): boolean {
  return to === 'eu'
}
function isGalicianTarget(to: CameraLang): boolean {
  return to === 'gl'
}
function isMalteseTarget(to: CameraLang): boolean {
  return to === 'mt'
}
function isIcelandicTarget(to: CameraLang): boolean {
  return to === 'is'
}
function isBosnianTarget(to: CameraLang): boolean {
  return to === 'bs'
}
function isAlbanianTarget(to: CameraLang): boolean {
  return to === 'sq'
}
function isZuluTarget(to: CameraLang): boolean {
  return to === 'zu'
}
function isSomaliTarget(to: CameraLang): boolean {
  return to === 'so'
}
function isAssameseTarget(to: CameraLang): boolean {
  return to === 'as'
}
function isMacedonianTarget(to: CameraLang): boolean {
  return to === 'mk'
}
function isMongolianTarget(to: CameraLang): boolean {
  return to === 'mn'
}
function isArmenianTarget(to: CameraLang): boolean {
  return to === 'hy'
}
function isGeorgianTarget(to: CameraLang): boolean {
  return to === 'ka'
}
function isAmharicTarget(to: CameraLang): boolean {
  return to === 'am'
}
function isPashtoTarget(to: CameraLang): boolean {
  return to === 'ps'
}

const TAMIL_SCRIPT = /[\u0B80-\u0BFF]/
const BENGALI_SCRIPT = /[\u0980-\u09FF]/

/** Camera Japanese: kana, or short kanji compounds (not long Chinese-only lines). */
function looksLikeCameraJapanese(t: string): boolean {
  if (/[\u3040-\u309F\u30A0-\u30FF\uFF66-\uFF9D]/.test(t)) return true
  const kanji = t.replace(/[^\u3400-\u9FFF\uF900-\uFAFF]/g, '')
  return kanji.length > 0 && kanji.length <= 12
}

function isCebuanoTarget(to: CameraLang): boolean {
  return to === 'ceb'
}

function isIlocanoTarget(to: CameraLang): boolean {
  return to === 'ilo'
}

function isBikolTarget(to: CameraLang): boolean {
  return to === 'bcl'
}

function isLatinPhilippineRegionalTarget(to: CameraLang): boolean {
  return isCebuanoTarget(to) || isIlocanoTarget(to) || isBikolTarget(to)
}

/**
 * Reject clearly wrong-script camera translations (same rules for AR line + docs batch).
 * Returns null when the candidate should be discarded in favor of the source line.
 */
function sanitizeCameraTranslation(to: CameraLang, translated: string, source: string): string | null {
  const t = translated.trim()
  if (!t) return null
  if (to === 'en' && hasHan(t)) return null
  if (isChineseTarget(to) && !hasHan(t) && /[A-Za-z]/.test(source)) return null
  if (isTagalogTarget(to) && hasHan(t)) return null
  if (isMexicanTarget(to) && hasHan(t)) return null
  if (isPeninsularTarget(to) && hasHan(t)) return null
  if (isVietnameseTarget(to) && hasHan(t)) return null
  if (isThaiTarget(to) && (hasHan(t) || !/[\u0E00-\u0E7F]/.test(t))) return null
  if (isLaoTarget(to) && (hasHan(t) || !/[\u0E80-\u0EFF]/.test(t))) return null
  if (isKoreanTarget(to) && (hasHan(t) || !/[\uAC00-\uD7A3]/.test(t))) return null
  if (isJapaneseTarget(to) && !looksLikeCameraJapanese(t)) return null
  if (isIndonesianTarget(to) && hasHan(t)) return null
  if (isMalayTarget(to) && hasHan(t)) return null
  if (isBrazilianPortugueseTarget(to) && hasHan(t)) return null
  if (isFrenchTarget(to) && hasHan(t)) return null
  if (isHindiTarget(to) && (hasHan(t) || !/[\u0900-\u097F]/.test(t))) return null
  if (isKhmerTarget(to) && (hasHan(t) || !/[\u1780-\u17FF]/.test(t))) return null
  if (isBurmeseTarget(to) && (hasHan(t) || !/[\u1000-\u109F]/.test(t))) return null
  if (isJavaneseTarget(to) && hasHan(t)) return null
  if (isItalianTarget(to) && hasHan(t)) return null
  if (isGermanTarget(to) && hasHan(t)) return null
  if (isDutchTarget(to) && hasHan(t)) return null
  if (isEgyptianArabicTarget(to) && (hasHan(t) || !ARABIC_SCRIPT.test(t))) return null
  if (isModernStandardArabicTarget(to) && (hasHan(t) || !ARABIC_SCRIPT.test(t))) return null
  if (isTamilTarget(to) && (hasHan(t) || !TAMIL_SCRIPT.test(t))) return null
  if (isEuropeanPortugueseTarget(to) && hasHan(t)) return null
  if (isTurkishTarget(to) && hasHan(t)) return null
  if (isBengaliTarget(to) && (hasHan(t) || !BENGALI_SCRIPT.test(t))) return null
  if (isTeluguTarget(to) && (hasHan(t) || !TELUGU_SCRIPT_RE.test(t))) return null
  if (isGujaratiTarget(to) && (hasHan(t) || !GUJARATI_SCRIPT_RE.test(t) || DEVANAGARI_RE.test(t))) return null
  if (isKannadaTarget(to) && (hasHan(t) || !KANNADA_SCRIPT_RE.test(t))) return null
  if (isPolishTarget(to) && hasHan(t)) return null
  if (isRomanianTarget(to) && hasHan(t)) return null
  if (isCzechTarget(to) && hasHan(t)) return null
  if (isGreekTarget(to) && (hasHan(t) || !GREEK_SCRIPT_RE.test(t))) return null
  if (isHungarianTarget(to) && hasHan(t)) return null
  if (isSwedishTarget(to) && hasHan(t)) return null
  if (isRussianTarget(to) && (hasHan(t) || !CYRILLIC_SCRIPT_RE.test(t) || UKRAINIAN_ONLY_RE.test(t))) return null
  if (isUkrainianTarget(to) && (hasHan(t) || !CYRILLIC_SCRIPT_RE.test(t) || RUSSIAN_ONLY_RE.test(t))) return null
  if (isHebrewTarget(to) && (hasHan(t) || !HEBREW_SCRIPT_RE.test(t))) return null
  if (isPersianTarget(to) && (hasHan(t) || !ARABIC_SCRIPT_RE.test(t) || URDU_ONLY_RE.test(t))) return null
  if (isUrduTarget(to) && (hasHan(t) || !ARABIC_SCRIPT_RE.test(t) || DEVANAGARI_RE.test(t))) return null
  if (isMalayalamTarget(to) && (hasHan(t) || !MALAYALAM_SCRIPT_RE.test(t) || rejectOtherIndic('malayalam').test(t))) return null
  if (isMarathiTarget(to) && (hasHan(t) || !DEVANAGARI_RE.test(t) || rejectOtherIndic('devanagari').test(t))) return null
  if (isPunjabiTarget(to) && (hasHan(t) || !GURMUKHI_SCRIPT_RE.test(t) || rejectOtherIndic('gurmukhi').test(t))) return null
  if (isOdiaTarget(to) && (hasHan(t) || !ODIA_SCRIPT_RE.test(t) || rejectOtherIndic('odia').test(t))) return null
  if (isSinhalaTarget(to) && (hasHan(t) || !SINHALA_SCRIPT_RE.test(t) || rejectOtherIndic('sinhala').test(t))) return null
  if (isNepaliTarget(to) && (hasHan(t) || !DEVANAGARI_RE.test(t) || rejectOtherIndic('devanagari').test(t))) return null
  if (isDanishTarget(to) && hasHan(t)) return null
  if (isNorwegianTarget(to) && hasHan(t)) return null
  if (isFinnishTarget(to) && hasHan(t)) return null
  if (isSlovakTarget(to) && hasHan(t)) return null
  if (isCroatianTarget(to) && hasHan(t)) return null
  if (isCatalanTarget(to) && hasHan(t)) return null
  if (isAzerbaijaniTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isKazakhTarget(to) && (hasHan(t) || !CYRILLIC_SCRIPT_RE.test(t) || KAZAKH_REJECT_RE.test(t))) return null
  if (isUzbekTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isBulgarianTarget(to) && (hasHan(t) || !CYRILLIC_SCRIPT_RE.test(t) || BULGARIAN_REJECT_RE.test(t))) return null
  if (isSerbianTarget(to) && (hasHan(t) || !CYRILLIC_SCRIPT_RE.test(t) || SERBIAN_REJECT_RE.test(t))) return null
  if (isSwahiliTarget(to) && hasHan(t)) return null
  if (isAfrikaansTarget(to) && hasHan(t)) return null
  if (isEstonianTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isLatvianTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isLithuanianTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isIrishTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isWelshTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isBasqueTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isGalicianTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isMalteseTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isIcelandicTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isBosnianTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isAlbanianTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isZuluTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isSomaliTarget(to) && (hasHan(t) || CYRILLIC_OR_ARABIC_RE.test(t))) return null
  if (isAssameseTarget(to) && (hasHan(t) || !BENGALI_ASSAMESE_SCRIPT_RE.test(t) || ASSAMESE_REJECT_RE.test(t))) return null
  if (isMacedonianTarget(to) && (hasHan(t) || !CYRILLIC_SCRIPT_RE.test(t) || MACEDONIAN_REJECT_RE.test(t))) return null
  if (isMongolianTarget(to) && (hasHan(t) || !CYRILLIC_SCRIPT_RE.test(t) || MONGOLIAN_REJECT_RE.test(t))) return null
  if (isArmenianTarget(to) && (hasHan(t) || !ARMENIAN_SCRIPT_RE.test(t) || ARMENIAN_REJECT_RE.test(t))) return null
  if (isGeorgianTarget(to) && (hasHan(t) || !GEORGIAN_SCRIPT_RE.test(t) || GEORGIAN_REJECT_RE.test(t))) return null
  if (isAmharicTarget(to) && (hasHan(t) || !ETHIOPIC_SCRIPT_RE.test(t) || ETHIOPIC_REJECT_RE.test(t))) return null
  if (isPashtoTarget(to) && (hasHan(t) || !ARABIC_SCRIPT_RE.test(t) || DEVANAGARI_RE.test(t))) return null
  if (isLatinPhilippineRegionalTarget(to) && hasHan(t)) return null
  return t
}

function cameraSystemPrompt(to: CameraLang, docBatch = false): string {
  const docHint = docBatch
    ? 'These lines come from one document — keep terminology, names, and tone consistent across all lines.'
    : ''
  if (to === 'yue') {
    return [
      'You translate signs, menus, forms, and short labels for Hong Kong / Cantonese readers.',
      'Translate English into natural written Chinese for Hong Kong (書面語 / 繁體). Prefer Traditional characters.',
      'Use Hong Kong wording where it differs from Mainland Mandarin (e.g. 的士 not 出租车; 巴士 not 公交车).',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel / lobby / hospitality: Check-in → 入住登記 (not airport 登機); Concierge → 禮賓; Luggage storage → 行李寄存.',
      '- Immigration / legal letters: Character Reference → 品格證明 / 推薦信 (not 角色參考); Judge → 法官; Federal District Court → 聯邦地區法院.',
      '- Pharmacy: Prescription pickup → 處方取藥; take a number → 請抽籌; Queue here → 請在此排隊.',
      '- Safety: Wet floor → 小心地滑 / 地面濕滑; Caution → 小心.',
      'Food/menu names: use common Hong Kong café wording (e.g. pineapple bun → 菠蘿包).',
      'Keep personal names, place names, and legal terms accurate.',
      'Keep brand names and codes (A2, HK$) when appropriate.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Chinese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'wuu') {
    return [
      'You translate signs, menus, forms, and short labels into colloquial Shanghainese (上海话 / 沪语).',
      'Use dialectal Chinese characters natural for spoken Shanghainese — NOT Mandarin-with-accent, NOT Cantonese.',
      'Prefer everyday Shanghai wording (e.g. 侬/阿拉/勿要) over textbook Mandarin.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → 登记入住; Concierge → 礼宾.',
      '- Safety: Wet floor → 地上潮湿 / 当心滑跌; Caution → 当心.',
      '- Pharmacy: Prescription pickup → 配药; Queue here → 请排队.',
      'Keep brand names and codes when appropriate.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Shanghainese Han>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'hak') {
    return [
      'You translate signs, menus, forms, and short labels into colloquial Hakka (客家話).',
      'Use Chinese characters as the primary line — NOT Latin-only output.',
      'Prefer everyday Hakka wording. Dialectal Han spellings OK. Do NOT rewrite into Mandarin textbook 普通话 or Cantonese particles (係/唔/喺/咗).',
      'Learners may see Pha̍k-fa-sṳ romanization separately — do NOT put romanization in the translation field.',
      'Never label anything as zh-TW.',
      docHint,
      'Keep brand names and codes when appropriate.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Hakka Han>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'teo') {
    return [
      'You translate signs, menus, forms, and short labels into colloquial Teochew / Chaoshan (潮州話).',
      'Use Chinese characters as the primary line — NOT Latin-only output.',
      'Prefer everyday Teochew wording. Do NOT rewrite into Mandarin textbook or Hokkien / Taiwanese Min Nan forms.',
      'Learners may see Peng’im romanization separately — do NOT put romanization in the translation field.',
      'Never label anything as zh-TW.',
      docHint,
      'Keep brand names and codes when appropriate.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Teochew Han>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'nan') {
    return [
      'You translate signs, menus, forms, and short labels into colloquial Hokkien / Min Nan (閩南語 / 福建話).',
      'Use Chinese characters as the primary line — NOT Latin-only output.',
      'CRITICAL: zh-TW is Taiwanese Mandarin (國語), NOT Hokkien — never output Mandarin-only textbook 国语/國語 as Hokkien.',
      'Prefer everyday Hokkien wording. Learners may see Tâi-lô / POJ romanization separately — do NOT put romanization in the translation field.',
      docHint,
      'Keep brand names and codes when appropriate.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Hokkien Han>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'cmn') {
    return [
      'You translate signs, menus, forms, and short labels into Mandarin Chinese (普通话).',
      'Prefer Simplified characters (简体) for Mainland / Mandarin readers.',
      'Do NOT use Cantonese-only particles or Hong Kong-only spellings (no 係/唔/喺/咗/㗎 unless shared).',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → 入住登记; Concierge → 礼宾; Luggage storage → 行李寄存.',
      '- Legal: Character Reference → 品格证明 / 推荐信; Judge → 法官.',
      '- Pharmacy: Prescription pickup → 处方取药; Queue here → 请在此排队.',
      '- Safety: Wet floor → 小心地滑; Caution → 小心.',
      'Keep brand names and codes when appropriate.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Mandarin Chinese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'tl') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Filipino (Tagalog).',
      'Write for Filipino travelers/readers: everyday spoken Filipino, not stiff textbook Tagalog.',
      'Light Taglish is OK when it is how Filipinos would actually say it on a sign (e.g. Check-in, Exit, Wi‑Fi).',
      'Use Latin script only. Diacritics (á, é, í, ó, ú, ñ) are optional — prefer plain ASCII when unsure.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Mag-check-in / Resepsyon; Luggage → Bagaha / Luggage.',
      '- Safety: Wet floor → Madulas ang sahig / Mag-ingat; Caution → Mag-ingat.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Tagalog output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Tagalog>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'es') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Mexican Spanish (español mexicano).',
      'Write for Mexican travelers/readers: everyday spoken Mexican Spanish, not stiff textbook Castilian.',
      'Prefer Mexico vocabulary (e.g. computadora, celular, plática, ¿mande?) over Spain-only wording when they differ.',
      'Use Latin script only. Include written accents (á, é, í, ó, ú, ñ, ü) when standard orthography requires them.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Registro / Check-in; Luggage → Equipaje.',
      '- Safety: Wet floor → Piso mojado / Piso resbaloso; Caution → Precaución.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Spanish output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Mexican Spanish>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'eses') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Peninsular (Spain) Spanish (español de España).',
      'Write for Spanish travelers/readers: everyday spoken Peninsular Spanish, not stiff textbook Latin American Spanish.',
      'Prefer Spain vocabulary (e.g. ordenador, móvil, coger, vale) over Mexican-only wording when they differ.',
      'Use Latin script only. Include written accents (á, é, í, ó, ú, ñ, ü) when standard orthography requires them.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Registro / Check-in; Luggage → Equipaje.',
      '- Safety: Wet floor → Suelo mojado / Suelo resbaladizo; Caution → Precaución.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Spanish output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Peninsular Spanish>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'vi') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Vietnamese (tiếng Việt).',
      'Write for Vietnamese travelers/readers: everyday spoken Vietnamese, not stiff formal writing.',
      'Use Latin script only (Quốc ngữ). ALWAYS include full tone and vowel-quality diacritics — never strip accents.',
      'Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Nhận phòng; Luggage → Hành lý.',
      '- Safety: Wet floor → Sàn ướt, cẩn thận; Caution → Cẩn thận.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Vietnamese output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Vietnamese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'th') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Central Thai (ภาษาไทย).',
      'Write for Thai travelers/readers: everyday spoken Bangkok Thai, not stiff formal writing.',
      'Use native Thai script (Unicode Thai block) only. Never use RTGS romanization, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → เช็คอิน; Luggage → กระเป๋าเดินทาง.',
      '- Safety: Wet floor → พื้นลื่น ระวัง; Caution → ระวัง.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Thai output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Thai>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (isJapaneseTarget(to)) {
    return [
      'You translate signs, menus, forms, and short labels into natural modern standard Japanese (共通語 / Tokyo media).',
      'Write for Japanese travelers/readers: everyday colloquial register, not stiff legal Japanese.',
      'Use natural Japanese orthography (kanji + kana). Never dump romaji as the primary translation.',
      'Never invent Chao tone letters, Cantonese ASCII tone digits, or IPA.',
      'Kanji is fine when natural Japanese would use it — do not output Mandarin/Cantonese Chinese sentences.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → チェックイン; Luggage → 荷物.',
      '- Safety: Wet floor → 床が滑ります / 足元注意; Caution → 注意.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Japanese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'id') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Bahasa Indonesia.',
      'Write for Indonesian travelers/readers: Jakarta/media everyday Indonesian, not stiff bureaucratic Indonesian, not Malay (Malaysia).',
      'Use Latin script only (correct Indonesian orthography). Never Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Pendaftaran; Luggage → Bagasi.',
      '- Safety: Wet floor → Lantai licin / Hati-hati; Caution → Hati-hati.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Indonesian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Indonesian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ms') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Bahasa Melayu (Malay / Malaysia).',
      'Write for Malaysian travelers/readers: Malaysia (ms-MY) everyday Malay, not stiff bureaucratic Malay, not Indonesian (Bahasa Indonesia).',
      'Use Latin script only (correct Malay orthography). Never Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Daftar masuk / Check-in; Luggage → Bagasi.',
      '- Safety: Wet floor → Lantai licin / Awas; Caution → Awas / Berhati-hati.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Malay output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Malay>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'pt') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Brazilian Portuguese (português do Brasil).',
      'Write for Brazilian travelers/readers: everyday spoken Brazilian Portuguese (pt-BR), not European Portuguese (pt-PT).',
      'Prefer Brazil vocabulary (ônibus, celular, legal, banheiro) over Portugal-only wording (autocarro, telemóvel, fixe, casa de banho) when they differ.',
      'Use Latin script only. Include written accents (á à â ã é ê í ó ô õ ú ç) when standard orthography requires them.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Registro; Luggage → Bagagem.',
      '- Safety: Wet floor → Piso molhado / Piso escorregadio; Caution → Cuidado.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Portuguese output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Brazilian Portuguese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'fr') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Metropolitan French (français de France).',
      'Write for French travelers/readers: everyday spoken France French, not stiff formal writing, not Quebec-primary Canadian French.',
      'Use Latin script only. ALWAYS include correct French accents (é, è, ê, ç, à, ù, …) when orthography requires them.',
      'Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Enregistrement / Check-in; Luggage → Bagages.',
      '- Safety: Wet floor → Sol glissant; Caution → Attention.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the French output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<French>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'hi') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Modern Standard Hindi (हिन्दी).',
      'Write for Hindi travelers/readers in India: everyday spoken Hindi, not stiff Sanskritized formal writing.',
      'Use Devanagari only. Never Chinese characters (Han), never IAST/ISO romanization, never Hinglish Latin as the main line, never Urdu Nastaliq, never invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → चेक-इन; Luggage → सामान.',
      '- Safety: Wet floor → फर्श गीला है; Caution → सावधान.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Hindi output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Hindi>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'km') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Cambodian Khmer (ភាសាខ្មែរ).',
      'Write for Khmer travelers/readers: everyday spoken Cambodia Khmer, not stiff formal writing.',
      'Use native Khmer script (Unicode Khmer block) only. Never use Latin romanization, Chao tone letters, IPA, or invented ASCII tone digits.',
      'Prefer short sign-ready wording. Examples:',
      '- Hotel / lobby: Check-in → ចុះឈ្មោះ; Concierge → អ្នកបម្រើភ្ញៀវ; Luggage storage → រក្សាទុកឥវ៉ាន់.',
      '- Safety: Wet floor → ជាន់រអិល ប្រុងប្រយ័ត្ន; Caution → ប្រុងប្រយ័ត្ន.',
      '- Food: Delicious → ឆ្ងាញ់; Water → ទឹក.',
      'Never leave the translation empty. Never copy Chinese characters into the Khmer output.',
      docHint,
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Khmer>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'my') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial standard Burmese (မြန်မာ).',
      'Write for Myanmar travelers/readers: everyday spoken Yangon / media Burmese, not stiff formal literary Burmese.',
      'Use native Myanmar script (Unicode Myanmar block) only. Never use MLCTS/romanization, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → ချက်အင်; Luggage → ခရီးဆောင်အိတ်.',
      '- Safety: Wet floor → ကြမ်းပြင်စိုနေသည် သတိထားပါ; Caution → သတိ။',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Burmese output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Burmese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'jv') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Javanese (Basa Jawa).',
      'Write for Javanese travelers/readers: Central/East Java media ngoko by default, Latin script only (not Hanacaraka).',
      'Do NOT use Indonesian (Bahasa Indonesia) wording when Javanese differs (e.g. prefer matur nuwun / suwun not terima kasih; ora/mboten not tidak).',
      'Use Latin Javanese orthography. Never Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Daftar; Luggage → Koper / Bagasi.',
      '- Safety: Wet floor → Lantai teles / Ati-ati; Caution → Ati-ati.',
      '- Food/menus: keep dish names natural; translate descriptive phrases into Javanese.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Javanese output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Javanese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'it') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial standard Italian (italiano standard).',
      'Write for Italian travelers/readers: everyday spoken Italy Italian, not stiff formal writing, not regional dialect by default.',
      'Use Latin script only. ALWAYS include correct Italian accents (è, é, à, ì, ò, ù, …) when orthography requires them.',
      'Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Registrazione; Luggage → Bagagli.',
      '- Safety: Wet floor → Pavimento bagnato; Caution → Attenzione.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Italian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Italian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'de') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial standard German (Deutsch, Deutschland).',
      'Write for German travelers/readers: everyday spoken Germany German, not stiff formal writing, not Swiss- or Austrian-primary.',
      'Use Latin script only. ALWAYS include correct German umlauts and ß (ä, ö, ü, ß) when orthography requires them. Capitalize all nouns.',
      'Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Anmeldung; Luggage → Gepäck.',
      '- Safety: Wet floor → Rutschgefahr; Caution → Achtung.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the German output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<German>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'nl') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Netherlands Dutch (Nederlands).',
      'Write for Dutch travelers/readers: everyday spoken Netherlands Dutch, not stiff formal writing, not Belgian Dutch / Flemish as the primary default.',
      'Use Latin script only. ALWAYS use correct Dutch orthography (ij, oe, ui, aa/ee/oo, diaeresis where required).',
      'Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Inchecken / Check-in; Luggage → Bagage.',
      '- Safety: Wet floor → Gladde vloer; Caution → Let op.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Dutch output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Dutch>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ar') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Egyptian Arabic (عامية مصرية / ar-EG).',
      'Write for Egyptian readers: everyday Cairene wording as it would appear on friendly Egyptian shop signs, menus, and notices — not stiff فصحى, not Gulf or Levantine dialect.',
      'Prefer Egyptian forms when natural (e.g. ده / دي / مش / عايز / فين / إزاي / كده) while keeping signage short and readable.',
      'Use Arabic script only. Never Chinese characters (Han), never Franco-Arabic / Arabizi Latin (3, 7, 2 digits for letters), never invented ASCII tone digits, never IPA.',
      'Omit full tashkeel (harakat) on the main line; add a shadda or a single vowel mark only when it prevents a real misreading.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → تسجيل الوصول; Luggage → الشنط.',
      '- Safety: Wet floor → الأرض مبلولة; Caution → خلي بالك.',
      '- Food/menus: keep dish names natural (كشري، فول، طعمية); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Egyptian Arabic output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Egyptian Arabic>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'arsa') {
    return [
      'You translate signs, menus, forms, and short labels into Modern Standard Arabic (العربية الفصحى / ar-SA).',
      'Write the way official signs, menus, forms, and public notices are written across the Arab world: formal written فصحى, neutral and pan-Arab — not Egyptian, Gulf, or Levantine colloquial.',
      'Use standard MSA vocabulary and grammar (e.g. هذا / هذه / لا / أريد / أين / كيف), with correct hamza and taa marbuta spelling.',
      'Use Arabic script only. Never Chinese characters (Han), never Franco-Arabic / Arabizi Latin, never invented ASCII tone digits, never IPA.',
      'Omit full tashkeel (harakat) on the main line; add a vowel mark only when it prevents a real misreading.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → تسجيل الوصول; Luggage → الأمتعة.',
      '- Safety: Wet floor → أرضية مبللة; Caution → تنبيه / احذر.',
      '- Food/menus: keep dish names natural; translate descriptive phrases formally.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Arabic output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Modern Standard Arabic>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ta') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Tamil (தமிழ், ta-IN).',
      'Write for Tamil readers in Tamil Nadu / India: everyday readable Tamil as on friendly shop signs and notices — not stiff literary செந்தமிழ் unless the source is official.',
      'Use Tamil script only. Never Latin/Tanglish as the main line, never ISO 15919 or other romanization, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → செக்-இன்; Luggage → பயணப் பைகள்.',
      '- Safety: Wet floor → ஈரமான தரை; Caution → கவனம்.',
      '- Food/menus: keep dish names natural (இட்லி, தோசை, சாம்பார்); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Tamil output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Tamil>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ptpt') {
    return [
      'You translate signs, menus, forms, and short labels into natural European Portuguese (Portugal, pt-PT).',
      'Write for readers in Portugal: everyday Portugal wording — NOT Brazilian Portuguese (never ônibus, celular, trem, banheiro, café da manhã).',
      'Use European lexicon (autocarro, telemóvel, comboio, casa de banho, pequeno-almoço) and modern AO90 Portugal spelling.',
      'Use Latin script only. ALWAYS include correct Portuguese accents (á à â ã é ê í ó ô õ ú ç).',
      'Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Registo de entrada; Luggage → Bagagem.',
      '- Safety: Wet floor → Piso molhado; Caution → Atenção / Cuidado.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Portuguese output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<European Portuguese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'tr') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Turkish (Türkçe, tr-TR).',
      'Write for readers in Türkiye: everyday Istanbul Turkish as on shop signs and notices, not stiff Ottoman-flavoured wording.',
      'Use Latin script only. ALWAYS use correct Turkish orthography — ı vs i, İ vs I, ğ, ş, ç, ö, ü — never ASCII-fold. Respect vowel harmony in suffixes.',
      'Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Giriş / Check-in; Luggage → Bagaj.',
      '- Safety: Wet floor → Islak zemin; Caution → Dikkat.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Turkish output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Turkish>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'bn') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Bengali (বাংলা, bn-IN).',
      'Write for Bengali readers in India / West Bengal: everyday readable চলিত বাংলা as on shop signs and notices — not archaic সাধু ভাষা.',
      'Use Bangla script only. Never Devanagari, never Latin/Banglish as the main line, never ISO 15919 or other romanization, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → চেক-ইন; Luggage → মালপত্র.',
      '- Safety: Wet floor → মেঝে ভেজা; Caution → সাবধান.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Bengali output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Bengali>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'te') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Telugu (తెలుగు, te-IN).',
      'Write for Telugu readers in Andhra Pradesh / Telangana: everyday readable Telugu as on friendly shop signs and notices — not stiff గ్రాంథికం.',
      'Use Telugu script only. Never Latin transliteration as the main line, never ISO 15919 or other romanization, never Kannada / Tamil / Devanagari letters, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → చెక్-ఇన్; Luggage → లగేజీ.',
      '- Safety: Wet floor → తడి నేల; Caution → జాగ్రత్త.',
      '- Food/menus: keep dish names natural (ఇడ్లీ, దోశ, పెసరట్టు); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Telugu output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Telugu>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'gu') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Gujarati (ગુજરાતી, gu-IN).',
      'Write for Gujarati readers in Gujarat / India: everyday readable Gujarati as on shop signs and notices.',
      'Use Gujarati script only. Never Devanagari / Hindi, never Latin transliteration as the main line, never ISO 15919 or other romanization, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → ચેક-ઇન; Luggage → સામાન.',
      '- Safety: Wet floor → ભીનું ભોંયતળિયું; Caution → સાવધાન.',
      '- Food/menus: keep dish names natural (ઢોકળા, થેપલા, ખાખરા); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Gujarati output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Gujarati>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'kn') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Kannada (ಕನ್ನಡ, kn-IN).',
      'Write for Kannada readers in Karnataka: everyday readable Kannada as on friendly shop signs and notices — not stiff literary Kannada.',
      'Use Kannada script only. Never Latin transliteration as the main line, never ISO 15919 or other romanization, never Telugu / Tamil / Devanagari letters, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → ಚೆಕ್-ಇನ್; Luggage → ಲಗೇಜು.',
      '- Safety: Wet floor → ಒದ್ದೆ ನೆಲ; Caution → ಎಚ್ಚರಿಕೆ.',
      '- Food/menus: keep dish names natural (ಇಡ್ಲಿ, ದೋಸೆ, ಬಿಸಿಬೇಳೆಬಾತ್); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Kannada output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Kannada>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'pl') {
    return [
      'You translate signs, menus, forms, and short labels into natural Polish (polski, pl-PL).',
      'Write for readers in Poland: everyday Polish as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Polish diacritics (ą ć ę ł ń ó ś ź ż) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Zameldowanie; Luggage → Bagaż.',
      '- Safety: Wet floor → Śliska podłoga; Caution → Uwaga.',
      '- Food/menus: keep dish names natural (pierogi, żurek); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Polish output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Polish>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ro') {
    return [
      'You translate signs, menus, forms, and short labels into natural Romanian (română, ro-RO).',
      'Write for readers in Romania: everyday Romanian as on shop signs and notices.',
      'Use Latin script only. ALWAYS use correct Romanian diacritics (ă â î ș ț with comma-below, never cedilla ş ţ) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Înregistrare; Luggage → Bagaje.',
      '- Safety: Wet floor → Pardoseală udă; Caution → Atenție.',
      '- Food/menus: keep dish names natural (sarmale, mici); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Romanian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Romanian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'cs') {
    return [
      'You translate signs, menus, forms, and short labels into natural Czech (čeština, cs-CZ).',
      'Write for readers in Czechia: everyday standard Czech as on shop signs and notices — never Slovak.',
      'Use Latin script only. ALWAYS use correct Czech diacritics (á č ď é ě í ň ó ř š ť ú ů ý ž) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Recepce; Luggage → Zavazadla.',
      '- Safety: Wet floor → Mokrá podlaha; Caution → Pozor.',
      '- Food/menus: keep dish names natural (svíčková, knedlíky); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Czech output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Czech>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'el') {
    return [
      'You translate signs, menus, forms, and short labels into natural Modern Greek (Ελληνικά, el-GR).',
      'Write for readers in Greece: everyday Modern Greek as on shop signs and notices, monotonic orthography.',
      'Use the Greek alphabet only (monotonic tonos). Never Greeklish / Latin transliteration as the main line, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Άφιξη; Luggage → Αποσκευές.',
      '- Safety: Wet floor → Βρεγμένο πάτωμα; Caution → Προσοχή.',
      '- Food/menus: keep dish names natural (μουσακάς, σουβλάκι); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Greek output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Greek>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'hu') {
    return [
      'You translate signs, menus, forms, and short labels into natural Hungarian (magyar, hu-HU).',
      'Write for readers in Hungary: everyday Hungarian as on shop signs and notices.',
      'Use Latin script only. ALWAYS use correct Hungarian diacritics (á é í ó ö ő ú ü ű — double acute ő ű, never ô û / õ ũ) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Bejelentkezés; Luggage → Csomag.',
      '- Safety: Wet floor → Csúszós padló; Caution → Vigyázat.',
      '- Food/menus: keep dish names natural (gulyás, lángos); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Hungarian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Hungarian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'sv') {
    return [
      'You translate signs, menus, forms, and short labels into natural Swedish (svenska, sv-SE).',
      'Write for readers in Sweden: everyday Swedish as on shop signs and notices — never Norwegian or Danish spelling.',
      'Use Latin script only. ALWAYS use correct Swedish letters (å ä ö) — never ASCII-fold. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Incheckning; Luggage → Bagage.',
      '- Safety: Wet floor → Halt golv; Caution → Varning / Se upp.',
      '- Food/menus: keep dish names natural (köttbullar, kanelbulle); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Swedish output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Swedish>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ru') {
    return [
      'You translate signs, menus, forms, and short labels into natural Russian (русский, ru-RU).',
      'Write for readers in Russia: everyday Russian as on shop signs and notices — never Ukrainian.',
      'Use Russian Cyrillic only. Never Ukrainian letters (і ї є ґ), never Latin translit as the main line, never stress marks, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Регистрация / заселение; Luggage → Багаж.',
      '- Safety: Wet floor → Мокрый пол; Caution → Осторожно.',
      '- Food/menus: keep dish names natural (борщ, пельмени); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Russian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Russian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'uk') {
    return [
      'You translate signs, menus, forms, and short labels into natural Ukrainian (українська, uk-UA).',
      'Write for readers in Ukraine: everyday standard Ukrainian as on shop signs and notices — never Russian or surzhyk.',
      'Use Ukrainian Cyrillic only (і ї є ґ, apostrophe ʼ). Never Russian letters (ы э ъ ё), never Latin transliteration as the main line, never stress marks, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Реєстрація / поселення; Luggage → Багаж.',
      '- Safety: Wet floor → Мокра підлога; Caution → Обережно.',
      '- Food/menus: keep dish names natural (борщ, вареники); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Ukrainian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Ukrainian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'he') {
    return [
      'You translate signs, menus, forms, and short labels into natural Modern Hebrew (עברית, he-IL).',
      'Write for readers in Israel: everyday unpointed Hebrew (no niqqud) as on shop signs and notices.',
      'Use Hebrew script only, unpointed. Never Latin transliteration, never Arabic or Yiddish, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → צ׳ק-אין / קבלה; Luggage → מזוודות.',
      '- Safety: Wet floor → רצפה רטובה; Caution → זהירות.',
      '- Food/menus: keep dish names natural (שקשוקה, פלאפל); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Hebrew output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Hebrew>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'fa') {
    return [
      'You translate signs, menus, forms, and short labels into natural Persian / Farsi (فارسی, fa-IR).',
      'Write for readers in Iran: everyday Persian as on shop signs and notices. This is Persian — NOT Arabic.',
      'Use Persian script only with Persian letters (پ چ ژ گ, Persian ی ک) and ZWNJ where needed. Never Arabic grammar or Arabic ي ك, never Urdu letters (ٹ ڈ ڑ ں ے), never Finglish / Latin, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → پذیرش / ورود; Luggage → چمدان / بار.',
      '- Safety: Wet floor → زمین خیس است; Caution → احتیاط.',
      '- Food/menus: keep dish names natural (چلوکباب، قورمه‌سبزی); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Persian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Persian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ur') {
    return [
      'You translate signs, menus, forms, and short labels into natural Urdu (اردو, ur-IN).',
      'Write for Urdu readers: everyday Urdu as on shop signs and notices. This is Urdu — NOT Hindi.',
      'Use Urdu Perso-Arabic script only (ٹ ڈ ڑ ں ے ھ). Never Devanagari / Hindi, never Roman Urdu / Latin as the main line, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → چیک اِن; Luggage → سامان.',
      '- Safety: Wet floor → گیلا فرش; Caution → احتیاط.',
      '- Food/menus: keep dish names natural (بریانی، نہاری); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Urdu output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Urdu>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ml') {
    return [
      'You translate signs, menus, forms, and short labels into natural Malayalam (മലയാളം, ml-IN).',
      'Write for Malayalam readers in Kerala: everyday readable Malayalam as on shop signs and notices.',
      'Use Malayalam script only. Never Latin transliteration as the main line, never ISO 15919 or other romanization, never Tamil / Telugu / Kannada / Devanagari letters, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → ചെക്ക്-ഇൻ; Luggage → ലഗേജ്.',
      '- Safety: Wet floor → നനഞ്ഞ തറ; Caution → ജാഗ്രത.',
      '- Food/menus: keep dish names natural (ഇഡ്ഡലി, ദോശ, പുട്ട്); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Malayalam output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Malayalam>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'mr') {
    return [
      'You translate signs, menus, forms, and short labels into natural Marathi (मराठी, mr-IN).',
      'Write for Marathi readers in Maharashtra: everyday readable Marathi as on shop signs and notices. This is Marathi — NOT Hindi.',
      'Use Devanagari with Marathi spelling and grammar only. Never Latin transliteration as the main line, never ISO 15919 or other romanization, never Hindi or Nepali wording, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → चेक-इन; Luggage → सामान.',
      '- Safety: Wet floor → ओली फरशी; Caution → सावधान.',
      '- Food/menus: keep dish names natural (वडा पाव, मिसळ, पुरणपोळी); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Marathi output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Marathi>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'pa') {
    return [
      'You translate signs, menus, forms, and short labels into natural Punjabi (ਪੰਜਾਬੀ, pa-IN).',
      'Write for Punjabi readers in Indian Punjab: everyday readable Punjabi as on shop signs and notices.',
      'Use Gurmukhi script only. Never Latin transliteration as the main line, never ISO 15919 or other romanization, never Shahmukhi / Arabic script, never Devanagari / Hindi, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → ਚੈੱਕ-ਇਨ; Luggage → ਸਮਾਨ.',
      '- Safety: Wet floor → ਗਿੱਲਾ ਫ਼ਰਸ਼; Caution → ਸਾਵਧਾਨ.',
      '- Food/menus: keep dish names natural (ਸਰੋਂ ਦਾ ਸਾਗ, ਮੱਕੀ ਦੀ ਰੋਟੀ, ਲੱਸੀ); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Punjabi output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Punjabi>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'or') {
    return [
      'You translate signs, menus, forms, and short labels into natural Odia (ଓଡ଼ିଆ, or-IN).',
      'Write for Odia readers in Odisha: everyday readable Odia as on shop signs and notices.',
      'Use Odia script only. Never Latin transliteration as the main line, never ISO 15919 or other romanization, never Bengali / Devanagari / Telugu letters, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → ଚେକ୍-ଇନ୍; Luggage → ମାଲପତ୍ର.',
      '- Safety: Wet floor → ଓଦା ଚଟାଣ; Caution → ସାବଧାନ.',
      '- Food/menus: keep dish names natural (ପଖାଳ, ଦାଲମା, ଛେନାପୋଡ଼); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Odia output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Odia>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'si') {
    return [
      'You translate signs, menus, forms, and short labels into natural Sinhala (සිංහල, si-LK).',
      'Write for Sinhala readers in Sri Lanka: everyday readable Sinhala as on shop signs and notices.',
      'Use Sinhala script only. Never Latin transliteration as the main line, never ISO 15919 or other romanization, never Tamil / Devanagari letters, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → චෙක්-ඉන්; Luggage → ගමන් මලු.',
      '- Safety: Wet floor → තෙත් බිම; Caution → ප්‍රවේශම් වන්න.',
      '- Food/menus: keep dish names natural (කිරිබත්, ලම්ප්‍රයිස්, කොත්තු); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Sinhala output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Sinhala>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ne') {
    return [
      'You translate signs, menus, forms, and short labels into natural Nepali (नेपाली, ne-NP).',
      'Write for Nepali readers in Nepal: everyday readable Nepali as on shop signs and notices. This is Nepali — NOT Hindi.',
      'Use Devanagari with Nepali spelling and grammar only. Never Latin transliteration as the main line, never ISO 15919 or other romanization, never Hindi or Marathi wording, never Chinese characters, never invented ASCII tone digits, never IPA.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → चेक-इन; Luggage → सामान.',
      '- Safety: Wet floor → भिजेको भुइँ; Caution → सावधान.',
      '- Food/menus: keep dish names natural (मोमो, दाल भात, सेल रोटी); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Nepali output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Nepali>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'da') {
    return [
      'You translate signs, menus, forms, and short labels into natural Danish (dansk, da-DK).',
      'Write for readers in Denmark: everyday Danish as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Danish diacritics (æ ø å) — never ASCII-fold. Never Norwegian or Swedish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Indtjekning; Luggage → Bagage.',
      '- Safety: Wet floor → Glat gulv; Caution → Pas på.',
      '- Food/menus: keep dish names natural (smørrebrød, frikadeller); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Danish output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Danish>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'nb') {
    return [
      'You translate signs, menus, forms, and short labels into natural Norwegian Bokmål (norsk bokmål, nb-NO).',
      'Write for readers in Norway: everyday Norwegian Bokmål as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Norwegian Bokmål diacritics (æ ø å) — never ASCII-fold. Never Nynorsk, Danish, or Swedish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Innsjekking; Luggage → Bagasje.',
      '- Safety: Wet floor → Vått gulv; Caution → Forsiktig.',
      '- Food/menus: keep dish names natural (brunost, kjøttkaker, lefse); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Norwegian Bokmål output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Norwegian Bokmål>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'fi') {
    return [
      'You translate signs, menus, forms, and short labels into natural Finnish (suomi, fi-FI).',
      'Write for readers in Finland: everyday Finnish as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Finnish diacritics (ä ö) — never ASCII-fold. Never Swedish or Estonian wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Sisäänkirjautuminen; Luggage → Matkatavarat.',
      '- Safety: Wet floor → Liukas lattia; Caution → Varo.',
      '- Food/menus: keep dish names natural (karjalanpiirakka, lohikeitto); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Finnish output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Finnish>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'sk') {
    return [
      'You translate signs, menus, forms, and short labels into natural Slovak (slovenčina, sk-SK).',
      'Write for readers in Slovakia: everyday Slovak as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Slovak diacritics (á ä č ď é í ĺ ľ ň ó ô ŕ š ť ú ý ž) — never ASCII-fold. Never Czech (no ě ř ů) wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Prihlásenie; Luggage → Batožina.',
      '- Safety: Wet floor → Šmykľavá podlaha; Caution → Pozor.',
      '- Food/menus: keep dish names natural (bryndzové halušky, kapustnica); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Slovak output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Slovak>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'hr') {
    return [
      'You translate signs, menus, forms, and short labels into natural Croatian (hrvatski, hr-HR).',
      'Write for readers in Croatia: everyday Croatian as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Croatian diacritics (č ć đ š ž) — never ASCII-fold. Never Cyrillic, Serbian ekavian, or Bosnian-specific wording wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Prijava; Luggage → Prtljaga.',
      '- Safety: Wet floor → Mokar pod; Caution → Oprez.',
      '- Food/menus: keep dish names natural (ćevapi, štrukli, sarma); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Croatian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Croatian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ca') {
    return [
      'You translate signs, menus, forms, and short labels into natural Catalan (català, ca-ES).',
      'Write for readers in Catalonia: everyday Central Catalan as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Catalan diacritics (à è é í ï ò ó ú ü ç and l·l) — never ASCII-fold. Never Spanish (Castilian), French, or Occitan wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Entrada (check-in); Luggage → Equipatge.',
      '- Safety: Wet floor → Terra mullat; Caution → Compte.',
      '- Food/menus: keep dish names natural (pa amb tomàquet, escalivada, crema catalana); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Catalan output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Catalan>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'az') {
    return [
      'You translate signs, menus, forms, and short labels into natural Azerbaijani (Azərbaycan dili, az-AZ).',
      'Write for readers in Azerbaijan: everyday Azerbaijani as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Azerbaijani letters (ə ç ş ğ ı ö ü) — never ASCII-fold, never Cyrillic or Arabic script. Never Turkish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Qeydiyyat (check-in); Luggage → Baqaj.',
      '- Safety: Wet floor → Döşəmə islaqdır; Caution → Diqqət.',
      '- Food/menus: keep dish names natural (plov, dolma, qutab, dönər); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Azerbaijani output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Azerbaijani>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'kk') {
    return [
      'You translate signs, menus, forms, and short labels into natural Kazakh (қазақ тілі, kk-KZ).',
      'Write for readers in Kazakhstan: everyday Kazakh as on shop signs and notices, not bureaucratic wording.',
      'Use Kazakh Cyrillic only (including ә ғ қ ң ө ұ ү һ і). Never Latin transliteration as the main line, never Russian wording where a Kazakh word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Тіркелу; Luggage → Жүк.',
      '- Safety: Wet floor → Еден дымқыл; Caution → Абайлаңыз.',
      '- Food/menus: keep dish names natural (бешбармақ, баурсақ, қазы, мәнті); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Kazakh output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Kazakh>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'uz') {
    return [
      'You translate signs, menus, forms, and short labels into natural Uzbek (oʻzbek tili, uz-UZ).',
      'Write for readers in Uzbekistan: everyday Uzbek as on shop signs and notices, not bureaucratic wording.',
      'Use Uzbek Latin script only (oʻ gʻ sh ch, tutuq belgisi ʼ). Never Cyrillic or Arabic script, never Kazakh, Kyrgyz, or Turkish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Roʻyxatdan oʻtish; Luggage → Yuk.',
      '- Safety: Wet floor → Pol nam; Caution → Ehtiyot boʻling.',
      '- Food/menus: keep dish names natural (plov, somsa, lagʻmon, manti); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Uzbek output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Uzbek>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'bg') {
    return [
      'You translate signs, menus, forms, and short labels into natural Bulgarian (български, bg-BG).',
      'Write for readers in Bulgaria: everyday Bulgarian as on shop signs and notices, not bureaucratic wording.',
      'Use Bulgarian Cyrillic only. Never Latin transliteration as the main line, never Russian wording or letters (ы э ё), never Serbian or Macedonian letters (ђ ј љ њ ћ џ). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Настаняване; Luggage → Багаж.',
      '- Safety: Wet floor → Мокър под; Caution → Внимание.',
      '- Food/menus: keep dish names natural (шопска салата, баница, таратор, кебапче); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Bulgarian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Bulgarian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'sr') {
    return [
      'You translate signs, menus, forms, and short labels into natural Serbian (српски, sr-RS).',
      'Write for readers in Serbia: everyday Serbian as on shop signs and notices, not bureaucratic wording.',
      'Use Serbian Cyrillic only (including ђ ј љ њ ћ џ). Never Latin script (Latinica), never Croatian or Bosnian wording, never Russian or Bulgarian letters (ы э ё щ ъ). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Пријава; Luggage → Пртљаг.',
      '- Safety: Wet floor → Клизав под; Caution → Опрез.',
      '- Food/menus: keep dish names natural (ћевапи, пљескавица, сарма, проја); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Serbian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Serbian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'sw') {
    return [
      'You translate signs, menus, forms, and short labels into natural Swahili (Kiswahili, sw-KE).',
      'Write for readers in Kenya: everyday Kiswahili as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. Keep noun-class agreement correct. Never Arabic script, never Sheng or English code-switching as the main line, never Lingala, Zulu, or other Bantu wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Kuingia (check-in); Luggage → Mizigo.',
      '- Safety: Wet floor → Sakafu ni mvua; Caution → Tahadhari.',
      '- Food/menus: keep dish names natural (ugali, nyama choma, sukuma wiki, pilau); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Swahili output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Swahili>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'af') {
    return [
      'You translate signs, menus, forms, and short labels into natural Afrikaans (Afrikaans, af-ZA).',
      'Write for readers in South Africa: everyday Afrikaans as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Afrikaans diacritics (ê é è ë ï ô ö û ü) — never ASCII-fold. Never Dutch (Nederlands) spelling or wording, never German. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Inklok; Luggage → Bagasie.',
      '- Safety: Wet floor → Nat vloer; Caution → Wees versigtig.',
      '- Food/menus: keep dish names natural (boerewors, bobotie, koeksisters, biltong); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Afrikaans output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Afrikaans>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'et') {
    return [
      'You translate signs, menus, forms, and short labels into natural Estonian (Estonian, et-EE).',
      'Write for readers in Estonia: everyday Estonian as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Estonian letters (ä ö õ ü š ž) — never ASCII-fold. Never Cyrillic or Arabic script. Never Finnish wording where Estonian differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Registreerimine; Luggage → Pagas.',
      '- Safety: Wet floor → Märg põrand; Caution → Ettevaatust.',
      '- Food/menus: keep dish names natural (verivorst, kiluvõileib, kama, mulgipuder); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Estonian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Estonian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'lv') {
    return [
      'You translate signs, menus, forms, and short labels into natural Latvian (Latvian, lv-LV).',
      'Write for readers in Latvia: everyday Latvian as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Latvian letters (ā č ē ģ ī ķ ļ ņ š ū ž) — never ASCII-fold. Never Cyrillic or Arabic script. Never Lithuanian or Russian wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Reģistrācija; Luggage → Bagāža.',
      '- Safety: Wet floor → Slapja grīda; Caution → Uzmanību.',
      '- Food/menus: keep dish names natural (rupjmaize, pīrāgi, pelēkie zirņi, kartupeļu pankūkas); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Latvian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Latvian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'lt') {
    return [
      'You translate signs, menus, forms, and short labels into natural Lithuanian (Lithuanian, lt-LT).',
      'Write for readers in Lithuania: everyday Lithuanian as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Lithuanian letters (ą č ę ė į š ų ū ž) — never ASCII-fold. Never Cyrillic or Arabic script. Never Latvian, Polish, or Russian wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Registracija; Luggage → Bagažas.',
      '- Safety: Wet floor → Šlapios grindys; Caution → Atsargiai.',
      '- Food/menus: keep dish names natural (cepelinai, šaltibarščiai, kugelis, balandėliai); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Lithuanian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Lithuanian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ga') {
    return [
      'You translate signs, menus, forms, and short labels into natural Irish (Irish, ga-IE).',
      'Write for readers in Ireland: everyday Irish as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Irish letters (á é í ó ú) — never ASCII-fold. Never Cyrillic or Arabic script. Never Scottish Gaelic (Gàidhlig). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Clárú isteach; Luggage → Bagáiste.',
      '- Safety: Wet floor → Urlár fliuch; Caution → Aire.',
      '- Food/menus: keep dish names natural (boxty, colcannon, coddle, arán sóide); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Irish output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Irish>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'cy') {
    return [
      'You translate signs, menus, forms, and short labels into natural Welsh (Welsh, cy-GB).',
      'Write for readers in Wales: everyday Welsh as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Welsh letters (â ê î ô û ŵ ŷ) — never ASCII-fold. Never Cyrillic or Arabic script. Never Breton or Cornish. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Cofrestru; Luggage → Bagiau.',
      '- Safety: Wet floor → Llawr gwlyb; Caution → Gofal.',
      '- Food/menus: keep dish names natural (bara brith, cawl, teisennau cri, Welsh rarebit); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Welsh output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Welsh>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'eu') {
    return [
      'You translate signs, menus, forms, and short labels into natural Basque (Basque, eu-ES).',
      'Write for readers in the Basque Country: everyday Basque as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Basque letters (ñ ç ü) — never ASCII-fold. Never Cyrillic or Arabic script. Never Spanish or French wording where Basque has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Erregistroa; Luggage → Ekipajea.',
      '- Safety: Wet floor → Zoru bustia; Caution → Kontuz.',
      '- Food/menus: keep dish names natural (pintxoak, marmitako, bakailao pil-pil, txangurroa); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Basque output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Basque>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'gl') {
    return [
      'You translate signs, menus, forms, and short labels into natural Galician (Galician, gl-ES).',
      'Write for readers in Galicia: everyday Galician as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Galician letters (á é í ó ú ñ ü) — never ASCII-fold. Never Cyrillic or Arabic script. Never Portuguese spelling, never Castilian Spanish wording where Galician differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Rexistro de entrada; Luggage → Equipaxe.',
      '- Safety: Wet floor → Chan mollado; Caution → Coidado.',
      '- Food/menus: keep dish names natural (polbo á feira, empanada, caldo galego, tarta de Santiago); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Galician output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Galician>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'mt') {
    return [
      'You translate signs, menus, forms, and short labels into natural Maltese (Maltese, mt-MT).',
      'Write for readers in Malta: everyday Maltese as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Maltese letters (ċ ġ ħ ż, għ) — never ASCII-fold. Never Cyrillic or Arabic script. Never Italian or English wording where a Maltese word exists. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Reġistrazzjoni; Luggage → Bagalji.',
      '- Safety: Wet floor → Art imxarrba; Caution → Attenzjoni.',
      '- Food/menus: keep dish names natural (pastizzi, ftira, ħobż biż-żejt, stuffat tal-fenek); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Maltese output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Maltese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'is') {
    return [
      'You translate signs, menus, forms, and short labels into natural Icelandic (Icelandic, is-IS).',
      'Write for readers in Iceland: everyday Icelandic as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Icelandic letters (á é í ó ú ý þ ð æ ö) — never ASCII-fold. Never Cyrillic or Arabic script. Never Faroese, Norwegian, or Danish wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Innritun; Luggage → Farangur.',
      '- Safety: Wet floor → Blautt gólf; Caution → Varúð.',
      '- Food/menus: keep dish names natural (skyr, hangikjöt, plokkfiskur, pylsur); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Icelandic output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Icelandic>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'bs') {
    return [
      'You translate signs, menus, forms, and short labels into natural Bosnian (Bosnian, bs-BA).',
      'Write for readers in Bosnia and Herzegovina: everyday Bosnian as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Bosnian letters (č ć dž đ š ž) — never ASCII-fold. Never Cyrillic or Arabic script. Latin script ONLY — never Cyrillic. Prefer Bosnian ijekavian wording; never Serbian ekavian or Croatian-purist wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Prijava; Luggage → Prtljag.',
      '- Safety: Wet floor → Mokar pod; Caution → Oprez.',
      '- Food/menus: keep dish names natural (ćevapi, burek, sogan-dolma, begova čorba); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Bosnian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Bosnian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'sq') {
    return [
      'You translate signs, menus, forms, and short labels into natural Albanian (Albanian, sq-AL).',
      'Write for readers in Albania and Kosovo: everyday Albanian as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. ALWAYS use correct Albanian letters (ë ç) — never ASCII-fold. Never Cyrillic or Arabic script. Standard Albanian (Tosk-based); never Italian or Turkish wording where Albanian has a word. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Regjistrimi; Luggage → Bagazhet.',
      '- Safety: Wet floor → Dysheme e lagur; Caution → Kujdes.',
      '- Food/menus: keep dish names natural (byrek, tavë kosi, qofte, fërgesë); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Albanian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Albanian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'zu') {
    return [
      'You translate signs, menus, forms, and short labels into natural Zulu (Zulu, zu-ZA).',
      'Write for readers in South Africa: everyday Zulu as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. Never Cyrillic or Arabic script. Keep noun-class concords correct. Never Xhosa, Ndebele, or Swati wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Ukungena; Luggage → Imithwalo.',
      '- Safety: Wet floor → Phansi kumanzi; Caution → Qaphela.',
      '- Food/menus: keep dish names natural (uphuthu, umngqusho, amasi, inyama yokosa); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Zulu output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Zulu>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'so') {
    return [
      'You translate signs, menus, forms, and short labels into natural Somali (Somali, so-SO).',
      'Write for readers in Somalia: everyday Somali as on shop signs and notices, not bureaucratic wording.',
      'Use Latin script only. Never Cyrillic or Arabic script. Use official Somali Latin orthography. Never Arabic or Osmanya script. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Is-diiwaangelin; Luggage → Alaabta socdaalka.',
      '- Safety: Wet floor → Dabaq qoyan; Caution → Digtoonow.',
      '- Food/menus: keep dish names natural (canjeero, bariis iyo hilib, suqaar, sambuusa); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Somali output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Somali>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'as') {
    return [
      'You translate signs, menus, forms, and short labels into natural Assamese (Assamese, as-IN).',
      'Write for readers in Assam: everyday Assamese as on shop signs and notices, not bureaucratic wording.',
      'Use Assamese script only (Bengali-Assamese script — keep Assamese ৰ and ৱ). Never Latin transliteration, never Bengali (Bangla) spelling or wording, never Hindi / Devanagari. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → চেক-ইন; Luggage → লগেজ.',
      '- Safety: Wet floor → ভিজা মজিয়া; Caution → সাৱধান.',
      '- Food/menus: keep dish names natural (খাৰ, মাছৰ টেঙা, আলু পিটিকা, পিঠা); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Assamese output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Assamese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'mk') {
    return [
      'You translate signs, menus, forms, and short labels into natural Macedonian (Macedonian, mk-MK).',
      'Write for readers in North Macedonia: everyday Macedonian as on shop signs and notices, not bureaucratic wording.',
      'Use Macedonian Cyrillic only (including ѓ ќ ѕ љ њ џ ј). Never Latin transliteration, never Bulgarian or Serbian wording or letters (ъ щ ю я ђ ћ), never Russian (ы э ё). Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Пријава; Luggage → Багаж.',
      '- Safety: Wet floor → Влажен под; Caution → Внимание.',
      '- Food/menus: keep dish names natural (тавче гравче, ајвар, шопска салата, бурек); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Macedonian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Macedonian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'mn') {
    return [
      'You translate signs, menus, forms, and short labels into natural Mongolian (Mongolian, mn-MN).',
      'Write for readers in Mongolia: everyday Mongolian as on shop signs and notices, not bureaucratic wording.',
      'Use Mongolian Cyrillic only (Khalkha, including ө and ү). Never Latin transliteration, never traditional Mongolian script, never Kazakh, Buryat, or Russian wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Бүртгүүлэх; Luggage → Ачаа.',
      '- Safety: Wet floor → Нойтон шал; Caution → Болгоомжтой.',
      '- Food/menus: keep dish names natural (бууз, хуушуур, цуйван, айраг); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Mongolian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Mongolian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'hy') {
    return [
      'You translate signs, menus, forms, and short labels into natural Armenian (Armenian, hy-AM).',
      'Write for readers in Armenia: everyday Armenian as on shop signs and notices, not bureaucratic wording.',
      'Use Armenian script only (Eastern Armenian). Never Latin transliteration, never Cyrillic or Georgian, never Western Armenian forms where Eastern differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Գրանցում; Luggage → Ուղեբեռ.',
      '- Safety: Wet floor → Թաց հատակ; Caution → Զգուշացում.',
      '- Food/menus: keep dish names natural (խորոված, դոլմա, լավաշ, լահմաջուն); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Armenian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Armenian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ka') {
    return [
      'You translate signs, menus, forms, and short labels into natural Georgian (Georgian, ka-GE).',
      'Write for readers in Georgia: everyday Georgian as on shop signs and notices, not bureaucratic wording.',
      'Use Georgian Mkhedruli script only. Never Latin transliteration, never Cyrillic or Armenian, never Russian wording. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → რეგისტრაცია; Luggage → ბარგი.',
      '- Safety: Wet floor → სველი იატაკი; Caution → ფრთხილად.',
      '- Food/menus: keep dish names natural (ხინკალი, ხაჭაპური, მწვადი, ბადრიჯანი ნიგვზით); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Georgian output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Georgian>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'am') {
    return [
      'You translate signs, menus, forms, and short labels into natural Amharic (Amharic, am-ET).',
      'Write for readers in Ethiopia: everyday Amharic as on shop signs and notices, not bureaucratic wording.',
      'Use Ethiopic (Amharic fidel) script only. Never Latin transliteration as the main line, never Tigrinya, never Arabic script. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → ምዝገባ; Luggage → ሻንጣ.',
      '- Safety: Wet floor → እርጥብ ወለል; Caution → ጥንቃቄ.',
      '- Food/menus: keep dish names natural (እንጀራ, ዶሮ ወጥ, ክትፎ, ሽሮ); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Amharic output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Amharic>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ps') {
    return [
      'You translate signs, menus, forms, and short labels into natural Pashto (Pashto, ps-AF).',
      'Write for readers in Afghanistan: everyday Pashto as on shop signs and notices, not bureaucratic wording.',
      'Use Pashto Perso-Arabic script only (right-to-left, with Pashto letters ټ ډ ړ ږ ښ ڼ ې ۍ ځ څ ګ). Never Latin transliteration, never Devanagari, never Dari / Persian or Urdu wording where Pashto differs. Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → ثبت; Luggage → سامان.',
      '- Safety: Wet floor → لوند فرش; Caution → احتیاط.',
      '- Food/menus: keep dish names natural (کابلي پلاو, منټو, بولاني, اشک); translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate (Latin brand names may stay Latin).',
      'Never leave the translation empty. Never copy Chinese characters into the Pashto output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Pashto>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (to === 'ko') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Korean (한국어).',
      'Write for Korean travelers/readers: everyday spoken Seoul Korean (해요체), not stiff formal writing.',
      'Use native Hangul only. Never use Chinese characters, RR romanization, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → 체크인; Luggage → 짐.',
      '- Safety: Wet floor → 미끄러운 바닥; Caution → 주의.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Korean output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Korean>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'lo') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Vientiane Lao (ພາສາລາວ).',
      'Write for Lao travelers/readers: everyday spoken Vientiane Lao, not stiff formal writing.',
      'Use native Lao script (Unicode Lao block) only. Never use a toneless romanization, Chao tone letters, IPA, or invented ASCII tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → ເຊັກອິນ; Luggage →ກະເປົາເດີນທາງ.',
      '- Safety: Wet floor → ພື້ນລື່ນ ລະວັງ; Caution → ລະວັງ.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Lao output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Lao>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'ceb') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Cebuano (Binisaya / Sugbuanon).',
      'Write for Cebuano travelers/readers: everyday spoken Visayan, not stiff textbook Cebuano.',
      'Use Latin script only. Diacritics are optional — prefer clear Latin orthography.',
      'Do NOT use Chinese characters, Baybayin, IPA, or invented tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Pagrehistro; Luggage → Bagahi / Luggage.',
      '- Safety: Wet floor → Basà ang salog / Pagbantay; Caution → Pagbantay / Pag-amping.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Cebuano output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Cebuano>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'ilo') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Ilocano (Ilokano).',
      'Write for Ilocano travelers/readers: everyday spoken Ilokano, not stiff textbook Ilocano.',
      'Use Latin script only. Diacritics are optional — prefer clear Latin orthography.',
      'Do NOT use Chinese characters, Baybayin, IPA, or invented tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Rehistro; Luggage → Maleta / Luggage.',
      '- Safety: Wet floor → Nalames ti datar / Agannad; Caution → Agannad.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Ilocano output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Ilocano>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'bcl') {
    return [
      'You translate signs, menus, forms, and short labels into natural colloquial Central Bikol (Bikol Naga).',
      'Write for Bikol travelers/readers: everyday spoken Central Bikol, not stiff textbook Bikol.',
      'Use Latin script only. Diacritics are optional — prefer clear Latin orthography.',
      'Do NOT use Chinese characters, Baybayin, IPA, or invented tone digits.',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → Check-in / Rehistro; Luggage → Maleta / Luggage.',
      '- Safety: Wet floor → Basâ an salog / Mag-ingat; Caution → Mag-ingat.',
      '- Food/menus: keep dish names natural; translate descriptive phrases.',
      'Keep brand names, place names, and codes when appropriate.',
      'Never leave the translation empty. Never copy Chinese characters into the Bikol output.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Central Bikol>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    'You translate signs, menus, forms, and short labels into clear traveler English.',
    'Source may be Traditional or Simplified Chinese (Cantonese or Mandarin writing), Tagalog / Filipino, Mexican Spanish, Vietnamese, Thai, Lao, Cebuano, Ilocano, or Central Bikol (Latin script).',
    'When the source is Tagalog/Filipino, Mexican Spanish, Vietnamese, Thai, Lao, Cebuano, Ilocano, or Central Bikol text, translate it into concise English.',
    docHint,
    "Use concise sign English: 不准進入 → No entry; 今日特餐 → Today's special; 乾炒牛河 → Dry-fried beef chow fun.",
    'Dim sum: 蝦餃 → har gow / shrimp dumplings; 燒賣 → siu mai; 叉燒包 → BBQ pork bun; 流沙包 → lava custard bun.',
    'Keep place names (中環 → Central) and exit codes.',
    'Never leave the translation empty. Never copy Chinese characters into the English output.',
    docBatch
      ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
      : 'Return ONLY valid JSON: {"translation":"<English>"}',
    'No markdown, no explanation.',
  ]
    .filter(Boolean)
    .join('\n')
}

export type CameraTranslateOpts = {
  /** Nearby OCR / document lines for disambiguation (not translated). */
  context?: string
}

function demoTranslation(source: string, to: CameraLang): string {
  if (isChineseTarget(to)) {
    let demo = hasHan(source)
      ? source
      : to === 'cmn'
        ? `（示范）${source}`
        : `（示範）${source}`
    if (to === 'cmn') demo = scrubYueToCmn(demo).text
    else if (to === 'yue') demo = polishCamYueOutput(demo)
    return demo
  }
  if (isTagalogTarget(to)) {
    return hasHan(source) ? `(demo TL) ${source}` : `(demo) ${source}`
  }
  if (isMexicanTarget(to)) {
    return hasHan(source) ? `(demo Mx) ${source}` : `(demo) ${source}`
  }
  if (isPeninsularTarget(to)) {
    return hasHan(source) ? `(demo ES) ${source}` : `(demo) ${source}`
  }
  if (isVietnameseTarget(to)) {
    return hasHan(source) ? `(demo VI) ${source}` : `(demo) ${source}`
  }
  if (isThaiTarget(to)) {
    return hasHan(source) ? `(demo TH) ${source}` : `(demo) ${source}`
  }
  if (isLaoTarget(to)) {
    return hasHan(source) ? `(demo LO) ${source}` : `(demo) ${source}`
  }
  if (isKoreanTarget(to)) {
    return hasHan(source) ? `(demo KO) ${source}` : `(demo) ${source}`
  }
  if (isJapaneseTarget(to)) {
    return `(demo JA) ${source}`
  }
  if (isIndonesianTarget(to)) {
    return hasHan(source) ? `(demo ID) ${source}` : `(demo) ${source}`
  }
  if (isMalayTarget(to)) {
    return hasHan(source) ? `(demo MS) ${source}` : `(demo) ${source}`
  }
  if (isBrazilianPortugueseTarget(to)) {
    return hasHan(source) ? `(demo PT-BR) ${source}` : `(demo) ${source}`
  }
  if (isFrenchTarget(to)) {
    return hasHan(source) ? `(demo FR) ${source}` : `(demo) ${source}`
  }
  if (isHindiTarget(to)) {
    return hasHan(source) ? `(demo HI) ${source}` : `(demo) ${source}`
  }
  if (isKhmerTarget(to)) {
    return hasHan(source) ? `(demo KM) ${source}` : `(demo) ${source}`
  }
  if (isBurmeseTarget(to)) {
    return hasHan(source) ? `(demo MY) ${source}` : `(demo) ${source}`
  }
  if (isJavaneseTarget(to)) {
    return hasHan(source) ? `(demo JV) ${source}` : `(demo) ${source}`
  }
  if (isItalianTarget(to)) {
    return hasHan(source) ? `(demo IT) ${source}` : `(demo) ${source}`
  }
  if (isGermanTarget(to)) {
    return hasHan(source) ? `(demo DE) ${source}` : `(demo) ${source}`
  }
  if (isDutchTarget(to)) {
    return hasHan(source) ? `(demo NL) ${source}` : `(demo) ${source}`
  }
  if (isEgyptianArabicTarget(to)) {
    return hasHan(source) ? `(demo AR-EG) ${source}` : `(demo) ${source}`
  }
  if (isModernStandardArabicTarget(to)) {
    return hasHan(source) ? `(demo AR-SA) ${source}` : `(demo) ${source}`
  }
  if (isTamilTarget(to)) {
    return hasHan(source) ? `(demo TA) ${source}` : `(demo) ${source}`
  }
  if (isEuropeanPortugueseTarget(to)) {
    return hasHan(source) ? `(demo PT-PT) ${source}` : `(demo) ${source}`
  }
  if (isTurkishTarget(to)) {
    return hasHan(source) ? `(demo TR) ${source}` : `(demo) ${source}`
  }
  if (isBengaliTarget(to)) {
    return hasHan(source) ? `(demo BN) ${source}` : `(demo) ${source}`
  }
  if (isTeluguTarget(to)) {
    return hasHan(source) ? `(demo TE) ${source}` : `(demo) ${source}`
  }
  if (isGujaratiTarget(to)) {
    return hasHan(source) ? `(demo GU) ${source}` : `(demo) ${source}`
  }
  if (isKannadaTarget(to)) {
    return hasHan(source) ? `(demo KN) ${source}` : `(demo) ${source}`
  }
  if (isPolishTarget(to)) {
    return hasHan(source) ? `(demo PL) ${source}` : `(demo) ${source}`
  }
  if (isRomanianTarget(to)) {
    return hasHan(source) ? `(demo RO) ${source}` : `(demo) ${source}`
  }
  if (isCzechTarget(to)) {
    return hasHan(source) ? `(demo CS) ${source}` : `(demo) ${source}`
  }
  if (isGreekTarget(to)) {
    return hasHan(source) ? `(demo EL) ${source}` : `(demo) ${source}`
  }
  if (isHungarianTarget(to)) {
    return hasHan(source) ? `(demo HU) ${source}` : `(demo) ${source}`
  }
  if (isSwedishTarget(to)) {
    return hasHan(source) ? `(demo SV) ${source}` : `(demo) ${source}`
  }
  if (isRussianTarget(to)) {
    return hasHan(source) ? `(demo RU) ${source}` : `(demo) ${source}`
  }
  if (isUkrainianTarget(to)) {
    return hasHan(source) ? `(demo UK) ${source}` : `(demo) ${source}`
  }
  if (isHebrewTarget(to)) {
    return hasHan(source) ? `(demo HE) ${source}` : `(demo) ${source}`
  }
  if (isPersianTarget(to)) {
    return hasHan(source) ? `(demo FA) ${source}` : `(demo) ${source}`
  }
  if (isUrduTarget(to)) {
    return hasHan(source) ? `(demo UR) ${source}` : `(demo) ${source}`
  }
  if (isMalayalamTarget(to)) {
    return hasHan(source) ? `(demo ML) ${source}` : `(demo) ${source}`
  }
  if (isMarathiTarget(to)) {
    return hasHan(source) ? `(demo MR) ${source}` : `(demo) ${source}`
  }
  if (isPunjabiTarget(to)) {
    return hasHan(source) ? `(demo PA) ${source}` : `(demo) ${source}`
  }
  if (isOdiaTarget(to)) {
    return hasHan(source) ? `(demo OR) ${source}` : `(demo) ${source}`
  }
  if (isSinhalaTarget(to)) {
    return hasHan(source) ? `(demo SI) ${source}` : `(demo) ${source}`
  }
  if (isNepaliTarget(to)) {
    return hasHan(source) ? `(demo NE) ${source}` : `(demo) ${source}`
  }
  if (isDanishTarget(to)) {
    return hasHan(source) ? `(demo DA) ${source}` : `(demo) ${source}`
  }
  if (isNorwegianTarget(to)) {
    return hasHan(source) ? `(demo NB) ${source}` : `(demo) ${source}`
  }
  if (isFinnishTarget(to)) {
    return hasHan(source) ? `(demo FI) ${source}` : `(demo) ${source}`
  }
  if (isSlovakTarget(to)) {
    return hasHan(source) ? `(demo SK) ${source}` : `(demo) ${source}`
  }
  if (isCroatianTarget(to)) {
    return hasHan(source) ? `(demo HR) ${source}` : `(demo) ${source}`
  }
  if (isCatalanTarget(to)) {
    return hasHan(source) ? `(demo CA) ${source}` : `(demo) ${source}`
  }
  if (isAzerbaijaniTarget(to)) {
    return hasHan(source) ? `(demo AZ) ${source}` : `(demo) ${source}`
  }
  if (isKazakhTarget(to)) {
    return hasHan(source) ? `(demo KK) ${source}` : `(demo) ${source}`
  }
  if (isUzbekTarget(to)) {
    return hasHan(source) ? `(demo UZ) ${source}` : `(demo) ${source}`
  }
  if (isBulgarianTarget(to)) {
    return hasHan(source) ? `(demo BG) ${source}` : `(demo) ${source}`
  }
  if (isSerbianTarget(to)) {
    return hasHan(source) ? `(demo SR) ${source}` : `(demo) ${source}`
  }
  if (isSwahiliTarget(to)) {
    return hasHan(source) ? `(demo SW) ${source}` : `(demo) ${source}`
  }
  if (isAfrikaansTarget(to)) {
    return hasHan(source) ? `(demo AF) ${source}` : `(demo) ${source}`
  }
  if (isEstonianTarget(to)) {
    return hasHan(source) ? `(demo ET) ${source}` : `(demo) ${source}`
  }
  if (isLatvianTarget(to)) {
    return hasHan(source) ? `(demo LV) ${source}` : `(demo) ${source}`
  }
  if (isLithuanianTarget(to)) {
    return hasHan(source) ? `(demo LT) ${source}` : `(demo) ${source}`
  }
  if (isIrishTarget(to)) {
    return hasHan(source) ? `(demo GA) ${source}` : `(demo) ${source}`
  }
  if (isWelshTarget(to)) {
    return hasHan(source) ? `(demo CY) ${source}` : `(demo) ${source}`
  }
  if (isBasqueTarget(to)) {
    return hasHan(source) ? `(demo EU) ${source}` : `(demo) ${source}`
  }
  if (isGalicianTarget(to)) {
    return hasHan(source) ? `(demo GL) ${source}` : `(demo) ${source}`
  }
  if (isMalteseTarget(to)) {
    return hasHan(source) ? `(demo MT) ${source}` : `(demo) ${source}`
  }
  if (isIcelandicTarget(to)) {
    return hasHan(source) ? `(demo IS) ${source}` : `(demo) ${source}`
  }
  if (isBosnianTarget(to)) {
    return hasHan(source) ? `(demo BS) ${source}` : `(demo) ${source}`
  }
  if (isAlbanianTarget(to)) {
    return hasHan(source) ? `(demo SQ) ${source}` : `(demo) ${source}`
  }
  if (isZuluTarget(to)) {
    return hasHan(source) ? `(demo ZU) ${source}` : `(demo) ${source}`
  }
  if (isSomaliTarget(to)) {
    return hasHan(source) ? `(demo SO) ${source}` : `(demo) ${source}`
  }
  if (isAssameseTarget(to)) {
    return hasHan(source) ? `(demo AS) ${source}` : `(demo) ${source}`
  }
  if (isMacedonianTarget(to)) {
    return hasHan(source) ? `(demo MK) ${source}` : `(demo) ${source}`
  }
  if (isMongolianTarget(to)) {
    return hasHan(source) ? `(demo MN) ${source}` : `(demo) ${source}`
  }
  if (isArmenianTarget(to)) {
    return hasHan(source) ? `(demo HY) ${source}` : `(demo) ${source}`
  }
  if (isGeorgianTarget(to)) {
    return hasHan(source) ? `(demo KA) ${source}` : `(demo) ${source}`
  }
  if (isAmharicTarget(to)) {
    return hasHan(source) ? `(demo AM) ${source}` : `(demo) ${source}`
  }
  if (isPashtoTarget(to)) {
    return hasHan(source) ? `(demo PS) ${source}` : `(demo) ${source}`
  }
  if (isHakkaTarget(to)) {
    return hasHan(source) ? `（示范·HAK）${source}` : `（示范·HAK）${source}`
  }
  if (isTeochewTarget(to)) {
    return hasHan(source) ? `（示范·TEO）${source}` : `（示范·TEO）${source}`
  }
  if (isHokkienTarget(to)) {
    return hasHan(source) ? `（示范·NAN）${source}` : `（示范·NAN）${source}`
  }
  if (isCebuanoTarget(to)) {
    return hasHan(source) ? `(demo CEB) ${source}` : `(demo) ${source}`
  }
  if (isIlocanoTarget(to)) {
    return hasHan(source) ? `(demo ILO) ${source}` : `(demo) ${source}`
  }
  if (isBikolTarget(to)) {
    return hasHan(source) ? `(demo BCL) ${source}` : `(demo) ${source}`
  }
  return `(demo) ${source}`
}

/**
 * Camera / written-Chinese translate (EN ↔ yue|cmn|wuu|tl|es). * Never apply Yue scrub to Mandarin (cmn) outputs — reverse-scrub Yue→cmn instead.
 */
export async function translateCameraText(
  text: string,
  from: CameraLang,
  to: CameraLang,
  opts?: CameraTranslateOpts,
): Promise<{ text: string; engine: string; cacheHit: boolean }> {
  // OCR often returns Simplified. HK OpenCC only for yue/cmn — never force
  // Hong Kong variants onto Shanghainese / Sichuanese Cam text.
  const source = normalizeCamChineseSource(from, text.trim().slice(0, 2000))
  if (!source) return { text: '', engine: 'empty', cacheHit: true }
  if (from === to) {
    if (to === 'cmn') {
      return { text: toSimplified(source), engine: 'identity', cacheHit: true }
    }
    return { text: source, engine: 'identity', cacheHit: true }
  }

  const key = `${from}|${to}|${source}`
  const hit = cache.get(key)
  if (hit !== undefined) {
    remember(key, hit)
    return { text: hit, engine: 'cache', cacheHit: true }
  }

  const client = openaiClient()
  if (!client) {
    const demo = demoTranslation(source, to)
    remember(key, demo)
    return { text: demo, engine: 'demo', cacheHit: false }
  }

  const context = opts?.context?.trim().slice(0, 800)
  const userContent = context
    ? `Context (do not translate):\n${context}\n\nTranslate this line:\n${source}`
    : source

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: 'system', content: cameraSystemPrompt(to) },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    ...llmChatExtras(),
  })

  const raw = completion.choices[0]?.message?.content?.trim() || ''
  const fallback = isChineseTarget(to)
    ? to === 'cmn'
      ? `（译）${source}`
      : `（譯）${source}`
    : isTagalogTarget(to)
      ? `(tr TL) ${source}`
      : isMexicanTarget(to)
        ? `(tr Mx) ${source}`
        : isPeninsularTarget(to)
          ? `(tr ES) ${source}`
          : isVietnameseTarget(to)
          ? `(tr VI) ${source}`
          : isThaiTarget(to)
            ? `(tr TH) ${source}`
            : isLaoTarget(to)
              ? `(tr LO) ${source}`
              : isJapaneseTarget(to)
                ? `(tr JA) ${source}`
              : isIndonesianTarget(to)
                ? `(tr ID) ${source}`
              : isMalayTarget(to)
                ? `(tr MS) ${source}`
              : isBrazilianPortugueseTarget(to)
                ? `(tr PT) ${source}`
              : isFrenchTarget(to)
                ? `(tr FR) ${source}`
              : isHindiTarget(to)
                ? `(tr HI) ${source}`
              : isKhmerTarget(to)
                ? `(tr KM) ${source}`
              : isBurmeseTarget(to)
                ? `(tr MY) ${source}`
              : isJavaneseTarget(to)
                ? `(tr JV) ${source}`
              : isItalianTarget(to)
                ? `(tr IT) ${source}`
              : isGermanTarget(to)
                ? `(tr DE) ${source}`
              : isDutchTarget(to)
                ? `(tr NL) ${source}`
              : isEgyptianArabicTarget(to)
                ? `(tr AR-EG) ${source}`
              : isModernStandardArabicTarget(to)
                ? `(tr AR-SA) ${source}`
              : isTamilTarget(to)
                ? `(tr TA) ${source}`
              : isEuropeanPortugueseTarget(to)
                ? `(tr PT-PT) ${source}`
              : isTurkishTarget(to)
                ? `(tr TR) ${source}`
              : isBengaliTarget(to)
                ? `(tr BN) ${source}`
              : isTeluguTarget(to)
                ? `(tr TE) ${source}`
              : isGujaratiTarget(to)
                ? `(tr GU) ${source}`
              : isKannadaTarget(to)
                ? `(tr KN) ${source}`
              : isPolishTarget(to)
                ? `(tr PL) ${source}`
              : isRomanianTarget(to)
                ? `(tr RO) ${source}`
              : isCzechTarget(to)
                ? `(tr CS) ${source}`
              : isGreekTarget(to)
                ? `(tr EL) ${source}`
              : isHungarianTarget(to)
                ? `(tr HU) ${source}`
              : isSwedishTarget(to)
                ? `(tr SV) ${source}`
              : isRussianTarget(to)
                ? `(tr RU) ${source}`
              : isUkrainianTarget(to)
                ? `(tr UK) ${source}`
              : isHebrewTarget(to)
                ? `(tr HE) ${source}`
              : isPersianTarget(to)
                ? `(tr FA) ${source}`
              : isUrduTarget(to)
                ? `(tr UR) ${source}`
              : isMalayalamTarget(to)
                ? `(tr ML) ${source}`
              : isMarathiTarget(to)
                ? `(tr MR) ${source}`
              : isPunjabiTarget(to)
                ? `(tr PA) ${source}`
              : isOdiaTarget(to)
                ? `(tr OR) ${source}`
              : isSinhalaTarget(to)
                ? `(tr SI) ${source}`
              : isNepaliTarget(to)
                ? `(tr NE) ${source}`
              : isDanishTarget(to)
                ? `(tr DA) ${source}`
              : isNorwegianTarget(to)
                ? `(tr NB) ${source}`
              : isFinnishTarget(to)
                ? `(tr FI) ${source}`
              : isSlovakTarget(to)
                ? `(tr SK) ${source}`
              : isCroatianTarget(to)
                ? `(tr HR) ${source}`
              : isCatalanTarget(to)
                ? `(tr CA) ${source}`
              : isAzerbaijaniTarget(to)
                ? `(tr AZ) ${source}`
              : isKazakhTarget(to)
                ? `(tr KK) ${source}`
              : isUzbekTarget(to)
                ? `(tr UZ) ${source}`
              : isBulgarianTarget(to)
                ? `(tr BG) ${source}`
              : isSerbianTarget(to)
                ? `(tr SR) ${source}`
              : isSwahiliTarget(to)
                ? `(tr SW) ${source}`
              : isAfrikaansTarget(to)
                ? `(tr AF) ${source}`
              : isEstonianTarget(to)
                ? `(tr ET) ${source}`
              : isLatvianTarget(to)
                ? `(tr LV) ${source}`
              : isLithuanianTarget(to)
                ? `(tr LT) ${source}`
              : isIrishTarget(to)
                ? `(tr GA) ${source}`
              : isWelshTarget(to)
                ? `(tr CY) ${source}`
              : isBasqueTarget(to)
                ? `(tr EU) ${source}`
              : isGalicianTarget(to)
                ? `(tr GL) ${source}`
              : isMalteseTarget(to)
                ? `(tr MT) ${source}`
              : isIcelandicTarget(to)
                ? `(tr IS) ${source}`
              : isBosnianTarget(to)
                ? `(tr BS) ${source}`
              : isAlbanianTarget(to)
                ? `(tr SQ) ${source}`
              : isZuluTarget(to)
                ? `(tr ZU) ${source}`
              : isSomaliTarget(to)
                ? `(tr SO) ${source}`
              : isAssameseTarget(to)
                ? `(tr AS) ${source}`
              : isMacedonianTarget(to)
                ? `(tr MK) ${source}`
              : isMongolianTarget(to)
                ? `(tr MN) ${source}`
              : isArmenianTarget(to)
                ? `(tr HY) ${source}`
              : isGeorgianTarget(to)
                ? `(tr KA) ${source}`
              : isAmharicTarget(to)
                ? `(tr AM) ${source}`
              : isPashtoTarget(to)
                ? `(tr PS) ${source}`
              : isKoreanTarget(to)
                ? `(tr KO) ${source}`
              : isCebuanoTarget(to)
            ? `(tr CEB) ${source}`
            : isIlocanoTarget(to)
              ? `(tr ILO) ${source}`
              : isBikolTarget(to)
                ? `(tr BCL) ${source}`
                : `(tr) ${source}`
  let translated = parseTranslation(raw, fallback)
  if (to === 'cmn') translated = scrubYueToCmn(translated).text
  else if (to === 'yue') translated = polishCamYueOutput(translated)
  const guarded = sanitizeCameraTranslation(to, translated, source)
  const outText = guarded ?? source
  remember(key, outText)
  return {
    text: outText,
    engine: env.openaiBaseUrl ? 'openai-compatible' : 'openai',
    cacheHit: false,
  }
}

const BATCH_SIZE = 16

function langLabel(lang: CameraLang): string {
  if (lang === 'en') return 'English'
  if (lang === 'cmn') return 'Mandarin Chinese 普通话 (简体 OK)'
  if (lang === 'wuu') return 'Shanghainese 上海话 / 沪语'
  if (lang === 'sichuan') return 'Sichuanese / Chengdu (四川话)'
  if (lang === 'hak') return 'Hakka (客家話) — Chinese characters; Pha̍k-fa-sṳ separate'
  if (lang === 'teo') return 'Teochew (潮州話) — Chinese characters; Peng’im separate'
  if (lang === 'nan')
    return 'Hokkien / Min Nan (閩南語) — Chinese characters; Tâi-lô/POJ separate — never zh-TW Mandarin'
  if (lang === 'tl') return 'Tagalog / Filipino (Latin script)'
  if (lang === 'es') return 'Mexican Spanish (Latin script, es-MX)'
  if (lang === 'eses') return 'Peninsular Spanish (Latin script, es-ES)'
  if (lang === 'vi') return 'Vietnamese (Latin script / Quốc ngữ, vi-VN)'
  if (lang === 'th') return 'Central Thai (Thai script, th-TH)'
  if (lang === 'lo') return 'Vientiane Lao (Lao script, lo-LA)'
  if (lang === 'ko') return 'Korean (Hangul, ko-KR)'
  if (lang === 'ja') return 'Japanese (kanji + kana, ja-JP)'
  if (lang === 'id') return 'Indonesian (Latin script, id-ID)'
  if (lang === 'ms') return 'Malay (Latin script, ms-MY / Malaysia)'
  if (lang === 'pt') return 'Brazilian Portuguese (Latin script, pt-BR)'
  if (lang === 'fr') return 'Metropolitan French (Latin script, fr-FR)'
  if (lang === 'hi') return 'Hindi (Devanagari, hi-IN)'
  if (lang === 'km') return 'Khmer (km-KH)'
  if (lang === 'my') return 'Standard Burmese (Myanmar script, my-MM)'
  if (lang === 'jv') return 'Javanese (Latin script, jv-ID)'
  if (lang === 'it') return 'Standard Italian (Latin script, it-IT)'
  if (lang === 'de') return 'Standard German (Latin script, de-DE)'
  if (lang === 'nl') return 'Standard Dutch (Latin script, nl-NL)'
  if (lang === 'ar') return 'Egyptian Arabic colloquial (Arabic script, ar-EG)'
  if (lang === 'arsa') return 'Modern Standard Arabic / فصحى (Arabic script, ar-SA)'
  if (lang === 'ta') return 'Tamil (Tamil script, ta-IN)'
  if (lang === 'ptpt') return 'European Portuguese (Latin script, pt-PT — not Brazilian)'
  if (lang === 'tr') return 'Turkish (Latin script, tr-TR)'
  if (lang === 'bn') return 'Bengali / Bangla (Bangla script, bn-IN)'
  if (lang === 'te') return 'Telugu (Telugu script, te-IN)'
  if (lang === 'gu') return 'Gujarati (Gujarati script, gu-IN — not Devanagari)'
  if (lang === 'kn') return 'Kannada (Kannada script, kn-IN)'
  if (lang === 'pl') return 'Polish (Latin script, pl-PL)'
  if (lang === 'ro') return 'Romanian (Latin script with ș ț, ro-RO)'
  if (lang === 'cs') return 'Czech (Latin script, cs-CZ — not Slovak)'
  if (lang === 'el') return 'Modern Greek (Greek script, el-GR)'
  if (lang === 'hu') return 'Hungarian (Latin script, hu-HU)'
  if (lang === 'sv') return 'Swedish (Latin script, sv-SE)'
  if (lang === 'ru') return 'Russian (Cyrillic, ru-RU — not Ukrainian)'
  if (lang === 'uk') return 'Ukrainian (Cyrillic, uk-UA — not Russian)'
  if (lang === 'he') return 'Modern Hebrew (Hebrew script, he-IL)'
  if (lang === 'fa') return 'Persian / Farsi (Persian script, fa-IR — not Arabic)'
  if (lang === 'ur') return 'Urdu (Perso-Arabic Nastaliq script, ur-IN — not Hindi)'
  if (lang === 'ml') return 'Malayalam (Malayalam script, ml-IN)'
  if (lang === 'mr') return 'Marathi (Devanagari, mr-IN — not Hindi)'
  if (lang === 'pa') return 'Punjabi (Gurmukhi script, pa-IN — not Shahmukhi)'
  if (lang === 'or') return 'Odia (Odia script, or-IN)'
  if (lang === 'si') return 'Sinhala (Sinhala script, si-LK — not Sichuanese)'
  if (lang === 'ne') return 'Nepali (Devanagari, ne-NP — not Hindi)'
  if (lang === 'da') return 'Danish (Latin script, da-DK — not Norwegian)'
  if (lang === 'nb') return 'Norwegian Bokmål (Latin script, nb-NO — not Nynorsk or Danish)'
  if (lang === 'fi') return 'Finnish (Latin script, fi-FI)'
  if (lang === 'sk') return 'Slovak (Latin script, sk-SK — not Czech)'
  if (lang === 'hr') return 'Croatian (Latin script, hr-HR — not Serbian)'
  if (lang === 'ca') return 'Catalan (Latin script, ca-ES — not Spanish)'
  if (lang === 'az') return 'Azerbaijani (Latin script, az-AZ — not Turkish)'
  if (lang === 'kk') return 'Kazakh (Cyrillic, kk-KZ — not Russian)'
  if (lang === 'uz') return 'Uzbek (Latin script, uz-UZ — not Cyrillic)'
  if (lang === 'bg') return 'Bulgarian (Cyrillic, bg-BG — not Russian)'
  if (lang === 'sr') return 'Serbian (Cyrillic only, sr-RS — never Latin)'
  if (lang === 'sw') return 'Swahili (Latin script, sw-KE)'
  if (lang === 'af') return 'Afrikaans (Latin script, af-ZA — not Dutch)'
  if (lang === 'et') return 'Estonian (Latin script, et-EE — not Finnish)'
  if (lang === 'lv') return 'Latvian (Latin script, lv-LV — not Lithuanian)'
  if (lang === 'lt') return 'Lithuanian (Latin script, lt-LT — not Latvian)'
  if (lang === 'ga') return 'Irish (Gaeilge, Latin script, ga-IE — not Scottish Gaelic)'
  if (lang === 'cy') return 'Welsh (Latin script, cy-GB)'
  if (lang === 'eu') return 'Basque (Latin script, eu-ES)'
  if (lang === 'gl') return 'Galician (Latin script, gl-ES — not Portuguese)'
  if (lang === 'mt') return 'Maltese (Latin script, mt-MT)'
  if (lang === 'is') return 'Icelandic (Latin script, is-IS)'
  if (lang === 'bs') return 'Bosnian (Latin script only, bs-BA — never Cyrillic)'
  if (lang === 'sq') return 'Albanian (Latin script, sq-AL)'
  if (lang === 'zu') return 'Zulu (Latin script, zu-ZA — not Xhosa)'
  if (lang === 'so') return 'Somali (Latin script, so-SO)'
  if (lang === 'as') return 'Assamese (Assamese script, as-IN — not Bengali)'
  if (lang === 'mk') return 'Macedonian (Cyrillic, mk-MK — not Bulgarian)'
  if (lang === 'mn') return 'Mongolian (Cyrillic, mn-MN — not traditional script)'
  if (lang === 'hy') return 'Armenian (Armenian script, hy-AM)'
  if (lang === 'ka') return 'Georgian (Georgian script, ka-GE)'
  if (lang === 'am') return 'Amharic (Ethiopic script, am-ET)'
  if (lang === 'ps') return 'Pashto (Perso-Arabic script, RTL, ps-AF — not Dari)'
  if (lang === 'ceb') return 'Cebuano / Binisaya (Latin script)'
  if (lang === 'ilo') return 'Ilocano / Ilokano (Latin script)'
  if (lang === 'bcl') return 'Central Bikol / Bikol Naga (Latin script)'
  return 'Hong Kong Chinese 繁體'
}

/** Context-aware batch translate for document page lines (keeps names/terms consistent). */
export async function translateCameraBatch(
  segments: string[],
  from: CameraLang,
  to: CameraLang,
): Promise<{ translations: string[]; engine: string }> {
  if (!segments.length) return { translations: [], engine: 'empty' }
  const normalized = segments.map((s) => normalizeCamChineseSource(from, s))
  if (from === to) {
    if (to === 'cmn') {
      return { translations: normalized.map((s) => toSimplified(s)), engine: 'identity' }
    }
    return { translations: normalized, engine: 'identity' }
  }

  const client = openaiClient()
  if (!client) {
    return {
      translations: normalized.map((s) => demoTranslation(s, to)),
      engine: 'demo',
    }
  }

  const out = [...normalized]
  for (let start = 0; start < normalized.length; start += BATCH_SIZE) {
    const chunk = normalized.slice(start, start + BATCH_SIZE)
    const numbered = chunk.map((line, i) => `${i + 1}. ${line}`).join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: Math.min(4000, 180 * chunk.length + 120),
      messages: [
        { role: 'system', content: cameraSystemPrompt(to, true) },
        {
          role: 'user',
          content: `Translate each numbered line (${langLabel(from)} → ${langLabel(to)}):\n${numbered}`,
        },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const fallbacks = chunk.map((s) =>
      isChineseTarget(to)
        ? to === 'cmn'
          ? `（译）${s}`
          : `（譯）${s}`
        : isTagalogTarget(to)
          ? `(tr TL) ${s}`
          : isMexicanTarget(to)
            ? `(tr Mx) ${s}`
            : isPeninsularTarget(to)
              ? `(tr ES) ${s}`
              : isVietnameseTarget(to)
              ? `(tr VI) ${s}`
              : isThaiTarget(to)
                ? `(tr TH) ${s}`
                : isLaoTarget(to)
                  ? `(tr LO) ${s}`
                  : isJapaneseTarget(to)
                    ? `(tr JA) ${s}`
                  : isIndonesianTarget(to)
                    ? `(tr ID) ${s}`
                  : isMalayTarget(to)
                    ? `(tr MS) ${s}`
                  : isBrazilianPortugueseTarget(to)
                    ? `(tr PT) ${s}`
                  : isFrenchTarget(to)
                    ? `(tr FR) ${s}`
                  : isHindiTarget(to)
                    ? `(tr HI) ${s}`
                  : isKhmerTarget(to)
                    ? `(tr KM) ${s}`
                  : isBurmeseTarget(to)
                    ? `(tr MY) ${s}`
                  : isJavaneseTarget(to)
                    ? `(tr JV) ${s}`
                  : isItalianTarget(to)
                    ? `(tr IT) ${s}`
                  : isGermanTarget(to)
                    ? `(tr DE) ${s}`
                  : isDutchTarget(to)
                    ? `(tr NL) ${s}`
                  : isEgyptianArabicTarget(to)
                    ? `(tr AR-EG) ${s}`
                  : isModernStandardArabicTarget(to)
                    ? `(tr AR-SA) ${s}`
                  : isTamilTarget(to)
                    ? `(tr TA) ${s}`
                  : isEuropeanPortugueseTarget(to)
                    ? `(tr PT-PT) ${s}`
                  : isTurkishTarget(to)
                    ? `(tr TR) ${s}`
                  : isBengaliTarget(to)
                    ? `(tr BN) ${s}`
                  : isTeluguTarget(to)
                    ? `(tr TE) ${s}`
                  : isGujaratiTarget(to)
                    ? `(tr GU) ${s}`
                  : isKannadaTarget(to)
                    ? `(tr KN) ${s}`
                  : isPolishTarget(to)
                    ? `(tr PL) ${s}`
                  : isRomanianTarget(to)
                    ? `(tr RO) ${s}`
                  : isCzechTarget(to)
                    ? `(tr CS) ${s}`
                  : isGreekTarget(to)
                    ? `(tr EL) ${s}`
                  : isHungarianTarget(to)
                    ? `(tr HU) ${s}`
                  : isSwedishTarget(to)
                    ? `(tr SV) ${s}`
                  : isRussianTarget(to)
                    ? `(tr RU) ${s}`
                  : isUkrainianTarget(to)
                    ? `(tr UK) ${s}`
                  : isHebrewTarget(to)
                    ? `(tr HE) ${s}`
                  : isPersianTarget(to)
                    ? `(tr FA) ${s}`
                  : isUrduTarget(to)
                    ? `(tr UR) ${s}`
                  : isMalayalamTarget(to)
                    ? `(tr ML) ${s}`
                  : isMarathiTarget(to)
                    ? `(tr MR) ${s}`
                  : isPunjabiTarget(to)
                    ? `(tr PA) ${s}`
                  : isOdiaTarget(to)
                    ? `(tr OR) ${s}`
                  : isSinhalaTarget(to)
                    ? `(tr SI) ${s}`
                  : isNepaliTarget(to)
                    ? `(tr NE) ${s}`
                  : isDanishTarget(to)
                    ? `(tr DA) ${s}`
                  : isNorwegianTarget(to)
                    ? `(tr NB) ${s}`
                  : isFinnishTarget(to)
                    ? `(tr FI) ${s}`
                  : isSlovakTarget(to)
                    ? `(tr SK) ${s}`
                  : isCroatianTarget(to)
                    ? `(tr HR) ${s}`
                  : isCatalanTarget(to)
                    ? `(tr CA) ${s}`
                  : isAzerbaijaniTarget(to)
                    ? `(tr AZ) ${s}`
                  : isKazakhTarget(to)
                    ? `(tr KK) ${s}`
                  : isUzbekTarget(to)
                    ? `(tr UZ) ${s}`
                  : isBulgarianTarget(to)
                    ? `(tr BG) ${s}`
                  : isSerbianTarget(to)
                    ? `(tr SR) ${s}`
                  : isSwahiliTarget(to)
                    ? `(tr SW) ${s}`
                  : isAfrikaansTarget(to)
                    ? `(tr AF) ${s}`
                  : isEstonianTarget(to)
                    ? `(tr ET) ${s}`
                  : isLatvianTarget(to)
                    ? `(tr LV) ${s}`
                  : isLithuanianTarget(to)
                    ? `(tr LT) ${s}`
                  : isIrishTarget(to)
                    ? `(tr GA) ${s}`
                  : isWelshTarget(to)
                    ? `(tr CY) ${s}`
                  : isBasqueTarget(to)
                    ? `(tr EU) ${s}`
                  : isGalicianTarget(to)
                    ? `(tr GL) ${s}`
                  : isMalteseTarget(to)
                    ? `(tr MT) ${s}`
                  : isIcelandicTarget(to)
                    ? `(tr IS) ${s}`
                  : isBosnianTarget(to)
                    ? `(tr BS) ${s}`
                  : isAlbanianTarget(to)
                    ? `(tr SQ) ${s}`
                  : isZuluTarget(to)
                    ? `(tr ZU) ${s}`
                  : isSomaliTarget(to)
                    ? `(tr SO) ${s}`
                  : isAssameseTarget(to)
                    ? `(tr AS) ${s}`
                  : isMacedonianTarget(to)
                    ? `(tr MK) ${s}`
                  : isMongolianTarget(to)
                    ? `(tr MN) ${s}`
                  : isArmenianTarget(to)
                    ? `(tr HY) ${s}`
                  : isGeorgianTarget(to)
                    ? `(tr KA) ${s}`
                  : isAmharicTarget(to)
                    ? `(tr AM) ${s}`
                  : isPashtoTarget(to)
                    ? `(tr PS) ${s}`
                  : isKoreanTarget(to)
                    ? `(tr KO) ${s}`
                  : isCebuanoTarget(to)
                ? `(tr CEB) ${s}`
                : isIlocanoTarget(to)
                  ? `(tr ILO) ${s}`
                  : isBikolTarget(to)
                    ? `(tr BCL) ${s}`
                    : `(tr) ${s}`,
    )
    const translated = parseBatchTranslations(raw, fallbacks)
    for (let i = 0; i < chunk.length; i++) {
      let t = stripLeadingListNumber((translated[i] || '').trim())
      const src = chunk[i] || ''
      if (to === 'cmn' && t) t = scrubYueToCmn(t).text
      else if (to === 'yue' && t) t = polishCamYueOutput(t)
      const guarded = sanitizeCameraTranslation(to, t, src)
      out[start + i] = guarded ?? src
      remember(`${from}|${to}|${src}`, out[start + i]!)
    }
  }

  return {
    translations: out,
    engine: env.openaiBaseUrl ? 'openai-compatible' : 'openai',
  }
}

/** Normalize legacy `zh` → `yue`; `fil` → `tl` for API callers. */
export function normalizeCameraLang(lang: string | undefined): CameraLang | undefined {
  if (!lang) return undefined
  if (lang === 'zh' || lang === 'yue') return 'yue'
  if (lang === 'fil' || lang === 'tl') return 'tl'
  if (lang === 'eses' || lang === 'es-ES' || lang === 'es-es') return 'eses'
  if (lang === 'es' || lang === 'es-MX' || lang === 'es-mx' || lang === 'es-US' || lang === 'es-us') return 'es'
  if (lang === 'vi' || lang === 'vi-VN' || lang === 'vi-vn') return 'vi'
  if (lang === 'th' || lang === 'th-TH' || lang === 'th-th') return 'th'
  if (lang === 'lo' || lang === 'lo-LA' || lang === 'lo-la') return 'lo'
  if (lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr') return 'ko'
  if (lang === 'ja' || lang === 'ja-JP' || lang === 'ja-jp') return 'ja'
  if (lang === 'id' || lang === 'id-ID' || lang === 'id-id') return 'id'
  if (lang === 'ms' || lang === 'ms-MY' || lang === 'ms-my') return 'ms'
  if (lang === 'ptpt' || lang === 'pt-PT' || lang === 'pt-pt') return 'ptpt'
  if (lang === 'pt' || lang === 'pt-BR' || lang === 'pt-br') return 'pt'
  if (lang === 'fr' || lang === 'fr-FR' || lang === 'fr-fr') return 'fr'
  if (lang === 'hi' || lang === 'hi-IN' || lang === 'hi-in') return 'hi'
  if (lang === 'km' || lang === 'km-KH' || lang === 'km-kh') return 'km'
  if (lang === 'my' || lang === 'my-MM' || lang === 'my-mm') return 'my'
  if (lang === 'jv' || lang === 'jv-ID' || lang === 'jv-id') return 'jv'
  if (lang === 'it' || lang === 'it-IT' || lang === 'it-it') return 'it'
  if (lang === 'de' || lang === 'de-DE' || lang === 'de-de') return 'de'
  if (lang === 'nl' || lang === 'nl-NL' || lang === 'nl-nl') return 'nl'
  if (lang === 'ar' || lang === 'ar-EG' || lang === 'ar-eg') return 'ar'
  if (lang === 'arsa' || lang === 'ar-SA' || lang === 'ar-sa') return 'arsa'
  if (lang === 'ta' || lang === 'ta-IN' || lang === 'ta-in') return 'ta'
  if (lang === 'tr' || lang === 'tr-TR' || lang === 'tr-tr') return 'tr'
  if (lang === 'bn' || lang === 'bn-IN' || lang === 'bn-in') return 'bn'
  if (lang === 'te' || lang === 'te-IN' || lang === 'te-in') return 'te'
  if (lang === 'gu' || lang === 'gu-IN' || lang === 'gu-in') return 'gu'
  if (lang === 'kn' || lang === 'kn-IN' || lang === 'kn-in') return 'kn'
  if (lang === 'pl' || lang === 'pl-PL' || lang === 'pl-pl') return 'pl'
  if (lang === 'ro' || lang === 'ro-RO' || lang === 'ro-ro') return 'ro'
  if (lang === 'cs' || lang === 'cs-CZ' || lang === 'cs-cz') return 'cs'
  if (lang === 'el' || lang === 'el-GR' || lang === 'el-gr') return 'el'
  if (lang === 'hu' || lang === 'hu-HU' || lang === 'hu-hu') return 'hu'
  if (lang === 'sv' || lang === 'sv-SE' || lang === 'sv-se') return 'sv'
  if (lang === 'ru' || lang === 'ru-RU' || lang === 'ru-ru') return 'ru'
  if (lang === 'uk' || lang === 'uk-UA' || lang === 'uk-ua') return 'uk'
  if (lang === 'he' || lang === 'he-IL' || lang === 'he-il') return 'he'
  if (lang === 'fa' || lang === 'fa-IR' || lang === 'fa-ir') return 'fa'
  if (lang === 'ur' || lang === 'ur-IN' || lang === 'ur-in') return 'ur'
  if (lang === 'ml' || lang === 'ml-IN' || lang === 'ml-in') return 'ml'
  if (lang === 'mr' || lang === 'mr-IN' || lang === 'mr-in') return 'mr'
  if (lang === 'pa' || lang === 'pa-IN' || lang === 'pa-in') return 'pa'
  if (lang === 'or' || lang === 'or-IN' || lang === 'or-in') return 'or'
  if (lang === 'si' || lang === 'si-LK' || lang === 'si-lk') return 'si'
  if (lang === 'ne' || lang === 'ne-NP' || lang === 'ne-np') return 'ne'
  if (lang === 'da' || lang === 'da-DK' || lang === 'da-dk') return 'da'
  if (lang === 'nb' || lang === 'nb-NO' || lang === 'nb-no') return 'nb'
  if (lang === 'fi' || lang === 'fi-FI' || lang === 'fi-fi') return 'fi'
  if (lang === 'sk' || lang === 'sk-SK' || lang === 'sk-sk') return 'sk'
  if (lang === 'hr' || lang === 'hr-HR' || lang === 'hr-hr') return 'hr'
  if (lang === 'ca' || lang === 'ca-ES' || lang === 'ca-es') return 'ca'
  if (lang === 'az' || lang === 'az-AZ' || lang === 'az-az') return 'az'
  if (lang === 'kk' || lang === 'kk-KZ' || lang === 'kk-kz') return 'kk'
  if (lang === 'uz' || lang === 'uz-UZ' || lang === 'uz-uz') return 'uz'
  if (lang === 'bg' || lang === 'bg-BG' || lang === 'bg-bg') return 'bg'
  if (lang === 'sr' || lang === 'sr-RS' || lang === 'sr-rs') return 'sr'
  if (lang === 'sw' || lang === 'sw-KE' || lang === 'sw-ke') return 'sw'
  if (lang === 'af' || lang === 'af-ZA' || lang === 'af-za') return 'af'
  if (lang === 'et' || lang === 'et-EE' || lang === 'et-ee') return 'et'
  if (lang === 'lv' || lang === 'lv-LV' || lang === 'lv-lv') return 'lv'
  if (lang === 'lt' || lang === 'lt-LT' || lang === 'lt-lt') return 'lt'
  if (lang === 'ga' || lang === 'ga-IE' || lang === 'ga-ie') return 'ga'
  if (lang === 'cy' || lang === 'cy-GB' || lang === 'cy-gb') return 'cy'
  if (lang === 'eu' || lang === 'eu-ES' || lang === 'eu-es') return 'eu'
  if (lang === 'gl' || lang === 'gl-ES' || lang === 'gl-es') return 'gl'
  if (lang === 'mt' || lang === 'mt-MT' || lang === 'mt-mt') return 'mt'
  if (lang === 'is' || lang === 'is-IS' || lang === 'is-is') return 'is'
  if (lang === 'bs' || lang === 'bs-BA' || lang === 'bs-ba') return 'bs'
  if (lang === 'sq' || lang === 'sq-AL' || lang === 'sq-al') return 'sq'
  if (lang === 'zu' || lang === 'zu-ZA' || lang === 'zu-za') return 'zu'
  if (lang === 'so' || lang === 'so-SO' || lang === 'so-so') return 'so'
  if (lang === 'as' || lang === 'as-IN' || lang === 'as-in') return 'as'
  if (lang === 'mk' || lang === 'mk-MK' || lang === 'mk-mk') return 'mk'
  if (lang === 'mn' || lang === 'mn-MN' || lang === 'mn-mn') return 'mn'
  if (lang === 'hy' || lang === 'hy-AM' || lang === 'hy-am') return 'hy'
  if (lang === 'ka' || lang === 'ka-GE' || lang === 'ka-ge') return 'ka'
  if (lang === 'am' || lang === 'am-ET' || lang === 'am-et') return 'am'
  if (lang === 'ps' || lang === 'ps-AF' || lang === 'ps-af') return 'ps'
  if (lang === 'ceb' || lang === 'ceb-PH' || lang === 'ceb-ph') return 'ceb'
  if (lang === 'ilo' || lang === 'ilo-PH' || lang === 'ilo-ph') return 'ilo'
  if (lang === 'bcl' || lang === 'bcl-PH' || lang === 'bcl-ph') return 'bcl'
  if (lang === 'hak' || lang === 'hak-CN' || lang === 'hak-cn') return 'hak'
  if (lang === 'teo' || lang === 'zh-CN-teo') return 'teo'
  if (lang === 'nan' || lang === 'nan-CN' || lang === 'nan-cn' || lang === 'nan-TW' || lang === 'nan-tw')
    return 'nan'
  if (lang === 'sichuan') return 'sichuan'
  if (lang === 'cmn' || lang === 'en' || lang === 'wuu') return lang
  return undefined
}
