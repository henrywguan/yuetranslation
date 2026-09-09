import type {
  ConversationTurn,
  Entitlement,
  HouseholdSummary,
  IncidentBannerSettings,
  Lang,
} from './types'
import { getAccessToken } from './auth'
import { captureDiagnostic } from './diagnostics'
import { guestDeviceHeaders } from './guestDevice'
import { messageFromApiBody } from './apiError'

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
    ...guestDeviceHeaders(),
    ...((init.headers as Record<string, string>) || {}),
  }
  if (WP_NONCE) headers['X-WP-Nonce'] = WP_NONCE
  const token = await getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  })
  if (!res.ok) {
    captureDiagnostic('api_error', `${path} ${res.status}`, res.status)
  }
  return res
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  throw new Error(messageFromApiBody(res.status, await res.text(), fallback))
}

export async function fetchHealth(): Promise<{
  engines: Record<string, boolean>
  entitlement: Entitlement
  incidentBanner?: IncidentBannerSettings | null
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
  romanization?: string
  sandhiHint?: string
  ipa?: string
  /** Wugniu for each alternatives entry (same order), Shanghainese only. */
  alternativeRomanizations?: string[]
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
  opts?: {
    includeAlternatives?: boolean
    signal?: AbortSignal
    /** Force Mexican Spanish register (details formalize). */
    register?: 'colloquial' | 'formal'
  },
): Promise<TranslateResponse> {
  const alts = Boolean(opts?.includeAlternatives)
  const register = opts?.register || ''
  const cacheKey = `${from}|${to}|${alts ? 1 : 0}|${register}|${text.trim()}`
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
      ...(opts?.register ? { register: opts.register } : {}),
    }),
  })
  if (!res.ok) await throwApiError(res, 'Translation failed')
  const data = (await res.json()) as TranslateResponse
  rememberTranslate(cacheKey, data)
  return data
}

export async function fetchBreakdown(
  text: string,
  opts?: { lang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi' },
): Promise<{
  characters: { char: string; jyutping: string | null; meaning: string }[]
  engine: string
  lang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi'
}> {
  const res = await apiFetch('/breakdown', {
    method: 'POST',
    body: JSON.stringify({ text, ...(opts?.lang ? { lang: opts.lang } : {}) }),
  })
  if (!res.ok) await throwApiError(res, 'Breakdown failed')
  return res.json()
}

export type DictionaryEntry = {
  lemma: string
  lang: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi'
  pronunciation?: string
  senses: { gloss: string; pos?: string; note?: string }[]
  examples: { text: string; translation?: string; note?: string }[]
  usageNotes: string[]
  media: { type: 'gif'; url: string; previewUrl?: string; alt?: string; source: string }[]
  provenance: string[]
  engine: 'offline' | 'openai' | 'mixed'
}

export async function fetchDetailsEnrich(input: {
  text: string
  lang: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi'
  contextText?: string
  contextLang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi'
  wantMedia?: boolean
}): Promise<DictionaryEntry> {
  const res = await apiFetch('/details/enrich', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!res.ok) await throwApiError(res, 'Dictionary details failed')
  const data = (await res.json()) as { entry: DictionaryEntry }
  return data.entry
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
  from: 'en' | 'zh' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi'
  to: 'en' | 'zh' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi'
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
  target?: 'en' | 'zh' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi'
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
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    throw Object.assign(new Error(data.message || 'Voice playback failed.'), {
      code: res.status,
      entitlement: (data as { entitlement?: unknown }).entitlement,
    })
  }
  return res.blob()
}

export async function saveTtsVoicePrefs(patch: {
  ttsVoiceYue?: string
  ttsVoiceEn?: string
  ttsVoiceCmn?: string
  ttsVoiceTl?: string
  ttsVoiceEs?: string
  ttsVoiceVi?: string
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

export async function saveAutoSpeakPref(
  autoSpeak: boolean,
): Promise<{ prefs: Entitlement['prefs']; entitlement?: Entitlement }> {
  const res = await apiFetch('/prefs/auto-speak', {
    method: 'PATCH',
    body: JSON.stringify({ autoSpeak }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Failed to save Auto-speak'), {
      code: res.status,
      entitlement: data.entitlement,
    })
  }
  return data
}

export async function savePrimaryLangPref(
  primaryLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi',
): Promise<{ prefs: Entitlement['prefs']; entitlement?: Entitlement }> {
  const res = await apiFetch('/prefs/primary-lang', {
    method: 'PATCH',
    body: JSON.stringify({ primaryLang }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Failed to save primary language'), {
      code: res.status,
      entitlement: data.entitlement,
    })
  }
  return data
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

export async function fetchAccountHistory(): Promise<ConversationTurn[] | null> {
  const res = await apiFetch('/history')
  if (res.status === 401) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load history')
  }
  return Array.isArray(data.turns) ? (data.turns as ConversationTurn[]) : []
}

export async function putAccountHistory(turns: ConversationTurn[]): Promise<void> {
  const res = await apiFetch('/history', {
    method: 'PUT',
    body: JSON.stringify({ turns }),
  })
  if (res.status === 401) return
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to save history')
  }
}
