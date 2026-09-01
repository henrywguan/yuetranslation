import type { Entitlement, HouseholdSummary, Lang } from './types'
import { getAccessToken } from './auth'
import { captureDiagnostic } from './diagnostics'

export function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    const fromQuery = new URLSearchParams(window.location.search).get('api')
    if (fromQuery) return fromQuery.replace(/\/$/, '')
  }
  return (import.meta.env.VITE_API_BASE as string) || '/api'
}

function resolveWpNonce(): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('nonce') || ''
}

export function getUpgradeUrl(): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('upgrade') || ''
}

const API_BASE = resolveApiBase()
const WP_NONCE = resolveWpNonce()

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) || {}),
  }
  if (WP_NONCE) headers['X-WP-Nonce'] = WP_NONCE
  const token = await getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: WP_NONCE ? 'include' : 'same-origin',
    ...init,
    headers,
  })
  if (!res.ok) {
    captureDiagnostic('api_error', `${path} ${res.status}`, res.status)
  }
  return res
}

export async function fetchHealth(): Promise<{
  engines: Record<string, boolean>
  entitlement: Entitlement
}> {
  const res = await apiFetch('/health')
  if (!res.ok) throw new Error('health failed')
  return res.json()
}

export async function fetchSpeechToken(): Promise<{ token: string; region: string } | null> {
  const res = await apiFetch('/speech-token')
  if (res.status === 401 || res.status === 402) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.message || data.code || 'Not allowed to use live speech'), {
      code: res.status,
      entitlement: data.data?.entitlement || data.entitlement,
    })
  }
  if (!res.ok) return null
  return res.json()
}

type TranslateResponse = {
  text: string
  definition?: string
  definitions?: string[]
  alternatives?: string[]
}

const TRANSLATE_CACHE_MAX = 64
const translateCache = new Map<string, TranslateResponse>()

function rememberTranslate(key: string, value: TranslateResponse) {
  if (translateCache.has(key)) translateCache.delete(key)
  translateCache.set(key, value)
  while (translateCache.size > TRANSLATE_CACHE_MAX) {
    const oldest = translateCache.keys().next().value
    if (oldest === undefined) break
    translateCache.delete(oldest)
  }
}

export async function translateText(
  text: string,
  from: Lang,
  to: Lang,
  opts?: { includeAlternatives?: boolean; signal?: AbortSignal },
): Promise<TranslateResponse> {
  const alts = Boolean(opts?.includeAlternatives)
  const cacheKey = `${from}|${to}|${alts ? 1 : 0}|${text.trim()}`
  const cached = translateCache.get(cacheKey)
  if (cached) return cached

  // API defaults/coerces to final — never request interim MT.
  const res = await apiFetch('/translate', {
    method: 'POST',
    signal: opts?.signal,
    body: JSON.stringify({
      text,
      from,
      to,
      includeAlternatives: alts,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as TranslateResponse
  rememberTranslate(cacheKey, data)
  return data
}

export async function fetchBreakdown(
  text: string,
): Promise<{ characters: { char: string; jyutping: string | null; meaning: string }[]; engine: string }> {
  const res = await apiFetch('/breakdown', {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function postHeartbeat(seconds = 15): Promise<Entitlement> {
  const res = await apiFetch('/usage/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ seconds }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.message || 'Heartbeat failed'), {
      code: res.status,
      entitlement: data.data?.entitlement || data.entitlement,
    })
  }
  return res.json()
}

export type CameraBox = { x: number; y: number; w: number; h: number }

export type CameraScanRegion = {
  id: string
  text: string
  translated: string
  from: 'en' | 'zh'
  to: 'en' | 'zh'
  box: CameraBox
  script: 'latin' | 'cjk' | 'mixed' | 'other'
  cacheHit: boolean
}

export type CameraScanResult = {
  regions: CameraScanRegion[]
  engine: string
  visionConfigured: boolean
  visionAuthFailed?: boolean
  translateMisses: number
  entitlement?: Entitlement
}

export async function postCameraHeartbeat(seconds = 15): Promise<Entitlement> {
  const res = await apiFetch('/usage/camera-heartbeat', {
    method: 'POST',
    body: JSON.stringify({ seconds }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.message || 'Camera heartbeat failed'), {
      code: res.status,
      entitlement: data.data?.entitlement || data.entitlement,
    })
  }
  return res.json()
}

export async function cameraScan(opts: {
  image: string
  boxes?: CameraBox[]
  target?: 'en' | 'zh'
  ocrOnly?: boolean
  /** PDF hybrid / Documents path — gated as docs, not camera translate metering. */
  forDocs?: boolean
}): Promise<CameraScanResult> {
  const res = await apiFetch('/camera/scan', {
    method: 'POST',
    body: JSON.stringify(opts),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.message || 'Camera scan failed'), {
      code: res.status,
      entitlement: data.entitlement,
    })
  }
  return res.json()
}

export async function fetchTtsAudio(
  text: string,
  lang: Lang,
  voice?: string | null,
): Promise<Blob | null> {
  const res = await apiFetch('/tts', {
    method: 'POST',
    body: JSON.stringify({ text, lang, ...(voice ? { voice } : {}) }),
  })
  if (!res.ok) return null
  return res.blob()
}

export async function saveTtsVoicePrefs(patch: {
  ttsVoiceYue?: string
  ttsVoiceEn?: string
}): Promise<{ prefs: Entitlement['prefs']; entitlement?: Entitlement }> {
  const res = await apiFetch('/prefs/tts-voices', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Failed to save voice preferences'), {
      code: res.status,
      entitlement: data.entitlement,
    })
  }
  return data
}

export async function fetchHousehold(): Promise<{ household: HouseholdSummary | null }> {
  const res = await apiFetch('/household')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load household')
  }
  return { household: data.household ?? null }
}

export async function sendHouseholdInvite(email: string): Promise<{
  inviteSent: true
  emailed: boolean
  acceptUrl: string
  invite: { id: string; email: string; createdAt: string; expiresAt: string }
  household: HouseholdSummary
  entitlement: Entitlement
}> {
  const res = await apiFetch('/household/invites', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Invite failed'), { code: data.code || res.status })
  }
  return data
}

export async function revokeHouseholdInvite(inviteId: string): Promise<{
  household: HouseholdSummary
  entitlement: Entitlement
}> {
  const res = await apiFetch(`/household/invites/${encodeURIComponent(inviteId)}`, {
    method: 'DELETE',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Could not revoke invite'), { code: data.code })
  }
  return data
}

export async function removeHouseholdMember(userId: string): Promise<{
  household: HouseholdSummary
  entitlement: Entitlement
}> {
  const res = await apiFetch(`/household/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Could not remove member'), { code: data.code })
  }
  return data
}

export async function acceptHouseholdInvite(token: string): Promise<{
  household: HouseholdSummary
  entitlement: Entitlement
}> {
  const res = await apiFetch('/household/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Could not accept invite'), { code: data.code })
  }
  return data
}

export async function saveUsername(
  username: string,
): Promise<{ prefs: Entitlement['prefs']; entitlement?: Entitlement }> {
  const res = await apiFetch('/prefs/username', {
    method: 'PATCH',
    body: JSON.stringify({ username }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Failed to save username'), {
      code: res.status,
      retryAfterMinutes: data.retryAfterMinutes,
      entitlement: data.entitlement,
    })
  }
  return data
}
