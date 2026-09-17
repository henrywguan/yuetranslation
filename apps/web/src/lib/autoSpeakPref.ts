const STORAGE_KEY = 'yue-auto-speak'

/**
 * Device cache so Auto-speak survives reloads before entitlement hydrates.
 * Default OFF — Solo / Conversation Auto-speak is a separate Family opt-in.
 * Harbor Quest always auto-plays via `speakHarborTts` (not this pref).
 */
export function readLocalAutoSpeak(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeLocalAutoSpeak(on: boolean) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}
