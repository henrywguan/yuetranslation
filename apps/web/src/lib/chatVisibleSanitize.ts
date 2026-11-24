/**
 * Client mirror of apps/api `deepseekChatSanitize.ts`.
 * Strip leaked system_reminder / reasoning_effort from #/chat bubbles.
 */

/** Opening tag only — `<\/?` would treat closers as openers and swallow trailing prose. */
const SYSTEM_REMINDER_BLOCK =
  /<system[_-]?reminder\b[^>]*>[\s\S]*?(?:<\/system[_-]?reminder\s*>|$)/gi

const SYSTEM_REMINDER_CLOSE = /<\/system[_-]?reminder\s*>/gi

const BARE_SYSTEM_REMINDER =
  /(?:^|\n)[ \t]*system[_-]?reminder\s*>[\s\S]*?(?:<\/system[_-]?reminder\s*>|(?=\n[ \t]*\n)|$)/gi

const REASONING_EFFORT_BLOCK =
  /(?:^|\n)[ \t]*(?:You are running\s+)?reasoning_effort\s*=\s*\S+[^\n]*(?:\n(?![ \t]*\n)[^\n]*)*/gi

const AGENT_JUNK_TAGS =
  /<\/?(?:think|thinking|assistant_scratchpad|tool_calls?|minimax:tool_call)(?:\s[^>]*)?>/gi

const INCOMPLETE_LEAK_SUFFIX =
  /(?:<+\s*\/?\s*sys(?:tem(?:[_-]?rem(?:inder)?)?)?|<\s*$|(?:^|\n)[ \t]*system[_-]?rem(?:inder)?\s*>?)$/i

export function sanitizeDeepseekChatVisibleText(text: string): string {
  let s = String(text || '')
  if (!s) return s
  s = s.replace(SYSTEM_REMINDER_BLOCK, '')
  s = s.replace(BARE_SYSTEM_REMINDER, '\n')
  s = s.replace(SYSTEM_REMINDER_CLOSE, '')
  s = s.replace(REASONING_EFFORT_BLOCK, '\n')
  s = s.replace(/\breasoning_effort\s*=\s*\w+/gi, '')
  s = s.replace(AGENT_JUNK_TAGS, '')
  const trailingNl = /\n$/.test(s)
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  if (trailingNl && !s.endsWith('\n')) s += '\n'
  return s
}

export function sanitizeDeepseekChatStreamBuffer(assembled: string): {
  visible: string
  hold: string
} {
  const raw = String(assembled || '')
  const m = raw.match(INCOMPLETE_LEAK_SUFFIX)
  if (m && m.index != null) {
    const hold = raw.slice(m.index)
    const visible = sanitizeDeepseekChatVisibleText(raw.slice(0, m.index))
    return { visible, hold }
  }
  return { visible: sanitizeDeepseekChatVisibleText(raw), hold: '' }
}

export function deepseekChatTextLooksLeaked(text: string): boolean {
  const t = String(text || '')
  return (
    /system[_-]?reminder/i.test(t) ||
    /reasoning_effort\s*=/i.test(t) ||
    /<\/?(?:think|thinking|assistant_scratchpad|tool_calls?|minimax:tool_call)\b/i.test(t)
  )
}

/** Delta may be a split junk/leak opener (`<to`, `<sys`, …) — force a full rescan. */
const STREAM_LEAK_DELTA_HINT =
  /<\s*\/?\s*(?:sys|tool|think|assistant_scratchpad|minimax)|system[_-]?rem|reasoning_effort\s*=/i

/**
 * Append a stream chunk without re-scanning the whole buffer every token.
 * Full-buffer sanitize is O(n) with multiple regexes — doing it per delta on a
 * growing DeepThink trace is O(n²) and freezes the tab ("Page Unresponsive").
 * Chunks are already sanitized at the SSE boundary; only re-scan when a leak
 * marker appears (incomplete tags spanning chunks).
 */
export function appendSanitizedStreamText(prev: string, delta: string): string {
  const next = String(prev || '') + String(delta || '')
  if (!next) return next
  if (deepseekChatTextLooksLeaked(next) || STREAM_LEAK_DELTA_HINT.test(delta || '')) {
    return sanitizeDeepseekChatVisibleText(next)
  }
  return next
}

/** Yield the SSE parse loop so React can paint Stop / Thinking during long thinks. */
export const CHAT_STREAM_YIELD_EVERY_MS = 32
export const CHAT_STREAM_YIELD_EVERY_EVENTS = 24

/**
 * Idle SSE with only heartbeats / no *meaningful* data events — auto-abort so UI never spins forever.
 * Must exceed image tool deadline (~95s) so legitimate generate_image does not trip the client.
 */
export const CHAT_STREAM_IDLE_MS = 150_000

/**
 * Before the first visible token / reasoning / tool status, fail faster than the full idle window.
 * Empty `contentReplace` (leak scrub / deferred-recovery wipe) must not keep the spinner alive.
 */
export const CHAT_STREAM_FIRST_PROGRESS_MS = 75_000

export const CHAT_STREAM_STALL_ERROR =
  'Reply stalled (no progress for too long — often Image / tools). Tap Stop working, then Send again or Continue.'

/** True when an SSE payload should reset the client idle watchdog. */
export function chatStreamEventIsMeaningfulProgress(parsed: {
  delta?: string
  contentReplace?: string
  reasoning?: string
  error?: string
  status?: string
  sources?: unknown[]
  searchStep?: unknown
  image?: { url?: string }
  avatar?: { action?: string }
  workspace?: { files?: unknown[] }
  project?: { actions?: unknown[] }
  sandbox?: unknown
  title?: string
}): boolean {
  if (parsed.error) return true
  if (parsed.status === 'thinking' || parsed.status === 'searching') return true
  if (parsed.reasoning) return true
  if (parsed.sources?.length) return true
  if (parsed.searchStep) return true
  if (parsed.image?.url) return true
  if (parsed.avatar?.action) return true
  if (parsed.workspace?.files?.length) return true
  if (parsed.project?.actions?.length) return true
  if (parsed.sandbox) return true
  if (typeof parsed.contentReplace === 'string') {
    // Empty replace (leak hold / deferred wipe) is not progress — do not reset idle.
    return Boolean(sanitizeDeepseekChatVisibleText(parsed.contentReplace).trim())
  }
  if (parsed.delta) {
    return Boolean(sanitizeDeepseekChatVisibleText(parsed.delta).trim())
  }
  // Bare title / started / done without visible text must not keep Ask hangs alive.
  return false
}
