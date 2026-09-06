/**
 * Mexican Spanish stress helpers — lexical stress via orthographic accent (tilde).
 * Not a tone language: no Cantonese/Wu-style tone digits.
 *
 * Classification follows RAE accentuation defaults when no written accent is present.
 */

export type MexicanStressClass = 'aguda' | 'llana' | 'esdrujula' | 'sobreesdrujula'

const ACUTE = /[áéíóúÁÉÍÓÚ]/
const VOWEL = /[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/

/** Strip edge punctuation so "¿Cómo?" still classifies. */
export function spanishBareWord(word: string): string {
  return word.trim().replace(/^[^A-Za-zÀ-ÿÜüÑñ]+|[^A-Za-zÀ-ÿÜüÑñ]+$/g, '')
}

function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Split into orthographic syllables (simple Spanish heuristic). */
export function spanishSyllables(word: string): string[] {
  const w = spanishBareWord(word)
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
    // Skip diphthong / triphthong nuclei loosely (vowel clusters = one nucleus).
    let j = i + 1
    while (j < chars.length && VOWEL.test(chars[j]!)) j += 1
    // Look ahead for next vowel; consonants between go with following syllable
    // except one coda when next onset needs it — keep a lightweight CV split.
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
  const syls = spanishSyllables(word)
  if (!syls.length) return null
  const accentIdx = syls.findIndex((s) => ACUTE.test(s))
  if (accentIdx >= 0) return accentIdx

  const bare = stripAccents(spanishBareWord(word))
  const n = syls.length
  if (n <= 1) return 0
  // Default: ends in vowel, n, or s → llana (penult); else aguda (final).
  if (/[aeiouuns]$/i.test(bare)) return n - 2
  return n - 1
}

/** Infer stress class from a (possibly accented) Spanish word. */
export function mexicanStressClass(word: string): MexicanStressClass | null {
  const w = spanishBareWord(word)
  if (!w || !/[A-Za-zÀ-ÿÜüÑñ]/.test(w)) return null
  const syls = spanishSyllables(w)
  if (!syls.length) return null
  const idx = stressedSyllableIndex(w)
  if (idx == null) return null
  const fromEnd = syls.length - 1 - idx
  if (fromEnd <= 0) return 'aguda'
  if (fromEnd === 1) return 'llana'
  if (fromEnd === 2) return 'esdrujula'
  return 'sobreesdrujula'
}

export function mexicanStressLabel(kind: MexicanStressClass): string {
  switch (kind) {
    case 'aguda':
      return 'Final stress (aguda)'
    case 'llana':
      return 'Penult stress (llana)'
    case 'esdrujula':
      return 'Antepenult stress (esdrújula)'
    case 'sobreesdrujula':
      return 'Pre-antepenult stress (sobreesdrújula)'
  }
}

export function mexicanStressChipShort(kind: MexicanStressClass): string {
  switch (kind) {
    case 'aguda':
      return 'Final'
    case 'llana':
      return 'Penult'
    case 'esdrujula':
      return 'Antepenult'
    case 'sobreesdrujula':
      return 'Pre-antepenult'
  }
}
