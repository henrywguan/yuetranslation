/** Helpers for DeepSeek Chat TTS + dictation language picks. */
import type { Lang } from './types'

/** Map browser locale → STT lock for chat dictation (Web Speech). */
export function chatDictateLang(navLang = typeof navigator !== 'undefined' ? navigator.language : 'en'): Lang {
  const loc = String(navLang || 'en').toLowerCase()
  if (loc.startsWith('zh-hk') || loc.includes('yue') || loc.startsWith('zh-tw')) return 'yue'
  if (loc.startsWith('zh')) return 'cmn'
  if (loc.startsWith('es')) return 'es'
  if (loc.startsWith('vi')) return 'vi'
  if (loc.startsWith('tl') || loc.startsWith('fil')) return 'tl'
  return 'en'
}

/**
 * Pick Azure TTS voice lang for an assistant bubble.
 * CJK-heavy → Mandarin; otherwise English (DeepSeek answers are usually English).
 */
export function chatSpeakLang(text: string): Lang {
  const t = text.trim()
  if (!t) return 'en'
  const cjk = (t.match(/[\u3400-\u9fff]/g) || []).length
  const latin = (t.match(/[A-Za-z]/g) || []).length
  if (cjk >= 8 && cjk >= latin) return 'cmn'
  return 'en'
}

/** Join prior draft + new STT text with a single space when needed. */
export function mergeDictateText(prior: string, spoken: string): string {
  const a = prior.replace(/\s+$/g, '')
  const b = spoken.trim()
  if (!b) return prior
  if (!a) return b
  if (/[\s([{“‘"']$/.test(a) || /^[,.;:!?)\]}”’]/.test(b)) return `${a}${b}`
  return `${a} ${b}`
}
