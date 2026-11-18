/**
 * Optional ISO 15919 reading for Tamil Details. Compact UI stays Tamil-script
 * only — no Tanglish Latin dump on every line.
 *
 * Covers modern Tamil letters (uyir, mei, uyirmei with vowel signs, pulli,
 * āytam) plus common Grantha letters (ஜ ஷ ஸ ஹ ஶ). Follows spelling, not
 * pronunciation: Tamil script does not mark voicing (க = k / g / h in speech).
 */

const INDEPENDENT: Record<string, string> = {
  அ: 'a',
  ஆ: 'ā',
  இ: 'i',
  ஈ: 'ī',
  உ: 'u',
  ஊ: 'ū',
  எ: 'e',
  ஏ: 'ē',
  ஐ: 'ai',
  ஒ: 'o',
  ஓ: 'ō',
  ஔ: 'au',
}

/** Consonant letter → ISO 15919 stem (without inherent a). */
const CONSONANT: Record<string, string> = {
  க: 'k',
  ங: 'ṅ',
  ச: 'c',
  ஞ: 'ñ',
  ட: 'ṭ',
  ண: 'ṇ',
  த: 't',
  ந: 'n',
  ப: 'p',
  ம: 'm',
  ய: 'y',
  ர: 'r',
  ல: 'l',
  வ: 'v',
  ழ: 'ḻ',
  ள: 'ḷ',
  ற: 'ṟ',
  ன: 'ṉ',
  ஜ: 'j',
  ஶ: 'ś',
  ஷ: 'ṣ',
  ஸ: 's',
  ஹ: 'h',
}

// Vowel signs are combining marks — escaped keys.
const VOWEL_SIGN: Record<string, string> = {
  '\u0BBE': 'ā', // ா
  '\u0BBF': 'i', // ி
  '\u0BC0': 'ī', // ீ
  '\u0BC1': 'u', // ு
  '\u0BC2': 'ū', // ூ
  '\u0BC6': 'e', // ெ
  '\u0BC7': 'ē', // ே
  '\u0BC8': 'ai', // ை
  '\u0BCA': 'o', // ொ
  '\u0BCB': 'ō', // ோ
  '\u0BCC': 'au', // ௌ
}

const PULLI = '\u0BCD'
const AYTAM = '\u0B83'
const AU_LENGTH = '\u0BD7'

const TAMIL = /[\u0B80-\u0BFF]/

/**
 * Transliterate Tamil script to ISO 15919. Returns null when the string has
 * no Tamil letters (Latin / Tanglish input never gets a fake reading).
 */
export function romanizeTamilIso15919(text: string): string | null {
  const t = text.normalize('NFC').trim()
  if (!t || !TAMIL.test(t)) return null

  let out = ''
  let i = 0
  while (i < t.length) {
    const ch = t[i]!

    if (ch === ' ' || ch === '\n' || ch === '\t') {
      out += ' '
      i += 1
      continue
    }

    if (INDEPENDENT[ch]) {
      out += INDEPENDENT[ch]
      i += 1
      continue
    }

    if (ch === AYTAM) {
      out += 'ḵ'
      i += 1
      continue
    }

    const stem = CONSONANT[ch]
    if (stem) {
      i += 1
      if (t[i] === PULLI) {
        out += stem
        i += 1
        continue
      }
      const sign = t[i] ? VOWEL_SIGN[t[i]!] : undefined
      if (sign) {
        out += stem + sign
        i += 1
      } else {
        out += stem + 'a'
      }
      if (t[i] === AU_LENGTH) i += 1
      continue
    }

    const code = ch.charCodeAt(0)
    if (code >= 0x0be6 && code <= 0x0bef) {
      out += String(code - 0x0be6)
      i += 1
      continue
    }

    // Stray combining marks (malformed input) are dropped; Latin / punctuation pass through.
    if (VOWEL_SIGN[ch] || ch === PULLI || ch === AU_LENGTH) {
      i += 1
      continue
    }

    out += ch
    i += 1
  }

  const cleaned = out.replace(/\s+/g, ' ').trim()
  return cleaned || null
}
