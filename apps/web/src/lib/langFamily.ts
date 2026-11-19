import type { IndicLang } from './indicPedagogy'
import type { EuroLang } from './euroPedagogy'
import type { CyrillicLang } from './cyrillicPedagogy'
import type { RtlFamilyLang } from './rtlPedagogy'

/** Batch 2–3b voice languages rendered by `LangFamilyText` (one renderer per script family). */
export type LangFamilyLang = IndicLang | EuroLang | CyrillicLang | RtlFamilyLang

export function isIndicFamilyLang(lang: string | null | undefined): lang is IndicLang {
  return (
    lang === 'te' ||
    lang === 'gu' ||
    lang === 'kn' ||
    lang === 'ml' ||
    lang === 'mr' ||
    lang === 'pa' ||
    lang === 'or' ||
    lang === 'si' ||
    lang === 'ne'
  )
}

export function isEuroFamilyLang(lang: string | null | undefined): lang is EuroLang {
  return (
    lang === 'pl' ||
    lang === 'ro' ||
    lang === 'cs' ||
    lang === 'el' ||
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
    lang === 'af'
  )
}

export function isCyrillicFamilyLang(lang: string | null | undefined): lang is CyrillicLang {
  return lang === 'ru' || lang === 'uk' || lang === 'kk' || lang === 'bg' || lang === 'sr'
}

export function isRtlFamilyLang(lang: string | null | undefined): lang is RtlFamilyLang {
  return lang === 'he' || lang === 'fa' || lang === 'ur'
}

export function isLangFamilyLang(lang: string | null | undefined): lang is LangFamilyLang {
  return isIndicFamilyLang(lang) || isEuroFamilyLang(lang) || isCyrillicFamilyLang(lang) || isRtlFamilyLang(lang)
}
