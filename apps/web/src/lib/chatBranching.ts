/**
 * DeepSeek Chat continue / branch helpers (local threads).
 */
import type { ChatAlternate, ChatMessage, ChatThread } from './chatHistory'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function snapshot(message: ChatMessage): ChatAlternate {
  return {
    id: message.id,
    content: message.content,
    reasoning: message.reasoning,
    thoughtMs: message.thoughtMs,
    sources: message.sources,
    searchSteps: message.searchSteps,
  }
}

/** Full ordered pool of reply siblings (includes the live body). */
export function alternatePool(message: ChatMessage): ChatAlternate[] {
  if (message.role !== 'assistant') return []
  const existing = message.alternates || []
  if (!existing.length) return [snapshot(message)]
  // Already a complete pool if activeAlternate points inside it and live matches.
  const idx = message.activeAlternate
  if (
    typeof idx === 'number' &&
    idx >= 0 &&
    idx < existing.length &&
    existing[idx]!.content === message.content
  ) {
    return existing
  }
  // Legacy / mid-regen: append live body if missing.
  const last = existing[existing.length - 1]
  if (last && last.content === message.content) return existing
  return [...existing, snapshot(message)].slice(-8)
}

/** Snapshot the live assistant body into the alternate pool before regenerating. */
export function pushAssistantAlternate(message: ChatMessage): ChatMessage {
  if (message.role !== 'assistant' || !message.content.trim()) return message
  const pool = alternatePool(message)
  return {
    ...message,
    alternates: pool,
    activeAlternate: pool.length - 1,
  }
}

/** Cycle through stored reply siblings (n = -1 | +1). */
export function cycleAssistantAlternate(message: ChatMessage, dir: -1 | 1): ChatMessage {
  if (message.role !== 'assistant') return message
  const pool = alternatePool(message)
  if (pool.length < 2) return message
  const cur = Math.min(pool.length - 1, Math.max(0, message.activeAlternate ?? pool.length - 1))
  const next = (cur + dir + pool.length) % pool.length
  const pick = pool[next]!
  return {
    ...message,
    id: pick.id || message.id,
    content: pick.content,
    reasoning: pick.reasoning,
    thoughtMs: pick.thoughtMs,
    sources: pick.sources,
    searchSteps: pick.searchSteps,
    alternates: pool,
    activeAlternate: next,
  }
}

/** Fork a new thread containing messages up to (and including) `throughId`. */
export function forkThreadAt(thread: ChatThread, throughId: string): ChatThread | null {
  const idx = thread.messages.findIndex((m) => m.id === throughId)
  if (idx < 0) return null
  const messages = thread.messages.slice(0, idx + 1).map((m) => ({
    ...m,
    id: uid(),
    alternates: m.alternates?.map((a) => ({ ...a, id: uid() })),
  }))
  const titleBase = thread.title.trim() || 'Chat'
  return {
    id: uid(),
    title: `Branch · ${titleBase}`.slice(0, 80),
    updatedAt: Date.now(),
    messages,
    pinned: false,
    archived: false,
  }
}

/** Whether the last assistant turn looks continue-eligible. */
export function canContinueAssistant(thread: ChatThread): boolean {
  const last = thread.messages[thread.messages.length - 1]
  if (!last || last.role !== 'assistant') return false
  return Boolean(last.content.trim())
}
