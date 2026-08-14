import OpenAI from 'openai'
import { z } from 'zod'
import { env, openaiConfigured } from './env.js'

const Body = z.object({
  text: z.string().min(1).max(2000),
  from: z.enum(['en', 'yue']).default('en'),
  to: z.enum(['en', 'yue']),
})

const DEMO: Record<string, string> = {
  hello: '你好',
  hi: '嗨',
  'thank you': '唔該',
  thanks: '多謝',
  'good morning': '早晨',
  'how are you': '你好嗎',
  'where is the mtr': '地鐵喺邊度',
  'how much is this': '呢個幾錢',
  你好: 'Hello',
  唔該: 'Thank you',
  多謝: 'Thanks',
  早晨: 'Good morning',
  地鐵喺邊度: 'Where is the MTR?',
  呢個幾錢: 'How much is this?',
  今日天氣好好呀: 'The weather is really nice today.',
  我想食茶餐廳: 'I want to eat at a cha chaan teng.',
  呢度去尖沙咀點樣行: 'How do I walk to Tsim Sha Tsui from here?',
}

function createChatClient() {
  return new OpenAI({
    // Ollama ignores the key but the SDK requires a non-empty string.
    apiKey: env.openaiApiKey || 'ollama',
    ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
  })
}

export async function translate(input: unknown) {
  const parsed = Body.parse(input)
  const from = parsed.from
  const to = parsed.to
  const text = parsed.text.trim()

  if (from === to) {
    return { text, engine: 'identity', from, to }
  }

  if (!openaiConfigured()) {
    const key = text.toLowerCase()
    const hit = DEMO[key] || DEMO[text]
    return {
      text: hit || (to === 'yue' ? `（示範）${text}` : `(demo) ${text}`),
      engine: 'demo',
      from,
      to,
    }
  }

  const client = createChatClient()
  const toYue = to === 'yue'
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
    engine: env.openaiBaseUrl ? 'openai-compatible' : 'openai',
    from,
    to,
  }
}
