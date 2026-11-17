/**
 * #/chat shell cutover — assistant-ui is the default.
 *
 * Opt out (classic ChatPage): localStorage `yue-chat-aui-v1=0`, or `?aui=0`.
 * Force AUI: `?aui=1` (also clears a prior opt-out).
 *
 * Stock shadcn/Tailwind look is deferred — DeepSeek tokens stay for now.
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

/** True unless the user explicitly opted back to classic. */
export function isChatAuiEnabled(): boolean {
  const fromQuery = readQueryOverride()
  if (fromQuery != null) {
    try {
      localStorage.setItem(CHAT_AUI_FLAG_KEY, fromQuery ? '1' : '0')
    } catch {
      /* ignore */
    }
    return fromQuery
  }
  try {
    // Missing key → cutover default ON. Only an explicit `0` keeps classic.
    return localStorage.getItem(CHAT_AUI_FLAG_KEY) !== '0'
  } catch {
    return true
  }
}

export function setChatAuiEnabled(on: boolean): void {
  try {
    localStorage.setItem(CHAT_AUI_FLAG_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}
