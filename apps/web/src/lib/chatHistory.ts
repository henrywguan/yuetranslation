/** Local DeepSeek Chat threads (device-only; no cloud sync). */

export type ChatRole = 'user' | 'assistant'

export type ChatSource = {
  url: string
  title: string
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  /** DeepSeek chain-of-thought (assistant only). */
  reasoning?: string
  /** Wall time spent in thinking mode, ms. */
  thoughtMs?: number
  /** Web search citations (assistant only, Search toggle). */
  sources?: ChatSource[]
}

export type ChatThread = {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
}

const STORAGE_KEY = 'yue-deepseek-chat-v1'
const MAX_THREADS = 40
const MAX_MESSAGES = 80
/** Drop DeepThink traces except on the newest N assistant rows per thread. */
const KEEP_REASONING_TAIL = 4
/** Cap a single message body so one thread cannot OOM the tab on open. */
const MAX_CONTENT_CHARS = 12_000
/**
 * Raw localStorage payload above this is cleared on hydrate — JSON.parse of
 * multi‑MB DeepThink history freezes Chrome on "Loading conversation…".
 */
export const CHAT_HYDRATE_MAX_RAW_BYTES = 256_000

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function titleFromContent(content: string): string {
  const line = content.trim().replace(/\s+/g, ' ')
  if (!line) return 'New chat'
  return line.length > 42 ? `${line.slice(0, 42)}…` : line
}

export function emptyThread(): ChatThread {
  const now = Date.now()
  return { id: uid(), title: 'New chat', updatedAt: now, messages: [] }
}

function normalizeSources(raw: unknown): ChatSource[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: ChatSource[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const url = String((item as ChatSource).url || '').trim()
    if (!/^https?:\/\//i.test(url)) continue
    const title = String((item as ChatSource).title || '').trim() || url
    if (out.some((s) => s.url === url)) continue
    out.push({ url, title })
  }
  return out.length ? out : undefined
}

function normalizeMessage(m: Partial<ChatMessage>): ChatMessage | null {
  if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null
  return {
    id: typeof m.id === 'string' ? m.id : uid(),
    role: m.role,
    content: String(m.content || ''),
    createdAt: Number(m.createdAt) || Date.now(),
    reasoning: typeof m.reasoning === 'string' && m.reasoning.trim() ? m.reasoning : undefined,
    thoughtMs: Number.isFinite(m.thoughtMs) ? Math.max(0, Number(m.thoughtMs)) : undefined,
    sources: normalizeSources(m.sources),
  }
}

export function normalizeChatThreads(parsed: unknown): ChatThread[] {
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((t): t is ChatThread => Boolean(t && typeof t === 'object' && typeof (t as ChatThread).id === 'string'))
    .map((t) => ({
      id: t.id,
      title: typeof t.title === 'string' && t.title.trim() ? t.title : 'New chat',
      updatedAt: Number(t.updatedAt) || Date.now(),
      messages: Array.isArray(t.messages)
        ? t.messages
            .map((m) => normalizeMessage(m as Partial<ChatMessage>))
            .filter((m): m is ChatMessage => Boolean(m))
            .slice(-MAX_MESSAGES)
        : [],
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_THREADS)
}

export function readChatThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return normalizeChatThreads(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

/** Pure prune — does not touch localStorage. */
export function pruneChatThreads(threads: ChatThread[]): { threads: ChatThread[]; changed: boolean } {
  let changed = false
  const next = threads.map((t) => {
    const messages = t.messages.slice(-MAX_MESSAGES)
    if (messages.length !== t.messages.length) changed = true

    const keepReasoning = new Set<string>()
    let assistantsFromEnd = 0
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i]!
      if (m.role !== 'assistant') continue
      if (assistantsFromEnd < KEEP_REASONING_TAIL && m.reasoning) keepReasoning.add(m.id)
      assistantsFromEnd += 1
    }

    const slimmed = messages.map((m) => {
      let row = m
      if (m.reasoning && !keepReasoning.has(m.id)) {
        changed = true
        row = { ...row, reasoning: undefined }
      }
      if (row.content.length > MAX_CONTENT_CHARS) {
        changed = true
        row = { ...row, content: `${row.content.slice(0, MAX_CONTENT_CHARS)}\n\n…` }
      }
      return row
    })

    return { ...t, messages: slimmed }
  })
  return { threads: next, changed }
}

/**
 * Permanently slim device history that can freeze `#/chat` on open (huge DeepThink
 * traces + multi‑KB markdown). Safe to call on every hydrate — no-op when already lean.
 */
export function pruneHeavyChatStorage(threads = readChatThreads()): ChatThread[] {
  const { threads: next, changed } = pruneChatThreads(threads)
  if (changed) writeChatThreads(next)
  return next
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, 0)
      })
      return
    }
    setTimeout(resolve, 0)
  })
}

export type ChatHydrateResult = {
  threads: ChatThread[]
  /** True when oversized / corrupt history was deleted so the tab can open. */
  clearedHeavy: boolean
}

/**
 * Async hydrate for `#/chat` open — yields between parse/prune steps and clears
 * payloads that would lock the main thread on JSON.parse.
 */
export async function hydrateChatThreadsAsync(): Promise<ChatHydrateResult> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { threads: [], clearedHeavy: false }

    if (raw.length > CHAT_HYDRATE_MAX_RAW_BYTES) {
      localStorage.removeItem(STORAGE_KEY)
      return { threads: [], clearedHeavy: true }
    }

    await yieldToMain()
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return { threads: [], clearedHeavy: true }
    }

    await yieldToMain()
    const normalized = normalizeChatThreads(parsed)
    await yieldToMain()
    const { threads, changed } = pruneChatThreads(normalized)
    if (changed) {
      await yieldToMain()
      writeChatThreads(threads)
    }
    return { threads, clearedHeavy: false }
  } catch {
    return { threads: [], clearedHeavy: false }
  }
}

export function writeChatThreads(threads: ChatThread[]) {
  try {
    const next = threads
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_THREADS)
      .map((t) => ({
        ...t,
        messages: t.messages.slice(-MAX_MESSAGES),
      }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

export function upsertChatThread(thread: ChatThread, all = readChatThreads()): ChatThread[] {
  // Prefer the caller's in-memory list when provided — re-parsing localStorage on
  // every stream delta (default arg) was multi-ms sync work per token.
  const rest = all.filter((t) => t.id !== thread.id)
  const next = [thread, ...rest]
  writeChatThreads(next)
  return next
}

export function deleteChatThread(id: string, all = readChatThreads()): ChatThread[] {
  const next = all.filter((t) => t.id !== id)
  writeChatThreads(next)
  return next
}

export function appendChatMessage(
  thread: ChatThread,
  role: ChatRole,
  content: string,
): { thread: ChatThread; message: ChatMessage } {
  const message: ChatMessage = {
    id: uid(),
    role,
    content,
    createdAt: Date.now(),
  }
  const messages = [...thread.messages, message].slice(-MAX_MESSAGES)
  const titled =
    role === 'user' && thread.messages.length === 0
      ? { ...thread, title: titleFromContent(content) }
      : thread
  return {
    message,
    thread: {
      ...titled,
      messages,
      updatedAt: Date.now(),
    },
  }
}

export function patchAssistantContent(
  thread: ChatThread,
  messageId: string,
  content: string,
  extras?: { reasoning?: string; thoughtMs?: number; sources?: ChatSource[] },
): ChatThread {
  return {
    ...thread,
    updatedAt: Date.now(),
    messages: thread.messages.map((m) =>
      m.id === messageId
        ? {
            ...m,
            content,
            ...(extras?.reasoning !== undefined ? { reasoning: extras.reasoning } : null),
            ...(extras?.thoughtMs !== undefined ? { thoughtMs: extras.thoughtMs } : null),
            ...(extras?.sources !== undefined ? { sources: extras.sources } : null),
          }
        : m,
    ),
  }
}

export function apiMessagesFromThread(thread: ChatThread): { role: ChatRole; content: string }[] {
  return thread.messages
    .filter((m) => m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }))
}
