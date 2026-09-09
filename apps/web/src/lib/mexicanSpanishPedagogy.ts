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

/**
 * Deterministic colloquial→formal polish for Mexican Spanish.
 * Used offline and as a client fallback when the model returns empty.
 */
export function localFormalizeMexicanSpanish(text: string): string {
  const src = text.trim()
  if (!src) return src
  let t = src
    .replace(/qué\s+onda/gi, 'cómo está')
    .replace(/que\s+onda/gi, 'cómo está')
    .replace(/cómo\s+andas/gi, 'cómo está')
    .replace(/como\s+andas/gi, 'cómo está')
    .replace(/no manches/gi, 'no puede ser')
    .replace(/órale/gi, 'de acuerdo')
    .replace(/orale/gi, 'de acuerdo')
    .replace(/güey/gi, '')
    .replace(/(^|[^\p{L}])wey(?=[^\p{L}]|$)/giu, '$1')
    .replace(/,?\s*hermano(?=[^\p{L}]|$)/giu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([?!¡¿.,;])/g, '$1')
    .trim()
  if (!/usted/i.test(t) && /cómo está/i.test(t)) {
    t = t.replace(/cómo está(?!\s+usted)/gi, 'cómo está usted')
  }
  if (!t || t.toLowerCase() === src.toLowerCase()) {
    if (/onda|hermano|güey|wey/i.test(src)) return '¿Cómo está usted?'
    return src
  }
  if (/^¿/.test(src) && !/^¿/.test(t)) t = `¿${t.replace(/^¿\s*/, '')}`
  if (/\?\s*$/.test(src) && !/\?\s*$/.test(t)) t = `${t.replace(/\?\s*$/, '')}?`
  t = t.replace(/^¿([a-záéíóúüñ])/u, (_, c: string) => `¿${c.toUpperCase()}`)
  return t.trim()
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
