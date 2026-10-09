/**
 * Infer English-source register for Arabic targets — no user toggle.
 * Egyptian (`ar`) stays colloquial عامية either way; `formal` only shifts it to polite
 * Egyptian address (حضرتك / لو سمحت), never to فصحى.
 * MSA (`arsa`) is always فصحى; `formal` pushes it to official written style.
 */
export type ArabicRegister = 'colloquial' | 'formal'

const FORMAL_EN =
  /\b(dear\s+(sir|madam|ma'?am)|to whom it may concern|please be advised|hereby|pursuant(\s+to)?|respectfully yours|yours\s+(truly|sincerely)|kindly\b|application for|affidavit|notary|certificate of|complaint letter|formal request|medical certificate|employment contract|memorandum|whereas|witnesseth|under penalty|duly authorized|ministry of|official notice)\b/i

const FORMAL_EN_SOFT =
  /\b(sir|ma'?am|madam)\b[\s\S]{0,40}\b(please|request|submit|attach|advise|inform)\b/i

export function inferArabicRegister(text: string): ArabicRegister {
  const t = text.trim()
  if (!t) return 'colloquial'
  if (FORMAL_EN.test(t) || FORMAL_EN_SOFT.test(t)) return 'formal'
  return 'colloquial'
}

/** Arabic block (U+0600–U+06FF) — covers Egyptian and MSA orthography. */
export const ARABIC_SCRIPT_RE = /[\u0600-\u06FF]/

export function hasArabicScript(s: string): boolean {
  return ARABIC_SCRIPT_RE.test(s)
}
