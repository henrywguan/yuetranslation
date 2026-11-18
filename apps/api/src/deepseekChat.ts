/**
 * General DeepSeek / OpenAI-compatible chat (Family/Business #/chat).
 *
 * Unlike translate (`llmChatExtras` disables thinking to save tokens), this path
 * keeps DeepSeek thinking on so quality matches the official DeepSeek app.
 * Temporal context + tools live in deepseekChatPrompt / Tools / Agent.
 */
import { z } from 'zod'
import { DEEPSEEK_CHAT_SYSTEM_BASE } from './deepseekChatPrompt.js'
import { env, openaiConfigured } from './env.js'
import { getAdmin } from './supabase.js'
import { currentMonthKey } from './usage.js'

/** Per-message body cap — keep in sync with web `MAX_CONTENT_CHARS`. */
export const DEEPSEEK_CHAT_CONTENT_MAX = 12_000

/** Max messages accepted on the wire (model window is DEEPSEEK_CHAT_HISTORY_LIMIT). */
export const DEEPSEEK_CHAT_MESSAGES_MAX = 48

export const DeepseekChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(DEEPSEEK_CHAT_CONTENT_MAX),
  /** Prior DeepThink trace — replayed as reasoning_content on assistant turns. */
  reasoning: z.string().trim().max(DEEPSEEK_CHAT_CONTENT_MAX).optional(),
  /** DeepSeek Files API ids on user turns (replayed every request for multi-turn context). */
  fileIds: z.array(z.string().regex(/^file-api-/)).max(5).optional(),
})

export const DeepseekChatBodySchema = z.object({
  messages: z.array(DeepseekChatMessageSchema).min(1).max(DEEPSEEK_CHAT_MESSAGES_MAX),
  /** DeepThink toggle — default on for DeepSeek hosts. */
  thinking: z.boolean().optional(),
  /** Search toggle — native deepseek_web_search / read_url when host supports it. */
  search: z.boolean().optional(),
  /** IANA timezone from the browser (temporal grounding). */
  timeZone: z.string().trim().max(80).optional(),
  /** BCP-47 locale hint. */
  locale: z.string().trim().max(32).optional(),
  /** Account Hub primary language (`yue`, `cmn`, `en`, …). */
  primaryLang: z.string().trim().max(24).optional(),
  /** Convenience: merge onto the last user message if that row omitted fileIds. */
  fileIds: z.array(z.string().regex(/^file-api-/)).max(5).optional(),
  /**
   * Enabled chat plugins (`image`, `mcp:<id>`). Omit = default-enabled configured builtins.
   * Empty array = no plugin tools.
   */
  plugins: z.array(z.string().trim().min(1).max(64)).max(16).optional(),
  /**
   * Continue the last assistant message (Chat Prefix Completion / beta).
   * When true, the last wire message must be `assistant`.
   */
  continue: z.boolean().optional(),
  /**
   * Harness mode — enable workspace_list/read/write tools + prompt nudge.
   * Default off; client sends true when the Harness toggle is on.
   */
  harness: z.boolean().optional(),
  /** Device-local thread workspace snapshot (text files only). */
  workspace: z
    .object({
      files: z
        .array(
          z.object({
            id: z.string().trim().min(1).max(80).optional(),
            path: z.string().trim().min(1).max(180),
            mime: z.string().trim().max(120).optional(),
            text: z.string().max(100_000).optional(),
            updatedAt: z.number().optional(),
          }),
        )
        .max(20),
    })
    .optional(),
})

export type DeepseekChatMessage = z.infer<typeof DeepseekChatMessageSchema>

export type DeepseekChatPayloadReason =
  | 'empty_messages'
  | 'too_many_messages'
  | 'message_too_long'
  | 'message_empty'
  | 'invalid_role'
  | 'invalid_shape'

/** Map Zod failure → stable reason for logs + client UX. */
export function deepseekChatPayloadReason(error: z.ZodError): DeepseekChatPayloadReason {
  for (const issue of error.issues) {
    if (issue.path[0] !== 'messages') continue
    if (issue.path.length === 1) {
      if (issue.code === 'too_big') return 'too_many_messages'
      if (issue.code === 'too_small') return 'empty_messages'
    }
    if (issue.path.includes('content')) {
      if (issue.code === 'too_big') return 'message_too_long'
      if (issue.code === 'too_small') return 'message_empty'
    }
    if (issue.path.includes('role')) return 'invalid_role'
  }
  return 'invalid_shape'
}

export function deepseekChatPayloadMessage(reason: DeepseekChatPayloadReason): string {
  switch (reason) {
    case 'too_many_messages':
      return 'Chat history is too long for one request. Start a new chat.'
    case 'message_too_long':
      return 'A message is too long. Shorten it and try again.'
    case 'message_empty':
      return 'Message cannot be empty.'
    case 'empty_messages':
      return 'No messages to send.'
    case 'invalid_role':
      return 'Invalid chat message role.'
    default:
      return 'Invalid chat payload.'
  }
}

export type DeepseekChatStreamEvent =
  | { kind: 'thinking' }
  | { kind: 'reasoning'; text: string }
  | { kind: 'delta'; text: string }

/** Keep last N turns so prompts stay bounded. */
export const DEEPSEEK_CHAT_HISTORY_LIMIT = 24

/** Room for long DeepThink research CoT + a structured answer. */
export const DEEPSEEK_CHAT_MAX_TOKENS = 16_384

/** Max tool rounds per Completions harness / agent fallback turn. */
export const DEEPSEEK_CHAT_MAX_TOOL_ROUNDS = 10

/** Timeless base — prefer buildDeepseekChatSystem() for live requests. */
export const DEEPSEEK_CHAT_SYSTEM = DEEPSEEK_CHAT_SYSTEM_BASE

/** Model id for #/chat (not Solo/Cam translate). */
export function deepseekChatModel(): string {
  return env.chatModel || env.openaiModel
}

/** True when chat should use DeepSeek thinking mode (default on for DeepSeek hosts/models). */
export function deepseekChatUsesThinking(): boolean {
  return /deepseek/i.test(`${env.openaiBaseUrl} ${env.openaiModel} ${deepseekChatModel()}`)
}

/** Native deepseek_web_search / deepseek_read_url available on this host. */
export function deepseekChatSupportsNativeWebTools(): boolean {
  return openaiConfigured() && deepseekChatUsesThinking()
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
