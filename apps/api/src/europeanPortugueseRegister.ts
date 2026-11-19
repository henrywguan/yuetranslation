/**
 * Infer European Portuguese register from source text — no user toggle.
 * Default: colloquial everyday European Portuguese (Portugal / pt-PT; tu between peers).
 * Switch to formal (o senhor / a senhora, careful wording) when the source looks
 * official, legal, medical, or ceremonial. Never Brazilian Portuguese (`pt`).
 */
export type EuropeanPortugueseRegister = 'colloquial' | 'formal'

const FORMAL_EN =
  /\b(dear\s+(sir|madam|ma'?am)|to whom it may concern|please be advised|hereby|pursuant(\s+to)?|respectfully yours|yours\s+(truly|sincerely)|kindly\b|application for|affidavit|notary|certificate of|complaint letter|formal request|medical certificate|employment contract|memorandum|whereas|witnesseth|under penalty|duly authorized)\b/i

const FORMAL_EN_SOFT =
  /\b(sir|ma'?am|madam)\b[\s\S]{0,40}\b(please|request|submit|attach|advise|inform)\b/i

/** Detect register from the utterance being translated (usually English → European Portuguese). */
export function inferEuropeanPortugueseRegister(text: string): EuropeanPortugueseRegister {
  const t = text.trim()
  if (!t) return 'colloquial'
  if (FORMAL_EN.test(t) || FORMAL_EN_SOFT.test(t)) return 'formal'
  return 'colloquial'
}
