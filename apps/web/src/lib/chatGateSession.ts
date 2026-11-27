/**
 * Opaque #/chat gate session (Family-equivalent). Server HMAC token in localStorage —
 * not a plaintext “grant Family” flag.
 */
const STORAGE_KEY = 'yue.ds.cg.v1'
const EVENT = 'yue-chat-gate'

export const CHAT_GATE_HEADER = 'X-Yue-Chat-Gate'

type Stored = { token: string; exp: number }

function readStored(): Stored | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Stored
    if (!parsed?.token || typeof parsed.exp !== 'number') return null
    if (parsed.exp * 1000 <= Date.now() + 5_000) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function getChatGateToken(): string | null {
  return readStored()?.token ?? null
}

export function hasChatGateSession(): boolean {
  return Boolean(getChatGateToken())
}

export function saveChatGateSession(token: string, exp: number): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, exp }))
  } catch {
    /* quota / private mode */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function clearChatGateSession(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeChatGateSession(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) cb()
  }
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

export function chatGateHeaders(): Record<string, string> {
  const token = getChatGateToken()
  return token ? { [CHAT_GATE_HEADER]: token } : {}
}
