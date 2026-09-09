/**
 * Keyless / offline visuals for Details dictionary media.
 * Tenor’s public API shut down 2026-06-30 — do not call it.
 *
 * - emoji: fully offline mnemonic (no network, no key)
 * - image: Wikimedia / Wikipedia REST thumbnail (no API key; polite UA)
 */

export type DictionaryMedia = {
  type: 'emoji' | 'image' | 'gif'
  /** Remote image/gif URL when type is image|gif */
  url?: string
  previewUrl?: string
  /** Unicode emoji when type is emoji */
  emoji?: string
  alt?: string
  source: string
}

/** Curated lemma → emoji (English + a few high-frequency CJK). Expand as needed. */
const EMOJI_BY_LEMMA: Record<string, string> = {
  apple: '🍎',
  蘋果: '🍎',
  苹果: '🍎',
  banana: '🍌',
  香蕉: '🍌',
  orange: '🍊',
  橙: '🍊',
  橘子: '🍊',
  grape: '🍇',
  葡萄: '🍇',
  water: '💧',
  水: '💧',
  tea: '🍵',
  茶: '🍵',
  coffee: '☕',
  咖啡: '☕',
  rice: '🍚',
  飯: '🍚',
  饭: '🍚',
  noodle: '🍜',
  noodles: '🍜',
  麵: '🍜',
  面: '🍜',
  fish: '🐟',
  魚: '🐟',
  鱼: '🐟',
  chicken: '🐔',
  雞: '🐔',
  鸡: '🐔',
  pig: '🐷',
  豬: '🐷',
  猪: '🐷',
  dog: '🐶',
  狗: '🐶',
  cat: '🐱',
  貓: '🐱',
  猫: '🐱',
  bird: '🐦',
  鳥: '🐦',
  鸟: '🐦',
  sun: '☀️',
  太陽: '☀️',
  太阳: '☀️',
  moon: '🌙',
  月亮: '🌙',
  star: '⭐',
  星: '⭐',
  fire: '🔥',
  火: '🔥',
  rain: '🌧️',
  雨: '🌧️',
  book: '📖',
  書: '📖',
  书: '📖',
  phone: '📱',
  電話: '📱',
  电话: '📱',
  car: '🚗',
  車: '🚗',
  车: '🚗',
  bus: '🚌',
  巴士: '🚌',
  train: '🚆',
  火車: '🚆',
  火车: '🚆',
  plane: '✈️',
  airplane: '✈️',
  飛機: '✈️',
  飞机: '✈️',
  house: '🏠',
  home: '🏠',
  屋企: '🏠',
  家: '🏠',
  school: '🏫',
  學校: '🏫',
  学校: '🏫',
  money: '💰',
  錢: '💰',
  钱: '💰',
  love: '❤️',
  愛: '❤️',
  爱: '❤️',
  happy: '😊',
  開心: '😊',
  开心: '😊',
  sad: '😢',
  傷心: '😢',
  伤心: '😢',
  hello: '👋',
  你好: '👋',
  thanks: '🙏',
  多謝: '🙏',
  谢谢: '🙏',
  thank: '🙏',
  yes: '✅',
  no: '❌',
  time: '⏰',
  時間: '⏰',
  时间: '⏰',
  food: '🍽️',
  食物: '🍽️',
  drink: '🥤',
  飲: '🥤',
  喝: '🥤',
  tree: '🌳',
  樹: '🌳',
  树: '🌳',
  flower: '🌸',
  花: '🌸',
  mountain: '⛰️',
  山: '⛰️',
  sea: '🌊',
  ocean: '🌊',
  海: '🌊',
  heart: '❤️',
  心: '❤️',
  hand: '✋',
  手: '✋',
  eye: '👁️',
  眼: '👁️',
  ear: '👂',
  耳: '👂',
  mouth: '👄',
  口: '👄',
  foot: '🦶',
  腳: '🦶',
  脚: '🦶',
  baby: '👶',
  嬰兒: '👶',
  婴儿: '👶',
  man: '👨',
  男人: '👨',
  woman: '👩',
  女人: '👩',
  child: '🧒',
  小朋友: '🧒',
  friend: '🤝',
  朋友: '🤝',
  work: '💼',
  工作: '💼',
  sleep: '😴',
  瞓: '😴',
  睡: '😴',
  walk: '🚶',
  行: '🚶',
  走: '🚶',
  run: '🏃',
  跑: '🏃',
  music: '🎵',
  音樂: '🎵',
  音乐: '🎵',
  movie: '🎬',
  film: '🎬',
  電影: '🎬',
  电影: '🎬',
  game: '🎮',
  遊戲: '🎮',
  游戏: '🎮',
  computer: '💻',
  電腦: '💻',
  电脑: '💻',
  internet: '🌐',
  網絡: '🌐',
  网络: '🌐',
  weather: '🌤️',
  天氣: '🌤️',
  天气: '🌤️',
  cold: '🥶',
  凍: '🥶',
  冷: '🥶',
  hot: '🥵',
  熱: '🥵',
  热: '🥵',
  bread: '🍞',
  麵包: '🍞',
  面包: '🍞',
  milk: '🥛',
  奶: '🥛',
  egg: '🥚',
  蛋: '🥚',
  cake: '🎂',
  蛋糕: '🎂',
  pizza: '🍕',
  burger: '🍔',
  ice: '🧊',
  冰: '🧊',
  snow: '❄️',
  雪: '❄️',
  wind: '💨',
  風: '💨',
  风: '💨',
  cloud: '☁️',
  雲: '☁️',
  云: '☁️',
  night: '🌃',
  夜晚: '🌃',
  morning: '🌅',
  朝早: '🌅',
  早上: '🌅',
  city: '🏙️',
  城市: '🏙️',
  country: '🏞️',
  國家: '🏞️',
  国家: '🏞️',
  map: '🗺️',
  地圖: '🗺️',
  地图: '🗺️',
  camera: '📷',
  相機: '📷',
  相机: '📷',
  photo: '📸',
  相: '📸',
  照片: '📸',
}

function normalizeLemma(text: string): string {
  return text.trim().toLowerCase().replace(/[’']/g, "'")
}

/** Offline emoji mnemonic for a lemma (+ optional paired gloss). */
export function emojiMnemonic(
  lemma: string,
  contextText?: string,
): DictionaryMedia | null {
  const keys = [lemma, contextText || '']
    .map((k) => normalizeLemma(k))
    .filter(Boolean)
  // Prefer exact; then first whitespace token (e.g. "red apple" → apple).
  for (const key of keys) {
    if (EMOJI_BY_LEMMA[key]) {
      return {
        type: 'emoji',
        emoji: EMOJI_BY_LEMMA[key],
        alt: lemma.trim() || key,
        source: 'emoji',
      }
    }
    const token = key.split(/[\s,，、]+/).find((t) => EMOJI_BY_LEMMA[t])
    if (token) {
      return {
        type: 'emoji',
        emoji: EMOJI_BY_LEMMA[token],
        alt: lemma.trim() || token,
        source: 'emoji',
      }
    }
  }
  return null
}

const WIKI_UA =
  'JyutTranslate/1.0 (https://github.com/henrywguan/yuetranslation; details-dictionary; keyless Wikimedia thumbnails)'

function wikiHostForQuery(query: string): string {
  // Prefer Chinese Wikipedia when the query is mostly Han.
  const han = (query.match(/[\u3400-\u9fff]/g) || []).join('').length
  const letters = (query.match(/[A-Za-z]/g) || []).join('').length
  return han >= letters && han > 0 ? 'zh.wikipedia.org' : 'en.wikipedia.org'
}

/**
 * Keyless Wikipedia REST summary thumbnail (illustrative still — not a GIF).
 * No API key; fails soft on network / missing pages.
 */
export async function fetchWikimediaThumb(
  query: string,
): Promise<DictionaryMedia | null> {
  const title = query.trim().slice(0, 80)
  if (!title) return null
  const host = wikiHostForQuery(title)
  const url = `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': WIKI_UA,
        'Api-User-Agent': WIKI_UA,
      },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      title?: string
      description?: string
      extract?: string
      thumbnail?: { source?: string }
      originalimage?: { source?: string }
      content_urls?: { desktop?: { page?: string } }
      type?: string
    }
    // Skip disambiguation / no image.
    if (data.type === 'disambiguation') return null
    const src = data.thumbnail?.source || data.originalimage?.source
    if (!src) return null
    return {
      type: 'image',
      url: src,
      previewUrl: data.thumbnail?.source || src,
      alt: data.description || data.title || title,
      source: 'wikipedia',
    }
  } catch {
    return null
  }
}

/** Build media list: emoji first (offline), then optional Wikimedia still. */
export async function resolveDictionaryMedia(opts: {
  lemma: string
  contextText?: string
  wantRemote?: boolean
}): Promise<{ media: DictionaryMedia[]; provenance: string[] }> {
  const media: DictionaryMedia[] = []
  const provenance: string[] = []
  const emoji = emojiMnemonic(opts.lemma, opts.contextText)
  if (emoji) {
    media.push(emoji)
    provenance.push('emoji')
  }
  if (opts.wantRemote !== false) {
    const thumb = await fetchWikimediaThumb(
      [opts.lemma, opts.contextText].filter(Boolean).join(' ').slice(0, 60) || opts.lemma,
    )
    if (thumb) {
      media.push(thumb)
      provenance.push('wikipedia')
    }
  }
  return { media, provenance }
}
