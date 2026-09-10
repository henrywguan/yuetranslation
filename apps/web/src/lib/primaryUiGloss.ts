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
 * Latin-script + Shanghainese / Sichuanese primaries: the gloss becomes the
 * secondary UI line and Chinese is hidden. Mandarin keeps Chinese characters as
 * secondary (pinyin stays tertiary).
 */
export function primaryReplacesChinese(lang: PrimaryLang): boolean {
  return lang === 'tl' || lang === 'es' || lang === 'vi' || lang === 'wuu' || lang === 'sichuan'
}

/** BCP 47 / HTML lang for the primary gloss line. */
export function primaryGlossHtmlLang(lang: PrimaryLang): string {
  switch (lang) {
    case 'tl':
      return 'tl'
    case 'es':
      return 'es-MX'
    case 'vi':
      return 'vi'
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
  const fromMap = row?.[primary as PrimaryGlossLang]
  if (typeof fromMap === 'string' && fromMap.trim()) return fromMap.trim()

  if (primary === 'cmn' && copy.zh.trim()) {
    const py = toPinyinCached(copy.zh)
    if (py.trim()) return py.trim()
  }

  return undefined
}
