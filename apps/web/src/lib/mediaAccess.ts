/** Microphone / secure-context helpers for live speech. */

export function canUseMicrophone(): boolean {
  try {
    return Boolean(
      typeof window !== 'undefined' &&
        window.isSecureContext &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function',
    )
  } catch {
    return false
  }
}

/** iPhone / iPad (including Chrome on iOS — all use WebKit). */
export function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  // iPadOS 13+ desktop UA
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * Request mic access inside a user gesture (pointerdown).
 * Critical on iOS: later awaits (Azure token / SDK import) lose the gesture,
 * and getUserMedia / Web Speech then fail silently.
 */
export async function unlockMicrophone(): Promise<MediaStream | null> {
  if (!canUseMicrophone()) return null
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
  } catch {
    return null
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  try {
    stream?.getTracks().forEach((t) => t.stop())
  } catch {
    /* ignore */
  }
}

/**
 * Friendly copy when the mic API is missing — common on iPhone over
 * http://192.168.x.x (non-secure context). Returns null when mic looks OK.
 */
export function micBlockedMessage(): string | null {
  if (canUseMicrophone()) return null

  const host = typeof location !== 'undefined' ? location.hostname : ''
  const proto = typeof location !== 'undefined' ? location.protocol : ''
  const isLanIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
  const insecure = proto === 'http:' && host !== 'localhost' && host !== '127.0.0.1'

  if (insecure || isLanIp) {
    return (
      'Microphone needs HTTPS on this device. ' +
      'Safari blocks the mic on http:// LAN addresses (e.g. 192.168.x.x). ' +
      'Use https://, or open the app on this phone via localhost / a tunnel.'
    )
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Microphone needs a secure context (HTTPS or localhost).'
  }

  return 'Microphone is unavailable in this browser.'
}
