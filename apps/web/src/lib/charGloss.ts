/** English glosses for common Hong Kong colloquial characters (offline / demo). */
import { learnedGloss as lookupLearned } from './learnedGloss'

const CHAR_GLOSS: Record<string, string> = {
  你: 'you',
  我: 'I / me',
  佢: 'he / she / they',
  係: 'to be (yes)',
  唔: 'not',
  喺: 'at / in',
  有: 'have / there is',
  冇: 'do not have / none',
  做: 'do / make',
  緊: 'progressive (-ing)',
  咗: 'perfective (already done)',
  住: 'continuous / live',
  咩: 'what (colloquial)',
  乜: 'what',
  嘢: 'thing',
  呀: 'softening particle',
  㗎: 'assertive particle',
  喇: 'change-of-state particle',
  喎: 'hearsay / soft particle',
  嗎: 'question particle',
  呢: 'this / sentence particle',
  個: 'classifier',
  啲: 'some',
  嘅: 'possessive / relative',
  而: 'and / while',
  家: 'home; in 而家 = now',
  度: 'place / degree',
  邊: 'where / which',
  點: 'how',
  好: 'good / very',
  多: 'many / much',
  謝: 'thanks',
  該: 'in 唔該 = thanks / excuse me',
  早: 'early',
  晨: 'morning',
  哈: 'in 哈囉 = hello',
  囉: 'in 哈囉 = hello',
  嗨: 'hi',
  最: 'most',
  近: 'recent / near',
  幾: 'how many / quite',
  請: 'please',
  問: 'ask',
  賣: 'sell',
  錢: 'money',
  樣: 'kind / appearance',
  地: 'in 地鐵 = MTR',
  鐵: 'in 地鐵 = MTR',
  港: 'harbour / HK',
  站: 'station',
  去: 'go',
  嚟: 'come',
  食: 'eat',
  飲: 'drink',
  睇: 'look / watch',
  聽: 'listen',
  講: 'speak',
  話: 'say',
  知: 'know',
  想: 'want / think',
  會: 'will',
  要: 'want / need',
  得: 'can / get',
  可: 'can',
  以: 'so as to',
  人: 'person',
  大: 'big',
  細: 'small',
  今: 'now / today',
  日: 'day',
  生: 'birth / life (in 生日)',
  快: 'fast; joyful (in 快樂)',
  樂: 'joy (in 快樂)',
  開: 'open; glad (in 開心)',
  心: 'heart (in 開心)',
  牛: 'cow; dated slang in 牛一 (birthday)',
  嘻: 'laughter particle',
  時: 'time',
  候: 'time / wait',
  事: 'matter / affair',
  先: 'first / only then',
  再: 'again',
  都: 'also / all',
  同: 'and / with',
  真: 'really',
  哋: 'plural (we / they)',
  '？': 'question mark',
  '！': 'exclamation',
  '。': 'full stop',
  '，': 'comma',
  愛: 'love',
  蘋: 'apple (in 蘋果)',
  果: 'fruit (in 蘋果)',
  香: 'fragrant; in 香蕉 (banana)',
  牙: 'tooth; in 香牙蕉 (banana)',
  蕉: 'banana',
}

// Keep GENERIC_CHAR_GLOSS in sync with apps/api/src/breakdown.ts.
const GENERIC_CHAR_GLOSS = 'Cantonese character'

function isGenericCharGloss(gloss: string | null | undefined): boolean {
  return (gloss || '').trim() === GENERIC_CHAR_GLOSS
}

/** Prefer a real gloss over the generic placeholder. */
export function pickCharGloss(...candidates: (string | null | undefined)[]): string {
  for (const raw of candidates) {
    const t = (raw || '').trim()
    if (t && !isGenericCharGloss(t)) return t
  }
  return ''
}

export function hasStaticGloss(token: string): boolean {
  const t = token.trim()
  return Boolean(t && CHAR_GLOSS[t])
}

/** Offline gloss: static seed, then learned localStorage cache. */
export function glossForChar(char: string): string {
  const staticGloss = CHAR_GLOSS[char]?.trim() || ''
  if (staticGloss) return staticGloss
  return lookupLearned(char)
}

const HAN_RE = /[\u3400-\u9fff\uf900-\ufaff]/

export function isHanChar(ch: string) {
  return HAN_RE.test(ch)
}

/** True when the string contains any Han character. */
export function hasHan(text: string) {
  return HAN_RE.test(text)
}

export { GENERIC_CHAR_GLOSS }
