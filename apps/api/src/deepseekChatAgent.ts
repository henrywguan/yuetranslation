/**
 * Tool-calling agent loop for DeepSeek Chat Completions (thinking + tools).
 * Non-stream tool rounds, then yield final answer as deltas for SSE UX.
 */
import { env, openaiConfigured } from './env.js'
import { openaiClient } from './openaiClient.js'
import {
  DEEPSEEK_CHAT_HISTORY_LIMIT,
  DEEPSEEK_CHAT_MAX_TOKENS,
  deepseekChatLlmExtras,
  deepseekChatUsesThinking,
  recentDeepseekChatMessages,
  type DeepseekChatMessage,
  type DeepseekChatStreamEvent,
} from './deepseekChat.js'
import { buildDeepseekChatSystem, type DeepseekChatPromptContext } from './deepseekChatPrompt.js'
import { DEEPSEEK_CHAT_TOOLS, executeDeepseekChatTool } from './deepseekChatTools.js'

export const DEEPSEEK_CHAT_MAX_TOOL_ROUNDS = 4

export type DeepseekChatAgentOptions = {
  thinkingEnabled?: boolean
  prompt: DeepseekChatPromptContext
  signal?: AbortSignal
}

type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type AssistantToolMessage = {
  role: 'assistant'
  content: string | null
  reasoning_content?: string | null
  tool_calls?: ToolCall[]
}

function chatBaseParams(thinkingEnabled: boolean) {
  const thinking = deepseekChatUsesThinking() && thinkingEnabled
  return {
    model: env.openaiModel,
    ...(thinking ? {} : { temperature: 0.7 as const }),
    max_tokens: DEEPSEEK_CHAT_MAX_TOKENS,
    ...deepseekChatLlmExtras(thinkingEnabled),
  }
}

function seedMessages(messages: DeepseekChatMessage[], prompt: DeepseekChatPromptContext) {
  const recent = recentDeepseekChatMessages(messages, DEEPSEEK_CHAT_HISTORY_LIMIT)
  return [
    { role: 'system' as const, content: buildDeepseekChatSystem(prompt) },
    ...recent.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]
}

/**
 * Run tool rounds (non-stream), yield reasoning + final answer deltas.
 * When the host is not DeepSeek, still injects temporal system + may skip tools.
 */
export async function* streamDeepseekChatAgent(
  messages: DeepseekChatMessage[],
  opts: DeepseekChatAgentOptions,
): AsyncGenerator<DeepseekChatStreamEvent | { kind: 'searching' }, void, unknown> {
  if (!openaiConfigured()) throw new Error('Chat model is not configured.')
  const client = openaiClient()
  if (!client) throw new Error('Chat model is not configured.')

  const thinkingEnabled = opts.thinkingEnabled !== false
  const useTools = deepseekChatUsesThinking() || /deepseek/i.test(`${env.openaiBaseUrl} ${env.openaiModel}`)

  type Msg =
    | { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string }
    | AssistantToolMessage

  const msgs: Msg[] = seedMessages(messages, { ...opts.prompt, mode: 'tools' })

  let announcedThinking = false
  for (let round = 0; round < DEEPSEEK_CHAT_MAX_TOOL_ROUNDS; round += 1) {
    if (opts.signal?.aborted) {
    const err = new Error('Aborted')
    err.name = 'AbortError'
    throw err
  }

    const completion = await client.chat.completions.create(
      {
        ...chatBaseParams(thinkingEnabled),
        stream: false,
        messages: msgs as never,
        ...(useTools ? { tools: DEEPSEEK_CHAT_TOOLS, tool_choice: 'auto' as const } : {}),
      },
      opts.signal ? { signal: opts.signal } : undefined,
    )

    const message = completion.choices[0]?.message as
      | {
          content?: string | null
          reasoning_content?: string | null
          tool_calls?: ToolCall[]
        }
      | undefined

    if (!message) throw new Error('Empty model reply.')

    const reasoning = message.reasoning_content?.trim()
    if (reasoning) {
      if (!announcedThinking) {
        announcedThinking = true
        yield { kind: 'thinking' }
      }
      yield { kind: 'reasoning', text: reasoning }
    }

    const toolCalls = message.tool_calls
    if (toolCalls?.length) {
      // Must pass full assistant message (incl. reasoning_content) back when tools are used.
      msgs.push({
        role: 'assistant',
        content: message.content ?? null,
        reasoning_content: message.reasoning_content ?? null,
        tool_calls: toolCalls,
      })

      yield { kind: 'searching' } // reuse "Searching…" as light tool activity signal

      for (const call of toolCalls) {
        const name = call.function?.name || ''
        const args = call.function?.arguments || '{}'
        const result = await executeDeepseekChatTool(name, args, {
          ...opts.prompt,
          signal: opts.signal,
        })
        msgs.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result,
        })
      }
      continue
    }

    const content = message.content?.trim() || ''
    if (!content) throw new Error('Empty model reply.')
    // Chunk for smoother SSE without another round-trip.
    const chunkSize = 48
    for (let i = 0; i < content.length; i += chunkSize) {
      yield { kind: 'delta', text: content.slice(i, i + chunkSize) }
    }
    return
  }

  // Cap exceeded — one final answer without tools.
  const stream = await client.chat.completions.create(
    {
      ...chatBaseParams(thinkingEnabled),
      stream: true,
      messages: msgs as never,
    },
    opts.signal ? { signal: opts.signal } : undefined,
  )
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

export async function generateDeepseekChatAgentReply(
  messages: DeepseekChatMessage[],
  opts: DeepseekChatAgentOptions,
): Promise<{ reply: string; model: string; reasoning?: string }> {
  let reply = ''
  let reasoning = ''
  for await (const ev of streamDeepseekChatAgent(messages, opts)) {
    if (ev.kind === 'reasoning') reasoning += ev.text
    if (ev.kind === 'delta') reply += ev.text
  }
  if (!reply.trim()) throw new Error('Empty model reply.')
  return {
    reply: reply.trim(),
    model: env.openaiModel,
    reasoning: reasoning.trim() || undefined,
  }
}
