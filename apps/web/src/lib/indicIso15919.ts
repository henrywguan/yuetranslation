/**
 * Optional ISO 15919 reading for Telugu / Gujarati / Kannada Details.
 * Compact UI stays native script only — no Latin dump on every line.
 *
 * The three Unicode blocks share the Brahmic offset layout (vowels 0x05–0x14,
 * consonants 0x15–0x39, signs 0x3E–0x4C, virama 0x4D), so one table keyed by
 * offset covers all of them. Telugu / Kannada distinguish short e / o from
 * long ē / ō; Gujarati has only e / o plus candra ê / ô.
 * Follows spelling (Gujarati final-a deletion is not modelled). Learner aid, not phonetics.
 */

export type IndicIsoLang = 'te' | 'gu' | 'kn'

const BASE: Record<IndicIsoLang, number> = { te: 0x0c00, gu: 0x0a80, kn: 0x0c80 }

const SCRIPT_RE: Record<IndicIsoLang, RegExp> = {
  te: /[\u0C00-\u0C7F]/,
  gu: /[\u0A80-\u0AFF]/,
  kn: /[\u0C80-\u0CFF]/,
}

const SHARED_VOWEL: Record<number, string> = {
  0x05: 'a',
  0x06: 'ā',
  0x07: 'i',
  0x08: 'ī',
  0x09: 'u',
  0x0a: 'ū',
  0x0b: 'r̥',
  0x0c: 'l̥',
  0x10: 'ai',
  0x14: 'au',
  0x60: 'r̥̄',
  0x61: 'l̥̄',
}

const DRAVIDIAN_VOWEL: Record<number, string> = { 0x0e: 'e', 0x0f: 'ē', 0x12: 'o', 0x13: 'ō' }
const GUJARATI_VOWEL: Record<number, string> = { 0x0d: 'ê', 0x0f: 'e', 0x11: 'ô', 0x13: 'o' }

const CONSONANT: Record<number, string> = {
  0x15: 'k',
  0x16: 'kh',
  0x17: 'g',
  0x18: 'gh',
  0x19: 'ṅ',
  0x1a: 'c',
  0x1b: 'ch',
  0x1c: 'j',
  0x1d: 'jh',
  0x1e: 'ñ',
  0x1f: 'ṭ',
  0x20: 'ṭh',
  0x21: 'ḍ',
  0x22: 'ḍh',
  0x23: 'ṇ',
  0x24: 't',
  0x25: 'th',
  0x26: 'd',
  0x27: 'dh',
  0x28: 'n',
  0x2a: 'p',
  0x2b: 'ph',
  0x2c: 'b',
  0x2d: 'bh',
  0x2e: 'm',
  0x2f: 'y',
  0x30: 'r',
  0x31: 'ṟ',
  0x32: 'l',
  0x33: 'ḷ',
  0x34: 'ḻ',
  0x35: 'v',
  0x36: 'ś',
  0x37: 'ṣ',
  0x38: 's',
  0x39: 'h',
  0xde: 'ḻ',
}

const SHARED_SIGN: Record<number, string> = {
  0x3e: 'ā',
  0x3f: 'i',
  0x40: 'ī',
  0x41: 'u',
  0x42: 'ū',
  0x43: 'r̥',
  0x44: 'r̥̄',
  0x48: 'ai',
  0x4c: 'au',
  0x62: 'l̥',
  0x63: 'l̥̄',
}

const DRAVIDIAN_SIGN: Record<number, string> = { 0x46: 'e', 0x47: 'ē', 0x4a: 'o', 0x4b: 'ō' }
const GUJARATI_SIGN: Record<number, string> = { 0x45: 'ê', 0x47: 'e', 0x49: 'ô', 0x4b: 'o' }

const VIRAMA = 0x4d
const NUKTA = 0x3c
const AVAGRAHA = 0x3d
const ANUSVARA = 0x02
const VISARGA = 0x03
const CANDRABINDU = 0x01
/** Combining length / candrabindu marks that NFC usually folds into a sign; drop if stray. */
const IGNORABLE = new Set([0x00, 0x04, 0x55, 0x56, 0xd5, 0xd6, 0x81])

function offsetOf(ch: string, base: number): number | null {
  const code = ch.codePointAt(0)!
  const off = code - base
  return off >= 0 && off < 0x80 ? off : null
}

/**
 * Transliterate Telugu / Gujarati / Kannada script to ISO 15919. Returns null when
 * the string has no letters of that script (Latin / other Indic scripts never get
 * a fake reading).
 */
export function romanizeIndicIso15919(text: string, lang: IndicIsoLang): string | null {
  const t = text.normalize('NFC').trim()
  if (!t || !SCRIPT_RE[lang].test(t)) return null
  const base = BASE[lang]
  const vowels = { ...SHARED_VOWEL, ...(lang === 'gu' ? GUJARATI_VOWEL : DRAVIDIAN_VOWEL) }
  const signs = { ...SHARED_SIGN, ...(lang === 'gu' ? GUJARATI_SIGN : DRAVIDIAN_SIGN) }

  const marks = (i: number): { text: string; next: number } => {
    let out = ''
    let next = i
    const o = next < t.length ? offsetOf(t[next]!, base) : null
    if (o === ANUSVARA) {
      out += 'ṁ'
      next += 1
    } else if (o === CANDRABINDU) {
      out += 'm̐'
      next += 1
    }
    if (next < t.length && offsetOf(t[next]!, base) === VISARGA) {
      out += 'ḥ'
      next += 1
    }
    return { text: out, next }
  }

  let out = ''
  let i = 0
  while (i < t.length) {
    const ch = t[i]!
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      out += ' '
      i += 1
      continue
    }
    if (ch === '।' || ch === '॥') {
      out += '.'
      i += 1
      continue
    }
    const off = offsetOf(ch, base)
    if (off === null) {
      out += ch
      i += 1
      continue
    }
    if (vowels[off]) {
      out += vowels[off]
      const m = marks(i + 1)
      out += m.text
      i = m.next
      continue
    }
    const stem = CONSONANT[off]
    if (stem) {
      i += 1
      if (i < t.length && offsetOf(t[i]!, base) === NUKTA) i += 1
      const next = i < t.length ? offsetOf(t[i]!, base) : null
      if (next === VIRAMA) {
        out += stem
        i += 1
        continue
      }
      const sign = next !== null ? signs[next] : undefined
      if (sign) {
        out += stem + sign
        i += 1
      } else {
        out += stem + 'a'
      }
      while (i < t.length && IGNORABLE.has(offsetOf(t[i]!, base) ?? -1)) i += 1
      const m = marks(i)
      out += m.text
      i = m.next
      continue
    }
    if (off >= 0x66 && off <= 0x6f) {
      out += String(off - 0x66)
      i += 1
      continue
    }
    if (off === ANUSVARA) out += 'ṁ'
    else if (off === VISARGA) out += 'ḥ'
    else if (off === AVAGRAHA) out += "'"
    // Stray signs / virama / nukta (malformed input) are dropped.
    i += 1
  }
  return out.replace(/\s+/g, ' ').trim() || null
}
