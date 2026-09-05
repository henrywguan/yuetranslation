import type { Lang } from './types'

const HAN_RE = /[\u3400-\u9fff\uf900-\ufaff]/
const CANTO_PUNCT = /[？！。，、…]/

/** Plain clipboard text — Han only for 粵/Mandarin, Latin script only for English. */
export function copyableText(text: string, lang: Lang): string {
  const trimmed = text.trim()
  if (!trimmed) return ''

  if (lang === 'yue' || lang === 'cmn') {
    return [...trimmed]
      .filter((ch) => HAN_RE.test(ch) || CANTO_PUNCT.test(ch))
      .join('')
      .trim()
  }

  return trimmed
    .replace(/[\u3400-\u9fff\uf900-\ufaff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
