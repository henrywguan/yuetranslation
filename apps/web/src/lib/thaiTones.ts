/**
 * Central Thai tone reading.
 *
 * The written tone mark is not the spoken tone. Pitch comes from effective
 * consonant class + live/dead syllable + vowel length + mark (mai ek/tho/tri/jattawa).
 * Compact UI shows this reading under the Thai script. RTGS is not used — it drops tones.
 *
 * Diacritics on the vowel: mid unmarked, low grave, falling circumflex, high acute, rising caron.
 */

export type ThaiTone = 'mid' | 'low' | 'falling' | 'high' | 'rising'

export type ThaiSyllable = {
  script: string
  reading: string
  tone: ThaiTone
}

export type ThaiAnalysis = {
  reading: string
  syllables: ThaiSyllable[]
}

export const THAI_TONE_HONESTY =
  'The written mark is not the spoken tone. Consonant class plus live or dead syllable decides Central Thai pitch.'

const MID = new Set([...'กจฎฏดตบปอ'])
const HIGH = new Set([...'ขฃฉฐถผฝศษสห'])
const LOW = new Set([...'คฅฆงชซฌญฑฒณทธนพฟภมยรลวฬฮ'])

const LEADING = new Set([...'เแโใไ'])
const TONE_CH: Record<string, 'ek' | 'tho' | 'tri' | 'jattawa'> = {
  '\u0E48': 'ek',
  '\u0E49': 'tho',
  '\u0E4A': 'tri',
  '\u0E4B': 'jattawa',
}
const ABOVE = new Set([...'ิีึืุูั็'])
const SONORANT = new Set([...'งญนมยรลวฬ'])
const CLUSTER_FIRST = new Set([...'กขคฆตปพภฝผฟ'])
const CLUSTER_SECOND = new Set([...'รลว'])

const ONSET: Record<string, string> = {
  ก: 'k',
  ข: 'kh',
  ฃ: 'kh',
  ค: 'kh',
  ฅ: 'kh',
  ฆ: 'kh',
  ง: 'ng',
  จ: 'j',
  ฉ: 'ch',
  ช: 'ch',
  ซ: 's',
  ฌ: 'ch',
  ญ: 'y',
  ฎ: 'd',
  ฏ: 'dt',
  ฐ: 'th',
  ฑ: 'th',
  ฒ: 'th',
  ณ: 'n',
  ด: 'd',
  ต: 'dt',
  ถ: 'th',
  ท: 'th',
  ธ: 'th',
  น: 'n',
  บ: 'b',
  ป: 'bp',
  ผ: 'ph',
  ฝ: 'f',
  พ: 'ph',
  ฟ: 'f',
  ภ: 'ph',
  ม: 'm',
  ย: 'y',
  ร: 'r',
  ล: 'l',
  ว: 'w',
  ศ: 's',
  ษ: 's',
  ส: 's',
  ห: 'h',
  ฬ: 'l',
  อ: '',
  ฮ: 'h',
}

const TONE_COMBINING: Record<ThaiTone, string> = {
  mid: '',
  low: '\u0300',
  falling: '\u0302',
  high: '\u0301',
  rising: '\u030C',
}

function isCons(ch: string | undefined): ch is string {
  return !!ch && MID.has(ch) || !!ch && HIGH.has(ch) || !!ch && LOW.has(ch)
}

function classOf(ch: string): 'high' | 'mid' | 'low' {
  if (HIGH.has(ch)) return 'high'
  if (MID.has(ch)) return 'mid'
  return 'low'
}

function markVowel(latin: string, tone: ThaiTone): string {
  const mark = TONE_COMBINING[tone]
  if (!mark) return latin
  const i = latin.search(/[aeiouy]/)
  if (i < 0) return latin + mark
  return (latin.slice(0, i + 1) + mark + latin.slice(i + 1)).normalize('NFC')
}

function codaLatin(ch: string): string {
  if ('กขคฆ'.includes(ch)) return 'k'
  if ('บปพฟภ'.includes(ch)) return 'p'
  if ('ง'.includes(ch)) return 'ng'
  if ('ม'.includes(ch)) return 'm'
  if ('ย'.includes(ch)) return 'y'
  if ('ว'.includes(ch)) return 'w'
  if ('นณญรลฬ'.includes(ch)) return 'n'
  return 't'
}

function isStopCoda(ch: string): boolean {
  return !'งนมยวรลญณฬ'.includes(ch)
}

type Mark = 'none' | 'ek' | 'tho' | 'tri' | 'jattawa'

export function thaiToneFromRules(
  cls: 'high' | 'mid' | 'low',
  kind: 'live' | 'dead',
  length: 'short' | 'long',
  mark: Mark,
): ThaiTone | null {
  if (mark === 'ek') {
    if (cls === 'low') return 'falling'
    return 'low'
  }
  if (mark === 'tho') {
    if (cls === 'low') return 'high'
    return 'falling'
  }
  if (mark === 'tri') return cls === 'mid' ? 'high' : null
  if (mark === 'jattawa') return cls === 'mid' ? 'rising' : null
  if (kind === 'live') {
    if (cls === 'high') return 'rising'
    return 'mid'
  }
  if (cls === 'low' && length === 'long') return 'falling'
  if (cls === 'low' && length === 'short') return 'high'
  return 'low'
}

function oVowelFollows(s: string, i: number): boolean {
  if (s[i] !== 'อ') return false
  const after = s[i + 1]
  if (after && (ABOVE.has(after) || after === 'า' || after === 'ะ' || after === 'ำ')) return false
  return !after || isCons(after) || after === '์' || !!TONE_CH[after] || LEADING.has(after)
}

function consonantStartsSyllable(s: string, i: number): boolean {
  const ch = s[i]
  if (!isCons(ch)) return false
  const n = s[i + 1]
  if (!n) return false
  if (LEADING.has(n) || ABOVE.has(n) || n === 'า' || n === 'ะ' || n === 'ำ' || n === '็') return true
  if (TONE_CH[n]) return true
  return false
}

type Taken = ThaiSyllable & { end: number }

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
  let onsetRom = ONSET[onsetChars] ?? ''
  i += 1

  if (onsetChars === 'ห' && SONORANT.has(s[i] || '')) {
    const sono = s[i]!
    eff = 'high'
    onsetRom = ONSET[sono] ?? ''
    onsetChars += sono
    i += 1
  } else if (onsetChars === 'อ' && s[i] === 'ย' && !LEADING.has(leading)) {
    // อักษรนำ อ — silent class leader, mainly อย่า / อย่าง / อยาก.
    eff = 'mid'
    onsetRom = 'y'
    onsetChars += 'ย'
    i += 1
  } else if (CLUSTER_FIRST.has(onsetChars) && CLUSTER_SECOND.has(s[i] || '')) {
    const second = s[i]!
    onsetRom = (ONSET[onsetChars] ?? '') + (second === 'ร' ? 'r' : second === 'ล' ? 'l' : 'w')
    onsetChars += second
    i += 1
  } else if (!leading && isCons(s[i]) && s[i] !== 'อ' && consonantStartsSyllable(s, i)) {
    const tone = thaiToneFromRules(eff, 'dead', 'short', 'none')
    if (!tone) return null
    const script = s.slice(start, i)
    return { script, reading: markVowel(`${onsetRom}a`, tone), tone, end: i }
  }

  let above = ''
  let mark: Mark = 'none'
  let killed = false
  let follow = ''
  while (i < s.length) {
    const c = s[i]!
    if (TONE_CH[c]) {
      mark = TONE_CH[c]
      i += 1
      continue
    }
    if (c === '์') {
      killed = true
      i += 1
      continue
    }
    if (ABOVE.has(c) || c === '็') {
      above += c
      i += 1
      continue
    }
    if (c === 'า' || c === 'ะ' || c === 'ำ') {
      follow += c
      i += 1
      continue
    }
    if (c === 'อ' && (leading === 'เ' || above.includes('ื') || above.includes('ิ'))) {
      follow += c
      i += 1
      continue
    }
    if (c === 'ย' && (leading === 'เ' || above.includes('ี'))) {
      follow += c
      i += 1
      continue
    }
    if (c === 'ว' && (follow.includes('า') || leading === 'เ' && follow.includes('ี'))) {
      follow += c
      i += 1
      continue
    }
    break
  }

  // Consonant + อ as the vowel /ɔː/ (ขอ, ขอบ) — อ was not consumed above.
  let oVowel = false
  if (!leading && !above && !follow && oVowelFollows(s, i)) {
    oVowel = true
    follow = 'อ'
    i += 1
  }

  let uai = false
  if (!killed && s[i] === 'ว' && s[i + 1] === 'ย') {
    uai = true
    i += 2
  }

  let coda = ''
  if (!killed && !uai && isCons(s[i])) {
    const next = s[i + 1]
    const hasVowel = !!(leading || above || follow || oVowel)
    const codaBeforeNextLeading = !!next && LEADING.has(next) && hasVowel
    const startsNext =
      !!next &&
      !codaBeforeNextLeading &&
      (ABOVE.has(next) || next === 'า' || next === 'ะ' || next === 'ำ' || !!TONE_CH[next])
    if (!startsNext) {
      coda = s[i]!
      i += 1
      if (s[i] === '์') {
        killed = true
        i += 1
      }
    }
  }

  if (above.includes('ั') && !coda && !killed) return null

  let vowel = 'a'
  let length: 'short' | 'long' = 'short'
  let implicitSonorant = false

  if (uai) {
    vowel = 'uai'
    length = 'long'
  } else if (follow.includes('ำ')) {
    vowel = 'am'
    length = 'long'
    implicitSonorant = true
  } else if (leading === 'ไ' || leading === 'ใ') {
    vowel = 'ai'
    length = 'long'
  } else if (leading === 'เ' && above.includes('ี') && follow.includes('ย')) {
    vowel = 'ia'
    length = 'long'
  } else if (leading === 'เ' && above.includes('ื')) {
    vowel = 'uea'
    length = 'long'
  } else if (leading === 'เ' && follow.includes('า') && follow.includes('ะ')) {
    vowel = 'o'
    length = 'short'
  } else if (leading === 'เ' && follow === 'า') {
    vowel = 'ao'
    length = 'long'
  } else if (leading === 'เ' && above.includes('ิ')) {
    vowel = 'oe'
    length = above.includes('็') || follow.includes('ะ') ? 'short' : 'long'
  } else if (leading === 'เ' && follow.includes('ะ')) {
    vowel = 'e'
    length = 'short'
  } else if (leading === 'เ') {
    vowel = 'e'
    length = 'long'
  } else if (leading === 'แ' && follow.includes('ะ')) {
    vowel = 'ae'
    length = 'short'
  } else if (leading === 'แ') {
    vowel = 'ae'
    length = 'long'
  } else if (leading === 'โ' && follow.includes('ะ')) {
    vowel = 'o'
    length = 'short'
  } else if (leading === 'โ') {
    vowel = 'o'
    length = 'long'
  } else if (above.includes('ี')) {
    vowel = 'ii'
    length = 'long'
  } else if (above.includes('ิ')) {
    vowel = 'i'
    length = 'short'
  } else if (above.includes('ู')) {
    vowel = 'uu'
    length = 'long'
  } else if (above.includes('ุ')) {
    vowel = 'u'
    length = 'short'
  } else if (above.includes('ื')) {
    vowel = 'ue'
    length = 'long'
  } else if (above.includes('ึ')) {
    vowel = 'ue'
    length = 'short'
  } else if (oVowel) {
    vowel = 'oo'
    length = 'long'
  } else if (follow.includes('า')) {
    vowel = 'aa'
    length = 'long'
  } else if (follow.includes('ะ') || above.includes('ั')) {
    vowel = 'a'
    length = 'short'
  } else if (above.includes('็')) {
    vowel = 'a'
    length = 'short'
  } else {
    vowel = 'a'
    length = 'short'
  }

  if (above.includes('็')) length = 'short'

  const dead =
    (!implicitSonorant && !!coda && isStopCoda(coda)) ||
    (!implicitSonorant && !coda && length === 'short')
  const kind = dead ? 'dead' : 'live'
  const tone = thaiToneFromRules(eff, kind, length, mark)
  if (!tone) return null

  const codaRom = coda && !killed ? codaLatin(coda) : ''
  const base = `${onsetRom}${vowel}${implicitSonorant ? '' : codaRom}`
  const script = s.slice(start, i)
  if (!script) return null
  return { script, reading: markVowel(base, tone), tone, end: i }
}

function parseRun(run: string): ThaiSyllable[] | null {
  const syllables: ThaiSyllable[] = []
  let i = 0
  while (i < run.length) {
    if (run[i] === 'ๆ' && syllables.length) {
      const prev = syllables[syllables.length - 1]!
      syllables.push({ ...prev, script: 'ๆ' })
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

/** Tone-marked reading for Central Thai script. Null when a syllable will not parse. */
export function analyzeThai(text: string): ThaiAnalysis | null {
  const trimmed = text.trim()
  if (!trimmed || !/[\u0E00-\u0E7F]/.test(trimmed)) return null
  const parts = trimmed.split(/(\s+)/)
  const syllables: ThaiSyllable[] = []
  const chunks: string[] = []
  for (const part of parts) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      chunks.push(part)
      continue
    }
    const thai = part.match(/^[\u0E00-\u0E7Fๆ]+$/)
    if (!thai) {
      const bits = part.split(/([^\u0E00-\u0E7F]+)/)
      for (const bit of bits) {
        if (!bit) continue
        if (/^[\u0E00-\u0E7Fๆ]+$/.test(bit)) {
          const syls = parseRun(bit)
          if (!syls) return null
          syllables.push(...syls)
          chunks.push(syls.map((s) => s.reading).join('-'))
        } else {
          chunks.push(bit)
        }
      }
      continue
    }
    const syls = parseRun(part)
    if (!syls) return null
    syllables.push(...syls)
    chunks.push(syls.map((s) => s.reading).join('-'))
  }
  if (!syllables.length) return null
  return { reading: chunks.join('').replace(/\s+/g, ' ').trim(), syllables }
}

export function thaiToneLabel(tone: ThaiTone): string {
  switch (tone) {
    case 'mid':
      return 'Mid — level'
    case 'low':
      return 'Low'
    case 'falling':
      return 'Falling'
    case 'high':
      return 'High'
    case 'rising':
      return 'Rising'
  }
}

export function thaiToneChip(tone: ThaiTone): string {
  switch (tone) {
    case 'mid':
      return 'Mid'
    case 'low':
      return 'Low'
    case 'falling':
      return 'Falling'
    case 'high':
      return 'High'
    case 'rising':
      return 'Rising'
  }
}
