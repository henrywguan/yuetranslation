import type { CameraBox, CameraScanRegion } from '../api'

export type CamPath = 'choice' | 'ar' | 'upload'

export type EditableBox = {
  id: string
  box: CameraBox
  text: string
  translated: string
  from: 'en' | 'zh'
  to: 'en' | 'zh'
  dirty: boolean
}

export type CameraTarget = 'auto' | 'en' | 'zh'

export function regionToEditable(r: CameraScanRegion): EditableBox {
  return {
    id: r.id,
    box: { ...r.box },
    text: r.text,
    translated: r.translated,
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

export function clampBox(box: CameraBox): CameraBox {
  const x = Math.min(0.98, Math.max(0, box.x))
  const y = Math.min(0.98, Math.max(0, box.y))
  const w = Math.min(1 - x, Math.max(0.02, box.w))
  const h = Math.min(1 - y, Math.max(0.02, box.h))
  return { x, y, w, h }
}
