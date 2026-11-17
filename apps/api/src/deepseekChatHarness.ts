/**
 * Unified DeepSeek Chat Completions harness:
 * thinking + client function tools + native deepseek_web_search / deepseek_read_url,
 * conversation title, and latest_reminder metadata.
 *
 * Intentionally omits DeepSeek `safety_check` — #/chat stays uncensored / abliterated.
 */
import { openaiConfigured } from './env.js'
import { openaiClient } from './openaiClient.js'
import {
  DEEPSEEK_CHAT_HISTORY_LIMIT,
  DEEPSEEK_CHAT_MAX_TOKENS,
  deepseekChatLlmExtras,
  deepseekChatModel,
  deepseekChatSupportsNativeWebTools,
  deepseekChatUsesThinking,
  recentDeepseekChatMessages,
  type DeepseekChatMessage,
} from './deepseekChat.js'
import {
  applyInlineCitationMarkers,
  parseUrlCitationAnnotations,
  sourcesFromInlineCitations,
} from './deepseekChatCitations.js'
import { buildDeepseekChatSystem, type DeepseekChatPromptContext } from './deepseekChatPrompt.js'
import { buildPluginTools } from './deepseekChatMcp.js'
import { DEEPSEEK_CHAT_TOOLS, executeDeepseekChatTool } from './deepseekChatTools.js'

export const DEEPSEEK_CHAT_MAX_TOOL_ROUNDS = 10

export const DEEPSEEK_CHAT_WEB_TOOLS = [
  { type: 'deepseek_web_search' as const },
  { type: 'deepseek_read_url' as const },
]

export type DeepseekChatSearchImage = {
  imageUrl: string
  url?: string
  title?: string
  siteName?: string
  siteIcon?: string
}

export type DeepseekChatSearchStep = {
  kind: string
  queries?: string[]
  url?: string
  title?: string
  siteName?: string
  snippet?: string
  /** Image-search result cards (`image_search` / `deep_image_search`). */
  images?: DeepseekChatSearchImage[]
}

export type DeepseekChatHarnessEvent =
  | { kind: 'thinking' }
  | { kind: 'searching' }
  | { kind: 'reasoning'; text: string }
  | { kind: 'delta'; text: string }
  /** Final answer rewrite with `[n]` citation chips (Completions annotations). */
  | { kind: 'content_replace'; text: string }
  | { kind: 'sources'; sources: { url: string; title: string }[] }
  | { kind: 'search_step'; step: DeepseekChatSearchStep }
  | { kind: 'title'; title: string }
  | { kind: 'image'; url: string; prompt: string; id: string }

export type DeepseekChatHarnessOptions = {
  thinkingEnabled?: boolean
  searchEnabled?: boolean
  prompt: DeepseekChatPromptContext
  signal?: AbortSignal
  fileIds?: string[]
  /** Enabled plugin ids (`image`, `mcp:<id>`). */
  plugins?: string[]
  /** Per-user BYOK secrets for image + MCP presets. */
  pluginCreds?: import('./deepseekChatPluginKeys.js').ChatPluginCredentials
}

type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type WireMsg =
  | { role: 'system'; content: string }
  | { role: 'latest_reminder'; content: string }
  | {
      role: 'user'
      content: string | Array<Record<string, unknown>>
    }
  | {
      role: 'assistant'
      content: string | null
      reasoning_content?: string | null
      tool_calls?: ToolCall[]
    }
  | { role: 'tool'; tool_call_id: string; content: string }

/** Function tools always; native web tools when Search is on and host supports them. */
export function buildDeepseekChatToolList(searchEnabled: boolean, pluginTools: unknown[] = []): unknown[] {
  const tools: unknown[] = [...DEEPSEEK_CHAT_TOOLS, ...pluginTools]
  if (searchEnabled && deepseekChatSupportsNativeWebTools()) {
    tools.push(...DEEPSEEK_CHAT_WEB_TOOLS)
  }
  return tools
}

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  cmn: 'Mandarin Chinese',
  yue: 'Cantonese',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ms: 'Malay',
  tl: 'Tagalog',
  wuu: 'Shanghainese',
  sichuan: 'Sichuanese',
  pt: 'Portuguese',
  hi: 'Hindi',
  ar: 'Arabic',
  it: 'Italian',
  nl: 'Dutch',
}

function languageFromLocale(locale: string): string {
  const primary = locale.split('-')[0]?.toLowerCase() || 'en'
  if (LANG_NAMES[primary]) return LANG_NAMES[primary]
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'language' })
    return dn.of(primary) || 'English'
  } catch {
    return 'English'
  }
}

/** Prefer Account Hub primary language when the client sent one. */
function languageFromPrompt(ctx: DeepseekChatPromptContext): string {
  const raw = String(ctx.primaryLang || '')
    .trim()
    .toLowerCase()
  if (!raw) return languageFromLocale(String(ctx.locale || 'en-US'))
  if (LANG_NAMES[raw]) return LANG_NAMES[raw]
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'language' })
    const named = dn.of(raw)
    if (named) return named
  } catch {
    /* fall through */
  }
  return raw
}

function locationFromTimeZone(timeZone: string): string {
  const tz = timeZone.trim() || 'UTC'
  const city = tz.includes('/') ? tz.slice(tz.lastIndexOf('/') + 1) : tz
  return city.replace(/_/g, ' ') || 'Unknown'
}

/**
 * DeepSeek latest_reminder: `YYYY-MM-DD,Weekday,Location,Web,Language`
 * Must sit immediately before the user message it belongs to.
 */
export function formatLatestReminder(ctx: DeepseekChatPromptContext = {}): {
  role: 'latest_reminder'
  content: string
} {
  const now = ctx.now ?? new Date()
  let timeZone = 'UTC'
  try {
    const raw = String(ctx.timeZone || '').trim()
    if (raw) {
      Intl.DateTimeFormat('en-US', { timeZone: raw }).format(now)
      timeZone = raw
    }
  } catch {
    timeZone = 'UTC'
  }
  let locale = 'en-US'
  try {
    const raw = String(ctx.locale || '').trim() || 'en-US'
    Intl.DateTimeFormat(raw).format(now)
    locale = raw
  } catch {
    locale = 'en-US'
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ''
  const y = get('year')
  const m = get('month')
  const d = get('day')
  const weekday = get('weekday')
  const date = `${y}-${m}-${d}`
  const location = locationFromTimeZone(timeZone)
  const language = languageFromPrompt({ ...ctx, locale })
  return {
    role: 'latest_reminder',
    content: `${date},${weekday},${location},Web,${language}`,
  }
}

function chatBaseParams(thinkingEnabled: boolean) {
  const thinking = deepseekChatUsesThinking() && thinkingEnabled
  return {
    model: deepseekChatModel(),
    ...(thinking ? {} : { temperature: 0.7 as const }),
    max_tokens: DEEPSEEK_CHAT_MAX_TOKENS,
    ...deepseekChatLlmExtras(thinkingEnabled),
  }
}

function userContentWithFiles(
  text: string,
  fileIds?: string[],
): string | Array<Record<string, unknown>> {
  const ids = (fileIds || []).filter((id) => /^file-api-/.test(id)).slice(0, 5)
  if (!ids.length) return text
  return [...ids.map((file_id) => ({ type: 'file', file_id })), { type: 'text', text }]
}

function seedWireMessages(
  messages: DeepseekChatMessage[],
  prompt: DeepseekChatPromptContext,
  searchEnabled: boolean,
  /** Extra ids merged onto the last user turn (composer convenience). */
  lastTurnFileIds?: string[],
): WireMsg[] {
  const recent = recentDeepseekChatMessages(messages, DEEPSEEK_CHAT_HISTORY_LIMIT)
  const system = buildDeepseekChatSystem({
    ...prompt,
    mode: 'tools',
    searchEnabled,
  })
  const out: WireMsg[] = [{ role: 'system', content: system }]

  for (let i = 0; i < recent.length; i += 1) {
    const m = recent[i]!
    const isLast = i === recent.length - 1
    if (m.role === 'user') {
      if (isLast) out.push(formatLatestReminder(prompt))
      const ids = isLast
        ? [...(m.fileIds || []), ...(lastTurnFileIds || [])]
        : m.fileIds
      out.push({
        role: 'user',
        content: userContentWithFiles(m.content, ids),
      })
      continue
    }
    if (m.role === 'assistant') {
      const row: WireMsg = {
        role: 'assistant',
        content: m.content,
      }
      if (m.reasoning?.trim()) {
        ;(row as { reasoning_content?: string }).reasoning_content = m.reasoning.trim()
      }
      out.push(row)
      continue
    }
    out.push({ role: m.role, content: m.content })
  }
  return out
}

function collectSourcesFromServerCall(
  call: Record<string, unknown>,
  into: Map<string, string>,
) {
  const sources = call.sources
  if (Array.isArray(sources)) {
    for (const s of sources) {
      if (!s || typeof s !== 'object') continue
      const row = s as Record<string, unknown>
      const url = typeof row.url === 'string' ? row.url.trim() : ''
      if (!/^https?:\/\//i.test(url)) continue
      const title =
        (typeof row.title === 'string' && row.title.trim()) ||
        (typeof row.site_name === 'string' && row.site_name.trim()) ||
        url
      if (!into.has(url)) into.set(url, title)
    }
  }
  const page = call.page
  if (page && typeof page === 'object') {
    const p = page as Record<string, unknown>
    const url = typeof p.url === 'string' ? p.url.trim() : ''
    if (/^https?:\/\//i.test(url) && !into.has(url)) {
      const title = (typeof p.title === 'string' && p.title.trim()) || url
      into.set(url, title)
    }
  }
}

function stepFromServerCall(call: Record<string, unknown>): DeepseekChatSearchStep {
  const action = (call.action || {}) as Record<string, unknown>
  const kind = String(call.kind || action.type || call.type || 'search')
  const step: DeepseekChatSearchStep = { kind }
  if (Array.isArray(action.queries)) {
    step.queries = action.queries.map((q) => String(q)).filter(Boolean)
  }
  if (typeof action.url === 'string') step.url = action.url
  const page = call.page as Record<string, unknown> | undefined
  if (page) {
    if (typeof page.url === 'string') step.url = page.url
    if (typeof page.title === 'string') step.title = page.title
  }
  const sources = call.sources
  if (Array.isArray(sources) && sources[0] && typeof sources[0] === 'object') {
    const s0 = sources[0] as Record<string, unknown>
    if (typeof s0.title === 'string') step.title = s0.title
    if (typeof s0.site_name === 'string') step.siteName = s0.site_name
    if (typeof s0.snippet === 'string') step.snippet = s0.snippet
    if (typeof s0.url === 'string') step.url = s0.url
  }
  // Image search results carry `image_url` for gallery cards.
  if (/image_search/i.test(kind) && Array.isArray(sources)) {
    const images: DeepseekChatSearchImage[] = []
    for (const raw of sources) {
      if (!raw || typeof raw !== 'object') continue
      const row = raw as Record<string, unknown>
      const imageUrl =
        (typeof row.image_url === 'string' && row.image_url.trim()) ||
        (typeof row.imageUrl === 'string' && row.imageUrl.trim()) ||
        ''
      if (!/^https?:\/\//i.test(imageUrl)) continue
      images.push({
        imageUrl,
        url: typeof row.url === 'string' ? row.url : undefined,
        title: typeof row.title === 'string' ? row.title : undefined,
        siteName: typeof row.site_name === 'string' ? row.site_name : undefined,
        siteIcon: typeof row.site_icon === 'string' ? row.site_icon : undefined,
      })
    }
    if (images.length) step.images = images.slice(0, 12)
  }
  return step
}

/**
 * Primary #/chat stream: Completions with optional native web tools + client tools.
 */
export async function* streamDeepseekChatHarness(
  messages: DeepseekChatMessage[],
  opts: DeepseekChatHarnessOptions,
): AsyncGenerator<DeepseekChatHarnessEvent, void, unknown> {
  if (!openaiConfigured()) throw new Error('Chat model is not configured.')
  const client = openaiClient()
  if (!client) throw new Error('Chat model is not configured.')

  const thinkingEnabled = opts.thinkingEnabled !== false
  const searchEnabled = opts.searchEnabled === true
  const useNativeWeb = searchEnabled && deepseekChatSupportsNativeWebTools()
  const pluginTools = await buildPluginTools(opts.plugins, opts.signal, opts.pluginCreds)
  const tools = buildDeepseekChatToolList(searchEnabled, pluginTools)
  const deepseekHost = deepseekChatUsesThinking()

  const msgs: WireMsg[] = seedWireMessages(messages, opts.prompt, searchEnabled, opts.fileIds)

  let announcedThinking = false
  let announcedSearching = false
  const allSources = new Map<string, string>()
  const pendingImages: Array<{ url: string; prompt: string; id: string }> = []

  for (let round = 0; round < DEEPSEEK_CHAT_MAX_TOOL_ROUNDS; round += 1) {
    if (opts.signal?.aborted) {
      const err = new Error('Aborted')
      err.name = 'AbortError'
      throw err
    }

    const body: Record<string, unknown> = {
      ...chatBaseParams(thinkingEnabled),
      stream: true,
      messages: msgs,
    }
    if (tools.length) {
      body.tools = tools
      body.tool_choice = 'auto'
    }
    // Do not set safety_check — product requirement: uncensored chat replies.
    if (deepseekHost) {
      body.title = { enabled: true }
    }

    const stream = (await client.chat.completions.create(
      body as never,
      opts.signal ? { signal: opts.signal } : undefined,
    )) as unknown as AsyncIterable<{
      choices?: Array<{
        finish_reason?: string | null
        delta?: Record<string, unknown>
        server_tool_event?: Record<string, unknown>
      }>
    }>

    let finishReason: string | null = null
    let pendingToolCalls: ToolCall[] = []
    let assistantContent = ''
    let assistantReasoning = ''
    let pendingAnnotations: unknown = null
    const toolCallBuf = new Map<number, ToolCall>()

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0]
      if (!choice) continue
      if (choice.finish_reason) finishReason = choice.finish_reason

      const evt = choice.server_tool_event
      if (evt && typeof evt === 'object') {
        const type = String(evt.type || '')
        if (type === 'call_started' || type === 'call_completed') {
          if (!announcedSearching) {
            announcedSearching = true
            yield { kind: 'searching' }
          }
          const call = (evt.call || {}) as Record<string, unknown>
          yield { kind: 'search_step', step: stepFromServerCall(call) }
          if (type === 'call_completed') {
            collectSourcesFromServerCall(call, allSources)
            if (allSources.size) {
              yield {
                kind: 'sources',
                sources: [...allSources.entries()].map(([url, title]) => ({ url, title })),
              }
            }
          }
        }
      }

      const delta = choice.delta
      if (!delta) continue

      const reasoning = delta.reasoning_content
      if (typeof reasoning === 'string' && reasoning) {
        if (!announcedThinking) {
          announcedThinking = true
          yield { kind: 'thinking' }
        }
        assistantReasoning += reasoning
        yield { kind: 'reasoning', text: reasoning }
      }

      const content = delta.content
      if (typeof content === 'string' && content) {
        assistantContent += content
        yield { kind: 'delta', text: content }
      }

      const title = delta.title
      if (typeof title === 'string' && title.trim()) {
        yield { kind: 'title', title: title.trim() }
      }

      // Accumulate streamed function tool_calls
      const tcs = delta.tool_calls
      if (Array.isArray(tcs)) {
        for (const raw of tcs) {
          if (!raw || typeof raw !== 'object') continue
          const tc = raw as {
            index?: number
            id?: string
            type?: string
            function?: { name?: string; arguments?: string }
          }
          const idx = Number(tc.index ?? 0)
          const prev = toolCallBuf.get(idx) || {
            id: '',
            type: 'function' as const,
            function: { name: '', arguments: '' },
          }
          if (tc.id) prev.id = tc.id
          if (tc.function?.name) prev.function.name += tc.function.name
          if (tc.function?.arguments) prev.function.arguments += tc.function.arguments
          toolCallBuf.set(idx, prev)
        }
      }

      // Final chunk may include annotations (url_citation with start/end indices).
      if (Array.isArray(delta.annotations) && delta.annotations.length) {
        pendingAnnotations = delta.annotations
        for (const a of delta.annotations) {
          if (!a || typeof a !== 'object') continue
          const ann = a as Record<string, unknown>
          const cite = (ann.url_citation || ann) as Record<string, unknown>
          const url = typeof cite.url === 'string' ? cite.url : ''
          if (!/^https?:\/\//i.test(url)) continue
          const citeTitle =
            (typeof cite.title === 'string' && cite.title.trim()) || url
          if (!allSources.has(url)) allSources.set(url, citeTitle)
        }
      }
    }

    // Ignore content_filter stop reasons; never surface a refusal to the client.
    if (finishReason === 'content_filter') {
      console.warn('[deepseek-chat] content_filter finish_reason ignored (uncensored harness)')
    }

    pendingToolCalls = [...toolCallBuf.values()].filter((t) => t.id && t.function.name)
    if (pendingToolCalls.length) {
      msgs.push({
        role: 'assistant',
        content: assistantContent || null,
        reasoning_content: assistantReasoning || null,
        tool_calls: pendingToolCalls,
      })
      if (!announcedSearching && !useNativeWeb) {
        announcedSearching = true
        yield { kind: 'searching' }
      }
      for (const call of pendingToolCalls) {
        const result = await executeDeepseekChatTool(call.function.name, call.function.arguments || '{}', {
          ...opts.prompt,
          signal: opts.signal,
          pluginCreds: opts.pluginCreds,
          onImage: (image) => {
            pendingImages.push(image)
          },
        })
        msgs.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result,
        })
      }
      while (pendingImages.length) {
        const image = pendingImages.shift()!
        yield { kind: 'image', ...image }
      }
      continue
    }

    // Final answer: inject `[n]` markers once annotations are available.
    // Sources emitted here MUST match chip order (`sources[n-1]` ↔ `[n]`).
    let orderedSources: { url: string; title: string }[] | null = null
    if (assistantContent.trim() && pendingAnnotations) {
      const parsedAnns = parseUrlCitationAnnotations(pendingAnnotations)
      if (parsedAnns.length) {
        const { text: marked, citations } = applyInlineCitationMarkers(
          assistantContent,
          parsedAnns,
          allSources,
        )
        for (const c of citations) {
          if (!allSources.has(c.url)) allSources.set(c.url, c.title)
        }
        if (marked !== assistantContent) {
          yield { kind: 'content_replace', text: marked }
        }
        orderedSources = sourcesFromInlineCitations(citations)
        for (const s of orderedSources) {
          if (!allSources.has(s.url)) allSources.set(s.url, s.title)
        }
      }
    }
    if (orderedSources?.length) {
      // Append any non-cited search URLs after the numbered citations.
      const cited = new Set(orderedSources.map((s) => s.url))
      const extras = [...allSources.entries()]
        .filter(([url]) => !cited.has(url))
        .map(([url, title]) => ({ url, title }))
      yield { kind: 'sources', sources: [...orderedSources, ...extras] }
    } else if (allSources.size) {
      yield {
        kind: 'sources',
        sources: [...allSources.entries()].map(([url, title]) => ({ url, title })),
      }
    }
    return
  }
}

export async function generateDeepseekChatHarnessReply(
  messages: DeepseekChatMessage[],
  opts: DeepseekChatHarnessOptions,
): Promise<{ reply: string; model: string; reasoning?: string; title?: string }> {
  let reply = ''
  let reasoning = ''
  let title: string | undefined
  for await (const ev of streamDeepseekChatHarness(messages, opts)) {
    if (ev.kind === 'reasoning') reasoning += ev.text
    if (ev.kind === 'delta') reply += ev.text
    if (ev.kind === 'content_replace') reply = ev.text
    if (ev.kind === 'title') title = ev.title
  }
  if (!reply.trim()) throw new Error('Empty model reply.')
  return {
    reply: reply.trim(),
    model: deepseekChatModel(),
    reasoning: reasoning.trim() || undefined,
    title,
  }
}
