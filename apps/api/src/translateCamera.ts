import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { hasHan } from './canto/han.js'
import { scrubYueToCmn } from './canto/scrubCmn.js'

/** Camera / docs target languages. Prefer yue|cmn|wuu|tl; legacy `zh` maps to yue. */
export type CameraLang = 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
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
  return to === 'yue' || to === 'cmn' || to === 'wuu'
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
  const source = text.trim().slice(0, 2000)
  if (!source) return { text: '', engine: 'empty', cacheHit: true }
  if (from === to) return { text: source, engine: 'identity', cacheHit: true }

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
  if (from === to) return { translations: segments, engine: 'identity' }

  const client = openaiClient()
  if (!client) {
    return {
      translations: segments.map((s) => demoTranslation(s, to)),
      engine: 'demo',
    }
  }

  const out = [...segments]
  for (let start = 0; start < segments.length; start += BATCH_SIZE) {
    const chunk = segments.slice(start, start + BATCH_SIZE)
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
  if (lang === 'ceb' || lang === 'ceb-PH' || lang === 'ceb-ph') return 'ceb'
  if (lang === 'ilo' || lang === 'ilo-PH' || lang === 'ilo-ph') return 'ilo'
  if (lang === 'bcl' || lang === 'bcl-PH' || lang === 'bcl-ph') return 'bcl'
  if (lang === 'cmn' || lang === 'en' || lang === 'wuu') return lang
  return undefined
}
