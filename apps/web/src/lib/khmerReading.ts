/**
 * Lightweight UNGEGN-style Khmer reading for compact / Details.
 *
 * Khmer is **not** a lexical tone language (unlike Thai / Lao). Do not invent
 * Cantonese-style ASCII tone digits or Chao letters. The learner line is a
 * romanization derived from consonant series + dependent vowels + coeng clusters.
 *
 * Returns null when the string has no Khmer script, or when a syllable will
 * not parse cleanly — UI then shows script only.
 */

export type KhmerSyllable = {
  script: string
  reading: string
}

export type KhmerAnalysis = {
  reading: string
  syllables: KhmerSyllable[]
}

export const KHMER_READING_HONESTY =
  'Khmer is not a lexical tone language. This line is a simplified UNGEGN-style reading from the script — series (a/o) and spelling decide vowel quality, not pitch marks.'

type Series = 'a' | 'o'

type ConsInfo = { base: string; series: Series }

/** Independent consonants (U+1780–17A2) with UNGEGN onset + series. */
const CONS: Record<string, ConsInfo> = {
  '\u1780': { base: 'k', series: 'a' }, // ក
  '\u1781': { base: 'kh', series: 'a' }, // ខ
  '\u1782': { base: 'k', series: 'o' }, // គ
  '\u1783': { base: 'kh', series: 'o' }, // ឃ
  '\u1784': { base: 'ng', series: 'o' }, // ង
  '\u1785': { base: 'ch', series: 'a' }, // ច
  '\u1786': { base: 'chh', series: 'a' }, // ឆ
  '\u1787': { base: 'ch', series: 'o' }, // ជ
  '\u1788': { base: 'chh', series: 'o' }, // ឈ
  '\u1789': { base: 'nh', series: 'o' }, // ញ
  '\u178A': { base: 'd', series: 'a' }, // ដ
  '\u178B': { base: 'th', series: 'a' }, // ឋ
  '\u178C': { base: 'd', series: 'o' }, // ឌ
  '\u178D': { base: 'th', series: 'o' }, // ឍ
  '\u178E': { base: 'n', series: 'a' }, // ណ
  '\u178F': { base: 't', series: 'a' }, // ត
  '\u1790': { base: 'th', series: 'a' }, // ថ
  '\u1791': { base: 't', series: 'o' }, // ទ
  '\u1792': { base: 'th', series: 'o' }, // ធ
  '\u1793': { base: 'n', series: 'o' }, // ន
  '\u1794': { base: 'b', series: 'a' }, // ប
  '\u1795': { base: 'ph', series: 'a' }, // ផ
  '\u1796': { base: 'p', series: 'o' }, // ព
  '\u1797': { base: 'ph', series: 'o' }, // ភ
  '\u1798': { base: 'm', series: 'o' }, // ម
  '\u1799': { base: 'y', series: 'o' }, // យ
  '\u179A': { base: 'r', series: 'o' }, // រ
  '\u179B': { base: 'l', series: 'o' }, // ល
  '\u179C': { base: 'v', series: 'o' }, // វ
  '\u179D': { base: 'sh', series: 'a' }, // ឝ
  '\u179E': { base: 'ss', series: 'a' }, // ឞ
  '\u179F': { base: 's', series: 'a' }, // ស
  '\u17A0': { base: 'h', series: 'a' }, // ហ
  '\u17A1': { base: 'l', series: 'a' }, // ឡ
  '\u17A2': { base: '', series: 'a' }, // អ
}

/** Independent vowels (U+17A5–17B3). */
const INDEP_VOWEL: Record<string, string> = {
  '\u17A5': 'e',
  '\u17A6': 'ei',
  '\u17A7': 'u',
  '\u17A9': 'u',
  '\u17AA': 'au',
  '\u17AB': 'rue',
  '\u17AC': 'rueu',
  '\u17AD': 'lue',
  '\u17AE': 'lueu',
  '\u17AF': 'ae',
  '\u17B0': 'ai',
  '\u17B1': 'ao',
  '\u17B2': 'ao',
  '\u17B3': 'au',
}

/** Dependent vowels: [a-series, o-series]. */
const DEP_VOWEL: Record<string, [string, string]> = {
  '\u17B6': ['a', 'ea'],
  '\u17B7': ['e', 'i'],
  '\u17B8': ['ei', 'i'],
  '\u17B9': ['oe', 'ue'],
  '\u17BA': ['oe', 'eu'],
  '\u17BB': ['o', 'u'],
  '\u17BC': ['au', 'u'],
  '\u17BD': ['uo', 'uo'],
  '\u17BE': ['ae', 'eua'],
  '\u17BF': ['ie', 'ie'],
  '\u17C0': ['ie', 'ie'],
  '\u17C1': ['e', 'e'],
  '\u17C2': ['ae', 'ae'],
  '\u17C3': ['ai', 'ai'],
  '\u17C4': ['ao', 'o'],
  '\u17C5': ['au', 'au'],
}

const COENG = '\u17D2'
const MUUSIKATOAN = '\u17C9'
const TRIISAP = '\u17CA'
const NIKAHIT = '\u17C6'
const REAHMUK = '\u17C7'
const YUUKALEAPINTU = '\u17C8'
const BANTOC = '\u17CB'

const KHMER_RE = /[\u1780-\u17FF]/

function isCons(ch: string | undefined): ch is string {
  return !!ch && ch in CONS
}

function isDepVowel(ch: string | undefined): boolean {
  return !!ch && ch in DEP_VOWEL
}

function inherent(series: Series): string {
  return series === 'a' ? 'a' : 'o'
}

function depVowel(ch: string, series: Series): string {
  const pair = DEP_VOWEL[ch]
  if (!pair) return ''
  return series === 'a' ? pair[0] : pair[1]
}

/**
 * True when chars[j] looks like the start of a new orthographic syllable
 * (consonant that will take a vowel/coeng).
 */
function looksLikeNextOnset(chars: string[], j: number): boolean {
  if (!isCons(chars[j])) return false
  let k = j + 1
  while (chars[k] === COENG && isCons(chars[k + 1])) k += 2
  if (chars[k] === MUUSIKATOAN || chars[k] === TRIISAP) k++
  if (
    isDepVowel(chars[k]) ||
    chars[k] === NIKAHIT ||
    chars[k] === REAHMUK ||
    chars[k] === YUUKALEAPINTU ||
    chars[k] === BANTOC
  ) {
    return true
  }
  // Bare C followed by another C → treat as a new open syllable with inherent vowel.
  return true
}

/**
 * Romanize one orthographic syllable starting at `i`.
 * Returns [latin, scriptSlice, nextIndex] or null.
 */
function readSyllable(chars: string[], i: number): [string, string, number] | null {
  const start = i
  const ch0 = chars[i]
  if (!ch0) return null

  if (ch0 in INDEP_VOWEL) {
    let j = i + 1
    let latin = INDEP_VOWEL[ch0]!
    if (chars[j] === NIKAHIT) {
      latin += 'm'
      j++
    } else if (chars[j] === REAHMUK) {
      latin += 'h'
      j++
    }
    return [latin, chars.slice(start, j).join(''), j]
  }

  if (!isCons(ch0)) return null

  const onset: string[] = [ch0]
  i++
  let hadMuusikatoan = false

  while (chars[i] === COENG && isCons(chars[i + 1])) {
    onset.push(chars[i + 1]!)
    i += 2
  }

  let series = CONS[onset[0]!]?.series ?? 'a'
  if (chars[i] === MUUSIKATOAN) {
    series = 'a'
    hadMuusikatoan = true
    i++
  } else if (chars[i] === TRIISAP) {
    series = 'o'
    i++
  }

  let vowel = ''
  let hasExplicitVowel = false
  if (isDepVowel(chars[i])) {
    vowel = depVowel(chars[i]!, series)
    hasExplicitVowel = true
    i++
  }

  let codaExtra = ''
  if (chars[i] === NIKAHIT) {
    codaExtra = 'm'
    i++
  } else if (chars[i] === REAHMUK) {
    codaExtra = 'h'
    i++
  } else if (chars[i] === YUUKALEAPINTU) {
    if (!hasExplicitVowel) vowel = inherent(series)
    hasExplicitVowel = true
    codaExtra = "'"
    i++
  }

  let bantoc = false
  if (chars[i] === BANTOC) {
    bantoc = true
    i++
  }

  let codaCons: string | null = null
  if (isCons(chars[i])) {
    const next = chars[i + 1]
    const startsNext =
      next === COENG ||
      isDepVowel(next) ||
      next === MUUSIKATOAN ||
      next === TRIISAP ||
      next === NIKAHIT ||
      next === REAHMUK ||
      next === YUUKALEAPINTU ||
      next === BANTOC
    if (!startsNext) {
      const peek = chars[i + 1]
      if (!peek || !isCons(peek) || looksLikeNextOnset(chars, i + 1)) {
        codaCons = chars[i]!
        i++
      }
    }
  }

  let latinOnset = ''
  for (const c of onset) {
    const info = CONS[c]
    if (!info) return null
    latinOnset += info.base
  }
  // ប៉ → p (muusikatoan on ba).
  if (onset[0] === '\u1794' && hadMuusikatoan) {
    latinOnset = 'p' + latinOnset.slice(1)
  }

  if (!hasExplicitVowel) {
    vowel = bantoc ? '' : inherent(series)
  }

  let latin = latinOnset + vowel + codaExtra
  if (codaCons) {
    const c = CONS[codaCons]
    if (!c) return null
    latin += c.base
  }

  if (!latin) {
    latin = inherent(series)
  }

  return [latin, chars.slice(start, i).join(''), i]
}

/** Analyze Khmer script into a hyphenated UNGEGN-style reading. */
export function analyzeKhmer(text: string): KhmerAnalysis | null {
  const trimmed = text.trim()
  if (!trimmed || !KHMER_RE.test(trimmed)) return null

  const chars = [...trimmed]
  const syllables: KhmerSyllable[] = []
  let i = 0
  let pendingSpace = false

  while (i < chars.length) {
    const ch = chars[i]!
    if (/\s/.test(ch) || ch === '\u200B' || ch === '\u00A0') {
      pendingSpace = true
      i++
      continue
    }
    if (!isCons(ch) && !(ch in INDEP_VOWEL)) {
      if (KHMER_RE.test(ch)) {
        return null
      }
      pendingSpace = true
      i++
      continue
    }

    const syl = readSyllable(chars, i)
    if (!syl) return null
    const [latin, script, next] = syl
    if (!latin) return null
    if (pendingSpace && syllables.length) {
      syllables.push({ script: ' ', reading: ' ' })
      pendingSpace = false
    }
    syllables.push({ script, reading: latin })
    i = next
  }

  if (!syllables.length) return null

  let reading = ''
  for (const cur of syllables) {
    if (cur.reading === ' ') {
      reading += ' '
      continue
    }
    if (reading && !reading.endsWith(' ')) reading += '-'
    reading += cur.reading
  }

  return {
    reading,
    syllables: syllables.filter((s) => s.reading !== ' '),
  }
}

/** Compact helper — reading string or null. */
export function romanizeKhmer(text: string): string | null {
  return analyzeKhmer(text)?.reading ?? null
}
