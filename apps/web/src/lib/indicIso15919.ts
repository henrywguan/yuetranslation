/**
 * Optional ISO 15919 reading for Telugu / Gujarati / Kannada / Malayalam / Marathi /
 * Punjabi (Gurmukhi) / Odia / Sinhala / Nepali Details.
 * Compact UI stays native script only — no Latin dump on every line.
 *
 * The Brahmic Unicode blocks (all but Sinhala) share the offset layout (vowels
 * 0x05–0x14, consonants 0x15–0x39, signs 0x3E–0x4C, virama 0x4D), so one table
 * keyed by offset covers them. Telugu / Kannada / Malayalam distinguish short e / o
 * from long ē / ō; Gujarati, Marathi, Nepali and Odia have only e / o (Gujarati and
 * Devanagari add candra ê / ô); Gurmukhi has only long ē / ō. Sinhala has its own block layout
 * and table. Follows spelling (inherent-a deletion is not modelled). Learner aid, not phonetics.
 */

export type IndicIsoLang = 'te' | 'gu' | 'kn' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne'

type BrahmicLang = Exclude<IndicIsoLang, 'si'>

const BASE: Record<BrahmicLang, number> = {
  te: 0x0c00,
  gu: 0x0a80,
  kn: 0x0c80,
  ml: 0x0d00,
  mr: 0x0900,
  pa: 0x0a00,
  or: 0x0b00,
  ne: 0x0900,
}

const SCRIPT_RE: Record<IndicIsoLang, RegExp> = {
  te: /[\u0C00-\u0C7F]/,
  gu: /[\u0A80-\u0AFF]/,
  kn: /[\u0C80-\u0CFF]/,
  ml: /[\u0D00-\u0D7F]/,
  mr: /[\u0900-\u097F]/,
  pa: /[\u0A00-\u0A7F]/,
  or: /[\u0B00-\u0B7F]/,
  si: /[\u0D80-\u0DFF]/,
  ne: /[\u0900-\u097F]/,
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
const DEVANAGARI_VOWEL: Record<number, string> = { 0x0d: 'ê', 0x0e: 'e', 0x0f: 'e', 0x11: 'ô', 0x12: 'o', 0x13: 'o' }
const ODIA_VOWEL: Record<number, string> = { 0x0f: 'e', 0x13: 'o' }
const GURMUKHI_VOWEL: Record<number, string> = { 0x0f: 'ē', 0x13: 'ō' }

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
const DEVANAGARI_SIGN: Record<number, string> = { 0x45: 'ê', 0x46: 'e', 0x47: 'e', 0x49: 'ô', 0x4a: 'o', 0x4b: 'o' }
const ODIA_SIGN: Record<number, string> = { 0x47: 'e', 0x4b: 'o' }
const GURMUKHI_SIGN: Record<number, string> = { 0x47: 'ē', 0x4b: 'ō' }

/** Malayalam atomic chillu letters (U+0D7A–U+0D7F). */
const MALAYALAM_CHILLU: Record<number, string> = { 0x7a: 'ṇ', 0x7b: 'n', 0x7c: 'r', 0x7d: 'l', 0x7e: 'ḷ', 0x7f: 'k' }

/** Consonant + nukta readings (NFC splits these precomposed letters). */
const NUKTA_CONSONANT: Partial<Record<BrahmicLang, Record<number, string>>> = {
  mr: { 0x15: 'q', 0x16: 'ḵh', 0x17: 'ġ', 0x1c: 'z', 0x21: 'ṛ', 0x22: 'ṛh', 0x2b: 'f', 0x2f: 'ẏ' },
  ne: { 0x15: 'q', 0x16: 'ḵh', 0x17: 'ġ', 0x1c: 'z', 0x21: 'ṛ', 0x22: 'ṛh', 0x2b: 'f', 0x2f: 'ẏ' },
  pa: { 0x16: 'x', 0x17: 'ġ', 0x1c: 'z', 0x2b: 'f', 0x38: 'ś' },
  or: { 0x21: 'ṛ', 0x22: 'ṛh' },
}

/** Script-specific extra consonants. */
const EXTRA_CONSONANT: Partial<Record<BrahmicLang, Record<number, string>>> = {
  pa: { 0x5c: 'ṛ' },
  or: { 0x5f: 'ẏ', 0x71: 'w' },
}

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

const SINHALA_VOWEL: Record<number, string> = {
  0x0d85: 'a', 0x0d86: 'ā', 0x0d87: 'æ', 0x0d88: 'ǣ', 0x0d89: 'i', 0x0d8a: 'ī', 0x0d8b: 'u', 0x0d8c: 'ū',
  0x0d8d: 'r̥', 0x0d8e: 'r̥̄', 0x0d8f: 'l̥', 0x0d90: 'l̥̄', 0x0d91: 'e', 0x0d92: 'ē', 0x0d93: 'ai',
  0x0d94: 'o', 0x0d95: 'ō', 0x0d96: 'au',
}

const SINHALA_SIGN: Record<number, string> = {
  0x0dcf: 'ā', 0x0dd0: 'æ', 0x0dd1: 'ǣ', 0x0dd2: 'i', 0x0dd3: 'ī', 0x0dd4: 'u', 0x0dd6: 'ū', 0x0dd8: 'r̥',
  0x0dd9: 'e', 0x0dda: 'ē', 0x0ddb: 'ai', 0x0ddc: 'o', 0x0ddd: 'ō', 0x0dde: 'au', 0x0ddf: 'ā', 0x0df2: 'r̥̄',
  0x0df3: 'l̥̄',
}

const SINHALA_CONSONANT: Record<number, string> = {
  0x0d9a: 'k', 0x0d9b: 'kh', 0x0d9c: 'g', 0x0d9d: 'gh', 0x0d9e: 'ṅ', 0x0d9f: 'ṅg', 0x0da0: 'c', 0x0da1: 'ch',
  0x0da2: 'j', 0x0da3: 'jh', 0x0da4: 'ñ', 0x0da5: 'jñ', 0x0da6: 'ñj', 0x0da7: 'ṭ', 0x0da8: 'ṭh', 0x0da9: 'ḍ',
  0x0daa: 'ḍh', 0x0dab: 'ṇ', 0x0dac: 'ṇḍ', 0x0dad: 't', 0x0dae: 'th', 0x0daf: 'd', 0x0db0: 'dh', 0x0db1: 'n',
  0x0db3: 'nd', 0x0db4: 'p', 0x0db5: 'ph', 0x0db6: 'b', 0x0db7: 'bh', 0x0db8: 'm', 0x0db9: 'mb', 0x0dba: 'y',
  0x0dbb: 'r', 0x0dbd: 'l', 0x0dc0: 'v', 0x0dc1: 'ś', 0x0dc2: 'ṣ', 0x0dc3: 's', 0x0dc4: 'h', 0x0dc5: 'ḷ',
  0x0dc6: 'f',
}

const SINHALA_VIRAMA = 0x0dca
const SINHALA_ANUSVARA = 0x0d82
const SINHALA_VISARGA = 0x0d83
const ZERO_WIDTH = new Set([0x200b, 0x200c, 0x200d])

function romanizeSinhala(t: string): string | null {
  let out = ''
  let i = 0
  while (i < t.length) {
    const cp = t.codePointAt(i)!
    const ch = t[i]!
    if (ZERO_WIDTH.has(cp)) {
      i += 1
      continue
    }
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      out += ' '
      i += 1
      continue
    }
    if (cp === 0x0df4) {
      out += '.'
      i += 1
      continue
    }
    const vowel = SINHALA_VOWEL[cp]
    if (vowel) {
      out += vowel
      i += 1
      continue
    }
    const stem = SINHALA_CONSONANT[cp]
    if (stem) {
      i += 1
      while (i < t.length && ZERO_WIDTH.has(t.codePointAt(i)!)) i += 1
      const next = i < t.length ? t.codePointAt(i)! : null
      if (next === SINHALA_VIRAMA) {
        out += stem
        i += 1
        continue
      }
      const sign = next !== null ? SINHALA_SIGN[next] : undefined
      if (sign) {
        out += stem + sign
        i += 1
      } else {
        out += stem + 'a'
      }
      continue
    }
    if (cp === SINHALA_ANUSVARA) out += 'ṁ'
    else if (cp === SINHALA_VISARGA) out += 'ḥ'
    else if (cp >= 0x0de6 && cp <= 0x0def) out += String(cp - 0x0de6)
    else if (cp < 0x0d80 || cp > 0x0dff) out += ch
    i += 1
  }
  return out.replace(/\s+/g, ' ').trim() || null
}

/**
 * Transliterate Indic script to ISO 15919. Returns null when the string has no
 * letters of that script (Latin / other Indic scripts never get a fake reading).
 */
export function romanizeIndicIso15919(text: string, lang: IndicIsoLang): string | null {
  const t = text.normalize('NFC').trim()
  if (!t || !SCRIPT_RE[lang].test(t)) return null
  if (lang === 'si') return romanizeSinhala(t)
  const base = BASE[lang]
  const vowelMap =
    lang === 'gu'
      ? GUJARATI_VOWEL
      : lang === 'mr' || lang === 'ne'
        ? DEVANAGARI_VOWEL
        : lang === 'or'
          ? ODIA_VOWEL
          : lang === 'pa'
            ? GURMUKHI_VOWEL
            : DRAVIDIAN_VOWEL
  const signMap =
    lang === 'gu'
      ? GUJARATI_SIGN
      : lang === 'mr' || lang === 'ne'
        ? DEVANAGARI_SIGN
        : lang === 'or'
          ? ODIA_SIGN
          : lang === 'pa'
            ? GURMUKHI_SIGN
            : DRAVIDIAN_SIGN
  const vowels = { ...SHARED_VOWEL, ...vowelMap }
  const signs = { ...SHARED_SIGN, ...signMap }
  const consonants = { ...CONSONANT, ...EXTRA_CONSONANT[lang] }
  const nuktaMap = NUKTA_CONSONANT[lang]
  const isGurmukhi = lang === 'pa'
  const isMalayalam = lang === 'ml'

  const isAnusvara = (o: number | null) => o === ANUSVARA || (isGurmukhi && o === 0x70)

  const marks = (i: number): { text: string; next: number } => {
    let out = ''
    let next = i
    const o = next < t.length ? offsetOf(t[next]!, base) : null
    if (isAnusvara(o)) {
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
  let geminate = false
  while (i < t.length) {
    const ch = t[i]!
    const cp = ch.codePointAt(0)!
    if (cp === 0x200b || cp === 0x200c || cp === 0x200d) {
      i += 1
      continue
    }
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
    if (isGurmukhi && off === 0x71) {
      geminate = true
      i += 1
      continue
    }
    if (isGurmukhi && (off === 0x72 || off === 0x73)) {
      const next = i + 1 < t.length ? offsetOf(t[i + 1]!, base) : null
      const sign = next !== null ? signs[next] : undefined
      if (sign) {
        out += sign
        i += 2
      } else {
        i += 1
      }
      const m = marks(i)
      out += m.text
      i = m.next
      continue
    }
    if (isMalayalam && MALAYALAM_CHILLU[off]) {
      out += MALAYALAM_CHILLU[off]
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
    let stem = consonants[off]
    if (stem) {
      i += 1
      if (i < t.length && offsetOf(t[i]!, base) === NUKTA) {
        stem = nuktaMap?.[off] ?? stem
        i += 1
      }
      if (geminate) {
        out += stem
        geminate = false
      }
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
    if (isAnusvara(off)) out += 'ṁ'
    else if (off === VISARGA) out += 'ḥ'
    else if (off === AVAGRAHA) out += "'"
    // Stray signs / virama / nukta (malformed input) are dropped.
    i += 1
  }
  return out.replace(/\s+/g, ' ').trim() || null
}
