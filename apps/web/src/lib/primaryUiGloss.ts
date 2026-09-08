import { toPinyinCached } from './pinyin'
import type { PrimaryLang } from './primaryLanguagePref'
import { PRIMARY_UI_GLOSS } from './primaryUiGloss.data'
import type { Bi } from './uiCopy'

/** Primary languages that replace Jyutping in BiText chrome. */
export type PrimaryGlossLang = Exclude<PrimaryLang, 'yue' | 'en'>

export function isPrimaryGlossLang(lang: PrimaryLang): lang is PrimaryGlossLang {
  return lang !== 'yue' && lang !== 'en'
}

/** BCP 47 / HTML lang for the tertiary primary gloss line. */
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
    case 'yue':
    default:
      return 'en'
  }
}

type BiWithGloss = Bi & Partial<Record<PrimaryGlossLang, string>>

/**
 * Tertiary UI gloss that replaces Jyutping when Account Hub primary ≠ Cantonese/English.
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
  const fromMap = row?.[primary]
  if (typeof fromMap === 'string' && fromMap.trim()) return fromMap.trim()

  if (primary === 'cmn' && copy.zh.trim()) {
    const py = toPinyinCached(copy.zh)
    if (py.trim()) return py.trim()
  }

  return undefined
}
