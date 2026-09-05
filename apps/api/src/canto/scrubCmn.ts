/**
 * Cheap Cantonese colloquial → Mandarin (普通话) scrub.
 * Phrase-level first (safer), then high-confidence character swaps when Yue-heavy.
 * Inverse of scrubMandarinToYue — never run when target is Yue.
 */

const PHRASE_SWAPS: Array<[RegExp, string]> = [
  [/係唔係/g, '是不是'],
  [/點解/g, '为什么'],
  [/做緊咩/g, '在做什么'],
  [/而家/g, '现在'],
  [/呢度/g, '这里'],
  [/嗰度/g, '那里'],
  [/邊度/g, '哪里'],
  [/唔係/g, '不是'],
  [/定係/g, '还是'],
  [/冇/g, '没有'],
  [/你哋/g, '你们'],
  [/我哋/g, '我们'],
  [/佢哋/g, '他们'],
  [/鍾意/g, '喜欢'],
  [/一齊/g, '一起'],
  [/咗/g, '了'],
  [/緊/g, '着'],
  [/啲/g, '点'],
  [/嘅/g, '的'],
  [/咩/g, '什么'],
  [/點/g, '怎么'],
  [/睇/g, '看'],
  [/講/g, '说'],
  [/俾|畀/g, '给'],
  [/食/g, '吃'],
  [/飲/g, '喝'],
  [/仲/g, '还'],
]

/** Single-char swaps applied after phrases when the string still looks Yue-leaning. */
const CHAR_SWAPS: Array<[RegExp, string]> = [
  [/係/g, '是'],
  [/唔/g, '不'],
  [/喺/g, '在'],
  [/哋/g, '们'],
  [/冇/g, '没'],
  [/嘅/g, '的'],
  [/咗/g, '了'],
  // Soften / strip Cantonese-only particles
  [/㗎|喇|喎/g, ''],
]

export function scrubYueToCmn(input: string): { text: string; changed: boolean } {
  let text = input
  const before = text
  for (const [re, to] of PHRASE_SWAPS) {
    text = text.replace(re, to)
  }
  if (looksYueHeavy(text)) {
    for (const [re, to] of CHAR_SWAPS) {
      text = text.replace(re, to)
    }
  }
  return { text, changed: text !== before }
}

/** Heuristic: presence of common Cantonese-only / colloquial markers. */
function looksYueHeavy(text: string) {
  return /[係唔喺哋冇嘅咗㗎喇喎啲咩緊睇講俾畀]/.test(text)
}
