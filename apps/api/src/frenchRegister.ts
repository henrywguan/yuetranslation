/**
 * Infer French register from source text — no user toggle.
 * Default: colloquial Metropolitan French (France / fr-FR).
 * Switch to formal (vous / more careful) when the source looks official,
 * legal, medical, or ceremonial.
 */
export type FrenchRegister = 'colloquial' | 'formal'

const FORMAL_EN =
  /\b(dear\s+(sir|madam|ma'?am)|to whom it may concern|please be advised|hereby|pursuant(\s+to)?|respectfully yours|yours\s+(truly|sincerely)|kindly\b|application for|affidavit|notary|certificate of|complaint letter|formal request|medical certificate|employment contract|memorandum|whereas|witnesseth|under penalty|duly authorized)\b/i

const FORMAL_EN_SOFT =
  /\b(sir|ma'?am|madam)\b[\s\S]{0,40}\b(please|request|submit|attach|advise|inform)\b/i

/** Detect register from the utterance being translated (usually English → French). */
export function inferFrenchRegister(text: string): FrenchRegister {
  const t = text.trim()
  if (!t) return 'colloquial'
  if (FORMAL_EN.test(t) || FORMAL_EN_SOFT.test(t)) return 'formal'
  return 'colloquial'
}
