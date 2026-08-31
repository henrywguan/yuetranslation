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
          'You translate signs, menus, forms, and short labels for Hong Kong / Greater China readers.',
          'Translate English into natural written Chinese (書面語). Prefer Traditional characters (繁體).',
          'Disambiguate by likely setting:',
          '- Hotel / lobby / hospitality: Check-in → 入住登記 (not airport 登機); Concierge → 禮賓; Luggage storage → 行李寄存.',
          '- Immigration / legal letters: Character Reference → 品格證明 / 推薦信 (not 角色參考).',
          '- Pharmacy: Prescription pickup → 處方取藥; take a number → 請抽籌; Queue here → 請在此排隊.',
          '- Safety: Wet floor → 小心地滑 / 地面濕滑; Caution → 小心.',
          'Food/menu names: use common Hong Kong café wording (e.g. pineapple bun → 菠蘿包).',
          'Keep brand names and codes (A2, HK$) when appropriate.',
          'Return ONLY valid JSON: {"translation":"<Chinese>"}',
          'No markdown, no explanation.',
        ].join('\n')
      : [
          'You translate signs, menus, forms, and short labels into clear traveler English.',
          'Source may be Traditional or Simplified Chinese (Cantonese or Mandarin writing).',
          'Use concise sign English: 不准進入 → No entry; 今日特餐 → Today\'s special; 乾炒牛河 → Dry-fried beef chow fun.',
          'Dim sum: 蝦餃 → har gow / shrimp dumplings; 燒賣 → siu mai; 叉燒包 → BBQ pork bun; 流沙包 → lava custard bun.',
          'Keep place names (中環 → Central) and exit codes.',
          'Never leave the translation empty. Never copy Chinese characters into the English output.',
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
