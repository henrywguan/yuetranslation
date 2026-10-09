import { toPinyinCached } from './pinyin'
import type { PrimaryLang } from './primaryLanguagePref'
import { PRIMARY_UI_GLOSS } from './primaryUiGloss.data'
import type { Bi } from './uiCopy'

/** Primary languages that replace Jyutping / Chinese chrome with a native gloss. */
export type PrimaryGlossLang = Exclude<PrimaryLang, 'yue' | 'en'>

export function isPrimaryGlossLang(lang: PrimaryLang): lang is PrimaryGlossLang {
  return lang !== 'yue' && lang !== 'en'
}

/**
 * Non-Cantonese / non-English / non-Mandarin primaries: the gloss becomes the
 * secondary UI line and Chinese is hidden. Mandarin keeps Chinese characters as
 * secondary (pinyin stays tertiary).
 *
 * Until a full BiText gloss pass lands for newer primaries, missing glosses fall
 * back to English-only chrome (see BiText / biPlain) instead of Cantonese 漢字.
 */
export function primaryReplacesChinese(lang: PrimaryLang): boolean {
  return lang !== 'yue' && lang !== 'en' && lang !== 'cmn'
}

/** BCP 47 / HTML lang for the primary gloss line. */
export function primaryGlossHtmlLang(lang: PrimaryLang): string {
  switch (lang) {
    case 'tl':
      return 'tl'
    case 'es':
      return 'es-MX'
    case 'eses':
      return 'es-ES'
    case 'vi':
      return 'vi'
    case 'th':
      return 'th'
    case 'lo':
      return 'lo'
    case 'ko':
      return 'ko'
    case 'ja':
      return 'ja'
    case 'id':
      return 'id'
    case 'ms':
      return 'ms'
    case 'pt':
      return 'pt-BR'
    case 'fr':
      return 'fr'
    case 'hi':
      return 'hi'
    case 'km':
      return 'km'
    case 'my':
      return 'my'
    case 'jv':
      return 'jv'
    case 'it':
      return 'it'
    case 'de':
      return 'de'
    case 'nl':
      return 'nl'
    case 'ar':
      return 'ar-EG'
    case 'arsa':
      return 'ar-SA'
    case 'cmn':
      return 'zh-Latn'
    case 'wuu':
      return 'wuu-Latn'
    case 'sichuan':
      return 'zh-Latn-CN-sichuan'
    case 'yue':
    case 'en':
    default:
      return 'en'
  }
}

type BiWithGloss = Bi & Partial<Record<PrimaryGlossLang, string>>

/**
 * Native UI gloss for Account Hub primary ≠ Cantonese/English.
 * Mandarin falls back to tone-mark pinyin of the Chinese line when no explicit gloss.
 */
export function resolvePrimaryUiGloss(
  copy: Bi,
  primary: PrimaryLang,
): string | undefined {
  if (primary === 'yue' || primary === 'en') return undefined

  const fromBi = (copy as BiWithGloss)[primary]
  if (typeof fromBi === 'string' && fromBi.trim()) return fromBi.trim()

  const row = PRIMARY_UI_GLOSS[copy.en]
  const fromMap = row?.[primary as keyof typeof row]
  if (typeof fromMap === 'string' && fromMap.trim()) return fromMap.trim()

  if (primary === 'cmn' && copy.zh.trim()) {
    const py = toPinyinCached(copy.zh)
    if (py.trim()) return py.trim()
  }

  return undefined
}
