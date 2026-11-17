/**
 * DeepSeek Chat continue / branch helpers (local threads).
 */
import type { ChatMessage, ChatThread } from './chatHistory'

export type ChatAlternate = {
  id: string
  content: string
  reasoning?: string
  thoughtMs?: number
  sources?: ChatMessage['sources']
  searchSteps?: ChatMessage['searchSteps']
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Snapshot the live assistant body into an alternate before regenerating. */
export function pushAssistantAlternate(message: ChatMessage): ChatMessage {
  if (message.role !== 'assistant' || !message.content.trim()) return message
  const snap: ChatAlternate = {
    id: message.id,
    content: message.content,
    reasoning: message.reasoning,
    thoughtMs: message.thoughtMs,
    sources: message.sources,
    searchSteps: message.searchSteps,
  }
  const prior = message.alternates || []
  return {
    ...message,
    alternates: [...prior, snap].slice(-8),
    activeAlternate: prior.length,
  }
}

/** Cycle through stored alternates + live content (n = -1 | +1). */
export function cycleAssistantAlternate(message: ChatMessage, dir: -1 | 1): ChatMessage {
  if (message.role !== 'assistant' || !message.alternates?.length) return message
  const pool: ChatAlternate[] = [
    ...message.alternates,
    {
      id: message.id,
      content: message.content,
      reasoning: message.reasoning,
      thoughtMs: message.thoughtMs,
      sources: message.sources,
      searchSteps: message.searchSteps,
    },
  ]
  const cur = Math.min(pool.length - 1, Math.max(0, message.activeAlternate ?? pool.length - 1))
  const next = (cur + dir + pool.length) % pool.length
  const pick = pool[next]!
  // Rebuild alternates excluding the newly activated body.
  const others = pool.filter((_, i) => i !== next)
  return {
    ...message,
    id: pick.id || message.id,
    content: pick.content,
    reasoning: pick.reasoning,
    thoughtMs: pick.thoughtMs,
    sources: pick.sources,
    searchSteps: pick.searchSteps,
    alternates: others,
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
  const t = last.content.trim()
  if (!t) return false
  // Heuristic: incomplete if ends mid-sentence / cut mid-list / no terminal punctuation.
  if (/[.!?。！？…」』）)\]]\s*$/.test(t)) return true // still allow explicit Continue
  return true
}
