import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { hasHan } from './canto/han.js'
import { scrubYueToCmn } from './canto/scrubCmn.js'

/** Camera / docs target languages. Prefer yue|cmn; legacy `zh` maps to yue. */
export type CameraLang = 'en' | 'yue' | 'cmn'

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
 * Models often echo the prompt's "1. / 2." line markers into each translation.
 * Strip a leading list index only when it looks like a batch marker (not e.g. "50g").
 */
export function stripLeadingListNumber(text: string): string {
  const t = text.trim()
  if (!t) return t
  // "1. 翻譯" / "12) Foo" / "3、文言" — not "50g" or "2017年"
  return t.replace(/^\d{1,3}(?:[\.\)：:]|\u3001)\s*/, '').trim() || t
}

function mapBatchItem(v: unknown, fallback: string): string {
  if (typeof v !== 'string' || !v.trim()) return fallback
  return stripLeadingListNumber(v)
}

export function parseBatchTranslations(raw: string, fallbacks: string[]): string[] {
  let trimmed = raw.trim()
  if (!trimmed) return fallbacks
  trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const json = JSON.parse(trimmed) as unknown
    if (Array.isArray(json)) {
      return json.map((v, i) => mapBatchItem(v, fallbacks[i] || ''))
    }
    if (json && typeof json === 'object') {
      const arr = (json as { translations?: unknown }).translations
      if (Array.isArray(arr)) {
        return arr.map((v, i) => mapBatchItem(v, fallbacks[i] || ''))
      }
    }
  } catch {
    // fall through — plain numbered lines as a last resort
    const lines = trimmed
      .split(/\n+/)
      .map((l) => stripLeadingListNumber(l))
      .filter(Boolean)
    if (lines.length === fallbacks.length) return lines
  }
  return fallbacks
}

function isChineseTarget(to: CameraLang): boolean {
  return to === 'yue' || to === 'cmn'
}

function cameraSystemPrompt(to: CameraLang, docBatch = false): string {
  const docHint = docBatch
    ? 'These lines come from one document — keep terminology, names, and tone consistent across all lines.'
    : ''
  if (to === 'yue') {
    return [
      'You translate signs, menus, forms, and short labels for Hong Kong / Cantonese readers.',
      'Translate English into natural written Chinese for Hong Kong (書面語 / 繁體). Prefer Traditional characters.',
      'Use Hong Kong wording where it differs from Mainland Mandarin (e.g. 的士 not 出租车; 巴士 not 公交车).',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel / lobby / hospitality: Check-in → 入住登記 (not airport 登機); Concierge → 禮賓; Luggage storage → 行李寄存.',
      '- Immigration / legal letters: Character Reference → 品格證明 / 推薦信 (not 角色參考); Judge → 法官; Federal District Court → 聯邦地區法院.',
      '- Pharmacy: Prescription pickup → 處方取藥; take a number → 請抽籌; Queue here → 請在此排隊.',
      '- Safety: Wet floor → 小心地滑 / 地面濕滑; Caution → 小心.',
      'Food/menu names: use common Hong Kong café wording (e.g. pineapple bun → 菠蘿包).',
      'Keep personal names, place names, and legal terms accurate.',
      'Keep brand names and codes (A2, HK$) when appropriate.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Chinese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (to === 'cmn') {
    return [
      'You translate signs, menus, forms, and short labels into Mandarin Chinese (普通话).',
      'Prefer Simplified characters (简体) for Mainland / Mandarin readers.',
      'Do NOT use Cantonese-only particles or Hong Kong-only spellings (no 係/唔/喺/咗/㗎 unless shared).',
      docHint,
      'Disambiguate by likely setting:',
      '- Hotel: Check-in → 入住登记; Concierge → 礼宾; Luggage storage → 行李寄存.',
      '- Legal: Character Reference → 品格证明 / 推荐信; Judge → 法官.',
      '- Pharmacy: Prescription pickup → 处方取药; Queue here → 请在此排队.',
      '- Safety: Wet floor → 小心地滑; Caution → 小心.',
      'Keep brand names and codes when appropriate.',
      docBatch
        ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
        : 'Return ONLY valid JSON: {"translation":"<Mandarin Chinese>"}',
      'No markdown, no explanation.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    'You translate signs, menus, forms, and short labels into clear traveler English.',
    'Source may be Traditional or Simplified Chinese (Cantonese or Mandarin writing).',
    docHint,
    "Use concise sign English: 不准進入 → No entry; 今日特餐 → Today's special; 乾炒牛河 → Dry-fried beef chow fun.",
    'Dim sum: 蝦餃 → har gow / shrimp dumplings; 燒賣 → siu mai; 叉燒包 → BBQ pork bun; 流沙包 → lava custard bun.',
    'Keep place names (中環 → Central) and exit codes.',
    'Never leave the translation empty. Never copy Chinese characters into the English output.',
    docBatch
      ? 'Return ONLY valid JSON: {"translations":["line1","line2",...]} — same count and order as input. Do NOT put "1." / "2." indices inside the strings.'
      : 'Return ONLY valid JSON: {"translation":"<English>"}',
    'No markdown, no explanation.',
  ]
    .filter(Boolean)
    .join('\n')
}

export type CameraTranslateOpts = {
  /** Nearby OCR / document lines for disambiguation (not translated). */
  context?: string
}

/**
 * Camera / written-Chinese translate (EN ↔ yue|cmn).
 * Never apply Yue scrub to Mandarin (cmn) outputs — reverse-scrub Yue→cmn instead.
 */
export async function translateCameraText(
  text: string,
  from: CameraLang,
  to: CameraLang,
  opts?: CameraTranslateOpts,
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
    let demo = isChineseTarget(to)
      ? hasHan(source)
        ? source
        : to === 'cmn'
          ? `（示范）${source}`
          : `（示範）${source}`
      : hasHan(source)
        ? `(demo) ${source}`
        : `(demo) ${source}`
    if (to === 'cmn') demo = scrubYueToCmn(demo).text
    remember(key, demo)
    return { text: demo, engine: 'demo', cacheHit: false }
  }

  const context = opts?.context?.trim().slice(0, 800)
  const userContent = context
    ? `Context (do not translate):\n${context}\n\nTranslate this line:\n${source}`
    : source

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: 'system', content: cameraSystemPrompt(to) },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    ...llmChatExtras(),
  })

  const raw = completion.choices[0]?.message?.content?.trim() || ''
  const fallback = isChineseTarget(to)
    ? to === 'cmn'
      ? `（译）${source}`
      : `（譯）${source}`
    : `(tr) ${source}`
  let translated = parseTranslation(raw, fallback)
  if (to === 'cmn') translated = scrubYueToCmn(translated).text
  remember(key, translated)
  return {
    text: translated,
    engine: env.openaiBaseUrl ? 'openai-compatible' : 'openai',
    cacheHit: false,
  }
}

const BATCH_SIZE = 16

function langLabel(lang: CameraLang): string {
  if (lang === 'en') return 'English'
  if (lang === 'cmn') return 'Mandarin Chinese 普通话 (简体 OK)'
  return 'Hong Kong Chinese 繁體'
}

/** Context-aware batch translate for document page lines (keeps names/terms consistent). */
export async function translateCameraBatch(
  segments: string[],
  from: CameraLang,
  to: CameraLang,
): Promise<{ translations: string[]; engine: string }> {
  if (!segments.length) return { translations: [], engine: 'empty' }
  if (from === to) return { translations: segments, engine: 'identity' }

  const client = openaiClient()
  if (!client) {
    return {
      translations: segments.map((s) => {
        let demo = isChineseTarget(to)
          ? hasHan(s)
            ? s
            : to === 'cmn'
              ? `（示范）${s}`
              : `（示範）${s}`
          : hasHan(s)
            ? `(demo) ${s}`
            : `(demo) ${s}`
        if (to === 'cmn') demo = scrubYueToCmn(demo).text
        return demo
      }),
      engine: 'demo',
    }
  }

  const out = [...segments]
  for (let start = 0; start < segments.length; start += BATCH_SIZE) {
    const chunk = segments.slice(start, start + BATCH_SIZE)
    const numbered = chunk.map((line, i) => `${i + 1}. ${line}`).join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: Math.min(4000, 180 * chunk.length + 120),
      messages: [
        { role: 'system', content: cameraSystemPrompt(to, true) },
        {
          role: 'user',
          content: `Translate each numbered line (${langLabel(from)} → ${langLabel(to)}):\n${numbered}`,
        },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const fallbacks = chunk.map((s) =>
      isChineseTarget(to) ? (to === 'cmn' ? `（译）${s}` : `（譯）${s}`) : `(tr) ${s}`,
    )
    const translated = parseBatchTranslations(raw, fallbacks)
    for (let i = 0; i < chunk.length; i++) {
      let t = stripLeadingListNumber((translated[i] || '').trim())
      const src = chunk[i] || ''
      if (to === 'en' && hasHan(t)) out[start + i] = src
      else if (isChineseTarget(to) && t && !hasHan(t) && /[A-Za-z]/.test(src)) out[start + i] = src
      else {
        if (to === 'cmn' && t) t = scrubYueToCmn(t).text
        out[start + i] = t || src
      }
      remember(`${from}|${to}|${src}`, out[start + i]!)
    }
  }

  return {
    translations: out,
    engine: env.openaiBaseUrl ? 'openai-compatible' : 'openai',
  }
}

/** Normalize legacy `zh` → `yue` for API callers. */
export function normalizeCameraLang(lang: string | undefined): CameraLang | undefined {
  if (!lang) return undefined
  if (lang === 'zh' || lang === 'yue') return 'yue'
  if (lang === 'cmn' || lang === 'en') return lang
  return undefined
}
