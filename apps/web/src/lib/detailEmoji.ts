/**
 * Offline emoji mnemonics for Details (client seed before / with enrich).
 * Keep in sync with apps/api/src/detailsMedia.ts — no network, no key.
 */
const EMOJI_BY_LEMMA: Record<string, string> = {
  apple: '🍎',
  蘋果: '🍎',
  苹果: '🍎',
  banana: '🍌',
  香蕉: '🍌',
  orange: '🍊',
  橙: '🍊',
  grape: '🍇',
  葡萄: '🍇',
  water: '💧',
  水: '💧',
  tea: '🍵',
  茶: '🍵',
  coffee: '☕',
  咖啡: '☕',
  book: '📖',
  書: '📖',
  书: '📖',
  phone: '📱',
  car: '🚗',
  車: '🚗',
  车: '🚗',
  dog: '🐶',
  狗: '🐶',
  cat: '🐱',
  貓: '🐱',
  猫: '🐱',
  fish: '🐟',
  魚: '🐟',
  鱼: '🐟',
  love: '❤️',
  愛: '❤️',
  爱: '❤️',
  sun: '☀️',
  moon: '🌙',
  star: '⭐',
  fire: '🔥',
  rain: '🌧️',
  home: '🏠',
  家: '🏠',
  school: '🏫',
  money: '💰',
  錢: '💰',
  钱: '💰',
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/['']/g, "'")
}

/** Offline emoji for a lemma (+ optional paired gloss). */
export function detailEmojiFor(lemma: string, contextText?: string): string | undefined {
  const keys = [lemma, contextText || '']
    .map(normalize)
    .filter(Boolean)
  for (const key of keys) {
    if (EMOJI_BY_LEMMA[key]) return EMOJI_BY_LEMMA[key]
    const token = key.split(/[\s,，、]+/).find((t) => EMOJI_BY_LEMMA[t])
    if (token) return EMOJI_BY_LEMMA[token]
  }
  return undefined
}
