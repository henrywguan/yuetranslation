/**
 * Optional ISO 15919 reading for Bengali Details. Compact UI stays Bangla
 * script only — no Banglish Latin dump on every line.
 *
 * Covers modern Bangla letters (vowels, consonants, kar signs, hasanta,
 * anusvara / candrabindu / visarga, nukta letters ড় ঢ় য়, khanda ta ৎ).
 * Follows spelling: the inherent vowel is written `a` even where Bangla
 * speech says [ɔ] or drops it word-finally. Learner aid, not phonetics.
 */

const INDEPENDENT: Record<string, string> = {
  অ: 'a',
  আ: 'ā',
  ই: 'i',
  ঈ: 'ī',
  উ: 'u',
  ঊ: 'ū',
  ঋ: 'r̥',
  ৠ: 'r̥̄',
  ঌ: 'l̥',
  এ: 'e',
  ঐ: 'ai',
  ও: 'o',
  ঔ: 'au',
}

/** Consonant letter → ISO 15919 stem (without inherent a). */
const CONSONANT: Record<string, string> = {
  ক: 'k',
  খ: 'kh',
  গ: 'g',
  ঘ: 'gh',
  ঙ: 'ṅ',
  চ: 'c',
  ছ: 'ch',
  জ: 'j',
  ঝ: 'jh',
  ঞ: 'ñ',
  ট: 'ṭ',
  ঠ: 'ṭh',
  ড: 'ḍ',
  ঢ: 'ḍh',
  ণ: 'ṇ',
  ত: 't',
  থ: 'th',
  দ: 'd',
  ধ: 'dh',
  ন: 'n',
  প: 'p',
  ফ: 'ph',
  ব: 'b',
  ভ: 'bh',
  ম: 'm',
  য: 'y',
  র: 'r',
  ল: 'l',
  শ: 'ś',
  ষ: 'ṣ',
  স: 's',
  হ: 'h',
  // Precomposed nukta letters
  ড়: 'ṛ',
  ঢ়: 'ṛh',
  য়: 'ẏ',
}

/** Base + nukta (decomposed form) → ISO stem. */
const NUKTA_CONSONANT: Record<string, string> = {
  ড: 'ṛ',
  ঢ: 'ṛh',
  য: 'ẏ',
}

// Kar (vowel) signs are combining marks — escaped keys.
const VOWEL_SIGN: Record<string, string> = {
  '\u09BE': 'ā', // া
  '\u09BF': 'i', // ি
  '\u09C0': 'ī', // ী
  '\u09C1': 'u', // ু
  '\u09C2': 'ū', // ূ
  '\u09C3': 'r̥', // ৃ
  '\u09C4': 'r̥̄', // ৄ
  '\u09C7': 'e', // ে
  '\u09C8': 'ai', // ৈ
  '\u09CB': 'o', // ো
  '\u09CC': 'au', // ৌ
}

const HASANTA = '\u09CD'
const NUKTA = '\u09BC'
const ANUSVARA = '\u0982'
const CANDRABINDU = '\u0981'
const VISARGA = '\u0983'
const KHANDA_TA = '\u09CE'
const AU_LENGTH = '\u09D7'

const BENGALI = /[\u0980-\u09FF]/

function trailingMarks(t: string, i: number): { text: string; next: number } {
  let text = ''
  let next = i
  if (t[next] === ANUSVARA) {
    text += 'ṁ'
    next += 1
  } else if (t[next] === CANDRABINDU) {
    text += 'm̐'
    next += 1
  }
  if (t[next] === VISARGA) {
    text += 'ḥ'
    next += 1
  }
  return { text, next }
}

/**
 * Transliterate Bangla script to ISO 15919. Returns null when the string has
 * no Bengali letters (Latin / Devanagari input never gets a fake reading).
 */
export function romanizeBengaliIso15919(text: string): string | null {
  const t = text.normalize('NFC').trim()
  if (!t || !BENGALI.test(t)) return null

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

    if (INDEPENDENT[ch]) {
      out += INDEPENDENT[ch]
      const marks = trailingMarks(t, i + 1)
      out += marks.text
      i = marks.next
      continue
    }

    if (ch === KHANDA_TA) {
      out += 't'
      i += 1
      continue
    }

    const hasNukta = t[i + 1] === NUKTA
    const stem = hasNukta ? NUKTA_CONSONANT[ch] ?? CONSONANT[ch] : CONSONANT[ch]
    if (stem) {
      i += hasNukta ? 2 : 1
      if (t[i] === HASANTA) {
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
      const marks = trailingMarks(t, i)
      out += marks.text
      i = marks.next
      continue
    }

    const code = ch.charCodeAt(0)
    if (code >= 0x09e6 && code <= 0x09ef) {
      out += String(code - 0x09e6)
      i += 1
      continue
    }

    if (ch === ANUSVARA) {
      out += 'ṁ'
      i += 1
      continue
    }
    if (ch === VISARGA) {
      out += 'ḥ'
      i += 1
      continue
    }
    // Stray combining marks (malformed input) are dropped; Latin / punctuation pass through.
    if (VOWEL_SIGN[ch] || ch === HASANTA || ch === NUKTA || ch === CANDRABINDU || ch === AU_LENGTH) {
      i += 1
      continue
    }

    out += ch
    i += 1
  }

  const cleaned = out.replace(/\s+/g, ' ').trim()
  return cleaned || null
}
