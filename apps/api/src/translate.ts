import OpenAI from 'openai'
import { z } from 'zod'
import { env, openaiConfigured } from './env.js'

const Body = z.object({
  text: z.string().min(1).max(2000),
  from: z.enum(['en', 'yue']).default('en'),
  to: z.enum(['en', 'yue']),
})

type DemoEntry = { text: string; definition?: string }

const DEMO: Record<string, DemoEntry> = {
  hello: { text: '你好', definition: 'hello; hi (greeting)' },
  hi: { text: '嗨', definition: 'hi; hey' },
  'thank you': { text: '唔該', definition: 'thank you (for a service / favor)' },
  thanks: { text: '多謝', definition: 'thanks; many thanks' },
  'good morning': { text: '早晨', definition: 'good morning' },
  'how are you': { text: '你好嗎', definition: 'how are you?' },
  'where is the mtr': { text: '地鐵喺邊度', definition: 'where is the MTR / subway?' },
  'how much is this': { text: '呢個幾錢', definition: 'how much is this?' },
  yes: { text: '係', definition: 'yes' },
  no: { text: '唔係', definition: 'no' },
  你好: { text: 'Hello', definition: 'hello; hi' },
  唔該: { text: 'Thank you', definition: 'thank you' },
  多謝: { text: 'Thanks', definition: 'thanks' },
  早晨: { text: 'Good morning', definition: 'good morning' },
  地鐵喺邊度: { text: 'Where is the MTR?', definition: 'where is the MTR?' },
  呢個幾錢: { text: 'How much is this?', definition: 'how much is this?' },
  係: { text: 'Yes', definition: 'yes' },
  唔係: { text: 'No', definition: 'no' },
}

function demoLookupKey(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[?!.,;:。？！，、…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
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

export async function translate(input: unknown) {
  const parsed = Body.parse(input)
  const from = parsed.from
  const to = parsed.to
  const text = parsed.text.trim()

  if (from === to) {
    return { text, definition: '', engine: 'identity', from, to }
  }

  const fallbackDefinition = from === 'en' ? text : ''

  if (!openaiConfigured()) {
    const key = demoLookupKey(text)
    const hit = DEMO[key] || DEMO[text]
    const primary = hit?.text || (to === 'yue' ? `（示範）${text}` : `(demo) ${text}`)
    const definition =
      hit?.definition ||
      (to === 'yue' ? fallbackDefinition : hit?.text ? '' : fallbackDefinition)
    return {
      text: primary,
      definition: to === 'yue' ? definition : hit?.definition || '',
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
    engine: env.openaiBaseUrl ? 'openai-compatible' : 'openai',
    from,
    to,
  }
}
