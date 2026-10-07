/**
 * Infer Japanese register from source text — no user toggle.
 * Default: colloquial everyday Japanese (共通語 / Tokyo media, natural spoken).
 * Switch to formal when the source looks official, legal, medical, or ceremonial.
 */
export type JapaneseRegister = 'colloquial' | 'formal'

const FORMAL_EN =
  /\b(dear\s+(sir|madam|ma'?am)|to whom it may concern|please be advised|hereby|pursuant(\s+to)?|respectfully yours|yours\s+(truly|sincerely)|kindly\b|application for|affidavit|notary|certificate of|complaint letter|formal request|medical certificate|employment contract|memorandum|whereas|witnesseth|under penalty|duly authorized)\b/i

const FORMAL_EN_SOFT =
  /\b(sir|ma'?am|madam)\b[\s\S]{0,40}\b(please|request|submit|attach|advise|inform)\b/i

/** Detect register from the utterance being translated (usually English → Japanese). */
export function inferJapaneseRegister(text: string): JapaneseRegister {
  const t = text.trim()
  if (!t) return 'colloquial'
  if (FORMAL_EN.test(t) || FORMAL_EN_SOFT.test(t)) return 'formal'
  return 'colloquial'
}

/** True when output looks like natural Japanese (kana and/or short kanji compounds). */
export function looksLikeJapaneseOutput(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  const hasKana = /[\u3040-\u309F\u30A0-\u30FF\uFF66-\uFF9D]/.test(t)
  if (hasKana) return true
  const kanjiOnly = t.replace(/[^\u3400-\u9FFF\uF900-\uFAFF]/g, '')
  // Short kanji compounds (出口, 東京) are valid; long Han-only lines are usually Chinese.
  return kanjiOnly.length > 0 && kanjiOnly.length <= 12
}
