/**
 * Tagalog pronunciation helpers — stress + final glottal (not tones).
 * Everyday writing omits diacritics; dictionary form marks them on the final vowel.
 */
export type TagalogStressClass = 'malumay' | 'mabilis' | 'malumi' | 'maragsa'

const ACUTE = /[áéíóúÁÉÍÓÚ]/
const GRAVE = /[àèìòùÀÈÌÒÙ]/
const CIRC = /[âêîôûÂÊÎÔÛ]/

/** Infer stress/glottal class from a dictionary-accented Tagalog word. */
export function tagalogStressClass(word: string): TagalogStressClass | null {
  const w = word.trim()
  if (!w) return null
  if (CIRC.test(w)) return 'maragsa'
  if (GRAVE.test(w)) return 'malumi'
  if (ACUTE.test(w)) return 'mabilis'
  if (/^[A-Za-zÑñ'\-]+$/.test(w)) return 'malumay'
  return null
}

export function tagalogStressLabel(kind: TagalogStressClass): string {
  switch (kind) {
    case 'malumay':
      return 'Penult stress'
    case 'mabilis':
      return 'Final stress'
    case 'malumi':
      return 'Penult stress + glottal'
    case 'maragsa':
      return 'Final stress + glottal'
  }
}
