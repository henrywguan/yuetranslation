/**
 * Vientiane Lao tone reading (five phonemic tones).
 *
 * Older textbooks list six tones; the sixth is not a separate Vientiane phoneme.
 * Spoken pitch is not the written mark: class + live/dead + length decide it.
 * Diacritics: mid unmarked, low falling grave, high falling circumflex,
 * high rising acute, low rising caron.
 */

export type LaoTone = 'mid' | 'lowFalling' | 'highFalling' | 'highRising' | 'lowRising'

export type LaoSyllable = {
  script: string
  reading: string
  tone: LaoTone
}

export type LaoAnalysis = {
  reading: string
  syllables: LaoSyllable[]
}

export const LAO_TONE_HONESTY =
  'Vientiane Lao has five tones. The written mark is not the pitch — consonant class and live or dead syllable decide it. Older six-tone charts split one of these, not a sixth phoneme.'

const HIGH = new Set([...'ຂສຖຜຝຫ'])
const MID = new Set([...'ກຈດຕບປຢອ'])
const LOW = new Set([...'ຄງຊຍທນພຟມຣລວຮ'])
const LEADING = new Set([...'ເແໂໃໄ'])
const ABOVE = new Set([...'ິີຶືຸູັົໍ'])
const SONORANT = new Set([...'ງຍນມຣລວ'])
const PRE: Record<string, { rom: string; cls: 'high' }> = {
  '\u0EDC': { rom: 'n', cls: 'high' },
  '\u0EDD': { rom: 'm', cls: 'high' },
}

const TONE_CH: Record<string, 'ek' | 'tho' | 'ti' | 'catawa'> = {
  '\u0EC8': 'ek',
  '\u0EC9': 'tho',
  '\u0ECA': 'ti',
  '\u0ECB': 'catawa',
}

const ONSET: Record<string, string> = {
  ກ: 'k',
  ຂ: 'kh',
  ຄ: 'kh',
  ງ: 'ng',
  ຈ: 'j',
  ຊ: 's',
  ຍ: 'ny',
  ດ: 'd',
  ຕ: 'dt',
  ຖ: 'th',
  ທ: 'th',
  ນ: 'n',
  ບ: 'b',
  ປ: 'bp',
  ຜ: 'ph',
  ຝ: 'f',
  ພ: 'ph',
  ຟ: 'f',
  ມ: 'm',
  ຢ: 'y',
  ຣ: 'r',
  ລ: 'l',
  ວ: 'w',
  ສ: 's',
  ຫ: 'h',
  ອ: '',
  ຮ: 'h',
}

const COMBINING: Record<LaoTone, string> = {
  mid: '',
  lowFalling: '\u0300',
  highFalling: '\u0302',
  highRising: '\u0301',
  lowRising: '\u030C',
}

type Cls = 'high' | 'mid' | 'low'
type Mark = 'none' | 'ek' | 'tho' | 'ti' | 'catawa'

function isCons(ch: string | undefined): ch is string {
  return !!ch && (HIGH.has(ch) || MID.has(ch) || LOW.has(ch) || ch in PRE)
}

function classOf(ch: string): Cls {
  if (ch in PRE) return 'high'
  if (HIGH.has(ch)) return 'high'
  if (MID.has(ch)) return 'mid'
  return 'low'
}

function markVowel(latin: string, tone: LaoTone): string {
  const mark = COMBINING[tone]
  if (!mark) return latin
  const i = latin.search(/[aeiouy]/)
  if (i < 0) return latin
  return (latin.slice(0, i + 1) + mark + latin.slice(i + 1)).normalize('NFC')
}

function codaLatin(ch: string): string {
  if ('ກຂຄ'.includes(ch)) return 'k'
  if ('ບປພຟຝຜ'.includes(ch)) return 'p'
  if (ch === 'ງ') return 'ng'
  if (ch === 'ມ') return 'm'
  if (ch === 'ຍ') return 'y'
  if (ch === 'ວ') return 'w'
  if ('ນນຣລ'.includes(ch)) return 'n'
  return 't'
}

function isStopCoda(ch: string): boolean {
  return !'ງນມຍວຣລ'.includes(ch)
}

export function laoToneFromRules(
  cls: Cls,
  kind: 'live' | 'dead',
  length: 'short' | 'long',
  mark: Mark,
): LaoTone {
  if (mark === 'ek') return 'mid'
  if (mark === 'tho') return cls === 'high' ? 'lowFalling' : 'highFalling'
  if (mark === 'ti') return 'highRising'
  if (mark === 'catawa') return 'lowRising'
  if (kind === 'live') {
    if (cls === 'low') return 'highRising'
    return 'lowRising'
  }
  if (length === 'short') return cls === 'low' ? 'mid' : 'highRising'
  return cls === 'low' ? 'highFalling' : 'lowFalling'
}

function consonantStartsSyllable(s: string, i: number): boolean {
  const n = s[i + 1]
  if (!n) return false
  return LEADING.has(n) || ABOVE.has(n) || n === 'າ' || n === 'ະ' || n === 'ຳ' || !!TONE_CH[n]
}

type Taken = LaoSyllable & { end: number }

function takeSyllable(s: string, start: number): Taken | null {
  let i = start
  let leading = ''
  if (LEADING.has(s[i] || '')) {
    leading = s[i]!
    i += 1
  }
  if (!isCons(s[i])) return null

  let onsetChars = s[i]!
  let eff = classOf(onsetChars)
  let onsetRom = PRE[onsetChars]?.rom ?? ONSET[onsetChars] ?? ''
  i += 1

  if (onsetChars === 'ຫ' && SONORANT.has(s[i] || '')) {
    const sono = s[i]!
    eff = 'high'
    onsetRom = ONSET[sono] ?? ''
    onsetChars += sono
    i += 1
  } else if (!leading && isCons(s[i]) && s[i] !== 'ອ' && consonantStartsSyllable(s, i) && !(onsetChars in PRE)) {
    const tone = laoToneFromRules(eff, 'dead', 'short', 'none')
    return {
      script: s.slice(start, i),
      reading: markVowel(`${onsetRom}a`, tone),
      tone,
      end: i,
    }
  }

  let above = ''
  let mark: Mark = 'none'
  let follow = ''
  while (i < s.length) {
    const c = s[i]!
    if (TONE_CH[c]) {
      mark = TONE_CH[c]
      i += 1
      continue
    }
    if (c === '໌') {
      i += 1
      continue
    }
    if (ABOVE.has(c)) {
      above += c
      i += 1
      continue
    }
    if (c === 'າ' || c === 'ະ' || c === 'ຳ') {
      follow += c
      i += 1
      continue
    }
    if (c === 'ຍ' && leading === 'ເ') {
      follow += c
      i += 1
      continue
    }
    if (c === 'ວ' && (follow.includes('າ') || above.includes('ີ') || leading === 'ເ')) {
      follow += c
      i += 1
      continue
    }
    break
  }

  let oVowel = false
  if (!leading && !above && !follow && s[i] === 'ອ') {
    const after = s[i + 1]
    const vowelMark = !!after && (ABOVE.has(after) || after === 'າ' || after === 'ະ' || after === 'ຳ')
    if (!vowelMark && (!after || isCons(after) || !!TONE_CH[after] || after === '໌' || LEADING.has(after))) {
      oVowel = true
      i += 1
    }
  }

  let uai = false
  if (s[i] === 'ວ' && s[i + 1] === 'ຍ') {
    uai = true
    i += 2
  }

  let coda = ''
  if (!uai && isCons(s[i])) {
    const next = s[i + 1]
    const hasVowel = !!(leading || above || follow || oVowel)
    const codaBeforeNextLeading = !!next && LEADING.has(next) && hasVowel
    const startsNext =
      !!next &&
      !codaBeforeNextLeading &&
      (ABOVE.has(next) || next === 'າ' || next === 'ະ' || next === 'ຳ' || !!TONE_CH[next])
    if (!startsNext) {
      coda = s[i]!
      i += 1
    }
  }

  if (above.includes('ັ') && !coda) return null

  let vowel = 'a'
  let length: 'short' | 'long' = 'short'
  let implicitSonorant = false
  if (uai) {
    vowel = 'uai'
    length = 'long'
  } else if (follow.includes('ຳ')) {
    vowel = 'am'
    length = 'long'
    implicitSonorant = true
  } else if (leading === 'ໄ' || leading === 'ໃ') {
    vowel = 'ai'
    length = 'long'
  } else if (leading === 'ເ' && follow.includes('ະ')) {
    vowel = 'e'
    length = 'short'
  } else if (leading === 'ເ' && (follow.includes('ວ') || above.includes('ີ'))) {
    vowel = follow.includes('ວ') && above.includes('ີ') ? 'ia' : follow.includes('ວ') ? 'ew' : 'e'
    length = 'long'
  } else if (leading === 'ເ') {
    vowel = 'e'
    length = 'long'
  } else if (leading === 'ແ' && follow.includes('ະ')) {
    vowel = 'ae'
    length = 'short'
  } else if (leading === 'ແ') {
    vowel = 'ae'
    length = 'long'
  } else if (leading === 'ໂ' && follow.includes('ະ')) {
    vowel = 'o'
    length = 'short'
  } else if (leading === 'ໂ') {
    vowel = 'o'
    length = 'long'
  } else if (above.includes('ີ')) {
    vowel = 'ii'
    length = 'long'
  } else if (above.includes('ິ')) {
    vowel = 'i'
    length = 'short'
  } else if (above.includes('ູ')) {
    vowel = 'uu'
    length = 'long'
  } else if (above.includes('ຸ')) {
    vowel = 'u'
    length = 'short'
  } else if (above.includes('ື')) {
    vowel = 'ue'
    length = 'long'
  } else if (above.includes('ຶ')) {
    vowel = 'ue'
    length = 'short'
  } else if (above.includes('ໍ') || oVowel) {
    vowel = 'oo'
    length = 'long'
  } else if (above.includes('ົ')) {
    vowel = 'o'
    length = 'short'
  } else if (follow.includes('າ')) {
    vowel = 'aa'
    length = 'long'
  } else if (follow.includes('ະ') || above.includes('ັ')) {
    vowel = 'a'
    length = 'short'
  }

  const dead =
    (!implicitSonorant && !!coda && isStopCoda(coda)) ||
    (!implicitSonorant && !coda && length === 'short')
  const tone = laoToneFromRules(eff, dead ? 'dead' : 'live', length, mark)
  const codaRom = coda ? codaLatin(coda) : ''
  const base = `${onsetRom}${vowel}${implicitSonorant ? '' : codaRom}`
  const script = s.slice(start, i)
  if (!script) return null
  return { script, reading: markVowel(base, tone), tone, end: i }
}

function parseRun(run: string): LaoSyllable[] | null {
  const syllables: LaoSyllable[] = []
  let i = 0
  while (i < run.length) {
    if (run[i] === 'ໆ' && syllables.length) {
      syllables.push({ ...syllables[syllables.length - 1]!, script: 'ໆ' })
      i += 1
      continue
    }
    const syl = takeSyllable(run, i)
    if (!syl || syl.end <= i) return null
    syllables.push({ script: syl.script, reading: syl.reading, tone: syl.tone })
    i = syl.end
  }
  return syllables.length ? syllables : null
}

export function analyzeLao(text: string): LaoAnalysis | null {
  const trimmed = text.trim()
  if (!trimmed || !/[\u0E80-\u0EFF]/.test(trimmed)) return null
  const parts = trimmed.split(/(\s+)/)
  const syllables: LaoSyllable[] = []
  const chunks: string[] = []
  for (const part of parts) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      chunks.push(part)
      continue
    }
    const bits = part.split(/([^\u0E80-\u0EFF]+)/)
    for (const bit of bits) {
      if (!bit) continue
      if (/[\u0E80-\u0EFF]/.test(bit)) {
        const syls = parseRun(bit)
        if (!syls) return null
        syllables.push(...syls)
        chunks.push(syls.map((s) => s.reading).join('-'))
      } else {
        chunks.push(bit)
      }
    }
  }
  if (!syllables.length) return null
  return { reading: chunks.join('').replace(/\s+/g, ' ').trim(), syllables }
}

export function laoToneLabel(tone: LaoTone): string {
  switch (tone) {
    case 'mid':
      return 'Mid level'
    case 'lowFalling':
      return 'Low falling'
    case 'highFalling':
      return 'High falling'
    case 'highRising':
      return 'High rising'
    case 'lowRising':
      return 'Low rising'
  }
}

export function laoToneChip(tone: LaoTone): string {
  switch (tone) {
    case 'mid':
      return 'Mid'
    case 'lowFalling':
      return 'Low fall'
    case 'highFalling':
      return 'High fall'
    case 'highRising':
      return 'High rise'
    case 'lowRising':
      return 'Low rise'
  }
}
