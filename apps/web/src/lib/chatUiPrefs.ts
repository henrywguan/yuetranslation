/**
 * Shared `#/chat` composer prefs (DeepThink / Search / Rich layout / Plugins).
 * Used by classic ChatPage and AUI ChatAuiRuntime.
 */

export const CHAT_THINK_KEY = 'yue-deepseek-chat-deepthink-v1'
export const CHAT_SEARCH_KEY = 'yue-deepseek-chat-search-v1'
export const CHAT_RICH_LAYOUT_KEY = 'yue-deepseek-chat-rich-layout-v1'
export const CHAT_PLUGINS_KEY = 'yue-deepseek-chat-plugins-v1'

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
