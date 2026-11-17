/**
 * Feature flag for the assistant-ui (#/chat) shell.
 * Default OFF — classic ChatPage stays until Henry flips this.
 *
 * Enable: localStorage `yue-chat-aui-v1=1`, or `?aui=1` before the hash.
 * Disable: `yue-chat-aui-v1=0`, or `?aui=0`.
 */

export const CHAT_AUI_FLAG_KEY = 'yue-chat-aui-v1'

function readQueryOverride(): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const q = new URLSearchParams(window.location.search)
    const v = q.get('aui')
    if (v === '1' || v === 'true') return true
    if (v === '0' || v === 'false') return false
  } catch {
    /* ignore */
  }
  return null
}

export function isChatAuiEnabled(): boolean {
  const fromQuery = readQueryOverride()
  if (fromQuery != null) {
    // Persist query override so subsequent navigations keep the shell.
    try {
      localStorage.setItem(CHAT_AUI_FLAG_KEY, fromQuery ? '1' : '0')
    } catch {
      /* ignore */
    }
    return fromQuery
  }
  try {
    return localStorage.getItem(CHAT_AUI_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function setChatAuiEnabled(on: boolean): void {
  try {
    localStorage.setItem(CHAT_AUI_FLAG_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}
