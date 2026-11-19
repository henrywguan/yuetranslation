/**
 * Infer target register from the (usually English) source — no user toggle.
 * Default: colloquial everyday speech with the familiar / natural address form.
 * Switch to formal (respectful address, careful wording) when the source looks
 * official, legal, medical, or ceremonial. Shared by the Batch 2 voice langs
 * (te / gu / kn / pl / ro / cs / el / hu / sv / ru / uk / he / fa / ur) and
 * Batch 3a (ml / mr / pa / or / si / ne / da / nb / fi / sk / hr / ca) and
 * Batch 3b (az / kk / uz / bg / sr / sw / af) and Batch 4 (et / lv / lt / ga / cy / eu / gl / mt / is /
 * bs / sq / zu / so / as / mk / mn / hy / ka / am / ps); each
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

/** Malayalam block (U+0D00–U+0D7F). */
export const MALAYALAM_SCRIPT_RE = /[\u0D00-\u0D7F]/
/** Gurmukhi (Punjabi) block (U+0A00–U+0A7F). */
export const GURMUKHI_SCRIPT_RE = /[\u0A00-\u0A7F]/
/** Odia block (U+0B00–U+0B7F). */
export const ODIA_SCRIPT_RE = /[\u0B00-\u0B7F]/
/** Sinhala block (U+0D80–U+0DFF). */
export const SINHALA_SCRIPT_RE = /[\u0D80-\u0DFF]/

const INDIC_BLOCKS = {
  devanagari: '\\u0900-\\u097F',
  bengali: '\\u0980-\\u09FF',
  gurmukhi: '\\u0A00-\\u0A7F',
  gujarati: '\\u0A80-\\u0AFF',
  odia: '\\u0B00-\\u0B7F',
  tamil: '\\u0B80-\\u0BFF',
  telugu: '\\u0C00-\\u0C7F',
  kannada: '\\u0C80-\\u0CFF',
  malayalam: '\\u0D00-\\u0D7F',
  sinhala: '\\u0D80-\\u0DFF',
} as const

export type IndicBlock = keyof typeof INDIC_BLOCKS

/**
 * Every Indic block except `own` — Batch 3a Indic langs reject output that falls back to a
 * neighbouring script. Marathi / Nepali share Devanagari with Hindi, so script alone cannot
 * tell them apart; their prompts carry that distinction.
 */
export function rejectOtherIndic(own: IndicBlock): RegExp {
  const ranges = (Object.keys(INDIC_BLOCKS) as IndicBlock[])
    .filter((k) => k !== own)
    .map((k) => INDIC_BLOCKS[k])
    .join('')
  return new RegExp(`[${ranges}]`)
}

/** Cyrillic or Arabic script — Latin-script Azerbaijani / Uzbek output must contain neither. */
export const CYRILLIC_OR_ARABIC_RE = /[\u0400-\u04FF\u0600-\u06FF]/
/** Russian-only ы э ъ ё щ — Serbian Cyrillic never uses them. */
export const SERBIAN_REJECT_RE = /[ЫыЭэЪъЁёЩщ]/
/** Serbian / Macedonian ђ ј љ њ ћ џ and Russian-only ы э ё — Bulgarian Cyrillic uses none of them. */
export const BULGARIAN_REJECT_RE = /[ЫыЭэЁёЂђЈјЉљЊњЋћЏџ]/
/** Ukrainian ї є ґ and Serbian ђ ј љ њ ћ џ — Kazakh Cyrillic uses none of them. */
export const KAZAKH_REJECT_RE = /[ЇїЄєҐґЂђЈјЉљЊњЋћЏџ]/

/** Bengali-Assamese block (U+0980–U+09FF) — includes Assamese ৰ (U+09F0) and ৱ (U+09F1). */
export const BENGALI_ASSAMESE_SCRIPT_RE = /[\u0980-\u09FF]/
/**
 * Other Indic blocks, Cyrillic and Arabic — an Assamese line must stay in Bengali-Assamese script.
 * Excludes U+0964 / U+0965 (danda / double danda), which Assamese uses as its full stop.
 */
export const ASSAMESE_REJECT_RE = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u0963\u0966-\u097F\u0A00-\u0DFF]/
/** Bulgarian ъ щ ю я, Serbian ђ ћ, Russian ы э ё, Ukrainian ї є ґ — Macedonian Cyrillic uses none of them. */
export const MACEDONIAN_REJECT_RE = /[ЫыЭэЪъЁёЩщЬьЮюЯяЂђЋћЇїЄєҐґ]/
/** Kazakh ә ғ қ ң ұ һ і, Ukrainian ї є ґ, Serbian ђ ј љ њ ћ џ and traditional Mongol script — Khalkha Cyrillic uses none. */
export const MONGOLIAN_REJECT_RE = /[ӘәҒғҚқҢңҰұҺһІіЇїЄєҐґЂђЈјЉљЊњЋћЏџ\u1800-\u18AF]/
/** Armenian block incl. punctuation (U+0530–U+058F). */
export const ARMENIAN_SCRIPT_RE = /[\u0530-\u058F]/
/** Cyrillic, Georgian, Arabic, Hebrew — an Armenian line contains none. */
export const ARMENIAN_REJECT_RE = /[\u0400-\u04FF\u0590-\u06FF\u10A0-\u10FF\u1C90-\u1CBF]/
/** Georgian Mkhedruli / Asomtavruli / Mtavruli / Nuskhuri. */
export const GEORGIAN_SCRIPT_RE = /[\u10A0-\u10FF\u1C90-\u1CBF\u2D00-\u2D2F]/
/** Cyrillic, Armenian, Arabic, Hebrew — a Georgian line contains none. */
export const GEORGIAN_REJECT_RE = /[\u0400-\u04FF\u0530-\u058F\u0590-\u06FF]/
/** Ethiopic, Ethiopic Supplement / Extended (Amharic fidel). */
export const ETHIOPIC_SCRIPT_RE = /[\u1200-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/
/** Cyrillic, Arabic, Hebrew, Armenian, Georgian — an Amharic line contains none. */
export const ETHIOPIC_REJECT_RE = /[\u0400-\u04FF\u0530-\u06FF\u10A0-\u10FF]/
