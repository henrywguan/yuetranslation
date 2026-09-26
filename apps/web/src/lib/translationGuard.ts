/**
 * Client-side translation sanitizers — gloss-dump detection lives in `@jyut/shared`.
 */
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './charGloss'

/**
 * Accept only clean translation text for pane display.
 * Returns null when the string must not be shown as a translation.
 */
function sanitizeTranslationText(text: string | null | undefined): string | null {
  const t = (text || '').trim()
  if (!t) return null
  if (looksLikeGlossDump(t)) return null
  return t
}

/** Reject EN→粵 payloads that never produced Cantonese characters. */
export function sanitizeYueTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (!hasHan(t)) return null
  return t
}

/** Reject 粵→EN payloads that still contain Cantonese characters (source echo). */
export function sanitizeEnTranslation(
  text: string | null | undefined,
  sourceYue?: string | null,
): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  const src = (sourceYue || '').trim()
  if (src && t === src) return null
  return t
}


/** Reject EN→Tagalog payloads that are empty, glossy, or still Chinese. */
export function sanitizeTlTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\p{L}]/u.test(t)) return null
  return t
}


/** Reject EN→Mexican Spanish payloads that are empty, glossy, or still Chinese. */
export function sanitizeEsTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\p{L}]/u.test(t)) return null
  return t
}

/** Reject EN→Vietnamese payloads that are empty, glossy, or still Chinese. */
export function sanitizeViTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\p{L}]/u.test(t)) return null
  return t
}

/** Reject EN→Thai payloads that are empty, glossy, Han, or missing Thai script. */
export function sanitizeThTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u0E00-\u0E7F]/.test(t)) return null
  return t
}

/** Reject EN→Lao payloads that are empty, glossy, Han, or missing Lao script. */
export function sanitizeLoTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (hasHan(t)) return null
  if (!/[\u0E80-\u0EFF]/.test(t)) return null
  return t
}

/** Reject EN→Cebuano / Ilocano / Central Bikol Latin payloads that are empty, glossy, or still Chinese. */
export function sanitizeCebTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeIloTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}

export function sanitizeBclTranslation(text: string | null | undefined): string | null {
  return sanitizeViTranslation(text)
}
