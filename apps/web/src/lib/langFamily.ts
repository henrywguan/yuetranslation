import type { IndicLang } from './indicPedagogy'
import type { EuroLang } from './euroPedagogy'
import type { CyrillicLang } from './cyrillicPedagogy'
import type { RtlFamilyLang } from './rtlPedagogy'
import type { ScriptFamilyLang } from './scriptPedagogy'

/** Batch 2–4 voice languages rendered by `LangFamilyText` (one renderer per script family). */
export type LangFamilyLang = IndicLang | EuroLang | CyrillicLang | RtlFamilyLang | ScriptFamilyLang

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
    lang === 'ne' ||
    lang === 'as'
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
    lang === 'so'
  )
}

export function isCyrillicFamilyLang(lang: string | null | undefined): lang is CyrillicLang {
  return lang === 'ru' || lang === 'uk' || lang === 'kk' || lang === 'bg' || lang === 'sr' || lang === 'mk' || lang === 'mn'
}

export function isRtlFamilyLang(lang: string | null | undefined): lang is RtlFamilyLang {
  return lang === 'he' || lang === 'fa' || lang === 'ur' || lang === 'ps'
}

/** Armenian / Georgian / Amharic — own-alphabet languages (Batch 4). */
export function isScriptFamilyLang(lang: string | null | undefined): lang is ScriptFamilyLang {
  return lang === 'hy' || lang === 'ka' || lang === 'am'
}

export function isLangFamilyLang(lang: string | null | undefined): lang is LangFamilyLang {
  return isIndicFamilyLang(lang) || isEuroFamilyLang(lang) || isCyrillicFamilyLang(lang) || isRtlFamilyLang(lang) || isScriptFamilyLang(lang)
}
