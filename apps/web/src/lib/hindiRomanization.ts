/**
 * Optional IAST (International Alphabet of Sanskrit Transliteration) reading
 * for Hindi Details. Compact UI stays Devanagari-only — no Hinglish Latin dump.
 *
 * Covers Modern Standard Hindi Devanagari (consonants, matras, virama,
 * anusvara/visarga/candrabindu, common nukta letters). Not a full Sanskrit
 * sandhi engine; learner aid only.
 */

const INDEPENDENT: Record<string, string> = {
  अ: 'a',
  आ: 'ā',
  इ: 'i',
  ई: 'ī',
  उ: 'u',
  ऊ: 'ū',
  ऋ: 'ṛ',
  ॠ: 'ṝ',
  ऌ: 'ḷ',
  ॡ: 'ḹ',
  ए: 'e',
  ऐ: 'ai',
  ओ: 'o',
  औ: 'au',
  ऍ: 'ê',
  ऑ: 'ô',
  ॲ: 'ê',
}

/** Consonant letter → IAST stem (without inherent a). */
const CONSONANT: Record<string, string> = {
  क: 'k',
  ख: 'kh',
  ग: 'g',
  घ: 'gh',
  ङ: 'ṅ',
  च: 'c',
  छ: 'ch',
  ज: 'j',
  झ: 'jh',
  ञ: 'ñ',
  ट: 'ṭ',
  ठ: 'ṭh',
  ड: 'ḍ',
  ढ: 'ḍh',
  ण: 'ṇ',
  त: 't',
  थ: 'th',
  द: 'd',
  ध: 'dh',
  न: 'n',
  प: 'p',
  फ: 'ph',
  ब: 'b',
  भ: 'bh',
  म: 'm',
  य: 'y',
  र: 'r',
  ल: 'l',
  व: 'v',
  श: 'ś',
  ष: 'ṣ',
  स: 's',
  ह: 'h',
  ळ: 'ḷ',
  // Nukta / Perso-Arabic loans (decomposed क + ़ and precomposed क़…)
  क़: 'q',
  ख़: 'ḳh',
  ग़: 'ġ',
  ज़: 'z',
  झ़: 'zh',
  ड़: 'ṛ',
  ढ़: 'ṛh',
  फ़: 'f',
  य़: 'ẏ',
  क़: 'q',
  ख़: 'ḳh',
  ग़: 'ġ',
  ज़: 'z',
  ड़: 'ṛ',
  ढ़: 'ṛh',
  फ़: 'f',
}

// Matras are combining marks — must be quoted / escaped (invalid bare identifiers).
const MATRA: Record<string, string> = {
  '\u093E': 'ā', // ा
  '\u093F': 'i', // ि
  '\u0940': 'ī', // ी
  '\u0941': 'u', // ु
  '\u0942': 'ū', // ू
  '\u0943': 'ṛ', // ृ
  '\u0944': 'ṝ', // ॄ
  '\u0962': 'ḷ', // ॢ
  '\u0963': 'ḹ', // ॣ
  '\u0947': 'e', // े
  '\u0948': 'ai', // ै
  '\u094B': 'o', // ो
  '\u094C': 'au', // ौ
  '\u0945': 'ê', // ॅ
  '\u0949': 'ô', // ॉ
}

const VIRAMA = '\u094D'
const NUKTA = '\u093C'
const ANUSVARA = '\u0902'
const CANDRABINDU = '\u0901'
const VISARGA = '\u0903'
const AVAGRAHA = '\u093D'

const DEVANAGARI = /[\u0900-\u097F]/

function isConsonantBase(ch: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONSONANT, ch)
}

function consonantStem(base: string, nukta: boolean): string | null {
  if (nukta) {
    const keyed = base + NUKTA
    if (CONSONANT[keyed]) return CONSONANT[keyed]
  }
  return CONSONANT[base] ?? null
}

/**
 * Transliterate Devanagari Hindi to IAST. Returns null when the string has no
 * Devanagari letters (so Latin/Hinglish input does not get a fake reading).
 */
export function romanizeHindiIast(text: string): string | null {
  const t = text.trim()
  if (!t || !DEVANAGARI.test(t)) return null

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
      out += ch === '।' ? '.' : '.'
      i += 1
      continue
    }

    if (INDEPENDENT[ch]) {
      out += INDEPENDENT[ch]
      i += 1
      // anusvara / candrabindu / visarga after vowel
      if (t[i] === ANUSVARA) {
        out += 'ṃ'
        i += 1
      } else if (t[i] === CANDRABINDU) {
        out += 'm̐'
        i += 1
      } else if (t[i] === VISARGA) {
        out += 'ḥ'
        i += 1
      }
      continue
    }

    if (isConsonantBase(ch)) {
      const hasNukta = t[i + 1] === NUKTA
      const stem = consonantStem(ch, hasNukta)
      i += hasNukta ? 2 : 1
      if (!stem) {
        out += ch
        continue
      }

      if (t[i] === VIRAMA) {
        // Dead consonant / conjunct — no inherent a
        out += stem
        i += 1
        continue
      }

      if (t[i] && MATRA[t[i]!]) {
        out += stem + MATRA[t[i]!]
        i += 1
      } else {
        out += stem + 'a'
      }

      if (t[i] === ANUSVARA) {
        out += 'ṃ'
        i += 1
      } else if (t[i] === CANDRABINDU) {
        out += 'm̐'
        i += 1
      } else if (t[i] === VISARGA) {
        out += 'ḥ'
        i += 1
      }
      continue
    }

    if (ch === AVAGRAHA) {
      out += "'"
      i += 1
      continue
    }

    // Skip combining marks we already handle; pass through Latin / digits / punct
    if (ch === NUKTA || ch === VIRAMA || ch === ANUSVARA || ch === CANDRABINDU || ch === VISARGA) {
      i += 1
      continue
    }

    out += ch
    i += 1
  }

  const cleaned = out.replace(/\s+/g, ' ').trim()
  return cleaned || null
}
