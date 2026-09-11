import type { CameraBox, CameraScanRegion } from '../api'
import type { Rgb } from './sampleRegionColors'
import { unwrapTranslationText } from './unwrapTranslation'
import type { Lang } from '../types'

export type CamPath = 'choice' | 'ar' | 'upload' | 'docs'

export type CameraLang = 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'vi' | 'ceb' | 'ilo' | 'bcl'

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

export type CameraTarget = 'auto' | 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'vi' | 'ceb' | 'ilo' | 'bcl'

/** Map API/legacy region langs (`zh`) onto CameraLang. */
export function normalizeRegionLang(lang: string | undefined): CameraLang {
  if (lang === 'cmn') return 'cmn'
  if (lang === 'wuu') return 'wuu'
  if (lang === 'sichuan') return 'sichuan'
  if (lang === 'en') return 'en'
  if (lang === 'ceb') return 'ceb'
  if (lang === 'ilo') return 'ilo'
  if (lang === 'bcl') return 'bcl'
  if (lang === 'tl' || lang === 'fil') return 'tl'
  if (lang === 'es' || lang === 'es-MX' || lang === 'es-mx') return 'es'
  if (lang === 'vi' || lang === 'vi-VN' || lang === 'vi-vn') return 'vi'
  // Legacy `zh` and explicit yue → Cantonese
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
const LATIN_DETAIL_CAM_LANGS = ['tl', 'es', 'vi', 'ceb', 'ilo', 'bcl'] as const
type LatinDetailCamLang = (typeof LATIN_DETAIL_CAM_LANGS)[number]

function isLatinDetailCam(lang: CameraLang): lang is LatinDetailCamLang {
  return (LATIN_DETAIL_CAM_LANGS as readonly string[]).includes(lang)
}

function latinDetailArgs(
  box: EditableBox,
  target: LatinDetailCamLang,
): { phrase: string; translation?: string; lang: LatinDetailCamLang } {
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
  if (box.to === 'vi') return 'vi'
  if (box.to === 'ceb') return 'ceb'
  if (box.to === 'ilo') return 'ilo'
  if (box.to === 'bcl') return 'bcl'
  if (box.to === 'en') return 'en'
  return HAN_RE.test(box.translated || box.text) ? 'yue' : 'en'
}
