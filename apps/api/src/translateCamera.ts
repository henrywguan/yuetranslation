import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { hasHan } from './canto/han.js'

export type CameraLang = 'en' | 'zh'

const CACHE_MAX = 256
const cache = new Map<string, string>()

function remember(key: string, value: string) {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, value)
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

function parseTranslation(raw: string, fallback: string): string {
  let trimmed = raw.trim()
  if (!trimmed) return fallback
  // Strip accidental markdown fences from some OpenAI-compatible backends.
  trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const json = JSON.parse(trimmed) as unknown
      if (typeof json === 'string') {
        trimmed = json.trim()
        continue
      }
      if (json && typeof json === 'object') {
        const obj = json as { translation?: unknown; text?: unknown }
        const t =
          (typeof obj.translation === 'string' && obj.translation.trim()) ||
          (typeof obj.text === 'string' && obj.text.trim()) ||
          ''
        if (t) return t
      }
      break
    } catch {
      break
    }
  }

  const m = trimmed.match(/"translation"\s*:\s*"((?:\\.|[^"\\])*)"/)
  if (m?.[1]) {
    try {
      return JSON.parse(`"${m[1]}"`) as string
    } catch {
      return m[1]
    }
  }

  return trimmed.replace(/^["']|["']$/g, '').trim() || fallback
}

/**
 * Camera / written-Chinese translate (EN ↔ zh).
 * Separate from speech EN↔粵 so Solo/Conversation stay unchanged.
 */
export async function translateCameraText(
  text: string,
  from: CameraLang,
  to: CameraLang,
): Promise<{ text: string; engine: string; cacheHit: boolean }> {
  const source = text.trim().slice(0, 2000)
  if (!source) return { text: '', engine: 'empty', cacheHit: true }
  if (from === to) return { text: source, engine: 'identity', cacheHit: true }

  const key = `${from}|${to}|${source}`
  const hit = cache.get(key)
  if (hit !== undefined) {
    remember(key, hit)
    return { text: hit, engine: 'cache', cacheHit: true }
  }

  const client = openaiClient()
  if (!client) {
    const demo =
      to === 'zh'
        ? hasHan(source)
          ? source
          : `（示範）${source}`
        : hasHan(source)
          ? `(demo) ${source}`
          : `(demo) ${source}`
    remember(key, demo)
    return { text: demo, engine: 'demo', cacheHit: false }
  }

  const system =
    to === 'zh'
      ? [
          'You translate signs, menus, and labels for Hong Kong / Greater China readers.',
          'Translate English into natural written Chinese.',
          'Prefer Traditional Chinese characters (繁體) when both are possible.',
          'Use wording that works for both Cantonese and Mandarin readers on signs/menus.',
          'Keep proper nouns when standard; otherwise transliterate sensibly.',
          'Return ONLY valid JSON: {"translation":"<Chinese>"}',
          'No markdown, no explanation.',
        ].join('\n')
      : [
          'You translate signs, menus, and labels into natural English.',
          'Source may be Traditional or Simplified Chinese (Cantonese or Mandarin writing).',
          'Preserve meaning for travelers; keep brand names when appropriate.',
          'Return ONLY valid JSON: {"translation":"<English>"}',
          'No markdown, no explanation.',
        ].join('\n')

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: source },
    ],
    response_format: { type: 'json_object' },
    ...llmChatExtras(),
  })

  const raw = completion.choices[0]?.message?.content?.trim() || ''
  const translated = parseTranslation(raw, to === 'zh' ? `（譯）${source}` : `(tr) ${source}`)
  remember(key, translated)
  return {
    text: translated,
    engine: env.openaiBaseUrl ? 'openai-compatible' : 'openai',
    cacheHit: false,
  }
}
