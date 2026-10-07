/**
 * Infer Javanese speech-level target from source text — no user toggle.
 * Default: ngoko (colloquial Basa Jawa) for casual English.
 * Switch to respectful (madya/krama-leaning) when the source looks official,
 * legal, medical, or ceremonial.
 */
export type JavaneseRegister = 'ngoko' | 'respectful'

const FORMAL_EN =
  /\b(dear\s+(sir|madam|ma'?am)|to whom it may concern|please be advised|hereby|pursuant(\s+to)?|respectfully yours|yours\s+(truly|sincerely)|kindly\b|application for|affidavit|notary|certificate of|complaint letter|formal request|medical certificate|employment contract|memorandum|whereas|witnesseth|under penalty|duly authorized)\b/i

const FORMAL_EN_SOFT =
  /\b(sir|ma'?am|madam)\b[\s\S]{0,40}\b(please|request|submit|attach|advise|inform)\b/i

/** Detect register from the utterance being translated (usually English → Javanese). */
export function inferJavaneseRegister(text: string): JavaneseRegister {
  const t = text.trim()
  if (!t) return 'ngoko'
  if (FORMAL_EN.test(t) || FORMAL_EN_SOFT.test(t)) return 'respectful'
  return 'ngoko'
}
