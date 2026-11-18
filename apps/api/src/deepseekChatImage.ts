/**
 * Chat image generation for #/chat `generate_image`.
 *
 * Prefer Google Gemini image models (shared GEMINI_API_KEY so Family users need no BYOK).
 * Fall back to OpenAI Images when Gemini is unavailable.
 * DeepSeek Completions hosts do not serve /v1/images.
 */
import OpenAI from 'openai'
import { env } from './env.js'
import { randomUUID } from 'node:crypto'
import type { ChatPluginCredentials } from './deepseekChatPluginKeys.js'

export type GeneratedChatImage = {
  id: string
  prompt: string
  mime: string
  /** Public URL (OpenAI temp URL or our /api/chat/generated-images/:id). */
  url: string
  createdAt: number
  /** Raw bytes when we host the image ourselves. */
  bytes?: Buffer
  provider?: 'gemini' | 'openai'
}

const STORE = new Map<string, GeneratedChatImage>()
const TTL_MS = 24 * 60 * 60 * 1000
const MAX_STORE = 40

function pruneStore() {
  const now = Date.now()
  for (const [id, row] of STORE) {
    if (now - row.createdAt > TTL_MS) STORE.delete(id)
  }
  if (STORE.size <= MAX_STORE) return
  const oldest = [...STORE.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)
  for (const [id] of oldest.slice(0, STORE.size - MAX_STORE)) STORE.delete(id)
}

export function geminiImageApiKey(userKey?: string): string {
  return (
    (userKey || '').trim() ||
    env.geminiApiKey ||
    ''
  )
}

export function openaiImageApiKey(userKey?: string): string {
  return (userKey || '').trim() || env.openaiImageApiKey || ''
}

export function chatImageConfigured(): boolean {
  return Boolean(geminiImageApiKey() || openaiImageApiKey())
}

/** Env and/or per-user BYOK (Gemini preferred, OpenAI fallback). */
export function chatImageConfiguredWith(creds?: ChatPluginCredentials | string): boolean {
  if (typeof creds === 'string') {
    return Boolean(geminiImageApiKey() || openaiImageApiKey(creds))
  }
  return Boolean(geminiImageApiKey(creds?.gemini) || openaiImageApiKey(creds?.image))
}

export function chatImageProviderLabel(creds?: ChatPluginCredentials): 'gemini' | 'openai' | 'none' {
  if (geminiImageApiKey(creds?.gemini)) return 'gemini'
  if (openaiImageApiKey(creds?.image)) return 'openai'
  return 'none'
}

export function getGeneratedChatImage(id: string): GeneratedChatImage | null {
  pruneStore()
  const row = STORE.get(id)
  if (!row) return null
  if (Date.now() - row.createdAt > TTL_MS) {
    STORE.delete(id)
    return null
  }
  return row
}

function publicImagePath(id: string): string {
  return `/api/chat/generated-images/${id}`
}

export function geminiAspectRatio(
  size?: '1024x1024' | '1024x1792' | '1792x1024',
): '1:1' | '9:16' | '16:9' {
  if (size === '1024x1792') return '9:16'
  if (size === '1792x1024') return '16:9'
  return '1:1'
}

type GeminiPart = {
  text?: string
  inlineData?: { mimeType?: string; data?: string }
  inline_data?: { mime_type?: string; data?: string }
}

async function generateViaGemini(
  prompt: string,
  opts: {
    signal?: AbortSignal
    size?: '1024x1024' | '1024x1792' | '1792x1024'
    apiKey: string
  },
): Promise<GeneratedChatImage> {
  const model = env.chatGeminiImageModel
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': opts.apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: geminiAspectRatio(opts.size),
        },
      },
    }),
    signal: opts.signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini image HTTP ${res.status}: ${text.slice(0, 240)}`)
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
    error?: { message?: string }
  }
  if (json.error?.message) throw new Error(json.error.message)
  const parts = json.candidates?.[0]?.content?.parts || []
  for (const part of parts) {
    const mime =
      part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/png'
    const data = part.inlineData?.data || part.inline_data?.data
    if (!data) continue
    const bytes = Buffer.from(data, 'base64')
    const id = randomUUID()
    return {
      id,
      prompt,
      mime,
      url: publicImagePath(id),
      createdAt: Date.now(),
      bytes,
      provider: 'gemini',
    }
  }
  throw new Error('Gemini returned no image data.')
}

async function generateViaOpenAI(
  prompt: string,
  opts: {
    signal?: AbortSignal
    size?: '1024x1024' | '1024x1792' | '1792x1024'
    apiKey: string
  },
): Promise<GeneratedChatImage> {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    ...(env.openaiImageBaseUrl ? { baseURL: env.openaiImageBaseUrl } : {}),
  })
  const model = env.chatImageModel
  const size = opts.size || '1024x1024'
  const result = await client.images.generate(
    {
      model,
      prompt,
      n: 1,
      size,
      ...(model.startsWith('dall-e') ? { response_format: 'url' } : {}),
    } as never,
    opts.signal ? { signal: opts.signal } : undefined,
  )
  const row = result.data?.[0]
  if (!row) throw new Error('Image API returned no data.')
  const id = randomUUID()
  if (typeof row.url === 'string' && /^https?:\/\//i.test(row.url)) {
    return {
      id,
      prompt,
      mime: 'image/png',
      url: row.url,
      createdAt: Date.now(),
      provider: 'openai',
    }
  }
  if (typeof row.b64_json === 'string' && row.b64_json) {
    const bytes = Buffer.from(row.b64_json, 'base64')
    return {
      id,
      prompt,
      mime: 'image/png',
      url: publicImagePath(id),
      createdAt: Date.now(),
      bytes,
      provider: 'openai',
    }
  }
  throw new Error('Image API returned neither url nor b64_json.')
}

/**
 * Generate one image. Gemini first (shared or BYOK), then OpenAI.
 * Returns markdown the model should include in its reply.
 */
export async function generateChatImage(
  prompt: string,
  opts?: {
    signal?: AbortSignal
    size?: '1024x1024' | '1024x1792' | '1792x1024'
    /** Per-user BYOK OpenAI Images key. */
    apiKey?: string
    /** Per-user BYOK Gemini API key. */
    geminiApiKey?: string
    pluginCreds?: ChatPluginCredentials
  },
): Promise<{ markdown: string; image: GeneratedChatImage }> {
  const cleaned = prompt.trim().slice(0, 3_000)
  if (!cleaned) throw new Error('prompt required')

  const geminiKey = geminiImageApiKey(opts?.geminiApiKey || opts?.pluginCreds?.gemini)
  const openaiKey = openaiImageApiKey(opts?.apiKey || opts?.pluginCreds?.image)

  pruneStore()
  let image: GeneratedChatImage
  if (geminiKey) {
    try {
      image = await generateViaGemini(cleaned, {
        signal: opts?.signal,
        size: opts?.size,
        apiKey: geminiKey,
      })
    } catch (err) {
      if (!openaiKey) throw err
      console.warn(
        '[deepseek-chat] Gemini image failed, falling back to OpenAI:',
        err instanceof Error ? err.message : err,
      )
      image = await generateViaOpenAI(cleaned, {
        signal: opts?.signal,
        size: opts?.size,
        apiKey: openaiKey,
      })
    }
  } else if (openaiKey) {
    image = await generateViaOpenAI(cleaned, {
      signal: opts?.signal,
      size: opts?.size,
      apiKey: openaiKey,
    })
  } else {
    throw new Error(
      'Image generation is not configured. Set GEMINI_API_KEY on the API (preferred), or add a key in Plugins → API keys.',
    )
  }

  STORE.set(image.id, image)
  const alt = cleaned.replace(/[\[\]]/g, '').slice(0, 120)
  const markdown = `![${alt}](${image.url})`
  return { markdown, image }
}
