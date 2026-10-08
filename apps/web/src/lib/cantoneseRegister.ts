/**
 * Cantonese spoken (口語) vs written (書面語) helpers for Details / results.
 * Compact panes stay 口語; written is an explicit upgrade action.
 */

/** Markers that usually mean the line is colloquial spoken Cantonese. */
const SPOKEN_MARKERS = [
  '係',
  '唔',
  '咗',
  '嘅',
  '喺',
  '冇',
  '佢',
  '哋',
  '嘢',
  '嚟',
  '睇',
  '嗰',
  '喇',
  '咩',
  '啲',
  '咁',
  '嘞',
  '呀',
  '啊',
  '喎',
  '噃',
  '邊度',
  '點解',
  '做咩',
  '得唔得',
  '好唔好',
]

const WRITTEN_MARKERS = ['是否', '沒有', '他們', '她們', '東西', '為什麼', '在哪裏', '在哪裡']

/** Common 口語 → 書面 replacements (deterministic offline polish). */
const SPOKEN_TO_WRITTEN: Array<[RegExp, string]> = [
  [/係唔係/g, '是否'],
  [/好唔好/g, '好不好'],
  [/得唔得/g, '行不行'],
  [/點解/g, '為什麼'],
  [/邊度/g, '哪裏'],
  [/做咩/g, '做什麼'],
  [/冇/g, '沒有'],
  [/唔/g, '不'],
  [/係/g, '是'],
  [/喺/g, '在'],
  [/佢哋/g, '他們'],
  [/我哋/g, '我們'],
  [/你哋/g, '你們'],
  [/佢/g, '他'],
  [/哋/g, '們'],
  [/嘅/g, '的'],
  [/咗/g, '了'],
  [/嚟/g, '來'],
  [/睇/g, '看'],
  [/嘢/g, '東西'],
  [/嗰/g, '那'],
  [/呢度/g, '這裏'],
  [/嗰度/g, '那裏'],
  [/啲/g, '些'],
  [/咁/g, '這麼'],
]

export function isSpokenCantonese(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (WRITTEN_MARKERS.some((m) => t.includes(m)) && !SPOKEN_MARKERS.some((m) => t.includes(m))) {
    return false
  }
  return SPOKEN_MARKERS.some((m) => t.includes(m))
}

/**
 * Deterministic 口語→書面 polish. Not a full rewrite — Details formalize
 * prefers the model path and falls back here when offline / empty.
 */
export function localWrittenCantonese(text: string): string {
  let out = text.trim()
  if (!out) return out
  for (const [re, to] of SPOKEN_TO_WRITTEN) {
    out = out.replace(re, to)
  }
  // Soften leftover sentence particles that look odd in 書面.
  out = out.replace(/[喇嘞喎噃呀啊]$/u, '')
  return out.trim() || text.trim()
}
