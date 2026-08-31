/**
 * Multimodal LLM OCR fallback for decorative / foil / calligraphy text
 * that Azure Read misses. Requires a vision-capable model
 * (OPENAI_VISION_MODEL, e.g. gpt-4o-mini) — DeepSeek chat models do not accept images.
 */
import OpenAI from 'openai'
import { env, visionLlmConfigured } from './env.js'
import type { OcrRegion } from './azureVision.js'
import { detectScript } from './azureVision.js'

export { visionLlmConfigured }

function visionClient(): OpenAI | null {
  if (!visionLlmConfigured()) return null
  return new OpenAI({
    apiKey: env.openaiVisionApiKey,
    ...(env.openaiVisionBaseUrl ? { baseURL: env.openaiVisionBaseUrl } : {}),
  })
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function toDataUrl(imageBase64: string): string {
  const trimmed = imageBase64.trim()
  if (/^data:image\//i.test(trimmed)) return trimmed
  return `data:image/jpeg;base64,${trimmed}`
}

/** Exported for unit tests. */
export function parseVisionLlmRegions(raw: string): OcrRegion[] {
  let text = raw.trim()
  if (!text) return []
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // Try to salvage a JSON object from surrounding prose.
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return []
    try {
      parsed = JSON.parse(m[0])
    } catch {
      return []
    }
  }

  const obj = parsed as { regions?: unknown; texts?: unknown }
  const out: OcrRegion[] = []

  if (Array.isArray(obj.regions)) {
    for (const item of obj.regions) {
      if (!item || typeof item !== 'object') continue
      const row = item as {
        text?: unknown
        x?: unknown
        y?: unknown
        w?: unknown
        h?: unknown
      }
      const t = typeof row.text === 'string' ? row.text.trim() : ''
      if (!t) continue
      const x = clamp01(Number(row.x))
      const y = clamp01(Number(row.y))
      const w = clamp01(Number(row.w))
      const h = clamp01(Number(row.h))
      out.push({
        text: t,
        box: {
          x,
          y,
          w: w > 0.002 ? w : 0.2,
          h: h > 0.002 ? h : 0.08,
        },
        script: detectScript(t),
      })
    }
  }

  if (!out.length && Array.isArray(obj.texts)) {
    const texts = obj.texts
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim())
    const n = texts.length || 1
    texts.forEach((t, i) => {
      out.push({
        text: t,
        box: {
          x: 0.1,
          y: Math.min(0.85, 0.15 + i * (0.7 / n)),
          w: 0.8,
          h: Math.min(0.2, 0.7 / n),
        },
        script: detectScript(t),
      })
    })
  }

  return out.slice(0, 32)
}

/**
 * Ask a vision LLM to read text in the image with normalized boxes.
 * Returns [] when not configured or on failure (caller keeps Azure result).
 */
export async function ocrImageWithVisionLlm(imageBase64: string): Promise<{
  regions: OcrRegion[]
  engine: 'vision-llm'
  invoked: boolean
}> {
  const client = visionClient()
  if (!client) return { regions: [], engine: 'vision-llm', invoked: false }

  const dataUrl = toDataUrl(imageBase64)
  // Cap payload — multimodal APIs dislike huge base64.
  if (dataUrl.length > 4_500_000) {
    console.warn('[vision-llm] image too large, skipping')
    return { regions: [], engine: 'vision-llm', invoked: false }
  }

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiVisionModel,
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are an OCR engine for a camera translation app (Hong Kong signs, menus, packaging, calligraphy).',
            'Read ALL visible text in the image, including decorative gold foil, embossed lettering, and calligraphy.',
            'Prefer Traditional Chinese when characters could be Trad or Simp.',
            'Return ONLY JSON:',
            '{"regions":[{"text":"...","x":0,"y":0,"w":0.2,"h":0.1}]}',
            'Boxes are normalized 0–1 relative to image width/height (x,y = top-left).',
            'Merge a short phrase on one line into one region. Skip logos with no readable text.',
            'If no text is readable, return {"regions":[]}.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract every readable text region from this photo.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      // Don't pass DeepSeek-chat thinking extras to vision models.
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const regions = parseVisionLlmRegions(raw)
    return { regions, engine: 'vision-llm', invoked: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[vision-llm] OCR failed:', msg.slice(0, 200))
    return { regions: [], engine: 'vision-llm', invoked: true }
  }
}
