import OpenAI from 'openai'
import { z } from 'zod'
import { env } from './env.js'

const Body = z.object({
  text: z.string().min(1).max(2000),
  from: z.enum(['en', 'yue']).default('en'),
  to: z.enum(['en', 'yue']),
  /** When true and EN→粵, also return colloquial alternatives if they exist. */
  includeAlternatives: z.boolean().optional().default(false),
})

type DemoEntry = { text: string; alternatives?: string[] }

const DEMO: Record<string, DemoEntry> = {
  hello: { text: '你好', alternatives: ['哈囉', '嗨'] },
  hi: { text: '嗨', alternatives: ['你好', '哈囉'] },
  'thank you': { text: '唔該', alternatives: ['多謝'] },
  thanks: { text: '多謝', alternatives: ['唔該'] },
  'good morning': { text: '早晨', alternatives: ['早安'] },
  'how are you': { text: '你好嗎', alternatives: ['最近點呀', '你幾好嗎'] },
  'what are you doing': {
    text: '你做緊咩呀？',
    alternatives: ['你而家做緊咩？', '做緊咩呀你？', '你喺度做緊乜嘢？'],
  },
  "what's up": { text: '點呀？', alternatives: ['最近點？', '有咩事？'] },
  'where is the mtr': { text: '地鐵喺邊度', alternatives: ['港鐵喺邊呀', '地鐵站喺邊'] },
  'how much is this': { text: '呢個幾錢', alternatives: ['呢樣幾多錢', '請問賣幾錢'] },
  你好: { text: 'Hello' },
  唔該: { text: 'Thank you' },
  多謝: { text: 'Thanks' },
  早晨: { text: 'Good morning' },
  你做緊咩呀: { text: 'What are you doing?' },
  '你做緊咩呀？': { text: 'What are you doing?' },
  地鐵喺邊度: { text: 'Where is the MTR?' },
  呢個幾錢: { text: 'How much is this?' },
}

/** Normalize for demo lookup: lowercase, collapse space, strip trailing punctuation. */
function demoLookupKey(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[?!.,;:。？！，、…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqAlternatives(primary: string, alts: string[]): string[] {
  const seen = new Set<string>([primary.trim()])
  const out: string[] = []
  for (const raw of alts) {
    const v = raw.trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
    if (out.length >= 3) break
  }
  return out
}

function parseYuePayload(raw: string, fallback: string): { text: string; alternatives: string[] } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as { primary?: unknown; alternatives?: unknown }
    const primary =
      typeof parsed.primary === 'string' && parsed.primary.trim()
        ? parsed.primary.trim()
        : fallback
    const alts = Array.isArray(parsed.alternatives)
      ? parsed.alternatives.filter((x): x is string => typeof x === 'string')
      : []
    return { text: primary, alternatives: uniqAlternatives(primary, alts) }
  } catch {
    // Model returned plain text — treat as primary only.
    return { text: cleaned || fallback, alternatives: [] }
  }
}

export async function translate(input: unknown) {
  const parsed = Body.parse(input)
  const from = parsed.from
  const to = parsed.to
  const text = parsed.text.trim()
  const wantAlts = Boolean(parsed.includeAlternatives && from === 'en' && to === 'yue')

  if (from === to) {
    return { text, alternatives: [], engine: 'identity', from, to }
  }

  if (!env.openaiApiKey) {
    const key = demoLookupKey(text)
    const hit = DEMO[key] || DEMO[text] || DEMO[demoLookupKey(text)]
    const primary = hit?.text || (to === 'yue' ? `（示範）${text}` : `(demo) ${text}`)
    const alternatives =
      wantAlts && hit?.alternatives ? uniqAlternatives(primary, hit.alternatives) : []
    return {
      text: primary,
      alternatives,
      engine: 'demo',
      from,
      to,
    }
  }

  const client = new OpenAI({ apiKey: env.openaiApiKey })
  const toYue = to === 'yue'

  if (wantAlts) {
    const system = [
      'You are a Hong Kong Cantonese interpreter.',
      'Translate English into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
      'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
      'Return ONLY valid JSON with this shape:',
      '{"primary":"<best translation>","alternatives":["<other natural variant>", "..."]}',
      'Rules for alternatives:',
      '- For everyday conversational questions (e.g. “what are you doing?”), prefer 2–3 natural spoken variants.',
      '- Variants should meaningfully differ (word order, particles, politeness, 而家/而家 vs bare progressive).',
      '- Do not repeat the primary or near-duplicates.',
      '- If there is truly no useful variation, return "alternatives": [].',
      '- No markdown, no explanation.',
    ].join('\n')

    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.35,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content?.trim() || text
    const { text: primary, alternatives } = parseYuePayload(raw, text)
    return { text: primary, alternatives, engine: 'openai', from, to }
  }

  const system = toYue
    ? [
        'You are a Hong Kong Cantonese interpreter.',
        'Translate into colloquial spoken Cantonese (口语粤语 / 口語粵語), not Mandarin and not formal written Chinese.',
        'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
        'Return ONLY the translation.',
      ].join('\n')
    : [
        'You are a Hong Kong Cantonese interpreter.',
        'Translate Cantonese into natural English for face-to-face conversation.',
        'Return ONLY the translation.',
      ].join('\n')

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ],
  })

  return {
    text: completion.choices[0]?.message?.content?.trim() || text,
    alternatives: [],
    engine: 'openai',
    from,
    to,
  }
}
