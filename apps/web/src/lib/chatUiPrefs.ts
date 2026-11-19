/**
 * Shared `#/chat` composer prefs (mode / DeepThink / Search / Rich layout / Plugins).
 * Used by classic ChatPage and AUI ChatAuiRuntime.
 */

/** Cursor-like Agent / Ask / Plan — capabilities (DeepThink/Search) stay under modes. */
export type ChatComposerMode = 'agent' | 'ask' | 'plan'

export const CHAT_MODE_KEY = 'yue-deepseek-chat-mode-v1'
export const CHAT_THINK_KEY = 'yue-deepseek-chat-deepthink-v1'
export const CHAT_SEARCH_KEY = 'yue-deepseek-chat-search-v1'
export const CHAT_RICH_LAYOUT_KEY = 'yue-deepseek-chat-rich-layout-v1'
export const CHAT_PLUGINS_KEY = 'yue-deepseek-chat-plugins-v1'

export const CHAT_COMPOSER_MODES: readonly ChatComposerMode[] = ['agent', 'ask', 'plan'] as const

export const CHAT_COMPOSER_MODE_LABEL: Record<ChatComposerMode, string> = {
  agent: 'Agent',
  ask: 'Ask',
  plan: 'Plan',
}

export function normalizeChatComposerMode(raw: unknown): ChatComposerMode {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'ask' || v === 'plan' || v === 'agent') return v
  return 'agent'
}

export function readChatComposerMode(fallback: ChatComposerMode = 'agent'): ChatComposerMode {
  try {
    return normalizeChatComposerMode(localStorage.getItem(CHAT_MODE_KEY) || fallback)
  } catch {
    return fallback
  }
}

export function writeChatComposerMode(mode: ChatComposerMode) {
  try {
    localStorage.setItem(CHAT_MODE_KEY, normalizeChatComposerMode(mode))
  } catch {
    /* ignore */
  }
}

/** Bound live DeepThink buffer mid-stream (full prune still runs on disk write). */
export const CHAT_LIVE_REASONING_KEEP = 24_000

export const CHAT_EMPTY_SUGGESTIONS = [
  'Explain quantum computing simply',
  'Draft a polite follow-up email',
  'Give me a 3-day city trip outline',
  'Help me debug this error message',
] as const

export function readChatFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return fallback
}

export function writeChatFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function readChatPluginIds(): string[] | null {
  try {
    const raw = localStorage.getItem(CHAT_PLUGINS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.map(String).filter(Boolean).slice(0, 16)
  } catch {
    return null
  }
}

export function writeChatPluginIds(ids: string[]) {
  try {
    localStorage.setItem(CHAT_PLUGINS_KEY, JSON.stringify(ids.slice(0, 16)))
  } catch {
    /* ignore */
  }
}
