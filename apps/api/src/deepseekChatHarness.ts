/**
 * Unified DeepSeek Chat Completions harness:
 * thinking + client function tools + native deepseek_web_search / deepseek_read_url,
 * conversation title, and latest_reminder metadata.
 *
 * Intentionally omits DeepSeek `safety_check` — #/chat stays uncensored / abliterated.
 */
import { openaiConfigured } from './env.js'
import { openaiBetaClient, openaiClient } from './openaiClient.js'
import {
  DEEPSEEK_CHAT_HISTORY_LIMIT,
  DEEPSEEK_CHAT_MAX_TOKENS,
  DEEPSEEK_CHAT_MAX_TOOL_ROUNDS,
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
import {
  createProjectStore,
  drainProjectActions,
  type ProjectAction,
  type ProjectAgentWire,
} from './deepseekChatProject.js'
import {
  DEEPSEEK_CHAT_PROJECT_TOOLS,
  DEEPSEEK_CHAT_SANDBOX_TOOLS,
  DEEPSEEK_CHAT_TOOLS,
  DEEPSEEK_CHAT_WORKSPACE_TOOLS,
  filterToolsForChatMode,
  executeDeepseekChatTool,
} from './deepseekChatTools.js'
import {
  createWorkspaceStore,
  type ChatWorkspaceFileWire,
  type ChatWorkspaceStore,
} from './deepseekChatWorkspace.js'

export { DEEPSEEK_CHAT_MAX_TOOL_ROUNDS }

export const DEEPSEEK_CHAT_WEB_TOOLS = [
  { type: 'deepseek_web_search' as const },
  { type: 'deepseek_read_url' as const },
]

/**
 * True when the model finished with a short "I'll search…" / "I'll look into…" /
 * "I'll check…" / "Running the searches now" style reply and never actually invoked
 * web tools — the #/chat "stopped instead of continuing" failure (Henry: Search on,
 * DeepThink + Image, visible reply stalls until Continue).
 */
export function looksLikeDeferredSearch(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length > 480) return false
  // Already delivered substantive content — do not treat as a deferred promise.
  if ((t.match(/\n/g) || []).length >= 4) return false
  return (
    /\b(i(?:['’]ll| will)|let me|i am going to|i'm going to)\b[\s\S]{0,100}\b(search(?:es|ing)?|look\s+(?:up|into)|investigate|research|dig\s+into|find\s+out|check (?:the )?(?:web|online|news)|find (?:the )?latest|check\b[\s\S]{0,40}\b(?:what'?s\s+new|latest|updates?|news|this\s+week))\b/i.test(
      t,
    ) ||
    /^(?:i(?:['’]ll| will)|let me)\s+(?:search|look\s+(?:up|into)|investigate|research)\b/i.test(
      t,
    ) ||
    // Status-line stopovers: "Running the searches now" (no I'll/let me).
    /\b(?:running|starting|doing|performing)\b[\s\S]{0,48}\bsearches?\b/i.test(t) ||
    /\bsearches?\s+(?:now|next)\b/i.test(t) ||
    // Bare "I'll check…" / "Let me check." with no weather/tool object.
    /^(?:sure[,.]?\s*|ok(?:ay)?[,.]?\s*)?(?:i(?:['’]ll| will)|let me)\s+check(?:\s+(?:for\s+you|that|this|it))?[.…!\s]*$/i.test(
      t,
    )
  )
}

/**
 * Combine visible reply + DeepThink reasoning: models often plan "Let me search the
 * web…" in reasoning while the streamed answer is a softer "I'll look into…".
 * Do not treat a short factual reply as deferred merely because reasoning mentioned search.
 */
export function looksLikeDeferredSearchTurn(content: string, reasoning = ''): boolean {
  if (looksLikeDeferredSearch(content)) return true
  const body = String(content || '').trim()
  const think = String(reasoning || '').trim()
  if (!think || !looksLikeDeferredSearch(think)) return false
  if (!body) return true
  // Tiny filler only ("Sure." / "One moment.") — not a real answer.
  if (body.length > 120 || (body.match(/\n/g) || []).length >= 1) return false
  // Allow … / ⋯ / multiple dots — DeepSeek often ends fillers with an ellipsis.
  return /^(?:sure|ok|okay|one moment|hang on|got it|alright|let me (?:see|check)|i(?:['’]ll| will) (?:check|see)|one moment while i (?:search|check|look))[.!…⋯]*\s*$/i.test(
    body,
  )
}

const DEFERRED_SEARCH_NUDGE =
  'You announced a web search but did not call deepseek_web_search (or deepseek_read_url). Call the web search tool now with concrete queries, then answer from the results. Do not stop after another "I\'ll search" / "I\'ll look into" / "I\'ll check" / "Running the searches now" sentence.'

/** Max silent-promise recoveries per turn (model sometimes re-announces after one nudge). */
export const MAX_DEFERRED_SEARCH_RECOVERIES = 2

/**
 * True when the model announced a client function tool (weather, fetch_url, etc.)
 * and ended the turn without any tool_calls — general tool deferral stall.
 */
export function looksLikeDeferredToolUse(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length > 480) return false
  if ((t.match(/\n/g) || []).length >= 4) return false
  return (
    /\b(i(?:['’]ll| will)|let me|i am going to|i'm going to)\b[\s\S]{0,80}\b(check|fetch|look up|get|call|use|run|calculate|convert)\b[\s\S]{0,100}\b(weather|forecast|url|page|link|calendar|date|time|math|units?|tool|jyut|phrase|temperature)\b/i.test(
      t,
    ) ||
    /\b(get_weather|fetch_url|get_date|get_now|calc|convert_units|jyut_plan_limits|jyut_phrase_lookup|jyut_learn_hint|generate_image|workspace_|sandbox_|project_)\w*\b/i.test(
      t,
    )
  )
}

const DEFERRED_TOOL_NUDGE =
  'You announced using a tool but did not emit any tool_calls. Call the matching function tool now (for example get_weather, fetch_url, get_date, calc, workspace_*, or project_*), then answer from the tool result. Do not stop after another "I\'ll check…" sentence.'

/**
 * True when the Overseer finished with a short "I'll set up workers…" reply and never
 * called project_create_agent / project_message_agent — silent Needs Attention stall.
 */
export function looksLikeDeferredOrchestration(text: string): boolean {
  const t = String(text || '').trim()
  if (!t || t.length > 600) return false
  if ((t.match(/\n/g) || []).length >= 4) return false
  return (
    /\b(i(?:['’]ll| will)|let me|i am going to|i'm going to|i(?:['’]m| am) about to)\b[\s\S]{0,120}\b(set up|create|spawn|spin up|launch|start|stand up|orchestrat(?:e|ing)?|build)\b[\s\S]{0,120}\b(workers?|agents?|knowledge[- ]?base|project)\b/i.test(
      t,
    ) ||
    /\b(then|next|after that)\b[\s\S]{0,80}\b(set up|create|spawn|spin up|launch|start)\b[\s\S]{0,100}\b(workers?|agents?)\b/i.test(
      t,
    ) ||
    /\b(project_create_agent|project_message_agent)\b/i.test(t)
  )
}

const DEFERRED_ORCHESTRATION_NUDGE =
  'You announced creating or messaging Project workers but did not call project_create_agent (with a message) or project_message_agent. Call those tools now to spawn/resume workers. Do not stop after another "I\'ll set up workers" sentence — the Inbox only updates when tools run.'

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
  | { kind: 'workspace'; files: ChatWorkspaceFileWire[] }
  | { kind: 'project'; actions: ProjectAction[] }
  | {
      kind: 'sandbox'
      activity: {
        kind: 'diff' | 'run' | 'pr'
        path?: string
        text?: string
        argv?: string[]
        stdout?: string
        stderr?: string
        exitCode?: number
        ok?: boolean
        reviewUrl?: string
        source?: 'sandbox' | 'workspace' | 'git'
        at?: number
      }
    }

export type DeepseekChatHarnessOptions = {
  thinkingEnabled?: boolean
  searchEnabled?: boolean
  /** Harness UI mode — workspace tools + prompt nudge. */
  harnessEnabled?: boolean
  /** Agent / Ask / Plan — Ask & Plan strip mutating tools. */
  chatMode?: 'agent' | 'ask' | 'plan'
  prompt: DeepseekChatPromptContext
  signal?: AbortSignal
  fileIds?: string[]
  /** Enabled plugin ids (`image`, `mcp:<id>`). */
  plugins?: string[]
  /** Per-user BYOK secrets for image + MCP presets. */
  pluginCreds?: import('./deepseekChatPluginKeys.js').ChatPluginCredentials
  /** Continue last assistant via Chat Prefix Completion (`prefix: true` + /beta). */
  continueReply?: boolean
  /** Incoming thread workspace snapshot (Harness). */
  workspaceFiles?: ChatWorkspaceFileWire[]
  /** Signed-in user for sandbox tools. */
  userId?: string
  /** Attached Chat Inbox sandbox session. */
  sandboxSessionId?: string
  /** Project id when Overseer turn (enables project_* tools). */
  projectId?: string
  /** Snapshot of Project agents for orchestration tools. */
  projectAgents?: ProjectAgentWire[]
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
      /** Chat Prefix Completion — last assistant only. */
      prefix?: boolean
    }
  | { role: 'tool'; tool_call_id: string; content: string }

/** Function tools always; native web tools when Search is on and host supports them. */
export function buildDeepseekChatToolList(
  searchEnabled: boolean,
  pluginTools: unknown[] = [],
  harnessEnabled = false,
  sandboxAttached = false,
  projectAttached = false,
  chatMode: 'agent' | 'ask' | 'plan' = 'agent',
): unknown[] {
  const readOnly = chatMode === 'ask' || chatMode === 'plan'
  // Ask/Plan: skip generation plugins; keep core + read tools.
  const plugins = readOnly ? [] : pluginTools
  const tools: unknown[] = [...DEEPSEEK_CHAT_TOOLS, ...plugins]
  if (harnessEnabled) tools.push(...DEEPSEEK_CHAT_WORKSPACE_TOOLS)
  if (sandboxAttached) tools.push(...DEEPSEEK_CHAT_SANDBOX_TOOLS)
  // Plan/Ask may still list agents (read) via project_* — filter strips mutators.
  if (projectAttached) tools.push(...DEEPSEEK_CHAT_PROJECT_TOOLS)
  if (searchEnabled && deepseekChatSupportsNativeWebTools()) {
    tools.push(...DEEPSEEK_CHAT_WEB_TOOLS)
  }
  return filterToolsForChatMode(tools, chatMode)
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
  eses: 'Spanish (Spain)',
  pt: 'Portuguese',
  hi: 'Hindi',
  ar: 'Arabic',
  arsa: 'Arabic (Saudi)',
  ta: 'Tamil',
  ptpt: 'Portuguese (Portugal)',
  tr: 'Turkish',
  bn: 'Bengali',
  te: 'Telugu',
  gu: 'Gujarati',
  kn: 'Kannada',
  pl: 'Polish',
  ro: 'Romanian',
  cs: 'Czech',
  el: 'Greek',
  hu: 'Hungarian',
  sv: 'Swedish',
  ru: 'Russian',
  uk: 'Ukrainian',
  he: 'Hebrew',
  fa: 'Persian',
  ur: 'Urdu',
  ml: 'Malayalam',
  mr: 'Marathi',
  pa: 'Punjabi',
  or: 'Odia',
  si: 'Sinhala',
  ne: 'Nepali',
  da: 'Danish',
  nb: 'Norwegian Bokmål',
  fi: 'Finnish',
  sk: 'Slovak',
  hr: 'Croatian',
  ca: 'Catalan',
  az: 'Azerbaijani',
  kk: 'Kazakh',
  uz: 'Uzbek',
  bg: 'Bulgarian',
  sr: 'Serbian',
  sw: 'Swahili',
  af: 'Afrikaans',
  et: 'Estonian',
  lv: 'Latvian',
  lt: 'Lithuanian',
  ga: 'Irish',
  cy: 'Welsh',
  eu: 'Basque',
  gl: 'Galician',
  mt: 'Maltese',
  is: 'Icelandic',
  bs: 'Bosnian',
  sq: 'Albanian',
  zu: 'Zulu',
  so: 'Somali',
  as: 'Assamese',
  mk: 'Macedonian',
  mn: 'Mongolian',
  hy: 'Armenian',
  ka: 'Georgian',
  am: 'Amharic',
  ps: 'Pashto',
  lo: 'Lao',
  km: 'Khmer',
  my: 'Burmese',
  jv: 'Javanese',
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
  continueReply = false,
): WireMsg[] {
  const recent = recentDeepseekChatMessages(messages, DEEPSEEK_CHAT_HISTORY_LIMIT)
  const system = buildDeepseekChatSystem({
    ...prompt,
    mode: 'tools',
    searchEnabled,
    harnessEnabled: prompt.harnessEnabled === true,
  })
  const out: WireMsg[] = [{ role: 'system', content: system }]

  for (let i = 0; i < recent.length; i += 1) {
    const m = recent[i]!
    const isLast = i === recent.length - 1
    if (m.role === 'user') {
      if (isLast && !continueReply) out.push(formatLatestReminder(prompt))
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
        row.reasoning_content = m.reasoning.trim()
      }
      if (continueReply && isLast) {
        row.prefix = true
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
  const continueReply = opts.continueReply === true
  const client = continueReply ? openaiBetaClient() : openaiClient()
  if (!client) throw new Error('Chat model is not configured.')

  const thinkingEnabled = opts.thinkingEnabled !== false
  const searchEnabled = opts.searchEnabled === true
  const harnessEnabled = opts.harnessEnabled === true
  const chatMode =
    opts.chatMode === 'ask' || opts.chatMode === 'plan'
      ? opts.chatMode
      : opts.prompt.chatMode === 'ask' || opts.prompt.chatMode === 'plan'
        ? opts.prompt.chatMode
        : 'agent'
  const sandboxSessionId = opts.sandboxSessionId || opts.prompt.sandboxSessionId
  const sandboxAttached = Boolean(sandboxSessionId && opts.userId)
  const projectId = String(opts.projectId || '').trim()
  const projectAttached = opts.prompt.inboxRole === 'overseer' && Boolean(projectId)
  const useNativeWeb = searchEnabled && deepseekChatSupportsNativeWebTools()
  const pluginTools = await buildPluginTools(opts.plugins, opts.signal, opts.pluginCreds)
  const tools = buildDeepseekChatToolList(
    searchEnabled,
    pluginTools,
    harnessEnabled,
    sandboxAttached,
    projectAttached,
    chatMode,
  )
  const deepseekHost = deepseekChatUsesThinking()
  const workspaceStore: ChatWorkspaceStore | undefined = harnessEnabled
    ? createWorkspaceStore(opts.workspaceFiles)
    : undefined
  const pendingWorkspaceWrites: ChatWorkspaceFileWire[] = []
  const projectStore = projectAttached
    ? createProjectStore({
        projectId,
        memory: opts.prompt.projectMemory,
        agents: opts.projectAgents,
      })
    : undefined
  const pendingProjectActions: ProjectAction[] = []
  const pendingSandboxActivity: Array<{
    kind: 'diff' | 'run' | 'pr'
    path?: string
    text?: string
    argv?: string[]
    stdout?: string
    stderr?: string
    exitCode?: number
    ok?: boolean
    reviewUrl?: string
    source?: 'sandbox' | 'workspace' | 'git'
    at?: number
  }> = []

  if (continueReply) {
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant' || !last.content.trim()) {
      throw new Error('Continue requires a non-empty assistant reply.')
    }
  }

  const msgs: WireMsg[] = seedWireMessages(
    messages,
    { ...opts.prompt, harnessEnabled, sandboxSessionId, chatMode },
    searchEnabled,
    opts.fileIds,
    continueReply,
  )

  let announcedThinking = false
  let announcedSearching = false
  let deferredSearchRecoveries = 0
  let deferredOrchestrationRecovered = false
  let deferredToolRecovered = false
  let projectOrchestrationUsed = false
  let clientToolsUsed = false
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
        const toolName = call.function.name
        clientToolsUsed = true
        if (toolName === 'project_create_agent' || toolName === 'project_message_agent') {
          projectOrchestrationUsed = true
        }
        const result = await executeDeepseekChatTool(toolName, call.function.arguments || '{}', {
          ...opts.prompt,
          chatMode,
          signal: opts.signal,
          pluginCreds: opts.pluginCreds,
          workspace: workspaceStore,
          project: projectStore,
          userId: opts.userId,
          sandboxSessionId,
          onImage: (image) => {
            pendingImages.push(image)
          },
          onWorkspaceWrite: (file) => {
            pendingWorkspaceWrites.push(file)
          },
          onProjectActions: (actions) => {
            pendingProjectActions.push(...actions)
          },
          onSandboxActivity: (activity) => {
            pendingSandboxActivity.push(activity)
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
      if (pendingWorkspaceWrites.length) {
        const files = pendingWorkspaceWrites.splice(0, pendingWorkspaceWrites.length)
        yield { kind: 'workspace', files }
      }
      if (pendingProjectActions.length) {
        const actions = pendingProjectActions.splice(0, pendingProjectActions.length)
        // Keep store drain in sync so list_agents stays consistent mid-turn.
        if (projectStore) drainProjectActions(projectStore)
        yield { kind: 'project', actions }
      }
      while (pendingSandboxActivity.length) {
        const activity = pendingSandboxActivity.shift()!
        yield { kind: 'sandbox', activity }
      }
      continue
    }

    // Search was on, but the model only *announced* a search and stopped — nudge
    // so the turn actually calls deepseek_web_search instead of RELATED chips.
    // Require real source URLs: a bare call_started (announcedSearching) must NOT
    // block recovery when the visible reply is still an empty "I'll check…" promise.
    const didServerSearch = allSources.size > 0
    if (
      searchEnabled &&
      useNativeWeb &&
      deferredSearchRecoveries < MAX_DEFERRED_SEARCH_RECOVERIES &&
      !didServerSearch &&
      looksLikeDeferredSearchTurn(assistantContent, assistantReasoning) &&
      round < DEEPSEEK_CHAT_MAX_TOOL_ROUNDS - 1
    ) {
      deferredSearchRecoveries += 1
      console.warn(
        `[deepseek-chat] deferred-search recovery #${deferredSearchRecoveries}: model announced search without tools`,
      )
      msgs.push({
        role: 'assistant',
        content: assistantContent || null,
        reasoning_content: assistantReasoning || null,
      })
      msgs.push({ role: 'user', content: DEFERRED_SEARCH_NUDGE })
      // Clear the empty promise from the UI so the real answer can stream in.
      yield { kind: 'content_replace', text: '' }
      assistantContent = ''
      continue
    }

    // Overseer announced worker setup but never called project_* spawn/message tools.
    if (
      projectAttached &&
      !deferredOrchestrationRecovered &&
      !projectOrchestrationUsed &&
      looksLikeDeferredOrchestration(assistantContent) &&
      round < DEEPSEEK_CHAT_MAX_TOOL_ROUNDS - 1
    ) {
      deferredOrchestrationRecovered = true
      console.warn(
        '[deepseek-chat] deferred-orchestration recovery: Overseer announced workers without project_* tools',
      )
      msgs.push({
        role: 'assistant',
        content: assistantContent || null,
        reasoning_content: assistantReasoning || null,
      })
      msgs.push({ role: 'user', content: DEFERRED_ORCHESTRATION_NUDGE })
      yield { kind: 'content_replace', text: '' }
      assistantContent = ''
      continue
    }

    // General client-tool deferral: announced weather/fetch/etc. without tool_calls.
    if (
      tools.length > 0 &&
      !deferredToolRecovered &&
      !clientToolsUsed &&
      !didServerSearch &&
      looksLikeDeferredToolUse(assistantContent) &&
      // Prefer search/orchestration recoveries when those intents also match.
      !(searchEnabled && useNativeWeb && looksLikeDeferredSearchTurn(assistantContent, assistantReasoning)) &&
      !(projectAttached && looksLikeDeferredOrchestration(assistantContent)) &&
      round < DEEPSEEK_CHAT_MAX_TOOL_ROUNDS - 1
    ) {
      deferredToolRecovered = true
      console.warn('[deepseek-chat] deferred-tool recovery: model announced tools without tool_calls')
      msgs.push({
        role: 'assistant',
        content: assistantContent || null,
        reasoning_content: assistantReasoning || null,
      })
      msgs.push({ role: 'user', content: DEFERRED_TOOL_NUDGE })
      yield { kind: 'content_replace', text: '' }
      assistantContent = ''
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
