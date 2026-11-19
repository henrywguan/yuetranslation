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
  target: z
    .enum(['en', 'zh', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi', 'th', 'lo', 'ko', 'ja', 'id', 'ms', 'pt', 'fr', 'hi', 'km', 'my', 'jv', 'it', 'de', 'nl', 'ar', 'arsa', 'ta', 'ptpt', 'tr', 'bn', 'te', 'gu', 'kn', 'pl', 'ro', 'cs', 'el', 'hu', 'sv', 'ru', 'uk', 'he', 'fa', 'ur', 'ml', 'mr', 'pa', 'or', 'si', 'ne', 'da', 'nb', 'fi', 'sk', 'hr', 'ca', 'az', 'kk', 'uz', 'bg', 'sr', 'sw', 'af', 'et', 'lv', 'lt', 'ga', 'cy', 'eu', 'gl', 'mt', 'is', 'bs', 'sq', 'zu', 'so', 'as', 'mk', 'mn', 'hy', 'ka', 'am', 'ps', 'ceb', 'ilo', 'bcl', 'hak', 'teo', 'nan'])
    .optional(),
  /** When true, skip translation and only return OCR regions. */
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
  if (preferred === 'es') {
    return looksChinese ? { from: 'yue', to: 'es' } : { from: 'en', to: 'es' }
  }
  if (preferred === 'eses') {
    return looksChinese ? { from: 'yue', to: 'eses' } : { from: 'en', to: 'eses' }
  }
  if (preferred === 'vi') {
    return looksChinese ? { from: 'yue', to: 'vi' } : { from: 'en', to: 'vi' }
  }
  if (preferred === 'th') {
    return looksChinese ? { from: 'yue', to: 'th' } : { from: 'en', to: 'th' }
  }
  if (preferred === 'lo') {
    return looksChinese ? { from: 'yue', to: 'lo' } : { from: 'en', to: 'lo' }
  }
  if (preferred === 'ko') {
    return looksChinese ? { from: 'yue', to: 'ko' } : { from: 'en', to: 'ko' }
  }
  if (preferred === 'ja') {
    return looksChinese ? { from: 'yue', to: 'ja' } : { from: 'en', to: 'ja' }
  }
  if (preferred === 'id') {
    return looksChinese ? { from: 'yue', to: 'id' } : { from: 'en', to: 'id' }
  }
  if (preferred === 'ms') {
    return looksChinese ? { from: 'yue', to: 'ms' } : { from: 'en', to: 'ms' }
  }
  if (preferred === 'pt') {
    return looksChinese ? { from: 'yue', to: 'pt' } : { from: 'en', to: 'pt' }
  }
  if (preferred === 'fr') {
    return looksChinese ? { from: 'yue', to: 'fr' } : { from: 'en', to: 'fr' }
  }
  if (preferred === 'hi') {
    return looksChinese ? { from: 'yue', to: 'hi' } : { from: 'en', to: 'hi' }
  }
  if (preferred === 'km') {
    return looksChinese ? { from: 'yue', to: 'km' } : { from: 'en', to: 'km' }
  }
  if (preferred === 'my') {
    return looksChinese ? { from: 'yue', to: 'my' } : { from: 'en', to: 'my' }
  }
  if (preferred === 'jv') {
    return looksChinese ? { from: 'yue', to: 'jv' } : { from: 'en', to: 'jv' }
  }
  if (preferred === 'it') {
    return looksChinese ? { from: 'yue', to: 'it' } : { from: 'en', to: 'it' }
  }
  if (preferred === 'de') {
    return looksChinese ? { from: 'yue', to: 'de' } : { from: 'en', to: 'de' }
  }
  if (preferred === 'nl') {
    return looksChinese ? { from: 'yue', to: 'nl' } : { from: 'en', to: 'nl' }
  }
  if (preferred === 'ar') {
    return looksChinese ? { from: 'yue', to: 'ar' } : { from: 'en', to: 'ar' }
  }
  if (preferred === 'arsa') {
    return looksChinese ? { from: 'yue', to: 'arsa' } : { from: 'en', to: 'arsa' }
  }
  if (preferred === 'ta') {
    return looksChinese ? { from: 'yue', to: 'ta' } : { from: 'en', to: 'ta' }
  }
  if (preferred === 'ptpt') {
    return looksChinese ? { from: 'yue', to: 'ptpt' } : { from: 'en', to: 'ptpt' }
  }
  if (preferred === 'tr') {
    return looksChinese ? { from: 'yue', to: 'tr' } : { from: 'en', to: 'tr' }
  }
  if (preferred === 'bn') {
    return looksChinese ? { from: 'yue', to: 'bn' } : { from: 'en', to: 'bn' }
  }
  if (preferred === 'te') {
    return looksChinese ? { from: 'yue', to: 'te' } : { from: 'en', to: 'te' }
  }
  if (preferred === 'gu') {
    return looksChinese ? { from: 'yue', to: 'gu' } : { from: 'en', to: 'gu' }
  }
  if (preferred === 'kn') {
    return looksChinese ? { from: 'yue', to: 'kn' } : { from: 'en', to: 'kn' }
  }
  if (preferred === 'pl') {
    return looksChinese ? { from: 'yue', to: 'pl' } : { from: 'en', to: 'pl' }
  }
  if (preferred === 'ro') {
    return looksChinese ? { from: 'yue', to: 'ro' } : { from: 'en', to: 'ro' }
  }
  if (preferred === 'cs') {
    return looksChinese ? { from: 'yue', to: 'cs' } : { from: 'en', to: 'cs' }
  }
  if (preferred === 'el') {
    return looksChinese ? { from: 'yue', to: 'el' } : { from: 'en', to: 'el' }
  }
  if (preferred === 'hu') {
    return looksChinese ? { from: 'yue', to: 'hu' } : { from: 'en', to: 'hu' }
  }
  if (preferred === 'sv') {
    return looksChinese ? { from: 'yue', to: 'sv' } : { from: 'en', to: 'sv' }
  }
  if (preferred === 'ru') {
    return looksChinese ? { from: 'yue', to: 'ru' } : { from: 'en', to: 'ru' }
  }
  if (preferred === 'uk') {
    return looksChinese ? { from: 'yue', to: 'uk' } : { from: 'en', to: 'uk' }
  }
  if (preferred === 'he') {
    return looksChinese ? { from: 'yue', to: 'he' } : { from: 'en', to: 'he' }
  }
  if (preferred === 'fa') {
    return looksChinese ? { from: 'yue', to: 'fa' } : { from: 'en', to: 'fa' }
  }
  if (preferred === 'ur') {
    return looksChinese ? { from: 'yue', to: 'ur' } : { from: 'en', to: 'ur' }
  }
  if (preferred === 'ml') {
    return looksChinese ? { from: 'yue', to: 'ml' } : { from: 'en', to: 'ml' }
  }
  if (preferred === 'mr') {
    return looksChinese ? { from: 'yue', to: 'mr' } : { from: 'en', to: 'mr' }
  }
  if (preferred === 'pa') {
    return looksChinese ? { from: 'yue', to: 'pa' } : { from: 'en', to: 'pa' }
  }
  if (preferred === 'or') {
    return looksChinese ? { from: 'yue', to: 'or' } : { from: 'en', to: 'or' }
  }
  if (preferred === 'si') {
    return looksChinese ? { from: 'yue', to: 'si' } : { from: 'en', to: 'si' }
  }
  if (preferred === 'ne') {
    return looksChinese ? { from: 'yue', to: 'ne' } : { from: 'en', to: 'ne' }
  }
  if (preferred === 'da') {
    return looksChinese ? { from: 'yue', to: 'da' } : { from: 'en', to: 'da' }
  }
  if (preferred === 'nb') {
    return looksChinese ? { from: 'yue', to: 'nb' } : { from: 'en', to: 'nb' }
  }
  if (preferred === 'fi') {
    return looksChinese ? { from: 'yue', to: 'fi' } : { from: 'en', to: 'fi' }
  }
  if (preferred === 'sk') {
    return looksChinese ? { from: 'yue', to: 'sk' } : { from: 'en', to: 'sk' }
  }
  if (preferred === 'hr') {
    return looksChinese ? { from: 'yue', to: 'hr' } : { from: 'en', to: 'hr' }
  }
  if (preferred === 'ca') {
    return looksChinese ? { from: 'yue', to: 'ca' } : { from: 'en', to: 'ca' }
  }
  if (preferred === 'az') {
    return looksChinese ? { from: 'yue', to: 'az' } : { from: 'en', to: 'az' }
  }
  if (preferred === 'kk') {
    return looksChinese ? { from: 'yue', to: 'kk' } : { from: 'en', to: 'kk' }
  }
  if (preferred === 'uz') {
    return looksChinese ? { from: 'yue', to: 'uz' } : { from: 'en', to: 'uz' }
  }
  if (preferred === 'bg') {
    return looksChinese ? { from: 'yue', to: 'bg' } : { from: 'en', to: 'bg' }
  }
  if (preferred === 'sr') {
    return looksChinese ? { from: 'yue', to: 'sr' } : { from: 'en', to: 'sr' }
  }
  if (preferred === 'sw') {
    return looksChinese ? { from: 'yue', to: 'sw' } : { from: 'en', to: 'sw' }
  }
  if (preferred === 'af') {
    return looksChinese ? { from: 'yue', to: 'af' } : { from: 'en', to: 'af' }
  }
  if (preferred === 'et') {
    return looksChinese ? { from: 'yue', to: 'et' } : { from: 'en', to: 'et' }
  }
  if (preferred === 'lv') {
    return looksChinese ? { from: 'yue', to: 'lv' } : { from: 'en', to: 'lv' }
  }
  if (preferred === 'lt') {
    return looksChinese ? { from: 'yue', to: 'lt' } : { from: 'en', to: 'lt' }
  }
  if (preferred === 'ga') {
    return looksChinese ? { from: 'yue', to: 'ga' } : { from: 'en', to: 'ga' }
  }
  if (preferred === 'cy') {
    return looksChinese ? { from: 'yue', to: 'cy' } : { from: 'en', to: 'cy' }
  }
  if (preferred === 'eu') {
    return looksChinese ? { from: 'yue', to: 'eu' } : { from: 'en', to: 'eu' }
  }
  if (preferred === 'gl') {
    return looksChinese ? { from: 'yue', to: 'gl' } : { from: 'en', to: 'gl' }
  }
  if (preferred === 'mt') {
    return looksChinese ? { from: 'yue', to: 'mt' } : { from: 'en', to: 'mt' }
  }
  if (preferred === 'is') {
    return looksChinese ? { from: 'yue', to: 'is' } : { from: 'en', to: 'is' }
  }
  if (preferred === 'bs') {
    return looksChinese ? { from: 'yue', to: 'bs' } : { from: 'en', to: 'bs' }
  }
  if (preferred === 'sq') {
    return looksChinese ? { from: 'yue', to: 'sq' } : { from: 'en', to: 'sq' }
  }
  if (preferred === 'zu') {
    return looksChinese ? { from: 'yue', to: 'zu' } : { from: 'en', to: 'zu' }
  }
  if (preferred === 'so') {
    return looksChinese ? { from: 'yue', to: 'so' } : { from: 'en', to: 'so' }
  }
  if (preferred === 'as') {
    return looksChinese ? { from: 'yue', to: 'as' } : { from: 'en', to: 'as' }
  }
  if (preferred === 'mk') {
    return looksChinese ? { from: 'yue', to: 'mk' } : { from: 'en', to: 'mk' }
  }
  if (preferred === 'mn') {
    return looksChinese ? { from: 'yue', to: 'mn' } : { from: 'en', to: 'mn' }
  }
  if (preferred === 'hy') {
    return looksChinese ? { from: 'yue', to: 'hy' } : { from: 'en', to: 'hy' }
  }
  if (preferred === 'ka') {
    return looksChinese ? { from: 'yue', to: 'ka' } : { from: 'en', to: 'ka' }
  }
  if (preferred === 'am') {
    return looksChinese ? { from: 'yue', to: 'am' } : { from: 'en', to: 'am' }
  }
  if (preferred === 'ps') {
    return looksChinese ? { from: 'yue', to: 'ps' } : { from: 'en', to: 'ps' }
  }
  if (preferred === 'ceb') {
    return looksChinese ? { from: 'yue', to: 'ceb' } : { from: 'en', to: 'ceb' }
  }
  if (preferred === 'ilo') {
    return looksChinese ? { from: 'yue', to: 'ilo' } : { from: 'en', to: 'ilo' }
  }
  if (preferred === 'bcl') {
    return looksChinese ? { from: 'yue', to: 'bcl' } : { from: 'en', to: 'bcl' }
  }
  if (preferred === 'hak') {
    return looksChinese ? { from: 'hak', to: 'hak' } : { from: 'en', to: 'hak' }
  }
  if (preferred === 'teo') {
    return looksChinese ? { from: 'teo', to: 'teo' } : { from: 'en', to: 'teo' }
  }
  if (preferred === 'nan') {
    return looksChinese ? { from: 'nan', to: 'nan' } : { from: 'en', to: 'nan' }
  }
  if (preferred === 'sichuan') {
    return looksChinese ? { from: 'sichuan', to: 'sichuan' } : { from: 'en', to: 'sichuan' }
  }
  if (preferred === 'wuu') {
    return looksChinese ? { from: 'wuu', to: 'wuu' } : { from: 'en', to: 'wuu' }
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
