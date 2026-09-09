/**
 * Browser Web Push subscribe helpers for the installed / HTTPS PWA.
 * iOS: only works from a Home Screen web app (16.4+); request permission
 * before any await so WebKit keeps the user gesture.
 */
import { getAccessToken } from './auth'
import { resolveApiBase } from './api'
import { isDisplayStandalone } from './pwaInstall'

const LS_ENABLED = 'yue.push.enabled'
const LS_ENDPOINT = 'yue.push.endpoint'

export type PushPublicConfig = {
  configured: boolean
  publicKey: string | null
  subject: string | null
}

export type PushCapability = {
  supported: boolean
  standalone: boolean
  /** iPhone/iPad Safari tab — PushManager missing until Add to Home Screen. */
  needsIosInstall: boolean
}

let cachedPushConfig: PushPublicConfig | null = null
let cachedPushConfigAt = 0

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** Safari wants a plain ArrayBuffer for applicationServerKey (not a Uint8Array view). */
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new ArrayBuffer(raw.length)
  const view = new Uint8Array(out)
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function pushCapability(): PushCapability {
  const hasSw = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  const hasPush = typeof window !== 'undefined' && 'PushManager' in window
  const hasNotification = typeof window !== 'undefined' && 'Notification' in window
  const standalone = isDisplayStandalone()
  const ios = isIosDevice()
  return {
    supported: hasSw && hasPush && hasNotification,
    standalone,
    needsIosInstall: ios && !standalone && hasSw && !hasPush,
  }
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

export function isPushOptIn(): boolean {
  try {
    return localStorage.getItem(LS_ENABLED) === '1'
  } catch {
    return false
  }
}

export function setPushOptIn(on: boolean) {
  try {
    localStorage.setItem(LS_ENABLED, on ? '1' : '0')
  } catch {
    // ignore
  }
}

export async function fetchPushConfig(force = false): Promise<PushPublicConfig> {
  const now = Date.now()
  if (!force && cachedPushConfig && now - cachedPushConfigAt < 5 * 60 * 1000) {
    return cachedPushConfig
  }
  const res = await fetch(`${resolveApiBase()}/push/config`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Push config failed')
  cachedPushConfig = data as PushPublicConfig
  cachedPushConfigAt = now
  return cachedPushConfig
}

/** Warm the VAPID public key so opt-in can request permission before any await. */
export function prefetchPushConfig(): void {
  if (!pushSupported() && !pushCapability().needsIosInstall) return
  void fetchPushConfig().catch(() => {
    // ignore warm failures
  })
}

async function postSubscribe(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  const token = await getAccessToken()
  const res = await fetch(`${resolveApiBase()}/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      expirationTime: json.expirationTime ?? null,
      locale: navigator.language || '',
      platform: navigator.platform || '',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Subscribe failed')
  try {
    localStorage.setItem(LS_ENDPOINT, json.endpoint || '')
  } catch {
    // ignore
  }
}

async function postUnsubscribe(endpoint: string, deleteRow = false): Promise<void> {
  const token = await getAccessToken()
  await fetch(`${resolveApiBase()}/push/unsubscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ endpoint, deleteRow }),
  })
}

export async function enablePushNotifications(): Promise<{ ok: true } | { ok: false; message: string }> {
  const cap = pushCapability()
  if (cap.needsIosInstall) {
    return {
      ok: false,
      message:
        'On iPhone, add JyutTranslate to your Home Screen first, open it from that icon, then enable notifications.',
    }
  }
  if (!pushSupported()) {
    return { ok: false, message: 'Push is not supported in this browser.' }
  }

  // iOS WebKit: request permission while the tap gesture is still alive.
  // Do not await network before this when permission is still "default".
  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') {
    setPushOptIn(false)
    return { ok: false, message: 'Notification permission was not granted.' }
  }

  const cfg = await fetchPushConfig()
  if (!cfg.configured || !cfg.publicKey) {
    return { ok: false, message: 'Push is not configured on the server yet.' }
  }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(cfg.publicKey),
    })
  }
  await postSubscribe(sub)
  setPushOptIn(true)
  return { ok: true }
}

export async function disablePushNotifications(): Promise<void> {
  setPushOptIn(false)
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    const endpoint = sub?.endpoint || localStorage.getItem(LS_ENDPOINT) || ''
    if (sub) await sub.unsubscribe()
    if (endpoint) await postUnsubscribe(endpoint, true)
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LS_ENDPOINT)
  } catch {
    // ignore
  }
}

/** Re-sync subscription when the user already opted in (e.g. after login). */
export async function syncPushSubscriptionIfEnabled(): Promise<void> {
  prefetchPushConfig()
  if (!isPushOptIn() || !pushSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    const cfg = await fetchPushConfig()
    if (!cfg.configured || !cfg.publicKey) return
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(cfg.publicKey),
      })
    }
    await postSubscribe(sub)
  } catch {
    // ignore sync errors
  }
}

export function listenPushNavigate(handler: (hashUrl: string) => void): () => void {
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; url?: string } | null
    if (data?.type === 'yue:push-navigate' && typeof data.url === 'string') {
      handler(data.url)
    }
  }
  navigator.serviceWorker?.addEventListener('message', onMessage)
  return () => navigator.serviceWorker?.removeEventListener('message', onMessage)
}
