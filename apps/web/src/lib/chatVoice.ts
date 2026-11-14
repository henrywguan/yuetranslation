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
 * Heuristic: Jyutping-ish → yue; Hangul/Kana unused; CJK → cmn; Spanish/Vietnamese/Tagalog
 * cues; else English.
 */
export function chatSpeakLang(text: string): Lang {
  const t = text.trim()
  if (!t) return 'en'
  const lower = t.toLowerCase()
  const cjk = (t.match(/[\u3400-\u9fff]/g) || []).length
  const latin = (t.match(/[A-Za-z]/g) || []).length
  // Jyutping tone digits after latin syllables are a strong Cantonese signal.
  const jyutpingHits = (lower.match(/\b[a-z]{1,6}[1-6]\b/g) || []).length
  if (jyutpingHits >= 3 || (cjk >= 4 && /jyutping|cantonese|粵|廣東話|广东话/i.test(t))) return 'yue'
  if (cjk >= 8 && cjk >= latin) return 'cmn'
  if ((lower.match(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g) || []).length >= 4) {
    return 'vi'
  }
  if (
    (lower.match(
      /\b(el|la|los|las|de|que|y|en|un|una|es|por|para|con|como|más|también|hola|gracias)\b/g,
    ) || []).length >= 5
  ) {
    return 'es'
  }
  if (
    (lower.match(/\b(ang|mga|ng|sa|ako|ikaw|siya|kami|kayo|sila|po|opo|salamat|kumusta)\b/g) || [])
      .length >= 4
  ) {
    return 'tl'
  }
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
