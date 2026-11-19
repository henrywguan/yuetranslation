/**
 * Offline token breakdown for Latin-script langs (en / tl / es / vi / id / ms / pt / ptpt / fr / jv / it / de / nl / tr / pl / ro / cs / hu / sv / da / nb / fi / sk / hr / ca / az / uz / sw / af / et / lv / lt / ga / cy / eu / gl / mt / is / bs / sq / zu / so / ceb / ilo / bcl).
 * Used when /api/breakdown is slow, metered, or offline — prevents an empty details panel.
 */
import type { CharBreakdown } from './jyutping'
import type { Lang } from './types'

// Includes IPA-extension letters (ə U+0259 for Azerbaijani) and the apostrophe variants Uzbek uses (o‘ g‘ / o' g').
const LATIN_LETTERS = 'A-Za-zÀ-ÖØ-öø-ÿĀ-ſƀ-ɏɐ-ʯḀ-ỿ'
const LATIN_TOKEN_RE = new RegExp(
  `[${LATIN_LETTERS}]+(?:['\u2018\u2019\u02BB\u02BC][${LATIN_LETTERS}]+)?|[0-9]+|[^\\s${LATIN_LETTERS}0-9]+`,
  'g',
)

function tokenizeLatin(text: string): string[] {
  const matches = text.match(LATIN_TOKEN_RE)
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
    if (/^[^\p{L}\p{N}\u2018\u2019\u02BB\u02BC']+$/u.test(tok)) {
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
    lang === 'eses' ||
    lang === 'vi' ||
    lang === 'id' ||
    lang === 'ms' ||
    lang === 'pt' ||
    lang === 'ptpt' ||
    lang === 'fr' ||
    lang === 'jv' ||
    lang === 'it' ||
    lang === 'de' ||
    lang === 'nl' ||
    lang === 'tr' ||
    lang === 'pl' ||
    lang === 'ro' ||
    lang === 'cs' ||
    lang === 'hu' ||
    lang === 'sv' ||
    lang === 'da' ||
    lang === 'nb' ||
    lang === 'fi' ||
    lang === 'sk' ||
    lang === 'hr' ||
    lang === 'ca' ||
    lang === 'az' ||
    lang === 'uz' ||
    lang === 'sw' ||
    lang === 'af' ||
    lang === 'et' ||
    lang === 'lv' ||
    lang === 'lt' ||
    lang === 'ga' ||
    lang === 'cy' ||
    lang === 'eu' ||
    lang === 'gl' ||
    lang === 'mt' ||
    lang === 'is' ||
    lang === 'bs' ||
    lang === 'sq' ||
    lang === 'zu' ||
    lang === 'so' ||
    lang === 'ceb' ||
    lang === 'ilo' ||
    lang === 'bcl'
  )
}
