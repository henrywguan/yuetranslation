/**
 * Durable guest device id — survives HttpOnly cookie wipe and most IP/VPN changes.
 * Cleared only when the user wipes site data / uses a fresh private profile.
 */
const STORAGE_KEY = 'yue-guest-device-id'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older engines.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function getOrCreateGuestDeviceId(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)?.trim() || ''
    if (UUID_RE.test(existing)) return existing
    const next = randomUuid()
    window.localStorage.setItem(STORAGE_KEY, next)
    return next
  } catch {
    return null
  }
}

/** Header name must match apps/api `GUEST_DEVICE_HEADER`. */
export const GUEST_DEVICE_HEADER = 'X-Yue-Guest-Device'

export function guestDeviceHeaders(): Record<string, string> {
  const id = getOrCreateGuestDeviceId()
  return id ? { [GUEST_DEVICE_HEADER]: id } : {}
}
