/**
 * DeepSeek Anthropic Messages path with server-side web_search (Search toggle).
 * Chat Completions does not honor a fabricated web_search flag — use this endpoint instead.
 */
import { env, openaiConfigured } from './env.js'
import {
  DEEPSEEK_CHAT_MAX_TOKENS,
  DEEPSEEK_CHAT_SYSTEM,
  deepseekChatUsesThinking,
  recentDeepseekChatMessages,
  type DeepseekChatMessage,
  type DeepseekChatStreamEvent,
} from './deepseekChat.js'

export type DeepseekChatSource = {
  url: string
  title: string
}

export type DeepseekChatSearchStreamEvent =
  | DeepseekChatStreamEvent
  | { kind: 'searching' }
  | { kind: 'sources'; sources: DeepseekChatSource[] }

/** True when the configured host can use DeepSeek Anthropic web_search. */
export function deepseekChatSupportsSearch(): boolean {
  return openaiConfigured() && /deepseek/i.test(`${env.openaiBaseUrl} ${env.openaiModel}`)
}

/**
 * Anthropic SDK base: strip trailing `/v1` from the OpenAI-compatible URL, then append `/anthropic`.
 * Example: https://api.deepseek.com/v1 → https://api.deepseek.com/anthropic
 */
export function deepseekAnthropicBaseUrl(openaiBaseUrl = env.openaiBaseUrl): string {
  const trimmed = openaiBaseUrl.trim().replace(/\/+$/, '')
  const withoutV1 = trimmed.replace(/\/v1$/i, '')
  const root = withoutV1 || 'https://api.deepseek.com'
  return `${root}/anthropic`
}

export function deepseekAnthropicMessagesUrl(openaiBaseUrl = env.openaiBaseUrl): string {
  return `${deepseekAnthropicBaseUrl(openaiBaseUrl)}/v1/messages`
}

function anthropicMessagesPayload(
  messages: DeepseekChatMessage[],
  thinkingEnabled: boolean,
): Record<string, unknown> {
  const recent = recentDeepseekChatMessages(messages)
  const body: Record<string, unknown> = {
    model: env.openaiModel,
    max_tokens: DEEPSEEK_CHAT_MAX_TOKENS,
    stream: true,
    system: DEEPSEEK_CHAT_SYSTEM,
    messages: recent.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      },
    ],
  }
  // Thinking on Anthropic path (budget_tokens ignored on DeepSeek; effort via output_config).
  if (deepseekChatUsesThinking() && thinkingEnabled) {
    body.thinking = { type: 'enabled' }
    body.output_config = { effort: 'high' }
  }
  return body
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

function collectSourcesFromContent(value: unknown, into: Map<string, string>) {
  if (!value) return
  if (Array.isArray(value)) {
    for (const item of value) collectSourcesFromContent(item, into)
    return
  }
  if (typeof value !== 'object') return
  const block = value as Record<string, unknown>
  const type = String(block.type || '')
  if (type === 'web_search_result' || type === 'search_result') {
    const url = block.url
    if (isHttpUrl(url)) {
      const title =
        (typeof block.title === 'string' && block.title.trim()) ||
        (typeof block.page_age === 'string' && block.page_age.trim()) ||
        url
      if (!into.has(url)) into.set(url, title)
    }
  }
  if (block.content !== undefined) collectSourcesFromContent(block.content, into)
}

function pushUniqueSources(
  map: Map<string, string>,
  sources: DeepseekChatSource[],
): DeepseekChatSource[] {
  const added: DeepseekChatSource[] = []
  for (const [url, title] of map) {
    if (sources.some((s) => s.url === url)) continue
    const entry = { url, title }
    sources.push(entry)
    added.push(entry)
  }
  return added
}

/**
 * Stream chat with DeepSeek Anthropic web_search.
 * Yields searching/thinking/reasoning/delta/sources events compatible with the chat SSE route.
 */
export async function* streamDeepseekChatWithSearch(
  messages: DeepseekChatMessage[],
  thinkingEnabled = true,
): AsyncGenerator<DeepseekChatSearchStreamEvent, void, unknown> {
  if (!openaiConfigured()) {
    throw new Error('Chat model is not configured.')
  }
  if (!deepseekChatSupportsSearch()) {
    throw new Error('Web search requires a DeepSeek host.')
  }
  if (!env.openaiApiKey) {
    throw new Error('Chat model is not configured.')
  }

  const url = deepseekAnthropicMessagesUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.openaiApiKey,
      'anthropic-version': '2023-06-01',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(anthropicMessagesPayload(messages, thinkingEnabled)),
  })

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 400)
    throw new Error(detail || `Anthropic chat failed (${res.status}).`)
  }
  if (!res.body) throw new Error('Anthropic chat stream unavailable.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let eventName = ''
  let announcedThinking = false
  let announcedSearching = false
  const allSources: DeepseekChatSource[] = []
  const pendingSourceMap = new Map<string, string>()

  const flushSources = function* (): Generator<DeepseekChatSearchStreamEvent> {
    const added = pushUniqueSources(pendingSourceMap, allSources)
    pendingSourceMap.clear()
    if (added.length) yield { kind: 'sources', sources: [...allSources] }
  }

  const handleData = function* (payload: string): Generator<DeepseekChatSearchStreamEvent> {
    if (!payload || payload === '[DONE]') return
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(payload) as Record<string, unknown>
    } catch {
      return
    }

    const type = String(parsed.type || eventName || '')

    if (type === 'error') {
      const err = parsed.error as { message?: string } | string | undefined
      const message =
        (typeof err === 'object' && err?.message) ||
        (typeof err === 'string' ? err : null) ||
        'Anthropic chat failed.'
      throw new Error(message)
    }

    if (type === 'content_block_start') {
      const block = (parsed.content_block || {}) as Record<string, unknown>
      const blockType = String(block.type || '')
      if (blockType === 'thinking' || blockType === 'redacted_thinking') {
        if (!announcedThinking) {
          announcedThinking = true
          yield { kind: 'thinking' }
        }
      }
      if (blockType === 'server_tool_use' && String(block.name || '') === 'web_search') {
        if (!announcedSearching) {
          announcedSearching = true
          yield { kind: 'searching' }
        }
      }
      if (blockType === 'web_search_tool_result') {
        if (!announcedSearching) {
          announcedSearching = true
          yield { kind: 'searching' }
        }
        collectSourcesFromContent(block, pendingSourceMap)
        yield* flushSources()
      }
      return
    }

    if (type === 'content_block_delta') {
      const delta = (parsed.delta || {}) as Record<string, unknown>
      const deltaType = String(delta.type || '')
      if (deltaType === 'thinking_delta' && typeof delta.thinking === 'string' && delta.thinking) {
        if (!announcedThinking) {
          announcedThinking = true
          yield { kind: 'thinking' }
        }
        yield { kind: 'reasoning', text: delta.thinking }
        return
      }
      if (deltaType === 'text_delta' && typeof delta.text === 'string' && delta.text) {
        yield { kind: 'delta', text: delta.text }
        return
      }
      // Some hosts stream tool payloads as input_json_delta — ignore for text.
      return
    }

    if (type === 'content_block_stop') {
      yield* flushSources()
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '')
        if (!line) {
          eventName = ''
          continue
        }
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
          continue
        }
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()
          yield* handleData(data)
        }
      }
    }
    if (buffer.trim()) {
      const line = buffer.trim()
      if (line.startsWith('data:')) {
        yield* handleData(line.slice(5).trim())
      }
    }
    if (allSources.length) {
      yield { kind: 'sources', sources: [...allSources] }
    }
  } finally {
    reader.releaseLock()
  }
}
