/**
 * Brazilian Portuguese stress helpers — lexical stress via orthographic accent.
 * Not a tone language: no Cantonese/Wu-style tone digits.
 *
 * Classification follows Portuguese accentuation defaults when no written accent
 * (acute / circumflex) is present. Tilde marks nasality, not stress class alone.
 */

export type BrazilianStressClass = 'oxitona' | 'paroxitona' | 'proparoxitona'

const STRESS_MARK = /[áéíóúâêôÁÉÍÓÚÂÊÔ]/
const VOWEL = /[aeiouáàâãéêíóôõúüAEIOUÁÀÂÃÉÊÍÓÔÕÚÜ]/

/** Strip edge punctuation so "Olá?" still classifies. */
export function portugueseBareWord(word: string): string {
  return word.trim().replace(/^[^A-Za-zÀ-ÿÜüÇç]+|[^A-Za-zÀ-ÿÜüÇç]+$/g, '')
}

function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Split into orthographic syllables (simple Portuguese heuristic). */
export function portugueseSyllables(word: string): string[] {
  const w = portugueseBareWord(word)
  if (!w) return []
  const lower = w.toLowerCase()
  const chars = [...lower]
  const breaks: number[] = []
  let i = 0
  while (i < chars.length) {
    if (!VOWEL.test(chars[i]!)) {
      i += 1
      continue
    }
    let j = i + 1
    while (j < chars.length && VOWEL.test(chars[j]!)) j += 1
    let k = j
    while (k < chars.length && !VOWEL.test(chars[k]!)) k += 1
    if (k < chars.length) {
      const cons = k - j
      const keep = cons >= 2 ? j + (cons - 1) : j
      if (keep > 0 && keep < chars.length) breaks.push(keep)
    }
    i = j
  }
  if (!breaks.length) return [w]
  const out: string[] = []
  let start = 0
  for (const b of breaks) {
    out.push(w.slice(start, b))
    start = b
  }
  out.push(w.slice(start))
  return out.filter(Boolean)
}

function stressedSyllableIndex(word: string): number | null {
  const syls = portugueseSyllables(word)
  if (!syls.length) return null
  const accentIdx = syls.findIndex((s) => STRESS_MARK.test(s))
  if (accentIdx >= 0) return accentIdx

  const bare = stripAccents(portugueseBareWord(word))
  const n = syls.length
  if (n <= 1) return 0
  // Default (unmarked): ends in a/e/o (+s) or em/ens → paroxítona; else oxítona.
  if (/(?:[aeo]s?|em|ens)$/i.test(bare)) return n - 2
  return n - 1
}

/** Infer stress class from a (possibly accented) Portuguese word. */
export function brazilianStressClass(word: string): BrazilianStressClass | null {
  const w = portugueseBareWord(word)
  if (!w || !/[A-Za-zÀ-ÿÜüÇç]/.test(w)) return null
  const syls = portugueseSyllables(w)
  if (!syls.length) return null
  const idx = stressedSyllableIndex(w)
  if (idx == null) return null
  const fromEnd = syls.length - 1 - idx
  if (fromEnd <= 0) return 'oxitona'
  if (fromEnd === 1) return 'paroxitona'
  return 'proparoxitona'
}

export function brazilianStressLabel(kind: BrazilianStressClass): string {
  switch (kind) {
    case 'oxitona':
      return 'Final stress (oxítona)'
    case 'paroxitona':
      return 'Penult stress (paroxítona)'
    case 'proparoxitona':
      return 'Antepenult stress (proparoxítona)'
  }
}

export function brazilianStressChipShort(kind: BrazilianStressClass): string {
  switch (kind) {
    case 'oxitona':
      return 'Final'
    case 'paroxitona':
      return 'Penult'
    case 'proparoxitona':
      return 'Antepenult'
  }
}
