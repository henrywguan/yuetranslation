/**
 * Import DeepSeek Chat official session JSON + markdown exports into our threads.
 */
import { emptyThread, type ChatMessage, type ChatThread } from './chatHistory'
import { parseImportedThread } from './chatExport'

type DsFragment = { type?: string; content?: string; elapsed_secs?: number | null }

type DsMessage = {
  id?: number
  parent_id?: number | null
  role?: string
  fragments?: DsFragment[]
}

type DsSession = {
  id?: string
  title?: string | null
  current_message_id?: number
  pinned?: boolean
  messages?: DsMessage[]
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function fragmentText(frags: DsFragment[] | undefined, type: string): string {
  if (!Array.isArray(frags)) return ''
  return frags
    .filter((f) => f && f.type === type && typeof f.content === 'string')
    .map((f) => String(f.content || '').trim())
    .filter(Boolean)
    .join('\n\n')
}

function fragmentThink(frags: DsFragment[] | undefined): { text?: string; secs?: number } {
  if (!Array.isArray(frags)) return {}
  const thinks = frags.filter((f) => f && f.type === 'THINK' && typeof f.content === 'string')
  if (!thinks.length) return {}
  const text = thinks.map((f) => String(f.content || '').trim()).filter(Boolean).join('\n\n')
  const secs = thinks.reduce((n, f) => n + (Number(f.elapsed_secs) || 0), 0)
  return { text: text || undefined, secs: secs || undefined }
}

/**
 * Linearize a DeepSeek message tree along the path to `current_message_id`
 * (or the highest id when missing).
 */
export function linearizeDeepseekSession(session: DsSession): ChatMessage[] {
  const messages = Array.isArray(session.messages) ? session.messages : []
  if (!messages.length) return []
  const byId = new Map<number, DsMessage>()
  for (const m of messages) {
    if (typeof m.id === 'number') byId.set(m.id, m)
  }
  let cursor =
    typeof session.current_message_id === 'number' && byId.has(session.current_message_id)
      ? session.current_message_id
      : Math.max(...[...byId.keys()])
  const chain: DsMessage[] = []
  const seen = new Set<number>()
  while (byId.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor)
    const row = byId.get(cursor)!
    chain.push(row)
    cursor = typeof row.parent_id === 'number' ? row.parent_id : -1
  }
  chain.reverse()

  const out: ChatMessage[] = []
  for (const m of chain) {
    const roleRaw = String(m.role || '').toUpperCase()
    const role = roleRaw === 'USER' ? 'user' : roleRaw === 'ASSISTANT' ? 'assistant' : null
    if (!role) continue
    const content =
      role === 'user'
        ? fragmentText(m.fragments, 'REQUEST')
        : fragmentText(m.fragments, 'RESPONSE') || fragmentText(m.fragments, 'TEMPLATE_RESPONSE')
    if (!content.trim()) continue
    const think = role === 'assistant' ? fragmentThink(m.fragments) : {}
    out.push({
      id: uid(),
      role,
      content: content.slice(0, 12_000),
      createdAt: Date.now(),
      ...(think.text ? { reasoning: think.text.slice(0, 12_000) } : null),
      ...(think.secs ? { thoughtMs: Math.round(think.secs * 1000) } : null),
    })
  }
  return out
}

export function parseDeepseekSessionJson(raw: unknown): ChatThread | null {
  if (!raw || typeof raw !== 'object') return null
  const session = raw as DsSession
  if (!Array.isArray(session.messages)) return null
  // Official sessions use USER/ASSISTANT roles + fragments.
  const looksOfficial = session.messages.some(
    (m) =>
      m &&
      (String(m.role || '').toUpperCase() === 'USER' ||
        String(m.role || '').toUpperCase() === 'ASSISTANT') &&
      Array.isArray(m.fragments),
  )
  if (!looksOfficial) return null
  const messages = linearizeDeepseekSession(session)
  if (!messages.length) return null
  const base = emptyThread()
  return {
    ...base,
    id: uid(),
    title: (typeof session.title === 'string' && session.title.trim()) || 'Imported DeepSeek chat',
    pinned: Boolean(session.pinned),
    updatedAt: Date.now(),
    messages,
  }
}

/** Parse markdown exports shaped like our threadToMarkdown (`## You` / `## DeepSeek`). */
export function parseChatMarkdown(raw: string): ChatThread | null {
  const text = raw.replace(/^\uFEFF/, '').trim()
  if (!text || !/^#\s+/m.test(text)) return null
  const lines = text.split(/\r?\n/)
  let title = 'Imported chat'
  const messages: ChatMessage[] = []
  let role: 'user' | 'assistant' | null = null
  let buf: string[] = []
  const flush = () => {
    if (!role) return
    const content = buf.join('\n').trim()
    buf = []
    if (!content) return
    messages.push({ id: uid(), role, content: content.slice(0, 12_000), createdAt: Date.now() })
  }
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)\s*$/)
    if (h1 && !messages.length && role == null) {
      title = h1[1]!.trim() || title
      continue
    }
    const h2 = line.match(/^##\s+(You|DeepSeek|Assistant|User)\s*$/i)
    if (h2) {
      flush()
      const label = h2[1]!.toLowerCase()
      role = label === 'you' || label === 'user' ? 'user' : 'assistant'
      continue
    }
    if (role) buf.push(line)
  }
  flush()
  if (!messages.length) return null
  return {
    ...emptyThread(),
    id: uid(),
    title: title.slice(0, 80),
    updatedAt: Date.now(),
    messages,
  }
}

/**
 * Best-effort import: our JSON, DeepSeek session JSON, or markdown.
 * Also accepts a ZIP-ish paste of a single session file body.
 */
export function parseAnyChatImport(raw: string): ChatThread | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Our local JSON or DeepSeek session JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        // Index array — not a single session
        return null
      }
      const ds = parseDeepseekSessionJson(parsed)
      if (ds) return ds
      const local = parseImportedThread(trimmed)
      if (local) return local
    } catch {
      /* fall through to markdown */
    }
  }

  return parseChatMarkdown(trimmed)
}
