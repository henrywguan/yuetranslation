/**
 * Mexican Spanish register helpers for details UI.
 * Compact panes stay accented Spanish only; informal note + formalize live in details.
 */

import { spanishBareWord } from './mexicanSpanishStress'

/** Markers that usually mean the line is colloquial / slangy, not formal. */
const INFORMAL_MARKERS = [
  'órale',
  'orale',
  'ahorita',
  'qué onda',
  'que onda',
  'no manches',
  'güey',
  'guey',
  'wey',
  'chido',
  'qué padre',
  'que padre',
  'ándale',
  'andale',
  'neta',
  'chamba',
  'pedo',
  'sale pues',
  '¿qué tal?',
  'que tal',
  'cómo andas',
  'como andas',
  'tú',
  'contigo',
  'para ti',
  'te quiero',
  'nos vemos',
]

const FORMAL_MARKERS = [
  'usted',
  'ustedes',
  'le agradezco',
  'se lo agradezco',
  'disculpe',
  'perdóneme',
  'perdoneme',
  'permítame',
  'permitame',
  'me gustaría',
  'quisiera',
  'por favor tenga',
  'estimado',
  'estimada',
  'atentamente',
]

function foldEs(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:"""''…—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasMarker(folded: string, marker: string): boolean {
  const m = foldEs(marker)
  if (!m) return false
  if (folded === m) return true
  if (folded.startsWith(`${m} `) || folded.endsWith(` ${m}`) || folded.includes(` ${m} `)) {
    return true
  }
  // Single-token markers (tú, usted) — word boundary via spaces after fold.
  if (!m.includes(' ') && folded.split(' ').includes(spanishBareWord(m) || m)) return true
  return folded.includes(m)
}

/** True when the Mexican Spanish line reads colloquial / slangy. */
export function isInformalMexicanSpanish(text: string): boolean {
  const folded = foldEs(text)
  if (!folded) return false
  if (INFORMAL_MARKERS.some((m) => hasMarker(folded, m))) return true
  // Soft tú object pronoun: "te " after fold (avoid matching inside longer words).
  if (/\bte\b/.test(folded) && !FORMAL_MARKERS.some((m) => hasMarker(folded, m))) {
    // "te" alone is weak; require another casual cue or 2nd-person present.
    if (/\b(estas|estas|vas|quieres|puedes|tienes|sabes|vienes)\b/.test(folded)) return true
  }
  return false
}

/** True when the line already looks polite / usted-register. */
export function isFormalMexicanSpanish(text: string): boolean {
  const folded = foldEs(text)
  if (!folded) return false
  if (isInformalMexicanSpanish(text)) return false
  return FORMAL_MARKERS.some((m) => hasMarker(folded, m))
}
