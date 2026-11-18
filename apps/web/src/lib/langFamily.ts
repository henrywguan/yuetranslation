import type { IndicLang } from './indicPedagogy'
import type { EuroLang } from './euroPedagogy'
import type { CyrillicLang } from './cyrillicPedagogy'
import type { RtlFamilyLang } from './rtlPedagogy'

/** Batch 2 voice languages rendered by `LangFamilyText` (one renderer per script family). */
export type LangFamilyLang = IndicLang | EuroLang | CyrillicLang | RtlFamilyLang

export function isIndicFamilyLang(lang: string | null | undefined): lang is IndicLang {
  return lang === 'te' || lang === 'gu' || lang === 'kn'
}

export function isEuroFamilyLang(lang: string | null | undefined): lang is EuroLang {
  return lang === 'pl' || lang === 'ro' || lang === 'cs' || lang === 'el' || lang === 'hu' || lang === 'sv'
}

export function isCyrillicFamilyLang(lang: string | null | undefined): lang is CyrillicLang {
  return lang === 'ru' || lang === 'uk'
}

export function isRtlFamilyLang(lang: string | null | undefined): lang is RtlFamilyLang {
  return lang === 'he' || lang === 'fa' || lang === 'ur'
}

export function isLangFamilyLang(lang: string | null | undefined): lang is LangFamilyLang {
  return isIndicFamilyLang(lang) || isEuroFamilyLang(lang) || isCyrillicFamilyLang(lang) || isRtlFamilyLang(lang)
}
