/**
 * Strip leaked agent / system chrome from #/chat visible text.
 * Models occasionally emit Cursor-shaped `<system_reminder>` / reasoning_effort
 * blobs into the content channel — never show those in the bubble.
 */

/** Opening `<system_reminder>` … closing tag (or EOS). Do not use `<\/?` — that treats closers as openers. */
const SYSTEM_REMINDER_BLOCK =
  /<system[_-]?reminder\b[^>]*>[\s\S]*?(?:<\/system[_-]?reminder\s*>|$)/gi

const SYSTEM_REMINDER_CLOSE = /<\/system[_-]?reminder\s*>/gi

/** Bare `system_reminder>` (missing `<`) through close tag, blank line, or EOS. */
const BARE_SYSTEM_REMINDER =
  /(?:^|\n)[ \t]*system[_-]?reminder\s*>[\s\S]*?(?:<\/system[_-]?reminder\s*>|(?=\n[ \t]*\n)|$)/gi

const REASONING_EFFORT_BLOCK =
  /(?:^|\n)[ \t]*(?:You are running\s+)?reasoning_effort\s*=\s*\S+[^\n]*(?:\n(?![ \t]*\n)[^\n]*)*/gi

const AGENT_JUNK_TAGS =
  /<\/?(?:think|thinking|assistant_scratchpad|tool_calls?|minimax:tool_call)(?:\s[^>]*)?>/gi

/** Hold back a partial leak tag at the end of a stream buffer so we do not flash `<sys`. */
const INCOMPLETE_LEAK_SUFFIX =
  /(?:<+\s*\/?\s*sys(?:tem(?:[_-]?rem(?:inder)?)?)?|<\s*$|(?:^|\n)[ \t]*system[_-]?rem(?:inder)?\s*>?)$/i

/**
 * Remove system_reminder / reasoning_effort / similar junk from assistant text.
 * Safe on full messages and on reassembled stream buffers.
 */
export function sanitizeDeepseekChatVisibleText(text: string): string {
  let s = String(text || '')
  if (!s) return s
  s = s.replace(SYSTEM_REMINDER_BLOCK, '')
  s = s.replace(BARE_SYSTEM_REMINDER, '\n')
  s = s.replace(SYSTEM_REMINDER_CLOSE, '')
  s = s.replace(REASONING_EFFORT_BLOCK, '\n')
  s = s.replace(/\breasoning_effort\s*=\s*\w+/gi, '')
  s = s.replace(AGENT_JUNK_TAGS, '')
  // Collapse runaway blank lines from removals; keep a single trailing newline if present.
  const trailingNl = /\n$/.test(s)
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  if (trailingNl && !s.endsWith('\n')) s += '\n'
  return s
}

/**
 * For live SSE: sanitize assembled text, but hold back an incomplete leak prefix
 * at the end so the next chunk can complete the match.
 */
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
    /<\/?(?:think|thinking|assistant_scratchpad)\b/i.test(t)
  )
}
