import { z } from 'zod'
import { visionConfigured } from './env.js'
import { ocrImage, detectScript, type OcrBox, type OcrRegion } from './azureVision.js'
import { ocrImageWithVisionLlm } from './visionLlmOcr.js'
import {
  translateCameraText,
  normalizeCameraLang,
  type CameraLang,
} from './translateCamera.js'

const BoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.002).max(1),
  h: z.number().min(0.002).max(1),
})

const Body = z.object({
  /** data URL or raw base64 image */
  image: z.string().min(32).max(5_500_000),
  /**
   * Optional client boxes (normalized). When present, OCR still runs on the
   * full image and text is assigned to overlapping boxes; empty-text boxes
   * keep geometry for manual fill.
   */
  boxes: z.array(BoxSchema).max(64).optional(),
  /** Preferred output language. Auto flips per-region from script when omitted. */
  target: z.enum(['en', 'zh', 'yue', 'cmn', 'wuu', 'tl']).optional(),  /** When true, skip translation and only return OCR regions. */
  ocrOnly: z.boolean().optional().default(false),
  /**
   * When true, this scan is part of Cam → Documents (PDF hybrid).
   * Gated/metered as docs, not camera translate counts.
   */
  forDocs: z.boolean().optional().default(false),
})

export type CameraScanRegion = {
  id: string
  text: string
  translated: string
  from: CameraLang
  to: CameraLang
  box: OcrBox
  script: OcrRegion['script']
  cacheHit: boolean
}

function iou(a: OcrBox, b: OcrBox): number {
  const ax2 = a.x + a.w
  const ay2 = a.y + a.h
  const bx2 = b.x + b.w
  const by2 = b.y + b.h
  const ix1 = Math.max(a.x, b.x)
  const iy1 = Math.max(a.y, b.y)
  const ix2 = Math.min(ax2, bx2)
  const iy2 = Math.min(ay2, by2)
  const iw = Math.max(0, ix2 - ix1)
  const ih = Math.max(0, iy2 - iy1)
  const inter = iw * ih
  if (inter <= 0) return 0
  const union = a.w * a.h + b.w * b.h - inter
  return union > 0 ? inter / union : 0
}

function pickTarget(
  script: OcrRegion['script'],
  preferred?: CameraLang,
): { from: CameraLang; to: CameraLang } {
  const looksChinese = script === 'cjk' || script === 'mixed'
  if (preferred === 'en') {
    return looksChinese ? { from: 'yue', to: 'en' } : { from: 'en', to: 'en' }
  }
  if (preferred === 'yue' || preferred === 'cmn') {
    return looksChinese
      ? { from: preferred, to: preferred }
      : { from: 'en', to: preferred }
  }
  if (preferred === 'tl') {
    return looksChinese ? { from: 'yue', to: 'tl' } : { from: 'en', to: 'tl' }
  }
  // Auto: Latin → Cantonese (HK default), CJK → English
  return looksChinese ? { from: 'yue', to: 'en' } : { from: 'en', to: 'yue' }
}

function assignTextToBoxes(ocr: OcrRegion[], boxes: OcrBox[]): Array<OcrRegion & { box: OcrBox }> {
  return boxes.map((box) => {
    const hits = ocr
      .map((r) => ({ r, score: iou(box, r.box) }))
      .filter((h) => h.score > 0.05)
      .sort((a, b) => b.score - a.score)
    if (!hits.length) {
      return { text: '', box, script: 'other' as const }
    }
    // Merge overlapping OCR lines into one region text (top-to-bottom).
    const merged = hits
      .map((h) => h.r)
      .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
    const text = merged
      .map((m) => m.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return { text, box, script: detectScript(text) }
  })
}

export type CameraScanOptions = {
  /**
   * When false, skip multimodal LLM OCR fallback (quota exhausted).
   * Azure Read still runs. Default true.
   */
  allowAiVision?: boolean
}

export async function cameraScan(
  input: unknown,
  opts: CameraScanOptions = {},
): Promise<{
  regions: CameraScanRegion[]
  engine: string
  visionConfigured: boolean
  visionAuthFailed?: boolean
  translateMisses: number
  /** True when multimodal LLM OCR was invoked (Azure Read empty / weak). */
  aiVisionUsed: boolean
  /** Regions recovered by the LLM fallback (0 if unused or failed). */
  aiVisionRegions: number
  /** True when LLM fallback was skipped because the monthly hard cap was hit. */
  aiVisionQuotaExhausted?: boolean
}> {
  const parsed = Body.parse(input)
  const allowAiVision = opts.allowAiVision !== false
  let { regions: ocrRegions, engine: ocrEngine, authFailed: visionAuthFailed } = await ocrImage(
    parsed.image,
  )
  let engine: string = ocrEngine
  let aiVisionUsed = false
  let aiVisionRegions = 0
  let aiVisionQuotaExhausted = false

  // Silent fallback: decorative / foil / calligraphy often returns 0 Azure lines.
  if (ocrRegions.length === 0 && !visionAuthFailed) {
    if (!allowAiVision) {
      aiVisionQuotaExhausted = true
    } else {
      const llm = await ocrImageWithVisionLlm(parsed.image)
      if (llm.invoked) {
        aiVisionUsed = true
        if (llm.regions.length > 0) {
          ocrRegions = llm.regions
          engine = llm.engine
          aiVisionRegions = llm.regions.length
        }
      }
    }
  }

  const baseRegions: OcrRegion[] =
    parsed.boxes && parsed.boxes.length > 0
      ? assignTextToBoxes(ocrRegions, parsed.boxes)
      : ocrRegions

  if (parsed.ocrOnly) {
    return {
      regions: baseRegions.map((r, i) => ({
        id: `r${i}`,
        text: r.text,
        translated: '',
        from: 'en',
        to: 'yue',
        box: r.box,
        script: r.script,
        cacheHit: false,
      })),
      engine,
      visionConfigured: visionConfigured(),
      visionAuthFailed,
      translateMisses: 0,
      aiVisionUsed,
      aiVisionRegions,
      aiVisionQuotaExhausted,
    }
  }

  const out: CameraScanRegion[] = []
  let translateMisses = 0
  const preferred = normalizeCameraLang(parsed.target)

  for (let i = 0; i < baseRegions.length; i++) {
    const r = baseRegions[i]!
    const text = r.text.trim()
    if (!text) {
      out.push({
        id: `r${i}`,
        text: '',
        translated: '',
        from: 'en',
        to: preferred && preferred !== 'en' ? preferred : 'yue',
        box: r.box,
        script: r.script,
        cacheHit: false,
      })
      continue
    }
    const { from, to } = pickTarget(r.script, preferred)
    const prev = baseRegions[i - 1]?.text.trim()
    const next = baseRegions[i + 1]?.text.trim()
    const context = [prev, next].filter(Boolean).join('\n')
    const result = await translateCameraText(text, from, to, { context })
    if (!result.cacheHit) translateMisses += 1
    out.push({
      id: `r${i}`,
      text,
      translated: result.text,
      from,
      to,
      box: r.box,
      script: r.script,
      cacheHit: result.cacheHit,
    })
  }

  return {
    regions: out,
    engine,
    visionConfigured: visionConfigured(),
    visionAuthFailed,
    translateMisses,
    aiVisionUsed,
    aiVisionRegions,
    aiVisionQuotaExhausted,
  }
}
