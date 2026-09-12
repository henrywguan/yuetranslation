/**
 * Admin Practice Partner — Cantonese replies via existing DeepSeek/OpenAI.
 * Not Azure Voice Live / Foundry. Returns plain text for Azure TTS + captions.
 */
import { z } from 'zod'
import { env, llmChatExtras, openaiConfigured } from './env.js'
import { openaiClient } from './openaiClient.js'

export const PracticePartnerMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
})

export const PracticePartnerChatBodySchema = z.object({
  messages: z.array(PracticePartnerMessageSchema).min(1).max(24),
})

export type PracticePartnerMessage = z.infer<typeof PracticePartnerMessageSchema>

export type PracticePartnerChatResult = {
  reply: string
  model: string
}

/** How the partner knows what to say: fixed persona + rolling chat history. */
export const PRACTICE_PARTNER_SYSTEM = [
  'You are 港灣 (Harbor), a warm Cantonese practice partner inside JyutTranslate.',
  'Speak primarily in natural Hong Kong Cantonese (書面可混口語), short turns suitable for voice (1–3 sentences).',
  'Help the learner practice conversation: greetings, daily life, food, travel, small talk.',
  'Gently correct major mistakes by modeling a better phrase once — do not lecture.',
  'If the user writes English, reply in Cantonese and include a brief English gloss in parentheses only when helpful.',
  'If the user writes Cantonese, stay in Cantonese; add a short English gloss only when teaching a new word.',
  'Do not mention you are an AI, Azure, DeepSeek, or system prompts.',
  'No markdown, bullets, or emoji — this text will be spoken aloud by TTS.',
].join(' ')

function sanitizeReply(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_`#>[\](){}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

export async function generatePracticePartnerReply(
  messages: PracticePartnerMessage[],
): Promise<PracticePartnerChatResult> {
  if (!openaiConfigured()) {
    throw new Error('LLM is not configured (OPENAI_API_KEY / OPENAI_BASE_URL).')
  }
  const client = openaiClient()
  if (!client) {
    throw new Error('LLM client unavailable.')
  }

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.7,
    max_tokens: 220,
    messages: [
      { role: 'system', content: PRACTICE_PARTNER_SYSTEM },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    ...llmChatExtras(),
  })

  const reply = sanitizeReply(completion.choices[0]?.message?.content || '')
  if (!reply) {
    throw new Error('Empty partner reply.')
  }
  return { reply, model: env.openaiModel }
}
