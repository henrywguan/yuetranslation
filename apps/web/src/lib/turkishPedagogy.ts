/**
 * Turkish Details helpers — sen / siz address + vowel-harmony honesty.
 * Compact panes stay Turkish orthography only (no IPA / Chao / tone digits).
 */

export type TurkishAddress = 'sen' | 'siz' | 'mixed'

export const TURKISH_HONESTY_NOTE =
  'Turkish suffixes follow vowel harmony (ev → evler, kitap → kitaplar); dotless ı and dotted i are different letters (I / İ in capitals). Spelling is close to speech; Turkish is not tonal.'

/** Turkish-aware lowercasing: I → ı, İ → i (never the English default). */
export function turkishLower(s: string): string {
  return s.normalize('NFC').toLocaleLowerCase('tr-TR')
}

/** Turkish-aware uppercasing: i → İ, ı → I. */
export function turkishUpper(s: string): string {
  return s.normalize('NFC').toLocaleUpperCase('tr-TR')
}

const L = '\\p{L}'
const word = (body: string) => new RegExp(`(?<![${L}])(?:${body})(?![${L}])`, 'u')

const SIZ_PRONOUN = word('siz|sizin|size|sizi|sizde|sizden|sizinle|sizler')
const SIZ_VERB = /(?:s[iıuü]n[iıuü]z)(?![\p{L}])/u
const SEN_PRONOUN = word('sen|senin|sana|seni|sende|senden|seninle')
/** Only unambiguous 2sg cues — bare -sin / -sun also ends 3sg optatives (olsun, gelsin). */
const SEN_VERB = word('nasılsın|m[iıuü]s[iıuü]n')

function foldTr(s: string): string {
  return turkishLower(s)
    .replace(/[«»„""''…—–-]/g, ' ')
    .replace(/[?!.,;:()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Best-effort sen / siz detection for Details chips. */
export function detectTurkishAddress(text: string): TurkishAddress | null {
  const t = foldTr(text)
  if (!t || !/\p{L}/u.test(t)) return null
  const hasSiz = SIZ_PRONOUN.test(t) || SIZ_VERB.test(t)
  const hasSen = SEN_PRONOUN.test(t) || (!hasSiz && SEN_VERB.test(t))
  if (hasSen && hasSiz) return 'mixed'
  if (hasSiz) return 'siz'
  if (hasSen) return 'sen'
  return null
}

export function turkishAddressLabel(kind: TurkishAddress): string {
  switch (kind) {
    case 'sen':
      return 'sen (informal)'
    case 'siz':
      return 'siz (formal / plural)'
    case 'mixed':
      return 'sen + siz'
  }
}

export function turkishAddressChip(kind: TurkishAddress): string {
  switch (kind) {
    case 'sen':
      return 'sen'
    case 'siz':
      return 'siz'
    case 'mixed':
      return 'sen / siz'
  }
}

const VOWELS = 'aeıioöuü'

/**
 * Suffix vowels the last vowel of `stem` selects: two-fold (e / a, as in -ler / -lar)
 * and four-fold (i / ı / u / ü, as in -im / -ım / -um / -üm). Null when no vowel.
 * Loanwords that break harmony (saat → saatler) are not special-cased.
 */
export function turkishHarmony(stem: string): { twoFold: 'e' | 'a'; fourFold: 'i' | 'ı' | 'u' | 'ü' } | null {
  const w = turkishLower(stem)
  let last: string | null = null
  for (const ch of w) if (VOWELS.includes(ch)) last = ch
  if (!last) return null
  const front = 'eiöü'.includes(last)
  const rounded = 'oöuü'.includes(last)
  return {
    twoFold: front ? 'e' : 'a',
    fourFold: front ? (rounded ? 'ü' : 'i') : rounded ? 'u' : 'ı',
  }
}
