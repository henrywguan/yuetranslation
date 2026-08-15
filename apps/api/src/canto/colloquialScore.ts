/** Colloquial HK Cantonese feature score (higher = more 口語). */

const POSITIVE = [
  '喺',
  '唔',
  '係',
  '咗',
  '緊',
  '啲',
  '㗎',
  '喇',
  '喎',
  '咩',
  '嘢',
  '哋',
  '佢',
  '冇',
  '嚟',
  '睇',
  '講',
  '俾',
  '仲',
  '而家',
  '點',
  '邊',
  '呢度',
  '嗰',
  '呀',
  '嘅',
]

const NEGATIVE = [
  '们',
  '們',
  '什么',
  '什麼',
  '怎么',
  '怎麼',
  '吗',
  '嗎',
  '正在',
  '没有',
  '沒有',
  '这',
  '這',
  '那',
  '的',
  '了',
  '和',
  '给',
  '給',
  '说',
  '說',
  '看',
  '吃',
  '喝',
  '在',
]

export function colloquialScore(text: string): number {
  let score = 0
  for (const tok of POSITIVE) {
    if (text.includes(tok)) score += tok.length > 1 ? 2 : 1
  }
  for (const tok of NEGATIVE) {
    if (text.includes(tok)) score -= tok.length > 1 ? 3 : 2
  }
  // Short spoken replies can still be fine with a low absolute score.
  if (text.trim().length <= 4 && score >= 0) score += 1
  return score
}

/** Threshold below which we attempt a constrained rewrite on finals. */
export const COLLOQUIAL_REWRITE_THRESHOLD = 0
