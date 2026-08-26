import { env, visionConfigured } from './env.js'

export type OcrBox = {
  /** Normalized 0–1 relative to image width/height. */
  x: number
  y: number
  w: number
  h: number
}

export type OcrRegion = {
  text: string
  box: OcrBox
  /** Rough script hint from characters. */
  script: 'latin' | 'cjk' | 'mixed' | 'other'
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function detectScript(text: string): OcrRegion['script'] {
  const s = text.trim()
  if (!s) return 'other'
  const cjk = (s.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).join('').length
  const latin = (s.match(/[A-Za-z]/g) || []).join('').length
  if (cjk > 0 && latin > 0) return 'mixed'
  if (cjk > 0) return 'cjk'
  if (latin > 0) return 'latin'
  return 'other'
}

function polygonToBox(
  polygon: number[],
  pageWidth: number,
  pageHeight: number,
): OcrBox | null {
  if (!polygon || polygon.length < 8 || pageWidth <= 0 || pageHeight <= 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i + 1 < polygon.length; i += 2) {
    const x = polygon[i]!
    const y = polygon[i + 1]!
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const w = maxX - minX
  const h = maxY - minY
  if (w <= 1 || h <= 1) return null
  return {
    x: clamp01(minX / pageWidth),
    y: clamp01(minY / pageHeight),
    w: clamp01(w / pageWidth),
    h: clamp01(h / pageHeight),
  }
}

function decodeDataUrl(imageBase64: string): Buffer {
  const trimmed = imageBase64.trim()
  const m = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s.exec(trimmed)
  const b64 = m ? m[1]! : trimmed
  return Buffer.from(b64, 'base64')
}

function authFailed(status: number) {
  return status === 401 || status === 403
}

/**
 * Azure AI Vision Read (OCR) 3.2 / 4.0 style analyze.
 * Uses Computer Vision Read API when AZURE_VISION_KEY is configured.
 */
export async function ocrImage(imageBase64: string): Promise<{
  regions: OcrRegion[]
  engine: 'azure-vision' | 'demo'
  authFailed?: boolean
}> {
  if (!visionConfigured()) {
    return { regions: [], engine: 'demo' }
  }

  const bytes = decodeDataUrl(imageBase64)
  if (bytes.length < 32) {
    return { regions: [], engine: 'azure-vision' }
  }
  // Cap ~3.5MB binary to stay under express JSON limits when base64-wrapped.
  if (bytes.length > 3_500_000) {
    throw new Error('Image too large for OCR (max ~3.5MB)')
  }

  const endpoint = env.azureVisionEndpoint.replace(/\/+$/, '')
  const startUrl = `${endpoint}/vision/v3.2/read/analyze`

  const startRes = await fetch(startUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.azureVisionKey,
      'Content-Type': 'application/octet-stream',
    },
    body: new Uint8Array(bytes),
  })

  if (!startRes.ok) {
    if (authFailed(startRes.status)) {
      console.warn('[vision] OCR auth failed — check AZURE_VISION_KEY and AZURE_VISION_ENDPOINT')
      return { regions: [], engine: 'demo', authFailed: true }
    }
    const detail = await startRes.text().catch(() => '')
    throw new Error(`Azure Vision OCR start failed: ${startRes.status} ${detail.slice(0, 200)}`)
  }

  const operationLocation =
    startRes.headers.get('operation-location') || startRes.headers.get('Operation-Location')
  if (!operationLocation) {
    throw new Error('Azure Vision OCR missing operation-location')
  }

  let result: unknown = null
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((r) => setTimeout(r, attempt < 3 ? 200 : 350))
    const poll = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': env.azureVisionKey },
    })
    if (!poll.ok) {
      if (authFailed(poll.status)) {
        console.warn('[vision] OCR poll auth failed')
        return { regions: [], engine: 'demo', authFailed: true }
      }
      throw new Error(`Azure Vision OCR poll failed: ${poll.status}`)
    }
    const json = (await poll.json()) as {
      status?: string
      analyzeResult?: {
        readResults?: Array<{
          width?: number
          height?: number
          lines?: Array<{ text?: string; boundingBox?: number[] }>
        }>
      }
    }
    const status = (json.status || '').toLowerCase()
    if (status === 'succeeded') {
      result = json
      break
    }
    if (status === 'failed') {
      throw new Error('Azure Vision OCR failed')
    }
  }

  if (!result) {
    throw new Error('Azure Vision OCR timed out')
  }

  const analyze = result as {
    analyzeResult?: {
      readResults?: Array<{
        width?: number
        height?: number
        lines?: Array<{ text?: string; boundingBox?: number[] }>
      }>
    }
  }

  const regions: OcrRegion[] = []
  for (const page of analyze.analyzeResult?.readResults || []) {
    const pageW = Math.max(1, Number(page.width) || 1)
    const pageH = Math.max(1, Number(page.height) || 1)
    for (const line of page.lines || []) {
      const text = (line.text || '').trim()
      if (!text) continue
      const box = polygonToBox(line.boundingBox || [], pageW, pageH)
      if (!box) continue
      regions.push({ text, box, script: detectScript(text) })
    }
  }

  return { regions, engine: 'azure-vision' }
}

export { detectScript }
