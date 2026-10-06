/**
 * Per-language details pedagogy — mirror `CONVERSATION_PANE_UI`.
 * Adding a Lang: extend `Lang`, then add a row here (tsc fails until you do).
 */
import type { Lang } from './types'

export type DetailPronField =
  | 'ipa'
  | 'jyutping'
  | 'pinyin'
  | 'accented'
  | 'wugniu'
  | 'sichuanese'
  | 'none'

export type DetailPedagogy = {
  /** BCP-47 for title / rows */
  htmlLang: string
  /** Which pronunciation field lives in CharBreakdown.jyutping */
  pronField: DetailPronField
  /** Fallback gloss language when primary is unset; runtime prefers Account Hub primary. */
  defaultGlossLang: Lang
  /** Show Han ruby title when phrase has Han */
  rubyTitle: boolean
  /** Client can build a local offline token list without /api/breakdown */
  localOffline: boolean
  /** Extra panels keyed by stable id (e.g. mx-register) */
  extraPanels: ReadonlyArray<'mx-register' | 'eses-register'>
}

export const DETAIL_PEDAGOGY: Record<Lang, DetailPedagogy> = {
  en: {
    htmlLang: 'en',
    pronField: 'ipa',
    // Fallback only — Details enrich uses Account Hub primary as glossLang.
    defaultGlossLang: 'en',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  yue: {
    htmlLang: 'zh-HK',
    pronField: 'jyutping',
    defaultGlossLang: 'yue',
    rubyTitle: true,
    localOffline: true,
    extraPanels: [],
  },
  cmn: {
    htmlLang: 'zh-CN',
    pronField: 'pinyin',
    defaultGlossLang: 'cmn',
    rubyTitle: true,
    localOffline: true,
    extraPanels: [],
  },
  wuu: {
    htmlLang: 'wuu-CN',
    pronField: 'wugniu',
    defaultGlossLang: 'wuu',
    // Title uses ShanghaineseText (phrase Wugniu + sandhi), not JyutRuby.
    // Per-char citation Wugniu is returned in CharBreakdown.jyutping.
    rubyTitle: false,
    localOffline: false,
    extraPanels: [],
  },
  sichuan: {
    htmlLang: 'zh-CN-sichuan',
    pronField: 'sichuanese',
    defaultGlossLang: 'sichuan',
    rubyTitle: true,
    localOffline: false,
    extraPanels: [],
  },
  tl: {
    htmlLang: 'tl',
    pronField: 'accented',
    defaultGlossLang: 'tl',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  es: {
    htmlLang: 'es-MX',
    pronField: 'accented',
    defaultGlossLang: 'es',
    rubyTitle: false,
    localOffline: true,
    extraPanels: ['mx-register'],
  },
  eses: {
    htmlLang: 'es-ES',
    pronField: 'accented',
    defaultGlossLang: 'eses',
    rubyTitle: false,
    localOffline: true,
    extraPanels: ['eses-register'],
  },
  vi: {
    htmlLang: 'vi',
    pronField: 'accented',
    defaultGlossLang: 'vi',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  th: {
    htmlLang: 'th',
    pronField: 'accented',
    defaultGlossLang: 'th',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  lo: {
    htmlLang: 'lo',
    pronField: 'accented',
    defaultGlossLang: 'lo',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ko: {
    htmlLang: 'ko',
    pronField: 'accented',
    defaultGlossLang: 'ko',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ja: {
    htmlLang: 'ja',
    pronField: 'accented',
    defaultGlossLang: 'ja',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  id: {
    htmlLang: 'id',
    pronField: 'accented',
    defaultGlossLang: 'id',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ms: {
    htmlLang: 'ms',
    pronField: 'accented',
    defaultGlossLang: 'ms',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  pt: {
    htmlLang: 'pt-BR',
    pronField: 'accented',
    defaultGlossLang: 'pt',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  fr: {
    htmlLang: 'fr-FR',
    pronField: 'accented',
    defaultGlossLang: 'fr',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  hi: {
    htmlLang: 'hi',
    pronField: 'accented',
    defaultGlossLang: 'hi',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  km: {
    htmlLang: 'km',
    pronField: 'accented',
    defaultGlossLang: 'km',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  my: {
    htmlLang: 'my',
    pronField: 'accented',
    defaultGlossLang: 'my',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  jv: {
    htmlLang: 'jv-ID',
    pronField: 'accented',
    defaultGlossLang: 'jv',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  it: {
    htmlLang: 'it-IT',
    pronField: 'accented',
    defaultGlossLang: 'it',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  de: {
    htmlLang: 'de-DE',
    pronField: 'accented',
    defaultGlossLang: 'de',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  nl: {
    htmlLang: 'nl-NL',
    pronField: 'accented',
    defaultGlossLang: 'nl',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ceb: {
    htmlLang: 'ceb',
    pronField: 'accented',
    defaultGlossLang: 'ceb',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  ilo: {
    htmlLang: 'ilo',
    pronField: 'accented',
    defaultGlossLang: 'ilo',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
  bcl: {
    htmlLang: 'bcl',
    pronField: 'accented',
    defaultGlossLang: 'bcl',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  },
}

export function detailPedagogy(lang: Lang): DetailPedagogy {
  return DETAIL_PEDAGOGY[lang]
}
