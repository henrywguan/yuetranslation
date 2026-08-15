import OpenAI from 'openai'
import { z } from 'zod'
import { env, openaiConfigured } from './env.js'

const Body = z.object({
  text: z.string().min(1).max(2000),
  from: z.enum(['en', 'yue']).default('en'),
  to: z.enum(['en', 'yue']),
  /** When true and EN→粵, also return colloquial alternatives if they exist. */
  includeAlternatives: z.boolean().optional().default(false),
})

type DemoEntry = { text: string; definition?: string; alternatives?: string[] }

const DEMO: Record<string, DemoEntry> = {
  hello: { text: '你好', definition: 'hello; hi (greeting)', alternatives: ['哈囉', '嗨'] },
  hi: { text: '嗨', definition: 'hi; hey', alternatives: ['你好', '哈囉'] },
  'thank you': { text: '唔該', definition: 'thank you (for a service / favor)', alternatives: ['多謝'] },
  thanks: { text: '多謝', definition: 'thanks; many thanks', alternatives: ['唔該'] },
  'good morning': { text: '早晨', definition: 'good morning', alternatives: ['早安'] },
  'how are you': { text: '你好嗎', definition: 'how are you?', alternatives: ['最近點呀', '你幾好嗎'] },
  'what are you doing': {
    text: '你做緊咩呀？',
    definition: 'what are you doing?',
    alternatives: ['你而家做緊咩？', '做緊咩呀你？', '你喺度做緊乜嘢？'],
  },
  "what's up": { text: '點呀？', definition: "what's up?", alternatives: ['最近點？', '有咩事？'] },
  'where is the mtr': {
    text: '地鐵喺邊度',
    definition: 'where is the MTR / subway?',
    alternatives: ['港鐵喺邊呀', '地鐵站喺邊'],
  },
  'how much is this': {
    text: '呢個幾錢',
    definition: 'how much is this?',
    alternatives: ['呢樣幾多錢', '請問賣幾錢'],
  },
  yes: { text: '係', definition: 'yes' },
  no: { text: '唔係', definition: 'no' },
  你好: { text: 'Hello', definition: 'hello; hi' },
  唔該: { text: 'Thank you', definition: 'thank you' },
  多謝: { text: 'Thanks', definition: 'thanks' },
  早晨: { text: 'Good morning', definition: 'good morning' },
  你做緊咩呀: { text: 'What are you doing?', definition: 'what are you doing?' },
  '你做緊咩呀？': { text: 'What are you doing?', definition: 'what are you doing?' },
  地鐵喺邊度: { text: 'Where is the MTR?', definition: 'where is the MTR?' },
  呢個幾錢: { text: 'How much is this?', definition: 'how much is this?' },
  係: { text: 'Yes', definition: 'yes' },
  唔係: { text: 'No', definition: 'no' },
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

function parsePayload(
  raw: string,
  fallbackText: string,
  fallbackDefinition: string,
): { text: string; definition: string } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as { translation?: unknown; definition?: unknown; text?: unknown }
    const textCandidate =
      (typeof parsed.translation === 'string' && parsed.translation.trim()) ||
      (typeof parsed.text === 'string' && parsed.text.trim()) ||
      ''
    const defCandidate = typeof parsed.definition === 'string' ? parsed.definition.trim() : ''
    return {
      text: textCandidate || fallbackText,
      definition: defCandidate || fallbackDefinition,
    }
  } catch {
    return { text: cleaned || fallbackText, definition: fallbackDefinition }
  }
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
    return { text, definition: '', alternatives: [], engine: 'identity', from, to }
  }

  const fallbackDefinition = from === 'en' ? text : ''

  if (!openaiConfigured()) {
    const key = demoLookupKey(text)
    const hit = DEMO[key] || DEMO[text]
    const primary = hit?.text || (to === 'yue' ? `（示範）${text}` : `(demo) ${text}`)
    const definition =
      hit?.definition ||
      (to === 'yue' ? fallbackDefinition : hit?.text ? '' : fallbackDefinition)
    const alternatives =
      wantAlts && hit?.alternatives ? uniqAlternatives(primary, hit.alternatives) : []
    return {
      text: primary,
      definition: to === 'yue' ? definition : hit?.definition || '',
      alternatives,
      engine: 'demo',
      from,
      to,
    }
  }

  const client = new OpenAI({
    apiKey: env.openaiApiKey || 'ollama',
    ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
  })
  const toYue = to === 'yue'

  if (wantAlts) {
    const system = [
      'You are a Hong Kong Cantonese interpreter.',
      'Translate English into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
      'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
      'Return ONLY valid JSON with this shape:',
      '{"primary":"<best translation>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
      'Rules for alternatives:',
      '- For everyday conversational questions (e.g. “what are you doing?”), prefer 2–3 natural spoken variants.',
      '- Variants should meaningfully differ (word order, particles, politeness, 而家 vs bare progressive).',
      '- Do not repeat the primary or near-duplicates.',
      '- If there is truly no useful variation, return "alternatives": [].',
      '- definition should help a learner: brief, clear, natural English.',
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
    let definition = fallbackDefinition
    try {
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      const parsedJson = JSON.parse(cleaned) as { definition?: unknown }
      if (typeof parsedJson.definition === 'string' && parsedJson.definition.trim()) {
        definition = parsedJson.definition.trim()
      }
    } catch {
      /* keep fallback */
    }
    return {
      text: primary,
      definition,
      alternatives,
      engine: env.openaiBaseUrl ? 'openai-compatible' : 'openai',
      from,
      to,
    }
  }

  const system = toYue
    ? [
        'You are a Hong Kong Cantonese interpreter.',
        'Translate into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
        'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
        'Return ONLY valid JSON:',
        '{"translation":"<Cantonese>","definition":"<short English gloss of what the Cantonese means>"}',
        'The definition should help a learner: brief, clear, natural English (not a dictionary dump).',
      ].join('\n')
    : [
        'You are a Hong Kong Cantonese interpreter.',
        'Translate Cantonese into natural English for face-to-face conversation.',
        'Return ONLY valid JSON:',
        '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
      ].join('\n')

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() || ''
  const payload = parsePayload(raw, text, fallbackDefinition)

  return {
    text: payload.text,
    definition: toYue ? payload.definition || fallbackDefinition : payload.definition,
    alternatives: [] as string[],
    engine: env.openaiBaseUrl ? 'openai-compatible' : 'openai',
    from,
    to,
  }
}
