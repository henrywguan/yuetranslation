/**
 * Arabic Details helpers — Egyptian colloquial (`ar`, ar-EG) vs Modern Standard (`arsa`, ar-SA).
 * Compact panes stay Arabic script only (RTL) — no IPA, Chao, tone, or register chips.
 * The two variants never share honesty copy: Egyptian is spoken Masri, MSA is formal written Arabic.
 */

export type ArabicVariant = 'ar' | 'arsa'

export const EGYPTIAN_ARABIC_HONESTY_NOTE =
  'Egyptian Arabic (Masri) is a spoken variety — spelling is informal and varies; ج is usually said as hard g, and ق often as a glottal stop.'

export const MSA_HONESTY_NOTE =
  'Modern Standard Arabic (Fusha) is the formal written standard — news, signs, and documents; everyday speech in each country is a local dialect.'

export const ARABIC_DIACRITIC_NOTE =
  'Short vowels (tashkeel) are shown here; most everyday Arabic text leaves them out.'

/** Harakat, tanwin, shadda, sukun, dagger alif. Tatweel (U+0640) is not a vowel mark. */
const TASHKEEL_RE = /[\u064B-\u0652\u0670]/u

export function arabicHonestyNote(variant: ArabicVariant): string {
  return variant === 'ar' ? EGYPTIAN_ARABIC_HONESTY_NOTE : MSA_HONESTY_NOTE
}

export function arabicHtmlLang(variant: ArabicVariant): 'ar-EG' | 'ar-SA' {
  return variant === 'ar' ? 'ar-EG' : 'ar-SA'
}

export function hasTashkeel(text: string): boolean {
  return TASHKEEL_RE.test(text)
}
