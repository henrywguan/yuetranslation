const STORAGE_KEY = 'yue-auto-speak'

/**
 * Device cache so Auto-speak survives reloads before entitlement hydrates.
 * Default ON (immersive learning) when the key has never been set.
 */
export function readLocalAutoSpeak(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === null) return true
    return v === '1'
  } catch {
    return true
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
