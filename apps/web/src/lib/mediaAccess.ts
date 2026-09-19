/** Microphone / camera / secure-context helpers. */

import { agentDebugLog } from './agentDebugLog'

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

export function canUseCamera(): boolean {
  return canUseMicrophone()
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
  // #region agent log
  agentDebugLog('A', 'mediaAccess.ts:unlockMicrophone:entry', 'unlockMicrophone called', {
    canUse: canUseMicrophone(),
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : null,
    protocol: typeof location !== 'undefined' ? location.protocol : null,
    host: typeof location !== 'undefined' ? location.hostname : null,
    displayMode:
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(display-mode: standalone)').matches
          ? 'standalone'
          : 'browser'
        : null,
    permState:
      typeof navigator !== 'undefined' && navigator.permissions
        ? 'queryable'
        : 'no-permissions-api',
  })
  // #endregion
  if (!canUseMicrophone()) {
    // #region agent log
    agentDebugLog('D', 'mediaAccess.ts:unlockMicrophone:blocked', 'canUseMicrophone false', {
      micBlocked: micBlockedMessage(),
    })
    // #endregion
    return null
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    // #region agent log
    agentDebugLog('A', 'mediaAccess.ts:unlockMicrophone:ok', 'getUserMedia granted', {
      tracks: stream.getAudioTracks().map((t) => ({
        label: t.label ? '(set)' : '',
        readyState: t.readyState,
        enabled: t.enabled,
        muted: t.muted,
      })),
    })
    // #endregion
    return stream
  } catch (err) {
    // #region agent log
    agentDebugLog('A', 'mediaAccess.ts:unlockMicrophone:fail', 'getUserMedia failed', {
      name: err instanceof Error ? err.name : 'unknown',
      message: err instanceof Error ? err.message : String(err),
    })
    // #endregion
    return null
  }
}

/** Rear-facing camera when available (phone); user-facing fallback on desktop. */
export async function unlockCamera(): Promise<MediaStream | null> {
  if (!canUseCamera()) return null
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      })
    } catch {
      return null
    }
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

export function cameraBlockedMessage(): string | null {
  if (canUseCamera()) return null
  const mic = micBlockedMessage()
  if (mic) return mic.replace(/Microphone/g, 'Camera').replace(/mic/g, 'camera')
  return 'Camera is unavailable in this browser.'
}
