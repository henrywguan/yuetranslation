/**
 * Pure helpers for `#/chat` selection menu, history scrubber, agent pill, mood picker.
 * Offline-smokable — no DOM / React.
 */

/** Quote each line for Reply into the composer draft. */
export function formatSelectionReplyQuote(text: string): string {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (!trimmed) return ''
  return trimmed
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}

/**
 * Reply: quoted block + blank line, then any prior draft (not wiped).
 * Caret belongs after the quote block (caller focuses + sets selection).
 */
export function applySelectionReply(draft: string, selected: string): string {
  const quote = formatSelectionReplyQuote(selected)
  if (!quote) return draft
  const rest = draft.trim()
  return rest ? `${quote}\n\n${rest}` : `${quote}\n\n`
}

/** Labeled context block for Include. */
export function formatSelectionIncludeBlock(text: string): string {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  if (!trimmed) return ''
  return `Included:\n"""\n${trimmed}\n"""`
}

/** Include: append excerpt without wiping existing draft. */
export function applySelectionInclude(draft: string, selected: string): string {
  const block = formatSelectionIncludeBlock(selected)
  if (!block) return draft
  const base = draft.trimEnd()
  return base ? `${base}\n\n${block}` : block
}

export type ScrubberTick = {
  id: string
  role: 'user' | 'assistant' | 'system' | string
  /** Short one-line clip for aria / compact labels. */
  snippet: string
  /** Full message body for the hover preview card. */
  text: string
  index: number
}

/** Truncate message text for compact scrubber labels (aria). */
export function scrubberSnippet(text: string, max = 48): string {
  const one = text.replace(/\s+/g, ' ').trim()
  if (!one) return '…'
  if (one.length <= max) return one
  return `${one.slice(0, Math.max(1, max - 1))}…`
}

/** Normalize full message text for the scrubber hover preview (keep line breaks). */
export function scrubberPreviewText(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim()
  return normalized || '…'
}

/** Build scrubber ticks from thread messages (id + role + text). */
export function buildScrubberTicks(
  messages: ReadonlyArray<{ id: string; role: string; content?: string; text?: string }>,
): ScrubberTick[] {
  return messages.map((m, index) => {
    const raw = typeof m.content === 'string' ? m.content : typeof m.text === 'string' ? m.text : ''
    return {
      id: m.id,
      role: m.role,
      snippet: scrubberSnippet(raw),
      text: scrubberPreviewText(raw),
      index,
    }
  })
}

/** Active tick index from scroll progress (0..1) over n ticks. */
export function scrubberActiveIndex(progress: number, tickCount: number): number {
  if (tickCount <= 0) return -1
  if (tickCount === 1) return 0
  const p = Math.min(1, Math.max(0, progress))
  return Math.min(tickCount - 1, Math.round(p * (tickCount - 1)))
}

export type AgentStripItem = {
  id: string
  threadId: string | null | undefined
  title: string
  role: 'overseer' | 'worker' | string
  status: string
}

/** Active agent for the pill (prefer matching activeId; else first). */
export function pickActiveAgentStripItem(
  agents: ReadonlyArray<AgentStripItem>,
  activeId: string | null | undefined,
): AgentStripItem | null {
  if (!agents.length) return null
  const hit = agents.find((a) => a.threadId && a.threadId === activeId)
  return hit ?? agents[0] ?? null
}

/** Dropdown list = all project agents; active first, then overseer, then workers. */
export function sortAgentStripDropdown(
  agents: ReadonlyArray<AgentStripItem>,
  activeId: string | null | undefined,
): AgentStripItem[] {
  return [...agents].sort((a, b) => {
    const aActive = a.threadId === activeId ? 0 : 1
    const bActive = b.threadId === activeId ? 0 : 1
    if (aActive !== bActive) return aActive - bActive
    const aRole = a.role === 'overseer' ? 0 : 1
    const bRole = b.role === 'overseer' ? 0 : 1
    if (aRole !== bRole) return aRole - bRole
    return a.title.localeCompare(b.title)
  })
}

export type MoodPickerEntry = {
  id: string
  label: string
  highEnergy: boolean
}

/** Mood grid entries from showcase (labels) filtered to shipped clip moods. */
export function buildMoodPickerEntries(
  moods: ReadonlyArray<string>,
  showcase: ReadonlyArray<{ id: string; label: string; highEnergy: boolean }>,
): MoodPickerEntry[] {
  const byId = new Map(showcase.map((e) => [e.id, e]))
  return moods.map((id) => {
    const hit = byId.get(id)
    return {
      id,
      label: hit?.label ?? id.charAt(0).toUpperCase() + id.slice(1),
      highEnergy: Boolean(hit?.highEnergy),
    }
  })
}
