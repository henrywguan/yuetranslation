/**
 * Infer Tamil register from source text — no user toggle.
 * Default: colloquial spoken Tamil (பேச்சுத் தமிழ், நீங்க / நீ as natural).
 * Switch to formal (respectful நீங்கள், careful standard wording) when the source looks
 * official, legal, medical, or ceremonial.
 */
export type TamilRegister = 'colloquial' | 'formal'

const FORMAL_EN =
  /\b(dear\s+(sir|madam|ma'?am)|to whom it may concern|please be advised|hereby|pursuant(\s+to)?|respectfully yours|yours\s+(truly|sincerely)|kindly\b|application for|affidavit|notary|certificate of|complaint letter|formal request|medical certificate|employment contract|memorandum|whereas|witnesseth|under penalty|duly authorized)\b/i

const FORMAL_EN_SOFT =
  /\b(sir|ma'?am|madam)\b[\s\S]{0,40}\b(please|request|submit|attach|advise|inform)\b/i

/** Detect register from the utterance being translated (usually English → Tamil). */
export function inferTamilRegister(text: string): TamilRegister {
  const t = text.trim()
  if (!t) return 'colloquial'
  if (FORMAL_EN.test(t) || FORMAL_EN_SOFT.test(t)) return 'formal'
  return 'colloquial'
}

/** Tamil block (U+0B80–U+0BFF). */
export const TAMIL_SCRIPT_RE = /[\u0B80-\u0BFF]/

export function hasTamilScript(s: string): boolean {
  return TAMIL_SCRIPT_RE.test(s)
}
