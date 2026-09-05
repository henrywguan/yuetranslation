import type { CameraBox, CameraScanRegion } from '../api'
import type { Rgb } from './sampleRegionColors'
import { unwrapTranslationText } from './unwrapTranslation'
import type { Lang } from '../types'

export type CamPath = 'choice' | 'ar' | 'upload' | 'docs'

export type CameraLang = 'en' | 'yue' | 'cmn'

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

export type CameraTarget = 'auto' | 'en' | 'yue' | 'cmn'

function normalizeRegionLang(lang: string | undefined): CameraLang {
  if (lang === 'cmn') return 'cmn'
  if (lang === 'en') return 'en'
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
  return lang === 'yue' || lang === 'cmn'
}

/** Pick Chinese + English sides for the shared character breakdown panel. */
export function boxDetailArgs(box: EditableBox): {
  phrase: string
  translation?: string
  lang?: Lang
} {
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
  const lang: Lang | undefined = isChineseCam(box.to)
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
  if (box.to === 'yue') return 'yue'
  if (box.to === 'en') return 'en'
  return HAN_RE.test(box.translated || box.text) ? 'yue' : 'en'
}
