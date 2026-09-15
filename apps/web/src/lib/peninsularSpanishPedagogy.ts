/**
 * Peninsular / Castilian Spanish (Spain, `eses`) register helpers for details UI.
 * Compact panes stay accented Spanish only; informal note + formalize live in details.
 * Stress classification is orthographic (RAE accent rules) and is shared with
 * Mexican Spanish — see `mexicanSpanishStress.ts`.
 */

import { spanishBareWord } from './mexicanSpanishStress'

/** Markers that usually mean the line is colloquial Peninsular Spanish, not formal. */
const INFORMAL_MARKERS = [
  'tío',
  'tio',
  'tía',
  'tia',
  'vale',
  'guay',
  'mola',
  'molar',
  'molan',
  'colega',
  'chaval',
  'chavala',
  'flipante',
  'flipa',
  'currar',
  'curro',
  'qué tal',
  'que tal',
  'vosotros',
  'vosotras',
  'tú',
  'contigo',
  'para ti',
  'te quiero',
  'nos vemos',
  'coger el',
  'coged',
]

const FORMAL_MARKERS = [
  'usted',
  'ustedes',
  'le agradezco',
  'se lo agradezco',
  'disculpe',
  'perdone',
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
    .replace(/[¿?¡!.,;:"“”''…—–-]/g, ' ')
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
  // Single-token markers (tú, vale) — word boundary via spaces after fold.
  if (!m.includes(' ') && folded.split(' ').includes(spanishBareWord(m) || m)) return true
  return folded.includes(m)
}

/**
 * Deterministic colloquial→formal polish for Peninsular Spanish.
 * Used offline and as a client fallback when the model returns empty.
 * Vosotros-aware: swaps the informal 2nd-person plural marker toward ustedes
 * register alongside the usual tío/vale/guay/mola cleanup.
 */
export function localFormalizeEses(text: string): string {
  const src = text.trim()
  if (!src) return src
  let t = src
    .replace(/qué\s+tal/gi, 'cómo está')
    .replace(/que\s+tal/gi, 'cómo está')
    .replace(/\bvale\b/gi, 'de acuerdo')
    .replace(/\bguay\b/gi, 'estupendo')
    .replace(/\bmola(n)?\b/gi, 'resulta estupendo')
    .replace(/\bvosotros\b/gi, 'ustedes')
    .replace(/\bvosotras\b/gi, 'ustedes')
    .replace(/,?\s*tío(?=[^\p{L}]|$)/giu, '')
    .replace(/,?\s*tía(?=[^\p{L}]|$)/giu, '')
    .replace(/,?\s*colega(?=[^\p{L}]|$)/giu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([?!¡¿.,;])/g, '$1')
    .trim()
  if (!/usted/i.test(t) && /cómo está/i.test(t)) {
    t = t.replace(/cómo está(?!\s+usted)/gi, 'cómo está usted')
  }
  if (!t || t.toLowerCase() === src.toLowerCase()) {
    if (/tío|tía|vale|guay|mola|colega/i.test(src)) return '¿Cómo está usted?'
    return src
  }
  if (/^¿/.test(src) && !/^¿/.test(t)) t = `¿${t.replace(/^¿\s*/, '')}`
  if (/\?\s*$/.test(src) && !/\?\s*$/.test(t)) t = `${t.replace(/\?\s*$/, '')}?`
  t = t.replace(/^¿([a-záéíóúüñ])/u, (_, c: string) => `¿${c.toUpperCase()}`)
  return t.trim()
}

/** True when the Peninsular Spanish line reads colloquial / slangy. */
export function isInformalEses(text: string): boolean {
  const folded = foldEs(text)
  if (!folded) return false
  if (INFORMAL_MARKERS.some((m) => hasMarker(folded, m))) return true
  // Soft tú object pronoun: "te " after fold (avoid matching inside longer words).
  if (/\bte\b/.test(folded) && !FORMAL_MARKERS.some((m) => hasMarker(folded, m))) {
    // "te" alone is weak; require another casual cue or 2nd-person present.
    if (/\b(estas|vas|quieres|puedes|tienes|sabes|vienes|teneis|querreis)\b/.test(folded)) {
      return true
    }
  }
  return false
}

/** True when the line already looks polite / usted-register. */
export function isFormalEses(text: string): boolean {
  const folded = foldEs(text)
  if (!folded) return false
  if (isInformalEses(text)) return false
  return FORMAL_MARKERS.some((m) => hasMarker(folded, m))
}

/** Aliases used by Details panel + store formalize. */
export const localFormalizePeninsularSpanish = localFormalizeEses
export const isInformalPeninsularSpanish = isInformalEses
export const isFormalPeninsularSpanish = isFormalEses
