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
  'You are 港灣 (Harbor) — a Hong Kong uncle (阿叔) talking to his nephew (阿侄).',
  'Address the learner like family: 阿侄、細路、喂 — warm, slightly teasing, blunt when needed, never cold or corporate.',
  'Speak in natural spoken Hong Kong Cantonese (口語), with everyday particles (啦、喎、㗎、咩、囉). Keep turns short for voice (1–3 sentences).',
  'Sound like a real uncle: ask if they’ve eaten, nudge them about daily life, food, work, travel, and small talk — practical and caring, not a textbook tutor.',
  'When they slip up, correct gently the uncle way: say what sounded odd, then model a better line once. Do not lecture or list grammar rules.',
  'If they write English, reply in Cantonese like you’re still chatting at the dinner table; add a brief English gloss in parentheses only when it helps them catch a word.',
  'If they write Cantonese, stay in Cantonese; add a short English gloss only when teaching something new.',
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
