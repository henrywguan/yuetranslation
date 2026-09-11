/**
 * Vietnamese tone-class helpers — Quốc ngữ already encodes tone via diacritics.
 * We never invent ASCII tone digits or Chao tone letters; this only classifies the
 * mark that is already written so Details can show a short tone-class chip.
 *
 * Six tones (thanh điệu): ngang (unmarked), sắc (acute), huyền (grave),
 * hỏi (hook above), ngã (tilde), nặng (dot below).
 * Vowel-quality marks (breve ă, circumflex â/ê/ô, horn ơ/ư) are NOT tones —
 * NFD decomposition keeps them as separate combining characters from the
 * tone-mark combining characters, so classification below never confuses them.
 */

export type VietnameseToneClass = 'ngang' | 'sac' | 'huyen' | 'hoi' | 'nga' | 'nang'

const COMBINING_ACUTE = '\u0301' // sắc
const COMBINING_GRAVE = '\u0300' // huyền
const COMBINING_HOOK_ABOVE = '\u0309' // hỏi
const COMBINING_TILDE = '\u0303' // ngã
const COMBINING_DOT_BELOW = '\u0323' // nặng

/** `Southern speech often merges hỏi ≈ ngã` — always show alongside tone chips. */
export const VIETNAMESE_SOUTHERN_MERGE_NOTE =
  'Southern speech often merges hỏi ≈ ngã; writing keeps all six marks.'

/** Strip surrounding punctuation so "chào?" still classifies as "chào". */
export function vietnameseBareWord(word: string): string {
  return word
    .trim()
    .replace(/^[^A-Za-zÀ-ỹĐđ]+|[^A-Za-zÀ-ỹĐđ]+$/g, '')
}

/** Classify the tone mark already present in a (possibly accented) Vietnamese word. */
export function vietnameseToneClass(word: string): VietnameseToneClass | null {
  const w = vietnameseBareWord(word)
  if (!w || !/[A-Za-zÀ-ỹĐđ]/.test(w)) return null
  const decomposed = w.normalize('NFD')
  if (decomposed.includes(COMBINING_ACUTE)) return 'sac'
  if (decomposed.includes(COMBINING_GRAVE)) return 'huyen'
  if (decomposed.includes(COMBINING_HOOK_ABOVE)) return 'hoi'
  if (decomposed.includes(COMBINING_TILDE)) return 'nga'
  if (decomposed.includes(COMBINING_DOT_BELOW)) return 'nang'
  return 'ngang'
}

export function vietnameseToneLabel(kind: VietnameseToneClass): string {
  switch (kind) {
    case 'ngang':
      return 'Ngang — mid-level (unmarked)'
    case 'sac':
      return 'Sắc — high rising'
    case 'huyen':
      return 'Huyền — low falling'
    case 'hoi':
      return 'Hỏi — dip–rise'
    case 'nga':
      return 'Ngã — rising–broken'
    case 'nang':
      return 'Nặng — low dropping, cut-off'
  }
}

export function vietnameseToneChipShort(kind: VietnameseToneClass): string {
  switch (kind) {
    case 'ngang':
      return 'Ngang'
    case 'sac':
      return 'Sắc'
    case 'huyen':
      return 'Huyền'
    case 'hoi':
      return 'Hỏi'
    case 'nga':
      return 'Ngã'
    case 'nang':
      return 'Nặng'
  }
}
