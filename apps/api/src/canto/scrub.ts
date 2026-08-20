/**
 * Cheap Mandarin / 書面語 → HK colloquial Cantonese scrub.
 * Phrase-level first (safer), then a few high-confidence character swaps.
 * Runs in milliseconds — safe on interim + final.
 */

const PHRASE_SWAPS: Array<[RegExp, string]> = [
  [/在干嘛|在幹嘛|在干什么|在幹什麼|在做什么|在做什麼/g, '做緊咩'],
  [/在干|在幹|在做/g, '做緊'],
  [/什么样|什麼樣|怎么样|怎麼樣/g, '點樣'],
  [/什么|什麼|甚么|甚麼/g, '咩'],
  [/怎么|怎麼|怎样|怎樣/g, '點'],
  [/为什么|為什麼|为甚么|為甚麼/g, '點解'],
  [/不是/g, '唔係'],
  [/没有|沒有/g, '冇'],
  [/你们|你們/g, '你哋'],
  [/我们|我們/g, '我哋'],
  [/他们|他們|她们|她們/g, '佢哋'],
  [/正在/g, '緊'],
  [/现在|現在/g, '而家'],
  [/这里|這裡|这儿|這兒/g, '呢度'],
  [/那里|那裡|那儿|那兒/g, '嗰度'],
  [/哪里|哪裡|哪儿|哪兒/g, '邊度'],
  [/这个|這個/g, '呢個'],
  [/那个|那個/g, '嗰個'],
  [/一点|一點|一些/g, '啲'],
  [/知道/g, '知'],
  [/喜欢|喜歡/g, '鍾意'],
  [/告诉|告訴/g, '話'],
  [/一起/g, '一齊'],
  [/还是|還是/g, '定係'],
  [/还|還(?!是)/g, '仲'],
  [/给|給/g, '俾'],
  [/看(?!見|到)/g, '睇'],
  [/说|說/g, '講'],
  [/吃/g, '食'],
  [/喝/g, '飲'],
  [/在(?=[^\s]{0,4}[边邊上下里裏内外度])/g, '喺'],
]

/** Single-char swaps applied after phrases (lower confidence — keep short). */
const CHAR_SWAPS: Array<[RegExp, string]> = [
  [/们|們/g, '哋'],
  [/这|這/g, '呢'],
  [/那/g, '嗰'],
  [/哪/g, '邊'],
  [/没|沒/g, '冇'],
  [/不/g, '唔'],
  [/和/g, '同'],
  [/的/g, '嘅'],
  [/吗|嗎/g, '呀'],
  [/了/g, '咗'],
  [/在/g, '喺'],
]

export function scrubMandarinToYue(input: string): { text: string; changed: boolean } {
  let text = input
  const before = text
  for (const [re, to] of PHRASE_SWAPS) {
    text = text.replace(re, to)
  }
  // Only apply char swaps if the string still looks Mandarin-leaning.
  if (looksMandarinHeavy(text)) {
    for (const [re, to] of CHAR_SWAPS) {
      text = text.replace(re, to)
    }
  }
  return { text, changed: text !== before }
}

/** Heuristic: presence of common Mandarin-only / written markers. */
function looksMandarinHeavy(text: string) {
  return /[们們什么什麼怎么怎麼吗嗎这這那哪没有沒有的了和给給]/.test(text)
}
