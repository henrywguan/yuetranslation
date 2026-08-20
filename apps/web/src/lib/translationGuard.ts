/**
 * Shared gloss-dump detector — keep in sync with API `looksLikeGlossDump`.
 * Used client-side so panes never paint dictionary junk even if a bad payload slips through.
 */

const DEMO_RE = /^(（示範）|\(demo\))/i

const META_WORD_RE =
  /\b(question mark|full stop|exclamation mark|comma|particle|interjection|colloquial|softening|classifier|measure word|variant of|same as|see also|archaic|literary|written|greeting word|literally means|used to mean)\b/i

/** True when a string still looks like a dictionary dump, not a conversational translation. */
function looksLikeGlossDump(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (DEMO_RE.test(t)) return true
  if (/^\d+\.\s/.test(t)) return true
  if (/\[[^\]]+\]/.test(t)) return true
  // Parenthetical sense notes: "(of answering phone calls) hello"
  if (/\([^)]{2,}\)/.test(t)) return true
  if (/\s\/\s/.test(t)) return true
  // Dictionary frames: "It is a greeting word, 'hi everybody' full stop"
  if (/\bit is a\b.+\bword\b/i.test(t)) return true
  if (META_WORD_RE.test(t)) return true
  // Lemma lists joined with " / " already covered; also "foo; bar; baz" dumps
  if ((t.match(/;/g) || []).length >= 2) return true
  // Mixed "you 聽 not 聽" gloss joins
  if (/[A-Za-z]{2,}.+[一-龥].+[A-Za-z]{2,}/.test(t) && t.split(/\s+/).length >= 3) {
    return true
  }
  // Long space-joined lemma lists — but allow natural English sentences.
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length >= 6) {
    const looksSentence =
      /[.?!…]$/.test(t) ||
      (/^[A-Z]/.test(t) && words.length <= 16 && !/\s\/\s/.test(t) && (t.match(/;/g) || []).length < 2)
    if (!looksSentence) return true
  }
  return false
}

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

const HAN = /[\u3400-\u9fff\uf900-\ufaff]/

/** Reject EN→粵 payloads that never produced Cantonese characters. */
export function sanitizeYueTranslation(text: string | null | undefined): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (!HAN.test(t)) return null
  return t
}

/** Reject 粵→EN payloads that still contain Cantonese characters (source echo). */
export function sanitizeEnTranslation(
  text: string | null | undefined,
  sourceYue?: string | null,
): string | null {
  const t = sanitizeTranslationText(text)
  if (!t) return null
  if (HAN.test(t)) return null
  const src = (sourceYue || '').trim()
  if (src && t === src) return null
  return t
}
