/**
 * Local DeepSeek Chat threads (device-local).
 * Full Supabase cloud sync is deferred — see `chatDeferred.ts`.
 */
import { normalizeWorkspace, pruneWorkspace } from './chatWorkspace.js'

export type ChatRole = 'user' | 'assistant'

export type ChatSource = {
  url: string
  title: string
}

export type ChatSearchImage = {
  imageUrl: string
  url?: string
  title?: string
  siteName?: string
  siteIcon?: string
}

export type ChatSearchStep = {
  kind: string
  queries?: string[]
  url?: string
  title?: string
  siteName?: string
  snippet?: string
  images?: ChatSearchImage[]
}

/** Display metadata for an attached file (ids still drive the API). */
export type ChatFileMeta = {
  fileId: string
  filename: string
  mime?: string
}

export type ChatAlternate = {
  id: string
  content: string
  reasoning?: string
  thoughtMs?: number
  sources?: ChatSource[]
  searchSteps?: ChatSearchStep[]
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
  /** Live search/fetch steps for the thinking panel. */
  searchSteps?: ChatSearchStep[]
  /** DeepSeek Files API ids attached to a user turn. */
  fileIds?: string[]
  /** Filenames / mime for UI chips (optional; fileIds remain source of truth for API). */
  files?: ChatFileMeta[]
  /** Prior regenerated replies for this assistant turn (branch siblings). */
  alternates?: ChatAlternate[]
  /** Index into alternates + live body for ← → branch UI. */
  activeAlternate?: number
}

/** Per-thread Harness workspace — see chatWorkspace.ts for caps/helpers. */
export type ChatThreadWorkspaceFile = {
  id: string
  path: string
  mime?: string
  text?: string
  updatedAt: number
}

export type ChatThreadWorkspace = {
  files: ChatThreadWorkspaceFile[]
  updatedAt: number
}

export type ChatThread = {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
  pinned?: boolean
  archived?: boolean
  /** Harness-mode persistent files (device-local). */
  workspace?: ChatThreadWorkspace
}

const STORAGE_KEY = 'yue-deepseek-chat-v1'
const MAX_THREADS = 40
const MAX_MESSAGES = 80
/** Drop DeepThink traces except on the newest N assistant rows per thread. */
const KEEP_REASONING_TAIL = 4
/** Keep searchSteps / heavy media only on the newest N assistants. */
const KEEP_SEARCH_STEPS_TAIL = 4
/** Cap a single message body so one thread cannot OOM the tab on open. */
export const MAX_CONTENT_CHARS = 12_000
/**
 * Max messages sent to POST /api/chat — keep in sync with API
 * `DEEPSEEK_CHAT_MESSAGES_MAX` (model window is smaller).
 */
export const API_CHAT_MESSAGES_MAX = 48
/**
 * Cap a single DeepThink trace in storage / settled panels.
 * Higher than answer content — long research CoT is the product for #/chat.
 * Still pruned to KEEP_REASONING_TAIL assistants per thread.
 */
export const MAX_REASONING_CHARS = 48_000
/**
 * Bound live DeepThink buffer mid-stream (disk prune still applies on write).
 * Keep the *tail* so the latest research steps survive long thinks.
 */
export const LIVE_REASONING_KEEP = 96_000
/**
 * While streaming, only paint this many chars of the trace — rewriting a
 * 50k+ `<pre>` every paint freezes the tab even with coalesced React updates.
 */
export const LIVE_REASONING_PAINT = 16_000
/**
 * Raw localStorage payload above this is cleared on hydrate — JSON.parse of
 * multi‑MB DeepThink history freezes Chrome on "Loading conversation…".
 */
export const CHAT_HYDRATE_MAX_RAW_BYTES = 512_000

/** Coalesce disk writes so stream-end stringify does not fight first markdown paint. */
let pendingDiskWrite: ChatThread[] | null = null
let diskWriteHandle: number | null = null

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

function normalizeSearchSteps(raw: unknown): ChatSearchStep[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: ChatSearchStep[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as ChatSearchStep
    const kind = String(row.kind || '').trim()
    if (!kind) continue
    let images: ChatSearchImage[] | undefined
    if (Array.isArray(row.images)) {
      const parsed: ChatSearchImage[] = []
      for (const img of row.images) {
        if (!img || typeof img !== 'object') continue
        const raw = img as ChatSearchImage
        const imageUrl = String(raw.imageUrl || '').trim()
        if (!/^https?:\/\//i.test(imageUrl)) continue
        const next: ChatSearchImage = { imageUrl }
        if (typeof raw.url === 'string') next.url = raw.url
        if (typeof raw.title === 'string') next.title = raw.title
        if (typeof raw.siteName === 'string') next.siteName = raw.siteName
        if (typeof raw.siteIcon === 'string') next.siteIcon = raw.siteIcon
        parsed.push(next)
        if (parsed.length >= 12) break
      }
      if (parsed.length) images = parsed
    }
    out.push({
      kind,
      queries: Array.isArray(row.queries) ? row.queries.map(String).filter(Boolean) : undefined,
      url: typeof row.url === 'string' ? row.url : undefined,
      title: typeof row.title === 'string' ? row.title : undefined,
      siteName: typeof row.siteName === 'string' ? row.siteName : undefined,
      snippet: typeof row.snippet === 'string' ? row.snippet : undefined,
      ...(images ? { images } : null),
    })
  }
  return out.length ? out.slice(-24) : undefined
}

function normalizeFileIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const ids = raw.map(String).filter((id) => /^file-api-/.test(id))
  return ids.length ? ids.slice(0, 5) : undefined
}

function normalizeFiles(raw: unknown, fileIds?: string[]): ChatFileMeta[] | undefined {
  const byId = new Map<string, ChatFileMeta>()
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const row = item as ChatFileMeta
      const fileId = String(row.fileId || '').trim()
      if (!/^file-api-/.test(fileId)) continue
      const filename = String(row.filename || '').trim() || 'attachment'
      const mime = typeof row.mime === 'string' ? row.mime : undefined
      byId.set(fileId, { fileId, filename, mime })
    }
  }
  for (const id of fileIds || []) {
    if (!byId.has(id)) byId.set(id, { fileId: id, filename: 'attachment' })
  }
  const out = [...byId.values()].slice(0, 5)
  return out.length ? out : undefined
}

function normalizeAlternates(raw: unknown): ChatAlternate[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: ChatAlternate[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as ChatAlternate
    const content = String(row.content || '').trim()
    if (!content) continue
    out.push({
      id: typeof row.id === 'string' ? row.id : uid(),
      content: content.slice(0, MAX_CONTENT_CHARS),
      reasoning: typeof row.reasoning === 'string' && row.reasoning.trim() ? row.reasoning : undefined,
      thoughtMs: Number.isFinite(row.thoughtMs) ? Math.max(0, Number(row.thoughtMs)) : undefined,
      sources: normalizeSources(row.sources),
      searchSteps: normalizeSearchSteps(row.searchSteps),
    })
  }
  return out.length ? out.slice(-8) : undefined
}

function normalizeMessage(m: Partial<ChatMessage>): ChatMessage | null {
  if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null
  const fileIds = normalizeFileIds(m.fileIds)
  const alternates = m.role === 'assistant' ? normalizeAlternates(m.alternates) : undefined
  return {
    id: typeof m.id === 'string' ? m.id : uid(),
    role: m.role,
    content: String(m.content || ''),
    createdAt: Number(m.createdAt) || Date.now(),
    reasoning: typeof m.reasoning === 'string' && m.reasoning.trim() ? m.reasoning : undefined,
    thoughtMs: Number.isFinite(m.thoughtMs) ? Math.max(0, Number(m.thoughtMs)) : undefined,
    sources: normalizeSources(m.sources),
    searchSteps: normalizeSearchSteps(m.searchSteps),
    fileIds,
    files: normalizeFiles(m.files, fileIds),
    ...(alternates ? { alternates } : null),
    ...(m.role === 'assistant' && Number.isFinite(m.activeAlternate)
      ? { activeAlternate: Math.max(0, Number(m.activeAlternate)) }
      : null),
  }
}

function sortThreads(threads: ChatThread[]): ChatThread[] {
  return threads.slice().sort((a, b) => {
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    const aa = a.archived ? 1 : 0
    const ba = b.archived ? 1 : 0
    if (aa !== ba) return aa - ba
    return b.updatedAt - a.updatedAt
  })
}

function normalizeChatThreads(parsed: unknown): ChatThread[] {
  if (!Array.isArray(parsed)) return []
  return sortThreads(
    parsed
      .filter((t): t is ChatThread => Boolean(t && typeof t === 'object' && typeof (t as ChatThread).id === 'string'))
      .map((t) => {
        const workspace = normalizeWorkspace((t as ChatThread).workspace)
        return {
          id: t.id,
          title: typeof t.title === 'string' && t.title.trim() ? t.title : 'New chat',
          updatedAt: Number(t.updatedAt) || Date.now(),
          pinned: Boolean(t.pinned),
          archived: Boolean(t.archived),
          ...(workspace ? { workspace } : null),
          messages: Array.isArray(t.messages)
            ? t.messages
                .map((m) => normalizeMessage(m as Partial<ChatMessage>))
                .filter((m): m is ChatMessage => Boolean(m))
                .slice(-MAX_MESSAGES)
            : [],
        }
      })
      .slice(0, MAX_THREADS),
  )
}

export function readChatThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    // Same hard cap as async hydrate — avoid main-thread freeze / OOM on sync reads.
    if (raw.length > CHAT_HYDRATE_MAX_RAW_BYTES) {
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
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
    const keepSearchSteps = new Set<string>()
    let assistantsFromEnd = 0
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i]!
      if (m.role !== 'assistant') continue
      if (assistantsFromEnd < KEEP_REASONING_TAIL && m.reasoning) keepReasoning.add(m.id)
      if (assistantsFromEnd < KEEP_SEARCH_STEPS_TAIL && m.searchSteps?.length) {
        keepSearchSteps.add(m.id)
      }
      assistantsFromEnd += 1
    }

    const slimmed = messages.map((m) => {
      let row = m
      if (m.reasoning && !keepReasoning.has(m.id)) {
        changed = true
        row = { ...row, reasoning: undefined }
      }
      if (row.searchSteps?.length && !keepSearchSteps.has(row.id)) {
        changed = true
        row = { ...row, searchSteps: undefined }
      }
      if (row.reasoning && row.reasoning.length > MAX_REASONING_CHARS) {
        changed = true
        // Keep the *tail* (latest research steps), matching LIVE_REASONING_KEEP.
        row = {
          ...row,
          reasoning: `…\n${row.reasoning.slice(-MAX_REASONING_CHARS)}`,
        }
      }
      if (row.content.length > MAX_CONTENT_CHARS) {
        changed = true
        row = { ...row, content: `${row.content.slice(0, MAX_CONTENT_CHARS)}\n\n…` }
      }
      // Cap alternate branches on older turns — keep at most 2 siblings.
      if (row.alternates && row.alternates.length > 2 && !keepReasoning.has(row.id)) {
        changed = true
        row = { ...row, alternates: row.alternates.slice(-2) }
      }
      return row
    })

    const workspace = pruneWorkspace(t.workspace)
    if (workspace !== t.workspace) changed = true
    return { ...t, messages: slimmed, ...(workspace ? { workspace } : { workspace: undefined }) }
  })
  return { threads: next, changed }
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

function prepareThreadsForDisk(threads: ChatThread[]): ChatThread[] {
  // Apply content/reasoning caps on every write so stream-end idle flush cannot
  // leave 24k live traces on disk until the next open prune.
  const { threads: pruned } = pruneChatThreads(threads)
  return sortThreads(pruned)
    .slice(0, MAX_THREADS)
    .map((t) => ({
      ...t,
      messages: t.messages.slice(-MAX_MESSAGES),
    }))
}

function commitDiskWrite(threads: ChatThread[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads))
  } catch {
    /* ignore quota */
  }
}

/**
 * Persist threads. Coalesces via requestIdleCallback (timeout fallback) so a
 * stream-end stringify does not block the first post-stream markdown paint.
 */
export function writeChatThreads(threads: ChatThread[]) {
  pendingDiskWrite = prepareThreadsForDisk(threads)
  if (typeof window === 'undefined') {
    const payload = pendingDiskWrite
    pendingDiskWrite = null
    commitDiskWrite(payload)
    return
  }
  if (diskWriteHandle != null) return
  const run = () => {
    diskWriteHandle = null
    const payload = pendingDiskWrite
    pendingDiskWrite = null
    if (!payload) return
    commitDiskWrite(payload)
  }
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
  ).requestIdleCallback
  if (typeof ric === 'function') {
    diskWriteHandle = ric(run, { timeout: 600 })
  } else {
    diskWriteHandle = window.setTimeout(run, 0)
  }
}

export function upsertChatThread(thread: ChatThread, all = readChatThreads()): ChatThread[] {
  // Prefer the caller's in-memory list when provided — avoids re-parsing disk
  // (and racing idle coalesce) on every persist.
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
  extras?: {
    reasoning?: string
    thoughtMs?: number
    sources?: ChatSource[]
    searchSteps?: ChatSearchStep[]
  },
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
            ...(extras?.searchSteps !== undefined ? { searchSteps: extras.searchSteps } : null),
          }
        : m,
    ),
  }
}

export function renameChatThread(thread: ChatThread, title: string): ChatThread {
  const next = title.trim().slice(0, 80)
  if (!next) return thread
  return { ...thread, title: next, updatedAt: Date.now() }
}

export function setChatThreadPinned(thread: ChatThread, pinned: boolean): ChatThread {
  return { ...thread, pinned: Boolean(pinned), updatedAt: Date.now() }
}

/**
 * Replace a closed worker's transcript with a single compact context turn so
 * later project_message_agent resumes without re-sending the full history.
 */
export function seedCompactedWorkerThread(
  thread: ChatThread,
  summary: string,
  agentTitle?: string,
): ChatThread {
  const note = String(summary || '').trim().slice(0, 2_000)
  if (!note) return thread
  const label = String(agentTitle || thread.title || 'Worker').trim() || 'Worker'
  const now = Date.now()
  const content =
    `Prior work was compacted for this worker (${label}).\n\nSummary:\n${note}\n\nContinue from this summary; do not assume earlier verbatim transcript is available.`
  const msg: ChatMessage = {
    id: uid(),
    role: 'user',
    content,
    createdAt: now,
  }
  return {
    ...thread,
    updatedAt: now,
    archived: false,
    messages: [msg],
  }
}

/**
 * When a live worker thread is near the wire cap, roll oldest turns into one
 * summary message and keep the newest tail (Overseer close summary preferred).
 */
export function rollupOldestChatMessages(
  thread: ChatThread,
  keepTail = Math.max(12, Math.floor(API_CHAT_MESSAGES_MAX * 0.6)),
): ChatThread {
  const msgs = thread.messages
  if (msgs.length <= keepTail + 2) return thread
  const drop = msgs.slice(0, msgs.length - keepTail)
  const tail = msgs.slice(msgs.length - keepTail)
  const bits = drop
    .map((m) => {
      const body = m.content.trim().replace(/\s+/g, ' ').slice(0, 180)
      if (!body) return ''
      return `${m.role}: ${body}`
    })
    .filter(Boolean)
    .slice(0, 16)
  if (!bits.length) return { ...thread, messages: tail }
  const now = Date.now()
  const rollup: ChatMessage = {
    id: uid(),
    role: 'user',
    content: `Context rollup (older turns compacted):\n${bits.join('\n')}`,
    createdAt: drop[0]?.createdAt || now,
  }
  return {
    ...thread,
    updatedAt: now,
    messages: [rollup, ...tail],
  }
}

export function setChatThreadArchived(thread: ChatThread, archived: boolean): ChatThread {
  return {
    ...thread,
    archived: Boolean(archived),
    pinned: archived ? false : thread.pinned,
    updatedAt: Date.now(),
  }
}

/** Case-insensitive search over titles + recent message text. */
export function searchChatThreads(threads: ChatThread[], query: string): ChatThread[] {
  const q = query.trim().toLowerCase()
  // Threads are already kept sorted on write/hydrate — avoid re-alloc when browsing.
  if (!q) return threads
  return sortThreads(
    threads.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true
      return t.messages.some((m) => m.content.toLowerCase().includes(q))
    }),
  )
}

/**
 * Build the POST /api/chat messages array: drop empties, truncate to the
 * shared content cap, keep the newest wire-max turns so Zod cannot 400.
 */
export function apiMessagesFromThread(
  thread: ChatThread,
): { role: ChatRole; content: string; reasoning?: string; fileIds?: string[] }[] {
  return thread.messages
    .map((m) => {
      const content = m.content.trim().slice(0, MAX_CONTENT_CHARS)
      if (!content) return null
      // Wire/API still capped at MAX_CONTENT_CHARS (Zod); storage may keep more.
      const reasoning =
        m.role === 'assistant' && m.reasoning?.trim()
          ? m.reasoning.trim().slice(-MAX_CONTENT_CHARS)
          : undefined
      const fileIds =
        m.role === 'user' && m.fileIds?.length
          ? m.fileIds.filter((id) => /^file-api-/.test(id)).slice(0, 5)
          : undefined
      return {
        role: m.role,
        content,
        ...(reasoning ? { reasoning } : null),
        ...(fileIds?.length ? { fileIds } : null),
      }
    })
    .filter(
      (m): m is { role: ChatRole; content: string; reasoning?: string; fileIds?: string[] } =>
        Boolean(m),
    )
    .slice(-API_CHAT_MESSAGES_MAX)
}
