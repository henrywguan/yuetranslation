/**
 * Offline token breakdown for Latin-script langs (en / tl / es / vi / ceb / ilo / bcl).
 * Used when /api/breakdown is slow, metered, or offline — prevents an empty details panel.
 */
import type { CharBreakdown } from './jyutping'
import type { Lang } from './types'

function tokenizeLatin(text: string): string[] {
  const matches = text.match(
    /[A-Za-zÀ-ÖØ-öø-ÿĀ-ſḀ-ỿ]+(?:['\u2019][A-Za-zÀ-ÖØ-öø-ÿĀ-ſḀ-ỿ]+)?|[0-9]+|[^\sA-Za-zÀ-ÖØ-öø-ÿĀ-ſḀ-ỿ0-9]+/g,
  )
  return (matches || []).filter((t) => t.trim())
}

function punctMeaning(tok: string): string {
  if (tok === '?' || tok === '？') return 'question mark'
  if (tok === '!' || tok === '！') return 'exclamation mark'
  if (tok === '.' || tok === '。') return 'full stop'
  if (tok === ',' || tok === '，') return 'comma'
  return 'punctuation'
}

/**
 * @param phraseGloss paired translation / definition used when the phrase is a single content word
 */
export function buildLocalLatinBreakdown(
  text: string,
  opts?: { phraseGloss?: string; lang?: Lang },
): CharBreakdown[] {
  const tokens = tokenizeLatin(text.trim())
  const content = tokens.filter((t) => /[\p{L}\p{N}]/u.test(t))
  const singleContent = content.length === 1
  const gloss = (opts?.phraseGloss || '').trim()

  return tokens.map((tok) => {
    if (/^[^\p{L}\p{N}\u2019']+$/u.test(tok)) {
      return { char: tok, jyutping: null, meaning: punctMeaning(tok) }
    }
    return {
      char: tok,
      jyutping: null,
      meaning: singleContent && gloss ? gloss : '',
    }
  })
}

export function isLatinDetailLang(lang: Lang): boolean {
  return (
    lang === 'en' ||
    lang === 'tl' ||
    lang === 'es' ||
    lang === 'vi' ||
    lang === 'ceb' ||
    lang === 'ilo' ||
    lang === 'bcl'
  )
}
