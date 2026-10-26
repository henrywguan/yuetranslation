/**
 * General DeepSeek / OpenAI-compatible chat (Family/Business #/chat).
 * Not product-support or Cantonese tutoring — plain assistant.
 */
import { z } from 'zod'
import { env, llmChatExtras, openaiConfigured } from './env.js'
import { openaiClient } from './openaiClient.js'
import { getAdmin } from './supabase.js'
import { currentMonthKey } from './usage.js'

export const DeepseekChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(8000),
})

export const DeepseekChatBodySchema = z.object({
  messages: z.array(DeepseekChatMessageSchema).min(1).max(48),
})

export type DeepseekChatMessage = z.infer<typeof DeepseekChatMessageSchema>

/** Keep last N turns so prompts stay bounded. */
export const DEEPSEEK_CHAT_HISTORY_LIMIT = 24

export const DEEPSEEK_CHAT_SYSTEM = [
  'You are a helpful AI assistant.',
  'Answer clearly and concisely.',
  'Use the language the user writes in unless they ask otherwise.',
].join(' ')

export function recentDeepseekChatMessages(
  messages: DeepseekChatMessage[],
  limit = DEEPSEEK_CHAT_HISTORY_LIMIT,
): DeepseekChatMessage[] {
  if (messages.length <= limit) return messages
  return messages.slice(-limit)
}

export function deepseekChatTurnLimit(plan: string, isAdmin: boolean): number {
  if (isAdmin) return 0
  if (plan === 'business') return Math.max(0, env.businessChatTurns)
  if (plan === 'family') return Math.max(0, env.familyChatTurns)
  return 0
}

export function canUseDeepseekChat(plan: string, isAdmin: boolean): boolean {
  if (isAdmin) return true
  return plan === 'family' || plan === 'business'
}

export async function getDeepseekChatTurns(userId: string, month = currentMonthKey()): Promise<number> {
  const client = getAdmin()
  if (!client) return 0
  const { data, error } = await client
    .from('deepseek_chat_months')
    .select('turn_count')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()
  if (error) {
    console.warn('[deepseek-chat] read turns failed:', error.message)
    return 0
  }
  return Math.max(0, Number(data?.turn_count) || 0)
}

export async function addDeepseekChatTurns(userId: string, turns = 1): Promise<number> {
  if (env.openMode) return 0
  const client = getAdmin()
  if (!client) return 0
  const month = currentMonthKey()
  const count = Math.max(0, Math.floor(turns))
  if (!count) return await getDeepseekChatTurns(userId, month)

  const { data, error } = await client.rpc('increment_deepseek_chat', {
    p_user_id: userId,
    p_month: month,
    p_turns: count,
  })
  if (!error && typeof data === 'number') return data

  if (error) {
    console.warn('[deepseek-chat] increment RPC unavailable, upserting:', error.message)
  }

  const current = await getDeepseekChatTurns(userId, month)
  const next = current + count
  const { error: upsertError } = await client.from('deepseek_chat_months').upsert(
    {
      user_id: userId,
      month,
      turn_count: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,month' },
  )
  if (upsertError) {
    console.error('[deepseek-chat] upsert failed:', upsertError.message)
    return current
  }
  return next
}

export async function generateDeepseekChatReply(
  messages: DeepseekChatMessage[],
): Promise<{ reply: string; model: string }> {
  if (!openaiConfigured()) {
    throw new Error('Chat model is not configured.')
  }
  const client = openaiClient()
  if (!client) throw new Error('Chat model is not configured.')

  const recent = recentDeepseekChatMessages(messages)
  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.7,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: DEEPSEEK_CHAT_SYSTEM },
      ...recent.map((m) => ({ role: m.role, content: m.content })),
    ],
    ...llmChatExtras(),
  })

  const reply = completion.choices[0]?.message?.content?.trim() || ''
  if (!reply) throw new Error('Empty model reply.')
  return { reply, model: env.openaiModel }
}

/** Stream assistant tokens; yields text deltas then completes. */
export async function* streamDeepseekChatReply(
  messages: DeepseekChatMessage[],
): AsyncGenerator<string, void, unknown> {
  if (!openaiConfigured()) {
    throw new Error('Chat model is not configured.')
  }
  const client = openaiClient()
  if (!client) throw new Error('Chat model is not configured.')

  const recent = recentDeepseekChatMessages(messages)
  const stream = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
    messages: [
      { role: 'system', content: DEEPSEEK_CHAT_SYSTEM },
      ...recent.map((m) => ({ role: m.role, content: m.content })),
    ],
    ...llmChatExtras(),
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta
  }
}
