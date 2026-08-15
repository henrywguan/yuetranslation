import { existsSync, readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { wordshkEnabled } from './licenseGate.js'

export type GlossHit = {
  gloss: string
  jyutping: string | null
  source: 'seed' | 'cc-canto' | 'wordshk'
}

type PackedDict = {
  source: string
  license: string
  attribution?: string
  version?: string
  entryCount: number
  entries: Record<string, { jyutping: string | null; gloss: string; simplified?: string | null }>
}

const dir = dirname(fileURLToPath(import.meta.url))

/** Hand-tuned HK colloquial particles / high-frequency chars (overrides imports). */
const SEED: Record<string, string> = {
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
  咩: 'what (colloquial)',
  乜: 'what',
  嘢: 'thing',
  呀: 'softening particle',
  㗎: 'assertive particle',
  喇: 'change-of-state particle',
  喎: 'hearsay / soft particle',
  嗎: 'question particle',
  呢: 'this / particle',
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
  你好: 'hello',
  唔該: 'thanks / excuse me',
  多謝: 'thank you',
  而家: 'now',
  最: 'most',
  近: 'recent / near',
  幾: 'how many / quite',
  哋: 'plural marker (you/they)',
  嚟: 'come',
  睇: 'look / watch',
  講: 'speak',
  俾: 'give / let',
  仲: 'still / also',
  '？': 'question mark',
  '！': 'exclamation mark',
  '。': 'full stop',
  '，': 'comma',
}

function loadPacked(basename: string): PackedDict | null {
  const gz = join(dir, 'data', `${basename}.json.gz`)
  const plain = join(dir, 'data', `${basename}.json`)
  try {
    if (existsSync(gz)) {
      const buf = gunzipSync(readFileSync(gz))
      return JSON.parse(buf.toString('utf8')) as PackedDict
    }
    if (existsSync(plain)) {
      return JSON.parse(readFileSync(plain, 'utf8')) as PackedDict
    }
  } catch {
    return null
  }
  return null
}

const ccCanto = loadPacked('cc-canto-gloss')
const wordshk = wordshkEnabled() ? loadPacked('wordshk-gloss') : null

export function glossStats() {
  return {
    seed: Object.keys(SEED).length,
    ccCanto: ccCanto?.entryCount || 0,
    wordshk: wordshkEnabled() ? wordshk?.entryCount || 0 : 0,
    wordshkEligible: wordshkEnabled(),
    attributions: [
      ccCanto?.attribution,
      wordshkEnabled() ? wordshk?.attribution : null,
    ].filter(Boolean),
  }
}

/** Look up a Traditional (or as-written) token: seed > words.hk (if gated) > CC-Canto. */
export function lookupGloss(token: string): GlossHit | null {
  const t = token.trim()
  if (!t) return null
  if (SEED[t]) {
    return { gloss: SEED[t], jyutping: null, source: 'seed' }
  }
  if (wordshk?.entries[t]) {
    const e = wordshk.entries[t]
    return { gloss: e.gloss, jyutping: e.jyutping, source: 'wordshk' }
  }
  if (ccCanto?.entries[t]) {
    const e = ccCanto.entries[t]
    return { gloss: e.gloss, jyutping: e.jyutping, source: 'cc-canto' }
  }
  return null
}

/**
 * Greedy longest-match glosses over a Cantonese string (max 4 chars).
 * Used by breakdown to prefer word senses when available.
 */
export function segmentGlosses(text: string): Array<{ surface: string; hit: GlossHit | null }> {
  const chars = Array.from(text.trim())
  const out: Array<{ surface: string; hit: GlossHit | null }> = []
  let i = 0
  while (i < chars.length) {
    let matched: GlossHit | null = null
    let len = 1
    const max = Math.min(4, chars.length - i)
    for (let L = max; L >= 1; L--) {
      const surface = chars.slice(i, i + L).join('')
      const hit = lookupGloss(surface)
      if (hit) {
        matched = hit
        len = L
        out.push({ surface, hit })
        break
      }
    }
    if (!matched) {
      out.push({ surface: chars[i], hit: null })
    }
    i += len
  }
  return out
}
