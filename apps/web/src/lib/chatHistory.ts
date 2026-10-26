/** Local DeepSeek Chat threads (device-only; no cloud sync). */

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  /** DeepSeek chain-of-thought (assistant only). */
  reasoning?: string
  /** Wall time spent in thinking mode, ms. */
  thoughtMs?: number
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

function normalizeMessage(m: Partial<ChatMessage>): ChatMessage | null {
  if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null
  return {
    id: typeof m.id === 'string' ? m.id : uid(),
    role: m.role,
    content: String(m.content || ''),
    createdAt: Number(m.createdAt) || Date.now(),
    reasoning: typeof m.reasoning === 'string' && m.reasoning.trim() ? m.reasoning : undefined,
    thoughtMs: Number.isFinite(m.thoughtMs) ? Math.max(0, Number(m.thoughtMs)) : undefined,
  }
}

export function readChatThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((t): t is ChatThread => Boolean(t && typeof t === 'object' && typeof t.id === 'string'))
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
  } catch {
    return []
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
  extras?: { reasoning?: string; thoughtMs?: number },
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
