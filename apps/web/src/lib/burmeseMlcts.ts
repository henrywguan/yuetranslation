/**
 * Lightweight MLCTS-style reading for Burmese (မြန်မာ).
 *
 * Compact UI shows Myanmar script plus this Latin reading when syllables parse.
 * Tones use Latin diacritics — never Cantonese-style ASCII tone digits.
 *
 * Tone marking (when clear from spelling):
 * - low / level — unmarked
 * - high (း) — acute
 * - creaky (့) — grave
 * - checked (asat stop final) — unmarked short nucleus + final consonant
 *
 * Stacked kinzi / rare conjuncts may omit a syllable or fall back to script-only.
 */

export type BurmeseTone = 'low' | 'high' | 'creaky' | 'checked'

export type BurmeseSyllable = {
  script: string
  reading: string
  tone: BurmeseTone
}

export type BurmeseAnalysis = {
  reading: string
  syllables: BurmeseSyllable[]
}

export const BURMESE_TONE_HONESTY =
  'MLCTS follows the spelling (e.g. မင်္ဂလာ → mangala); Yangon speech may differ (mingala). Tones (low, high, creaky, checked) come from the orthography — not Cantonese-style tone digits. Rare conjuncts may omit a reading.'

const CONS: Record<string, string> = {
  က: 'k',
  ခ: 'kh',
  ဂ: 'g',
  ဃ: 'gh',
  င: 'ng',
  စ: 'c',
  ဆ: 'ch',
  ဇ: 'j',
  ဈ: 'jh',
  ဉ: 'ny',
  ည: 'ny',
  ဋ: 't',
  ဌ: 'ht',
  ဍ: 'd',
  ဎ: 'dh',
  ဏ: 'n',
  တ: 't',
  ထ: 'ht',
  ဒ: 'd',
  ဓ: 'dh',
  န: 'n',
  ပ: 'p',
  ဖ: 'hp',
  ဗ: 'b',
  ဘ: 'bh',
  မ: 'm',
  ယ: 'y',
  ရ: 'r',
  လ: 'l',
  ဝ: 'w',
  သ: 's',
  ဟ: 'h',
  ဠ: 'l',
  အ: '',
}

const IND_VOWEL: Record<string, string> = {
  ဣ: 'i',
  ဤ: 'i',
  ဥ: 'u',
  ဦ: 'u',
  ဧ: 'e',
  ဩ: 'o',
  ဪ: 'o',
}

const MEDIAL: Record<string, string> = {
  '\u103B': 'y', // ျ
  '\u103C': 'r', // ြ
  '\u103D': 'w', // ွ
  '\u103E': 'h', // ှ
}

const ASAT = '\u103A'
const VIRAMA = '\u1039'
const CREAKY = '\u1037'
const VISARGA = '\u1038'
const ANUSVARA = '\u1036'

const VOWEL_SIGNS = new Set([
  '\u102B', // ာ
  '\u102C', // ါ
  '\u102D', // ိ
  '\u102E', // ီ
  '\u102F', // ု
  '\u1030', // ူ
  '\u1031', // ေ
  '\u1032', // ဲ
  '\u1033', // ဳ
  '\u1034', // ဴ
  '\u1035', // ဵ
])

const FINAL_STOP: Record<string, string> = {
  က: 'k',
  ခ: 'k',
  ဂ: 'k',
  င: 'ng',
  စ: 'c',
  ည: 'ny',
  တ: 't',
  န: 'n',
  ပ: 'p',
  မ: 'm',
  ယ: 'y',
  ရ: 'r',
  လ: 'l',
  ဝ: 'w',
  သ: 't',
  ဟ: 't',
  အ: 't',
}

function isCons(ch: string | undefined): ch is string {
  return !!ch && Object.prototype.hasOwnProperty.call(CONS, ch)
}

function isMyanmarLetter(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (cp >= 0x1000 && cp <= 0x109f) || (cp >= 0xaa60 && cp <= 0xaa7f)
}

function applyToneDiacritic(vowel: string, tone: BurmeseTone): string {
  if (!vowel) return vowel
  // Prefer first Latin letter for combining mark.
  const chars = [...vowel]
  let idx = chars.findIndex((c) => /[aeiouăāīū]/i.test(c))
  if (idx < 0) idx = 0
  const mark = tone === 'high' ? '\u0301' : tone === 'creaky' ? '\u0300' : ''
  if (!mark) return vowel
  chars[idx] = chars[idx] + mark
  return chars.join('')
}

function normalizeReading(s: string): string {
  return s.normalize('NFC')
}

type ParsedSyl = {
  script: string
  onset: string
  nucleus: string
  coda: string
  tone: BurmeseTone
  kinzi: boolean
}

function parseSyllableAt(chars: string[], start: number): { syl: ParsedSyl; next: number } | null {
  let i = start
  const first = chars[i]
  if (!first) return null

  // Independent vowel syllable
  if (Object.prototype.hasOwnProperty.call(IND_VOWEL, first)) {
    let script = first
    i++
    let tone: BurmeseTone = 'low'
    let coda = ''
    if (chars[i] === ANUSVARA) {
      script += chars[i]!
      coda = 'n'
      i++
    }
    if (chars[i] === CREAKY) {
      script += chars[i]!
      tone = 'creaky'
      i++
    } else if (chars[i] === VISARGA) {
      script += chars[i]!
      tone = 'high'
      i++
    }
    return {
      syl: {
        script,
        onset: '',
        nucleus: IND_VOWEL[first]!,
        coda,
        tone,
        kinzi: false,
      },
      next: i,
    }
  }

  if (!isCons(chars[i])) return null
  const base = chars[i]!
  let script = base
  i++

  let onset = CONS[base] ?? ''
  // Medials (order: y, r, w, h roughly as written)
  const medials: string[] = []
  while (chars[i] && Object.prototype.hasOwnProperty.call(MEDIAL, chars[i]!)) {
    const m = chars[i]!
    script += m
    medials.push(MEDIAL[m]!)
    i++
  }
  // MLCTS medial order: r/y then w then h after onset
  const medialStr = ['r', 'y', 'w', 'h'].filter((m) => medials.includes(m)).join('')
  onset = `${onset}${medialStr}`

  // Dependent vowels
  const vowelChars: string[] = []
  while (chars[i] && VOWEL_SIGNS.has(chars[i]!)) {
    vowelChars.push(chars[i]!)
    script += chars[i]!
    i++
  }

  let nucleus = 'a'
  const vset = new Set(vowelChars)
  if (vset.has('\u1031') && vset.has('\u102C') && chars[i] === ASAT) {
    // ော်
    nucleus = 'o'
    script += ASAT
    i++
  } else if (vset.has('\u1031') && vset.has('\u102C')) {
    nucleus = 'au'
  } else if (vset.has('\u102D') && vset.has('\u102F')) {
    nucleus = 'ui'
  } else if (vset.has('\u1031') && vset.has('\u102B')) {
    nucleus = 'au'
  } else if (vset.has('\u1031')) {
    nucleus = 'e'
  } else if (vset.has('\u1032')) {
    nucleus = 'ai'
  } else if (vset.has('\u102E')) {
    nucleus = 'i'
  } else if (vset.has('\u102D')) {
    nucleus = 'i'
  } else if (vset.has('\u1030')) {
    nucleus = 'u'
  } else if (vset.has('\u102F')) {
    nucleus = 'u'
  } else if (vset.has('\u102C') || vset.has('\u102B')) {
    nucleus = 'a'
  } else if (vowelChars.length === 0) {
    nucleus = 'a'
  }

  // Length marks for open ā / ī / ū (MLCTS long)
  if ((vset.has('\u102C') || vset.has('\u102B')) && !vset.has('\u1031') && nucleus === 'a') {
    nucleus = 'ā'
  }
  if (vset.has('\u102E')) nucleus = 'ī'
  if (vset.has('\u1030')) nucleus = 'ū'

  let coda = ''
  let tone: BurmeseTone = 'low'
  let kinzi = false

  if (chars[i] === ANUSVARA) {
    script += ANUSVARA
    coda = 'n'
    i++
  }

  // Kinzi after this onset: င + ASAT + VIRAMA + C2 → coda -ng on THIS syllable;
  // C2 starts the next syllable (kinzi is not a checked-tone asat).
  if (
    chars[i] === 'င' &&
    chars[i + 1] === ASAT &&
    chars[i + 2] === VIRAMA &&
    isCons(chars[i + 3])
  ) {
    script += `င${ASAT}${VIRAMA}`
    coda = 'ng'
    kinzi = true
    i += 3
    // leave C2 for the next parseSyllableAt call
  } else if (chars[i] === VIRAMA && isCons(chars[i + 1])) {
    // Stacked conjunct via VIRAMA — keep script, light coda
    script += VIRAMA + chars[i + 1]!
    const stacked = chars[i + 1]!
    i += 2
    while (
      chars[i] &&
      (Object.prototype.hasOwnProperty.call(MEDIAL, chars[i]!) || VOWEL_SIGNS.has(chars[i]!))
    ) {
      script += chars[i]!
      i++
    }
    if (!coda) coda = FINAL_STOP[stacked] || CONS[stacked] || ''
  } else if (isCons(chars[i]) && chars[i + 1] === ASAT && chars[i + 2] !== VIRAMA) {
    // Asat final (checked syllable): C + ASAT (not kinzi)
    const fin = chars[i]!
    script += fin + ASAT
    coda = FINAL_STOP[fin] || CONS[fin] || ''
    tone = 'checked'
    i += 2
    if (nucleus === 'ā') nucleus = 'a'
    if (nucleus === 'ī') nucleus = 'i'
    if (nucleus === 'ū') nucleus = 'u'
  } else if (chars[i] === ASAT) {
    script += ASAT
    if (!coda) coda = 't'
    tone = 'checked'
    i++
    if (nucleus === 'ā') nucleus = 'a'
  }

  if (chars[i] === CREAKY) {
    script += CREAKY
    if (tone !== 'checked') tone = 'creaky'
    i++
  } else if (chars[i] === VISARGA) {
    script += VISARGA
    if (tone !== 'checked') tone = 'high'
    i++
  }

  // Inherent အ with no onset letter already mapped to ''
  if (base === 'အ' && !medialStr) {
    onset = ''
  }

  return {
    syl: { script, onset, nucleus, coda, tone, kinzi },
    next: i,
  }
}

function syllableReading(syl: ParsedSyl): string {
  let vowel = syl.nucleus
  if (syl.tone === 'high' || syl.tone === 'creaky') {
    vowel = applyToneDiacritic(vowel, syl.tone)
  }
  const body = `${syl.onset}${vowel}${syl.coda}`
  return normalizeReading(body || vowel)
}

/**
 * Analyze Myanmar-script text into MLCTS-style syllables.
 * Returns null when there is no Myanmar script or parsing yields nothing useful.
 */
export function analyzeBurmese(text: string): BurmeseAnalysis | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (!/[\u1000-\u109F]/.test(trimmed)) return null

  const chars = [...trimmed]
  const syllables: BurmeseSyllable[] = []
  let i = 0
  let myanmarSeen = 0
  let parsedMyanmar = 0

  while (i < chars.length) {
    const ch = chars[i]!
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[.,!?;:'"()\-–—/]/.test(ch) || /[0-9\u1040-\u1049]/.test(ch)) {
      i++
      continue
    }
    if (!isMyanmarLetter(ch) && !Object.prototype.hasOwnProperty.call(IND_VOWEL, ch)) {
      // Latin / other — skip
      i++
      continue
    }
    myanmarSeen++
    const parsed = parseSyllableAt(chars, i)
    if (!parsed) {
      i++
      continue
    }
    parsedMyanmar++
    const reading = syllableReading(parsed.syl)
    if (reading) {
      syllables.push({
        script: parsed.syl.script,
        reading,
        tone: parsed.syl.tone,
      })
    }
    i = parsed.next
  }

  if (!syllables.length) return null
  // Prefer a reading when we parsed most Myanmar chunks; otherwise script-only.
  if (myanmarSeen > 0 && parsedMyanmar < Math.ceil(myanmarSeen * 0.5)) return null

  return {
    reading: syllables.map((s) => s.reading).join('-'),
    syllables,
  }
}

export function burmeseToneLabel(tone: BurmeseTone): string {
  if (tone === 'high') return 'High'
  if (tone === 'creaky') return 'Creaky'
  if (tone === 'checked') return 'Checked'
  return 'Low'
}

export function burmeseToneChip(tone: BurmeseTone): string {
  if (tone === 'high') return 'High'
  if (tone === 'creaky') return 'Creaky'
  if (tone === 'checked') return 'Checked'
  return 'Low'
}
