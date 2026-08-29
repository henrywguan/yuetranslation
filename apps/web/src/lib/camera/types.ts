import type { CameraBox, CameraScanRegion } from '../api'
import type { Rgb } from './sampleRegionColors'
import { unwrapTranslationText } from './unwrapTranslation'

export type CamPath = 'choice' | 'ar' | 'upload' | 'docs'

export type EditableBox = {
  id: string
  box: CameraBox
  text: string
  translated: string
  from: 'en' | 'zh'
  to: 'en' | 'zh'
  dirty: boolean
  /** Sampled source background (AR matched overlays). */
  bg?: Rgb
  /** Sampled source ink / contrast text color (AR matched overlays). */
  fg?: Rgb
}

export type CameraTarget = 'auto' | 'en' | 'zh'

export function regionToEditable(r: CameraScanRegion): EditableBox {
  return {
    id: r.id,
    box: { ...r.box },
    text: r.text,
    translated: unwrapTranslationText(r.translated),
    from: r.from,
    to: r.to,
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
    to: 'zh',
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

/** Pick Cantonese/Chinese + English sides for the shared character breakdown panel. */
export function boxDetailArgs(box: EditableBox): { phrase: string; translation?: string } {
  const zhByDir = box.to === 'zh' ? box.translated : box.from === 'zh' ? box.text : ''
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
  return { phrase, translation }
}
