/**
 * Infer Bengali register from source text — no user toggle.
 * Default: colloquial Standard Colloquial Bengali (চলিত বাংলা, তুমি / আপনি as natural).
 * Switch to formal (respectful আপনি, careful wording — still চলিত, not সাধু) when the source
 * looks official, legal, medical, or ceremonial.
 */
export type BengaliRegister = 'colloquial' | 'formal'

const FORMAL_EN =
  /\b(dear\s+(sir|madam|ma'?am)|to whom it may concern|please be advised|hereby|pursuant(\s+to)?|respectfully yours|yours\s+(truly|sincerely)|kindly\b|application for|affidavit|notary|certificate of|complaint letter|formal request|medical certificate|employment contract|memorandum|whereas|witnesseth|under penalty|duly authorized)\b/i

const FORMAL_EN_SOFT =
  /\b(sir|ma'?am|madam)\b[\s\S]{0,40}\b(please|request|submit|attach|advise|inform)\b/i

/** Detect register from the utterance being translated (usually English → Bengali). */
export function inferBengaliRegister(text: string): BengaliRegister {
  const t = text.trim()
  if (!t) return 'colloquial'
  if (FORMAL_EN.test(t) || FORMAL_EN_SOFT.test(t)) return 'formal'
  return 'colloquial'
}

/** Bengali–Assamese block (U+0980–U+09FF). Devanagari is NOT accepted. */
export const BENGALI_SCRIPT_RE = /[\u0980-\u09FF]/

export function hasBengaliScript(s: string): boolean {
  return BENGALI_SCRIPT_RE.test(s)
}
