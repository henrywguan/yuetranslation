import type { CameraBox, CameraScanRegion } from '../api'
import type { Rgb } from './sampleRegionColors'
import { unwrapTranslationText } from './unwrapTranslation'
import type { Lang } from '../types'

export type CamPath = 'choice' | 'ar' | 'upload' | 'docs'

export type CameraLang = 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'kk' | 'uz' | 'bg' | 'sr' | 'sw' | 'af' | 'et' | 'lv' | 'lt' | 'ga' | 'cy' | 'eu' | 'gl' | 'mt' | 'is' | 'bs' | 'sq' | 'zu' | 'so' | 'as' | 'mk' | 'mn' | 'ps' | 'hy' | 'ka' | 'am' | 'ceb' | 'ilo' | 'bcl'

export type EditableBox = {
  id: string
  box: CameraBox
  text: string
  translated: string
  from: CameraLang
  to: CameraLang
  dirty: boolean
  /** Sampled source background (AR matched overlays). */
  bg?: Rgb
  /** Sampled source ink / contrast text color (AR matched overlays). */
  fg?: Rgb
}

export type CameraTarget = 'auto' | 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'kk' | 'uz' | 'bg' | 'sr' | 'sw' | 'af' | 'et' | 'lv' | 'lt' | 'ga' | 'cy' | 'eu' | 'gl' | 'mt' | 'is' | 'bs' | 'sq' | 'zu' | 'so' | 'as' | 'mk' | 'mn' | 'ps' | 'hy' | 'ka' | 'am' | 'ceb' | 'ilo' | 'bcl'

/** Product CameraLang codes — identity map for server `to` / `from` values. */
const CAMERA_LANG_SET = new Set<string>([
  'en',
  'yue',
  'cmn',
  'wuu',
  'sichuan',
  'tl',
  'es',
  'eses',
  'vi',
  'th',
  'lo',
  'ko',
  'ja',
  'id',
  'ms',
  'pt',
  'fr',
  'hi',
  'km',
  'my',
  'jv',
  'it',
  'de',
  'nl',
  'ar',
  'arsa',
  'ta',
  'ptpt',
  'tr',
  'bn',
  'te',
  'gu',
  'kn',
  'pl',
  'ro',
  'cs',
  'el',
  'hu',
  'sv',
  'ru',
  'uk',
  'he',
  'fa',
  'ur',
  'ml',
  'mr',
  'pa',
  'or',
  'si',
  'ne',
  'da',
  'nb',
  'fi',
  'sk',
  'hr',
  'ca',
  'az',
  'kk',
  'uz',
  'bg',
  'sr',
  'sw',
  'af',
  'et',
  'lv',
  'lt',
  'ga',
  'cy',
  'eu',
  'gl',
  'mt',
  'is',
  'bs',
  'sq',
  'zu',
  'so',
  'as',
  'mk',
  'mn',
  'ps',
  'hy',
  'ka',
  'am',
  'ceb',
  'ilo',
  'bcl',
])

/**
 * Map API/legacy region langs onto CameraLang.
 * Locale aliases (es-ES, pt-PT, fil-PH, …) resolve before bare tags.
 * Unknown / legacy `zh` → Cantonese — never silently remaps a known CameraLang.
 */
export function normalizeRegionLang(lang: string | undefined): CameraLang {
  if (!lang) return 'yue'
  const raw = lang.trim()
  if (!raw) return 'yue'
  if (CAMERA_LANG_SET.has(raw)) return raw as CameraLang

  const l = raw.toLowerCase()
  // Variety peers — check specific locales before bare tags.
  if (l === 'es-es' || l.startsWith('es-es')) return 'eses'
  if (l === 'pt-pt' || l.startsWith('pt-pt')) return 'ptpt'
  if (l === 'es-mx' || l.startsWith('es-mx') || l === 'es') return 'es'
  if (l === 'pt-br' || l.startsWith('pt-br') || l === 'pt') return 'pt'
  if (l.startsWith('fil') || l === 'tl') return 'tl'
  if (l.startsWith('ar-eg') || l === 'ar') return 'ar'
  if (l.startsWith('ar-sa') || l.startsWith('ar-')) return 'arsa'
  if (l.startsWith('vi')) return 'vi'
  if (l.startsWith('th')) return 'th'
  if (l.startsWith('lo')) return 'lo'
  if (l.startsWith('ko')) return 'ko'
  if (l.startsWith('ja')) return 'ja'
  if (l.startsWith('id')) return 'id'
  if (l.startsWith('ms')) return 'ms'
  if (l.startsWith('fr')) return 'fr'
  if (l.startsWith('hi')) return 'hi'
  if (l.startsWith('km')) return 'km'
  if (l.startsWith('my')) return 'my'
  if (l.startsWith('jv')) return 'jv'
  if (l.startsWith('it')) return 'it'
  if (l.startsWith('de')) return 'de'
  if (l.startsWith('nl')) return 'nl'
  if (l.startsWith('ta')) return 'ta'
  if (l.startsWith('tr')) return 'tr'
  if (l.startsWith('bn')) return 'bn'
  if (l.startsWith('te')) return 'te'
  if (l.startsWith('gu')) return 'gu'
  if (l.startsWith('kn')) return 'kn'
  if (l.startsWith('pl')) return 'pl'
  if (l.startsWith('ro')) return 'ro'
  if (l.startsWith('cs')) return 'cs'
  if (l.startsWith('el')) return 'el'
  if (l.startsWith('hu')) return 'hu'
  if (l.startsWith('sv')) return 'sv'
  if (l.startsWith('ru')) return 'ru'
  if (l.startsWith('uk')) return 'uk'
  if (l.startsWith('he')) return 'he'
  if (l.startsWith('fa')) return 'fa'
  if (l.startsWith('ur')) return 'ur'
  if (l.startsWith('ml')) return 'ml'
  if (l.startsWith('mr')) return 'mr'
  if (l.startsWith('pa')) return 'pa'
  if (l.startsWith('or')) return 'or'
  // Sinhala (`si` / `si-LK`) — never match `sichuan` via startsWith('si').
  if (l.includes('sichuan')) return 'sichuan'
  if (l === 'si' || l.startsWith('si-')) return 'si'
  if (l.startsWith('ne')) return 'ne'
  if (l.startsWith('da')) return 'da'
  if (l.startsWith('nb') || l.startsWith('no-')) return 'nb'
  if (l.startsWith('fi')) return 'fi'
  if (l.startsWith('sk')) return 'sk'
  if (l.startsWith('hr')) return 'hr'
  if (l === 'ca' || l.startsWith('ca-')) return 'ca'
  if (l === 'az' || l.startsWith('az-')) return 'az'
  if (l === 'kk' || l.startsWith('kk-')) return 'kk'
  if (l === 'uz' || l.startsWith('uz-')) return 'uz'
  if (l === 'bg' || l.startsWith('bg-')) return 'bg'
  if (l === 'sr' || l.startsWith('sr-')) return 'sr'
  if (l === 'sw' || l.startsWith('sw-')) return 'sw'
  if (l === 'af' || l.startsWith('af-')) return 'af'
  if (l === 'et' || l.startsWith('et-')) return 'et'
  if (l === 'lv' || l.startsWith('lv-')) return 'lv'
  if (l === 'lt' || l.startsWith('lt-')) return 'lt'
  if (l === 'ga' || l.startsWith('ga-')) return 'ga'
  if (l === 'cy' || l.startsWith('cy-')) return 'cy'
  if (l === 'eu' || l.startsWith('eu-')) return 'eu'
  if (l === 'gl' || l.startsWith('gl-')) return 'gl'
  if (l === 'mt' || l.startsWith('mt-')) return 'mt'
  if (l === 'is' || l.startsWith('is-')) return 'is'
  if (l === 'bs' || l.startsWith('bs-')) return 'bs'
  if (l === 'sq' || l.startsWith('sq-')) return 'sq'
  if (l === 'zu' || l.startsWith('zu-')) return 'zu'
  if (l === 'so' || l.startsWith('so-')) return 'so'
  if (l === 'as' || l.startsWith('as-')) return 'as'
  if (l === 'mk' || l.startsWith('mk-')) return 'mk'
  if (l === 'mn' || l.startsWith('mn-')) return 'mn'
  if (l === 'ps' || l.startsWith('ps-')) return 'ps'
  if (l === 'hy' || l.startsWith('hy-')) return 'hy'
  if (l === 'ka' || l.startsWith('ka-')) return 'ka'
  if (l === 'am' || l.startsWith('am-')) return 'am'
  if (l.startsWith('en')) return 'en'
  if (l.startsWith('wuu')) return 'wuu'
  if (l.startsWith('zh-cn') || l.includes('cmn') || l.includes('hans')) return 'cmn'
  if (l.startsWith('ceb')) return 'ceb'
  if (l.startsWith('ilo')) return 'ilo'
  if (l.startsWith('bcl')) return 'bcl'
  // Legacy `zh` / explicit yue / unknown → Cantonese
  return 'yue'
}

export function regionToEditable(r: CameraScanRegion): EditableBox {
  return {
    id: r.id,
    box: { ...r.box },
    text: r.text,
    translated: unwrapTranslationText(r.translated),
    from: normalizeRegionLang(r.from),
    to: normalizeRegionLang(r.to),
    dirty: false,
  }
}

export function newBox(box: CameraBox): EditableBox {
  return {
    id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    box,
    text: '',
    translated: '',
    from: 'en',
    to: 'yue',
    dirty: true,
  }
}

/** After Translate / Auto-detect fills a translation, the overlay stays pinned. */
export function isOverlayLocked(box: EditableBox): boolean {
  return Boolean(box.translated.trim())
}

export function clampBox(box: CameraBox): CameraBox {
  const x = Math.min(0.98, Math.max(0, box.x))
  const y = Math.min(0.98, Math.max(0, box.y))
  const w = Math.min(1 - x, Math.max(0.02, box.w))
  const h = Math.min(1 - y, Math.max(0.02, box.h))
  return { x, y, w, h }
}

const HAN_RE = /[\u3400-\u9fff]/

function isChineseCam(lang: CameraLang): boolean {
  return lang === 'yue' || lang === 'cmn' || lang === 'wuu' || lang === 'sichuan'
}

/** Latin non-Chinese Cam targets: translation is the Details subject; English is the hint. */
const LATIN_DETAIL_CAM_LANGS = [
  'tl',
  'es',
  'eses',
  'vi',
  'id',
  'ms',
  'pt',
  'fr',
  'jv',
  'it',
  'de',
  'nl',
  'ptpt',
  'tr',
  'pl',
  'ro',
  'cs',
  'hu',
  'sv',
  'da',
  'nb',
  'fi',
  'sk',
  'hr',
  'ca',
  'az',
  'uz',
  'sw',
  'af',
  'et',
  'lv',
  'lt',
  'ga',
  'cy',
  'eu',
  'gl',
  'mt',
  'is',
  'bs',
  'sq',
  'zu',
  'so',
  'ceb',
  'ilo',
  'bcl',
] as const
type LatinDetailCamLang = (typeof LATIN_DETAIL_CAM_LANGS)[number]

function isLatinDetailCam(lang: CameraLang): lang is LatinDetailCamLang {
  return (LATIN_DETAIL_CAM_LANGS as readonly string[]).includes(lang)
}

/** Own-script Cam targets (not Latin, not Han primary) — same detail dispatch shape. */
const SCRIPT_DETAIL_CAM_LANGS = ['th', 'lo', 'ko', 'ja', 'hi', 'km', 'my', 'ar', 'arsa', 'ta', 'bn', 'te', 'gu', 'kn', 'el', 'ru', 'uk', 'he', 'fa', 'ur', 'ml', 'mr', 'pa', 'or', 'si', 'ne', 'kk', 'bg', 'sr', 'as', 'mk', 'mn', 'hy', 'ka', 'am', 'ps'] as const
type ScriptDetailCamLang = (typeof SCRIPT_DETAIL_CAM_LANGS)[number]

function isScriptDetailCam(lang: CameraLang): lang is ScriptDetailCamLang {
  return (SCRIPT_DETAIL_CAM_LANGS as readonly string[]).includes(lang)
}

function latinDetailArgs(
  box: EditableBox,
  target: LatinDetailCamLang | ScriptDetailCamLang,
): { phrase: string; translation?: string; lang: LatinDetailCamLang | ScriptDetailCamLang } {
  const targetByDir = box.to === target ? box.translated : box.from === target ? box.text : ''
  const enByDir = box.to === 'en' ? box.translated : box.from === 'en' ? box.text : ''
  const targetText =
    targetByDir.trim() ||
    (!HAN_RE.test(box.translated) ? box.translated : '') ||
    (!HAN_RE.test(box.text) ? box.text : '')
  const en =
    enByDir.trim() ||
    (box.to !== target && !HAN_RE.test(box.translated) ? box.translated : '') ||
    (box.from !== target && !HAN_RE.test(box.text) ? box.text : '')
  const phrase = (targetText || box.text || box.translated).trim()
  const translation = en.trim() && en.trim() !== phrase ? en.trim() : undefined
  return { phrase, translation, lang: target }
}

/** Pick target-language phrase + English hint for the shared character breakdown panel. */
export function boxDetailArgs(box: EditableBox): {
  phrase: string
  translation?: string
  lang?: CameraLang
} {
  const latinTarget =
    (isLatinDetailCam(box.to) && box.to) ||
    (isLatinDetailCam(box.from) && box.from) ||
    (isScriptDetailCam(box.to) && box.to) ||
    (isScriptDetailCam(box.from) && box.from) ||
    null
  if (latinTarget) return latinDetailArgs(box, latinTarget)

  const zhByDir = isChineseCam(box.to)
    ? box.translated
    : isChineseCam(box.from)
      ? box.text
      : ''
  const enByDir = box.to === 'en' ? box.translated : box.from === 'en' ? box.text : ''
  const zh =
    zhByDir.trim() ||
    (HAN_RE.test(box.text) ? box.text : '') ||
    (HAN_RE.test(box.translated) ? box.translated : '')
  const en =
    enByDir.trim() ||
    (!HAN_RE.test(box.text) ? box.text : '') ||
    (!HAN_RE.test(box.translated) ? box.translated : '')
  const phrase = (zh || box.text || box.translated).trim()
  const translation = en.trim() && en.trim() !== phrase ? en.trim() : undefined
  const lang: CameraLang | undefined = isChineseCam(box.to)
    ? box.to
    : isChineseCam(box.from)
      ? box.from
      : HAN_RE.test(phrase)
        ? 'yue'
        : undefined
  return { phrase, translation, lang }
}

export function speakLangForBox(box: EditableBox): Lang {
  if (box.to === 'cmn') return 'cmn'
  if (box.to === 'wuu') return 'wuu'
  if (box.to === 'sichuan') return 'sichuan'
  if (box.to === 'yue') return 'yue'
  if (box.to === 'tl') return 'tl'
  if (box.to === 'es') return 'es'
  if (box.to === 'eses') return 'eses'
  if (box.to === 'vi') return 'vi'
  if (box.to === 'th') return 'th'
  if (box.to === 'lo') return 'lo'
  if (box.to === 'ko') return 'ko'
  if (box.to === 'ja') return 'ja'
  if (box.to === 'id') return 'id'
  if (box.to === 'ms') return 'ms'
  if (box.to === 'pt') return 'pt'
  if (box.to === 'fr') return 'fr'
  if (box.to === 'hi') return 'hi'
  if (box.to === 'km') return 'km'
  if (box.to === 'my') return 'my'
  if (box.to === 'jv') return 'jv'
  if (box.to === 'it') return 'it'
  if (box.to === 'de') return 'de'
  if (box.to === 'nl') return 'nl'
  if (box.to === 'ar') return 'ar'
  if (box.to === 'arsa') return 'arsa'
  if (box.to === 'ta') return 'ta'
  if (box.to === 'ptpt') return 'ptpt'
  if (box.to === 'tr') return 'tr'
  if (box.to === 'bn') return 'bn'
  if (box.to === 'te') return 'te'
  if (box.to === 'gu') return 'gu'
  if (box.to === 'kn') return 'kn'
  if (box.to === 'pl') return 'pl'
  if (box.to === 'ro') return 'ro'
  if (box.to === 'cs') return 'cs'
  if (box.to === 'el') return 'el'
  if (box.to === 'hu') return 'hu'
  if (box.to === 'sv') return 'sv'
  if (box.to === 'ru') return 'ru'
  if (box.to === 'uk') return 'uk'
  if (box.to === 'he') return 'he'
  if (box.to === 'fa') return 'fa'
  if (box.to === 'ur') return 'ur'
  if (box.to === 'ml') return 'ml'
  if (box.to === 'mr') return 'mr'
  if (box.to === 'pa') return 'pa'
  if (box.to === 'or') return 'or'
  if (box.to === 'si') return 'si'
  if (box.to === 'ne') return 'ne'
  if (box.to === 'da') return 'da'
  if (box.to === 'nb') return 'nb'
  if (box.to === 'fi') return 'fi'
  if (box.to === 'sk') return 'sk'
  if (box.to === 'hr') return 'hr'
  if (box.to === 'ca') return 'ca'
  if (box.to === 'az') return 'az'
  if (box.to === 'kk') return 'kk'
  if (box.to === 'uz') return 'uz'
  if (box.to === 'bg') return 'bg'
  if (box.to === 'sr') return 'sr'
  if (box.to === 'sw') return 'sw'
  if (box.to === 'af') return 'af'
  if (box.to === 'et') return 'et'
  if (box.to === 'lv') return 'lv'
  if (box.to === 'lt') return 'lt'
  if (box.to === 'ga') return 'ga'
  if (box.to === 'cy') return 'cy'
  if (box.to === 'eu') return 'eu'
  if (box.to === 'gl') return 'gl'
  if (box.to === 'mt') return 'mt'
  if (box.to === 'is') return 'is'
  if (box.to === 'bs') return 'bs'
  if (box.to === 'sq') return 'sq'
  if (box.to === 'zu') return 'zu'
  if (box.to === 'so') return 'so'
  if (box.to === 'as') return 'as'
  if (box.to === 'mk') return 'mk'
  if (box.to === 'mn') return 'mn'
  if (box.to === 'ps') return 'ps'
  if (box.to === 'hy') return 'hy'
  if (box.to === 'ka') return 'ka'
  if (box.to === 'am') return 'am'
  if (box.to === 'ceb') return 'ceb'
  if (box.to === 'ilo') return 'ilo'
  if (box.to === 'bcl') return 'bcl'
  if (box.to === 'en') return 'en'
  return HAN_RE.test(box.translated || box.text) ? 'yue' : 'en'
}
