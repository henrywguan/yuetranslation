/**
 * Chat image generation — OpenAI Images API on a dedicated client
 * (chat often runs on DeepSeek Completions, which does not serve /images).
 */
import OpenAI from 'openai'
import { env } from './env.js'
import { randomUUID } from 'node:crypto'

export type GeneratedChatImage = {
  id: string
  prompt: string
  mime: string
  /** Public URL (OpenAI temp URL or our /api/chat/generated-images/:id). */
  url: string
  createdAt: number
  /** Raw bytes when we host the image ourselves. */
  bytes?: Buffer
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

export function chatImageConfigured(): boolean {
  return Boolean(env.openaiImageApiKey)
}

export function chatImageClient(): OpenAI | null {
  if (!chatImageConfigured()) return null
  return new OpenAI({
    apiKey: env.openaiImageApiKey,
    ...(env.openaiImageBaseUrl ? { baseURL: env.openaiImageBaseUrl } : {}),
  })
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
  // Relative path so the browser hits the same API host (works in local Vite proxy + prod).
  return `/api/chat/generated-images/${id}`
}

/**
 * Generate one image. Prefer hosted OpenAI URL; otherwise host b64 via our route.
 * Returns markdown the model should include in its reply.
 */
export async function generateChatImage(
  prompt: string,
  opts?: { signal?: AbortSignal; size?: '1024x1024' | '1024x1792' | '1792x1024' },
): Promise<{ markdown: string; image: GeneratedChatImage }> {
  const client = chatImageClient()
  if (!client) {
    throw new Error(
      'Image generation is not configured. Set OPENAI_IMAGE_API_KEY (or OPENAI_API_KEY with an Images-capable host).',
    )
  }
  const cleaned = prompt.trim().slice(0, 3_000)
  if (!cleaned) throw new Error('prompt required')

  const model = env.chatImageModel
  const size = opts?.size || '1024x1024'

  const result = await client.images.generate(
    {
      model,
      prompt: cleaned,
      n: 1,
      size,
      ...(model.startsWith('dall-e') ? { response_format: 'url' } : {}),
    } as never,
    opts?.signal ? { signal: opts.signal } : undefined,
  )

  const row = result.data?.[0]
  if (!row) throw new Error('Image API returned no data.')

  pruneStore()
  const id = randomUUID()
  let image: GeneratedChatImage

  if (typeof row.url === 'string' && /^https?:\/\//i.test(row.url)) {
    image = {
      id,
      prompt: cleaned,
      mime: 'image/png',
      url: row.url,
      createdAt: Date.now(),
    }
  } else if (typeof row.b64_json === 'string' && row.b64_json) {
    const bytes = Buffer.from(row.b64_json, 'base64')
    image = {
      id,
      prompt: cleaned,
      mime: 'image/png',
      url: publicImagePath(id),
      createdAt: Date.now(),
      bytes,
    }
  } else {
    throw new Error('Image API returned neither url nor b64_json.')
  }

  STORE.set(id, image)
  const alt = cleaned.replace(/[\[\]]/g, '').slice(0, 120)
  const markdown = `![${alt}](${image.url})`
  return { markdown, image }
}
