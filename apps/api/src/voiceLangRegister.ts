/**
 * Infer target register from the (usually English) source — no user toggle.
 * Default: colloquial everyday speech with the familiar / natural address form.
 * Switch to formal (respectful address, careful wording) when the source looks
 * official, legal, medical, or ceremonial. Shared by the Batch 2 voice langs
 * (te / gu / kn / pl / ro / cs / el / hu / sv / ru / uk / he / fa / ur); each
 * language module decides what "formal" means for its own address system.
 */
export type SourceRegister = 'colloquial' | 'formal'

const FORMAL_EN =
  /\b(dear\s+(sir|madam|ma'?am)|to whom it may concern|please be advised|hereby|pursuant(\s+to)?|respectfully yours|yours\s+(truly|sincerely)|kindly\b|application for|affidavit|notary|certificate of|complaint letter|formal request|medical certificate|employment contract|memorandum|whereas|witnesseth|under penalty|duly authorized)\b/i

const FORMAL_EN_SOFT =
  /\b(sir|ma'?am|madam)\b[\s\S]{0,40}\b(please|request|submit|attach|advise|inform)\b/i

export function inferSourceRegister(text: string): SourceRegister {
  const t = text.trim()
  if (!t) return 'colloquial'
  if (FORMAL_EN.test(t) || FORMAL_EN_SOFT.test(t)) return 'formal'
  return 'colloquial'
}

/** Telugu block (U+0C00–U+0C7F). */
export const TELUGU_SCRIPT_RE = /[\u0C00-\u0C7F]/
/** Gujarati block (U+0A80–U+0AFF). */
export const GUJARATI_SCRIPT_RE = /[\u0A80-\u0AFF]/
/** Kannada block (U+0C80–U+0CFF). */
export const KANNADA_SCRIPT_RE = /[\u0C80-\u0CFF]/
/** Greek + Greek Extended (monotonic output expected; polytonic tolerated). */
export const GREEK_SCRIPT_RE = /[\u0370-\u03FF\u1F00-\u1FFF]/
export const CYRILLIC_SCRIPT_RE = /[\u0400-\u04FF]/
/** Letters Russian has and Ukrainian does not — a Ukrainian line containing them is Russian. */
export const RUSSIAN_ONLY_RE = /[ЫыЭэЪъЁё]/
/** Letters Ukrainian has and Russian does not. */
export const UKRAINIAN_ONLY_RE = /[ІіЇїЄєҐґ]/
export const HEBREW_SCRIPT_RE = /[\u0590-\u05FF]/
export const ARABIC_SCRIPT_RE = /[\u0600-\u06FF]/
/** Urdu-only letters (ٹ ڈ ڑ ں ے ۓ ھ) — a Persian line containing them is Urdu. */
export const URDU_ONLY_RE = /[\u0679\u0688\u0691\u06BA\u06D2\u06D3\u06BE]/
export const DEVANAGARI_RE = /[\u0900-\u097F]/
/** Other Indic blocks a Telugu / Gujarati / Kannada line must not fall back to. */
export const TAMIL_BENGALI_DEVANAGARI_RE = /[\u0900-\u09FF\u0B80-\u0BFF]/
