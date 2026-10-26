/**
 * General DeepSeek / OpenAI-compatible chat (Family/Business #/chat).
 * Not product-support or Cantonese tutoring — plain assistant.
 *
 * Unlike translate (`llmChatExtras` disables thinking to save tokens), this path
 * keeps DeepSeek thinking on so quality matches the official DeepSeek app.
 */
import { z } from 'zod'
import { env, openaiConfigured } from './env.js'
import { openaiClient } from './openaiClient.js'
import { getAdmin } from './supabase.js'
import { currentMonthKey } from './usage.js'

export const DeepseekChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(8000),
})

export const DeepseekChatBodySchema = z.object({
  messages: z.array(DeepseekChatMessageSchema).min(1).max(48),
  /** DeepThink toggle — default on for DeepSeek hosts. */
  thinking: z.boolean().optional(),
})

export type DeepseekChatMessage = z.infer<typeof DeepseekChatMessageSchema>

export type DeepseekChatStreamEvent =
  | { kind: 'thinking' }
  | { kind: 'reasoning'; text: string }
  | { kind: 'delta'; text: string }

/** Keep last N turns so prompts stay bounded. */
export const DEEPSEEK_CHAT_HISTORY_LIMIT = 24

/** Room for chain-of-thought + a long structured answer. */
export const DEEPSEEK_CHAT_MAX_TOKENS = 8192

export const DEEPSEEK_CHAT_SYSTEM = [
  'You are a helpful AI assistant.',
  'Give accurate, well-structured answers.',
  'When a question benefits from detail (guides, comparisons, plans), be thorough and organized — use headings, bullets, or tables when they help.',
  'Use the language the user writes in unless they ask otherwise.',
].join(' ')

/** True when chat should use DeepSeek thinking mode (default on for DeepSeek hosts/models). */
export function deepseekChatUsesThinking(): boolean {
  return /deepseek/i.test(`${env.openaiBaseUrl} ${env.openaiModel}`)
}

/**
 * Chat Completions extras for general chat.
 * Do NOT reuse translate's thinking:disabled — that collapses Flash to a shallow answerer.
 */
export function deepseekChatLlmExtras(thinkingEnabled = true): Record<string, unknown> {
  if (!deepseekChatUsesThinking()) return {}
  if (!thinkingEnabled) return { thinking: { type: 'disabled' } }
  return {
    thinking: { type: 'enabled' },
    reasoning_effort: 'high',
  }
}

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

function chatMessagesPayload(messages: DeepseekChatMessage[]) {
  const recent = recentDeepseekChatMessages(messages)
  return [
    { role: 'system' as const, content: DEEPSEEK_CHAT_SYSTEM },
    ...recent.map((m) => ({ role: m.role, content: m.content })),
  ]
}

function chatBaseParams(thinkingEnabled = true) {
  const thinking = deepseekChatUsesThinking() && thinkingEnabled
  return {
    model: env.openaiModel,
    // Thinking mode ignores temperature; omit it there so we match DeepSeek docs.
    ...(thinking ? {} : { temperature: 0.7 as const }),
    max_tokens: DEEPSEEK_CHAT_MAX_TOKENS,
    ...deepseekChatLlmExtras(thinkingEnabled),
  }
}

export async function generateDeepseekChatReply(
  messages: DeepseekChatMessage[],
  thinkingEnabled = true,
): Promise<{ reply: string; model: string; reasoning?: string }> {
  if (!openaiConfigured()) {
    throw new Error('Chat model is not configured.')
  }
  const client = openaiClient()
  if (!client) throw new Error('Chat model is not configured.')

  const completion = await client.chat.completions.create({
    ...chatBaseParams(thinkingEnabled),
    stream: false,
    messages: chatMessagesPayload(messages),
  })

  const message = completion.choices[0]?.message as
    | { content?: string | null; reasoning_content?: string | null }
    | undefined
  const reply = message?.content?.trim() || ''
  if (!reply) throw new Error('Empty model reply.')
  const reasoning = message?.reasoning_content?.trim() || undefined
  return { reply, model: env.openaiModel, reasoning }
}

/**
 * Stream assistant tokens. Yields reasoning deltas for the DeepSeek-style trace panel,
 * then answer `delta` events.
 */
export async function* streamDeepseekChatReply(
  messages: DeepseekChatMessage[],
  thinkingEnabled = true,
): AsyncGenerator<DeepseekChatStreamEvent, void, unknown> {
  if (!openaiConfigured()) {
    throw new Error('Chat model is not configured.')
  }
  const client = openaiClient()
  if (!client) throw new Error('Chat model is not configured.')

  const stream = await client.chat.completions.create({
    ...chatBaseParams(thinkingEnabled),
    stream: true,
    messages: chatMessagesPayload(messages),
  })

  let announcedThinking = false
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta as
      | { content?: string | null; reasoning_content?: string | null }
      | undefined
    if (!delta) continue
    if (delta.reasoning_content) {
      if (!announcedThinking) {
        announcedThinking = true
        yield { kind: 'thinking' }
      }
      yield { kind: 'reasoning', text: delta.reasoning_content }
      continue
    }
    if (delta.content) yield { kind: 'delta', text: delta.content }
  }
}
