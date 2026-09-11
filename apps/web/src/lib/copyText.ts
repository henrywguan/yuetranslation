import type { Lang } from './types'
import { ensureJyutpingSegs, rubyJpSyllable } from './jyutping'

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

/**
 * Clipboard Jyutping + Chao tone letters (LSHK numbers + contour marks) (e.g. `teng1˥ m4˨˩`).
 * Skips chars without a syllable (punctuation / unknown).
 */
export async function copyableJyutpingChao(text: string): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const segs = await ensureJyutpingSegs(trimmed)
  if (!segs.length) return ''
  const out: string[] = []
  for (const seg of segs) {
    const jp = (seg.jp || '').trim()
    if (!jp) continue
    out.push(rubyJpSyllable(jp))
  }
  return out.join(' ')
}
