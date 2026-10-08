/**
 * Cantonese Yale romanization from LSHK Jyutping syllables.
 * Display toggle only — Jyutping (+ Chao) stays the product default.
 */

import type { JyutTone } from './jyutping'
import { parseJyutpingTone } from './jyutping'

/** Jyutping initials longest-first. */
const INITIALS = [
  'ng',
  'gw',
  'kw',
  'zh',
  'ch',
  'sh',
  'b',
  'p',
  'm',
  'f',
  'd',
  't',
  'n',
  'l',
  'g',
  'k',
  'h',
  'z',
  'c',
  's',
  'j',
  'w',
]

const FINAL_MAP: Record<string, string> = {
  aa: 'a',
  aai: 'aai',
  aau: 'aau',
  aam: 'aam',
  aan: 'aan',
  aang: 'aang',
  aap: 'aap',
  aat: 'aat',
  aak: 'aak',
  ai: 'ai',
  au: 'au',
  am: 'am',
  an: 'an',
  ang: 'ang',
  ap: 'ap',
  at: 'at',
  ak: 'ak',
  e: 'e',
  ei: 'ei',
  eu: 'eu',
  em: 'em',
  eng: 'eng',
  ep: 'ep',
  ek: 'ek',
  i: 'i',
  iu: 'iu',
  im: 'im',
  in: 'in',
  ing: 'ing',
  ip: 'ip',
  it: 'it',
  ik: 'ik',
  o: 'o',
  oi: 'oi',
  ou: 'ou',
  on: 'on',
  ong: 'ong',
  ot: 'ot',
  ok: 'ok',
  oe: 'eu',
  oeng: 'eung',
  oek: 'euk',
  eoi: 'eui',
  eon: 'eun',
  eot: 'eut',
  u: 'u',
  ui: 'ui',
  un: 'un',
  ung: 'ung',
  ut: 'ut',
  uk: 'uk',
  yu: 'yu',
  yun: 'yun',
  yut: 'yut',
  m: 'm',
  ng: 'ng',
}

const INITIAL_MAP: Record<string, string> = {
  z: 'j',
  c: 'ch',
  j: 'y',
}

const YALE_TONES: Record<JyutTone, { mark: string; h: boolean }> = {
  '1': { mark: '\u0304', h: false },
  '2': { mark: '\u0301', h: false },
  '3': { mark: '', h: false },
  '4': { mark: '\u0300', h: true },
  '5': { mark: '\u0301', h: true },
  '6': { mark: '', h: true },
}

function applyYaleTone(base: string, tone: JyutTone): string {
  const { mark, h } = YALE_TONES[tone]
  const nucleus = /[aeiou]+/i.exec(base)
  // Syllabic m / ng: mark the first letter; low tones take a trailing h.
  if (!nucleus) {
    const out = h ? `${base}h` : base
    return `${out.slice(0, 1)}${mark}${out.slice(1)}`.normalize('NFC')
  }
  const start = nucleus.index
  const end = start + nucleus[0].length
  // Yale low tones (4–6): h follows the vowel cluster, before any final consonant.
  const withH = h ? `${base.slice(0, end)}h${base.slice(end)}` : base
  if (!mark) return withH.normalize('NFC')
  return `${withH.slice(0, start + 1)}${mark}${withH.slice(start + 1)}`.normalize('NFC')
}

function splitJyutping(roman: string): { initial: string; final: string } {
  const lower = roman.toLowerCase()
  for (const init of INITIALS) {
    if (lower.startsWith(init) && lower.length > init.length) {
      return { initial: init, final: lower.slice(init.length) }
    }
  }
  return { initial: '', final: lower }
}

/** One Jyutping syllable → Yale (tone-marked). Unknown syllables pass through. */
export function jyutpingSyllableToYale(jp: string): string {
  const parsed = parseJyutpingTone(jp)
  if (!parsed) return jp.trim()
  const roman = parsed.roman.replace(/[1-6]$/, '')
  const { initial, final } = splitJyutping(roman)
  const yaleInit = INITIAL_MAP[initial] ?? initial
  const yaleFinal = FINAL_MAP[final] || final
  let body = `${yaleInit}${yaleFinal}`
  // Yale: jyu → yu, ji → yi
  if (body.startsWith('yyu')) body = `yu${body.slice(3)}`
  if (body.startsWith('yi') && yaleInit === 'y') {
    /* keep yi */
  }
  return applyYaleTone(body, parsed.tone)
}

/** Replace bare Jyutping syllables in free text with Yale. */
export function jyutpingTextToYale(text: string): string {
  return text.replace(/\b([A-Za-z]+[1-6])\b/g, (syl) => jyutpingSyllableToYale(syl))
}
