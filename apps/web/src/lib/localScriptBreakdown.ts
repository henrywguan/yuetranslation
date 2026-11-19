/**
 * Offline token breakdown for non-Latin script voice langs.
 * Mirrors API `localScriptBreakdown` so Details is not blank while /api/breakdown loads
 * (DETAIL_PEDAGOGY.localOffline === true).
 *
 * Batch 1: ta, bn · Batch 2: te, gu, kn, el, ru, uk, he, fa, ur
 * Batch 3a: ml, mr, pa, or, si, ne · Batch 3b (Cyrillic): kk, bg, sr
 * (Latin Batch langs use `localLatinBreakdown` instead.)
 */
import type { CharBreakdown } from './jyutping'
import type { Lang } from './types'

export type ScriptDetailLang =
  | 'ta'
  | 'bn'
  | 'te'
  | 'gu'
  | 'kn'
  | 'el'
  | 'ru'
  | 'uk'
  | 'he'
  | 'fa'
  | 'ur'
  | 'ml'
  | 'mr'
  | 'pa'
  | 'or'
  | 'si'
  | 'ne'
  | 'kk'
  | 'bg'
  | 'sr'

const TOKEN_RE: Record<ScriptDetailLang, RegExp> = {
  ta: /[\u0B80-\u0BFF]+|[0-9]+|[^\s\u0B80-\u0BFF0-9]+/g,
  bn: /[\u0980-\u09FF]+|[0-9]+|[^\s\u0980-\u09FF0-9]+/g,
  te: /[\u0C00-\u0C7F]+|[0-9]+|[^\s\u0C00-\u0C7F0-9]+/g,
  gu: /[\u0A80-\u0AFF]+|[0-9]+|[^\s\u0A80-\u0AFF0-9]+/g,
  kn: /[\u0C80-\u0CFF]+|[0-9]+|[^\s\u0C80-\u0CFF0-9]+/g,
  el: /[\u0370-\u03FF\u1F00-\u1FFF]+|[0-9]+|[^\s\u0370-\u03FF\u1F00-\u1FFF0-9]+/g,
  ru: /[\u0400-\u04FF]+|[0-9]+|[^\s\u0400-\u04FF0-9]+/g,
  uk: /[\u0400-\u04FF\u02BC]+|[0-9]+|[^\s\u0400-\u04FF\u02BC0-9]+/g,
  he: /[\u0590-\u05FF]+|[0-9]+|[^\s\u0590-\u05FF0-9]+/g,
  fa: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|[0-9]+|[^\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF0-9]+/g,
  ur: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|[0-9]+|[^\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF0-9]+/g,
  ml: /[\u0D00-\u0D7F]+|[0-9]+|[^\s\u0D00-\u0D7F0-9]+/g,
  mr: /[\u0900-\u0963\u0966-\u097F]+|[0-9]+|[^\s\u0900-\u0963\u0966-\u097F0-9]+/g,
  pa: /[\u0A00-\u0A7F]+|[0-9]+|[^\s\u0A00-\u0A7F0-9]+/g,
  or: /[\u0B00-\u0B7F]+|[0-9]+|[^\s\u0B00-\u0B7F0-9]+/g,
  si: /[\u0D80-\u0DFF]+|[0-9]+|[^\s\u0D80-\u0DFF0-9]+/g,
  ne: /[\u0900-\u0963\u0966-\u097F]+|[0-9]+|[^\s\u0900-\u0963\u0966-\u097F0-9]+/g,
  kk: /[\u0400-\u04FF]+|[0-9]+|[^\s\u0400-\u04FF0-9]+/g,
  bg: /[\u0400-\u04FF]+|[0-9]+|[^\s\u0400-\u04FF0-9]+/g,
  sr: /[\u0400-\u04FF]+|[0-9]+|[^\s\u0400-\u04FF0-9]+/g,
}

function punctMeaning(tok: string): string {
  if (tok === '?' || tok === '？') return 'question mark'
  if (tok === '!' || tok === '！') return 'exclamation mark'
  if (tok === '.' || tok === '।' || tok === '。') return 'full stop'
  if (tok === ',' || tok === '，') return 'comma'
  return 'punctuation'
}

export function isScriptDetailLang(lang: Lang | string | null | undefined): lang is ScriptDetailLang {
  return (
    lang === 'ta' ||
    lang === 'bn' ||
    lang === 'te' ||
    lang === 'gu' ||
    lang === 'kn' ||
    lang === 'el' ||
    lang === 'ru' ||
    lang === 'uk' ||
    lang === 'he' ||
    lang === 'fa' ||
    lang === 'ur' ||
    lang === 'ml' ||
    lang === 'mr' ||
    lang === 'pa' ||
    lang === 'or' ||
    lang === 'si' ||
    lang === 'ne' ||
    lang === 'kk' ||
    lang === 'bg' ||
    lang === 'sr'
  )
}

/**
 * @param phraseGloss paired translation / definition used when the phrase is a single content word
 */
export function buildLocalScriptBreakdown(
  text: string,
  lang: ScriptDetailLang,
  opts?: { phraseGloss?: string },
): CharBreakdown[] {
  const re = TOKEN_RE[lang]
  // Clone via match on a fresh exec — avoid shared /g lastIndex surprises across calls.
  const tokens = (text.trim().match(new RegExp(re.source, re.flags)) || []).filter((t) => t.trim())
  const content = tokens.filter((t) => /[\p{L}\p{M}\p{N}]/u.test(t))
  const singleContent = content.length === 1
  const gloss = (opts?.phraseGloss || '').trim()

  return tokens.map((tok) => {
    if (/^[^\p{L}\p{M}\p{N}]+$/u.test(tok)) {
      return { char: tok, jyutping: null, meaning: punctMeaning(tok) }
    }
    return {
      char: tok,
      jyutping: null,
      meaning: singleContent && gloss ? gloss : '',
    }
  })
}
