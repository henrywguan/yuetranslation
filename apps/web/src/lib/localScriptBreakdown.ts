/**
 * Offline token breakdown for non-Latin script voice langs (Tamil / Bengali on Batch 1).
 * Mirrors API `localScriptBreakdown` so Details is not blank while /api/breakdown loads
 * (DETAIL_PEDAGOGY.localOffline === true).
 */
import type { CharBreakdown } from './jyutping'
import type { Lang } from './types'

export type ScriptDetailLang = 'ta' | 'bn'

const TOKEN_RE: Record<ScriptDetailLang, RegExp> = {
  // Tamil
  ta: /[\u0B80-\u0BFF]+|[0-9]+|[^\s\u0B80-\u0BFF0-9]+/g,
  // Bengali / Bangla
  bn: /[\u0980-\u09FF]+|[0-9]+|[^\s\u0980-\u09FF0-9]+/g,
}

function punctMeaning(tok: string): string {
  if (tok === '?' || tok === '？') return 'question mark'
  if (tok === '!' || tok === '！') return 'exclamation mark'
  if (tok === '.' || tok === '।' || tok === '。') return 'full stop'
  if (tok === ',' || tok === '，') return 'comma'
  return 'punctuation'
}

export function isScriptDetailLang(lang: Lang | string | null | undefined): lang is ScriptDetailLang {
  return lang === 'ta' || lang === 'bn'
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
  const tokens = (text.trim().match(re) || []).filter((t) => t.trim())
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
