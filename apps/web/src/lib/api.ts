import type {
  ConversationTurn,
  Entitlement,
  HouseholdSummary,
  IncidentBannerSettings,
  Lang,
} from './types'
import type { PrimaryLang } from './primaryLanguagePref'
import { getAccessToken } from './auth'
import { captureDiagnostic } from './diagnostics'
import { guestDeviceHeaders } from './guestDevice'
import { messageFromApiBody } from './apiError'
import { hasOfflinePack, offlineTranslate } from './offlineLexicon'
import { sanitizeApiBase, sanitizeLeaveUrl } from './safeUrl'

export function resolveApiBase(): string {
  const fallback = (import.meta.env.VITE_API_BASE as string) || '/api'
  if (typeof window === 'undefined') return fallback
  const fromQuery = new URLSearchParams(window.location.search).get('api')
  // Never allow ?api=https://evil — that exfiltrates Bearer tokens.
  return sanitizeApiBase(fromQuery, fallback, window.location.origin)
}

function resolveWpNonce(): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('nonce') || ''
}

export function getUpgradeUrl(): string {
  if (typeof window === 'undefined') return ''
  const raw = new URLSearchParams(window.location.search).get('upgrade') || ''
  return sanitizeLeaveUrl(raw, window.location.origin) || ''
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
  // A hung health read used to leave PlanChip on Connecting with no second try.
  const signal =
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(12_000)
      : undefined
  const res = await apiFetch('/health', signal ? { signal } : {})
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

  const tryOffline = (): TranslateResponse | null => {
    if (!hasOfflinePack()) return null
    const hit = offlineTranslate(from, to, text, alts)
    if (!hit?.text) return null
    return {
      text: hit.text,
      definition: hit.definition,
      definitions: hit.definitions,
      alternatives: hit.alternatives,
    }
  }

  // Prefer network; when offline / unreachable, use an installed dictionary pack.
  const offlineFirst =
    typeof navigator !== 'undefined' && navigator.onLine === false && (from === 'en' || from === 'yue')

  if (offlineFirst) {
    const local = tryOffline()
    if (local) {
      rememberTranslate(cacheKey, local)
      return local
    }
  }

  try {
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
    if (!res.ok) {
      const local = tryOffline()
      if (local) {
        rememberTranslate(cacheKey, local)
        return local
      }
      await throwApiError(res, 'Translation failed')
    }
    const data = (await res.json()) as TranslateResponse
    rememberTranslate(cacheKey, data)
    return data
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    if (err instanceof Error && err.name === 'AbortError') throw err
    const local = tryOffline()
    if (local) {
      rememberTranslate(cacheKey, local)
      return local
    }
    throw err
  }
}

export async function fetchBreakdown(
  text: string,
  opts?: { lang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl' },
): Promise<{
  characters: { char: string; jyutping: string | null; meaning: string }[]
  engine: string
  lang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
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
  lang: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
  /** Language senses/examples/usage were written in (Account Hub primary). */
  glossLang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
  pronunciation?: string
  senses: { gloss: string; pos?: string; note?: string }[]
  examples: { text: string; translation?: string; note?: string }[]
  usageNotes: string[]
  media: {
    type: 'emoji' | 'image' | 'gif'
    url?: string
    previewUrl?: string
    emoji?: string
    alt?: string
    source: string
  }[]
  provenance: string[]
  engine: 'offline' | 'openai' | 'mixed'
}

export async function fetchDetailsEnrich(input: {
  text: string
  lang: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
  contextText?: string
  contextLang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
  /** Account Hub primary — senses/examples/usage language. */
  glossLang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
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
  from: 'en' | 'zh' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
  to: 'en' | 'zh' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
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
  target?: 'en' | 'zh' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ceb' | 'ilo' | 'bcl'
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
  opts?: {
    loud?: boolean
    /** Structured beats. The server writes SSML. Never send markup here. */
    performance?: {
      delivery: string
      reaction: string
      phrase: string
      cue: string
    } | null
  },
): Promise<Blob | null> {
  const performance =
    opts?.performance?.phrase && opts.performance.delivery
      ? {
          delivery: opts.performance.delivery,
          reaction: opts.performance.reaction,
          phrase: opts.performance.phrase,
          cue: opts.performance.cue,
        }
      : null
  const res = await apiFetch('/tts', {
    method: 'POST',
    body: JSON.stringify({
      text,
      lang,
      ...(voice ? { voice } : {}),
      ...(opts?.loud ? { loud: true } : {}),
      ...(performance ? { performance } : {}),
    }),
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
  ttsVoiceEses?: string
  ttsVoiceVi?: string
  ttsVoiceTh?: string
  ttsVoiceLo?: string
  ttsVoiceKo?: string
  ttsVoiceJa?: string
  ttsVoiceId?: string
  ttsVoiceMs?: string
  ttsVoicePt?: string
  ttsVoiceFr?: string
  ttsVoiceHi?: string
  ttsVoiceKm?: string
  ttsVoiceMy?: string
  ttsVoiceJv?: string
  ttsVoiceIt?: string
  ttsVoiceDe?: string
  ttsVoiceNl?: string
  ttsVoiceAr?: string
  ttsVoiceArsa?: string
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
  primaryLang: PrimaryLang,
): Promise<{ prefs: Entitlement['prefs']; entitlement?: Entitlement }> {
  // keepalive so a quick app switch / kill mid-translate still finishes the PATCH.
  const res = await apiFetch('/prefs/primary-lang', {
    method: 'PATCH',
    body: JSON.stringify({ primaryLang }),
    keepalive: true,
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

export async function fetchHousehold(): Promise<{ household: HouseholdSummary | null }> {
  const res = await apiFetch('/household')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Could not load household'), {
      code: data.code || res.status,
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

export type HarborQuestProgressPayload = {
  cleared: string[]
  stepCursor: Record<string, number>
  correctCount: number
  /** Arena gold from Match the Definition (lifetime). */
  gold: number
  /** Experience points (lifetime). */
  xp: number
  /** Times each mission/pier has been completed. */
  missionClears: Record<string, number>
  /** Ferry coins — always persisted in Supabase jsonb. */
  coins: number
  /** Owned gear ids — always persisted in Supabase jsonb. */
  owned: string[]
  /** Equipped look — always persisted in Supabase jsonb. */
  look: {
    hat: string
    top: string
    bottom: string
    shoes: string
    hand: string
  }
  /** Save Shack stamp (ms) — always persisted in Supabase jsonb. */
  lastSavedAt: number
}

export async function fetchHarborQuestProgress(): Promise<HarborQuestProgressPayload | null> {
  const res = await apiFetch('/harbor-quest')
  if (res.status === 401) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load Harbor Quest progress')
  }
  const progress = data.progress
  if (!progress || typeof progress !== 'object') {
    return {
      cleared: [],
      stepCursor: {},
      correctCount: 0,
      gold: 0,
      xp: 0,
      missionClears: {},
      coins: 40,
      owned: ['hat-straw', 'top-harbor', 'bottom-travel', 'shoes-leather', 'hand-none'],
      look: {
        hat: 'hat-straw',
        top: 'top-harbor',
        bottom: 'bottom-travel',
        shoes: 'shoes-leather',
        hand: 'hand-none',
      },
      lastSavedAt: 0,
    }
  }
  return progress as HarborQuestProgressPayload
}

export async function putHarborQuestProgress(progress: HarborQuestProgressPayload): Promise<void> {
  const res = await apiFetch('/harbor-quest', {
    method: 'PUT',
    body: JSON.stringify({ progress }),
  })
  if (res.status === 401) return
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to save Harbor Quest progress')
  }
}

export type HarborGiftKind = 'lantern' | 'title'

export type HarborGiftResult = {
  ok: true
  progress: HarborQuestProgressPayload
  householdMate: boolean
  giverTitleAward: string | null
  receiverTitleAward: string | null
}

/** Cosmetic lantern / title gift to another sailor (server-authoritative). */
export async function postHarborQuestGift(input: {
  toUserId: string
  kind: HarborGiftKind
  itemId: string
}): Promise<HarborGiftResult> {
  const res = await apiFetch('/harbor-quest/gift', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || 'Gift failed')
  }
  return data as HarborGiftResult
}

export type HarborLeaderboardEntry = {
  rank: number
  userId: string
  displayName: string
  xp: number
  gold: number
  correctCount: number
  clearedCount: number
  isYou?: boolean
}

export type HarborLeaderboardPayload = {
  entries: HarborLeaderboardEntry[]
  me: HarborLeaderboardEntry | null
  limit: number
}

/** Global Harbor Quest ranks (public; signed-in callers get `me` / `isYou`). */
export async function fetchHarborQuestLeaderboard(
  limit = 25,
): Promise<HarborLeaderboardPayload> {
  const res = await apiFetch(`/harbor-quest/leaderboard?limit=${Math.min(50, Math.max(1, limit))}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load Harbor Quest leaderboard')
  }
  const entries = Array.isArray(data.entries) ? (data.entries as HarborLeaderboardEntry[]) : []
  const me =
    data.me && typeof data.me === 'object' ? (data.me as HarborLeaderboardEntry) : null
  const lim =
    typeof data.limit === 'number' && Number.isFinite(data.limit) ? Math.floor(data.limit) : limit
  return { entries, me, limit: lim }
}

export type PracticePartnerLeaderboardEntry = {
  rank: number
  userId: string
  displayName: string
  xp: number
  bestStreak: number
  totalPasses: number
  isYou?: boolean
}

export type PracticePartnerLeaderboardPayload = {
  entries: PracticePartnerLeaderboardEntry[]
  me: PracticePartnerLeaderboardEntry | null
  limit: number
}

/** Global Practice Partner ranks (public; signed-in callers get `me` / `isYou`). */
export async function fetchPracticePartnerLeaderboard(
  limit = 25,
): Promise<PracticePartnerLeaderboardPayload> {
  const res = await apiFetch(
    `/practice-partner/leaderboard?limit=${Math.min(50, Math.max(1, limit))}`,
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load Practice Partner leaderboard')
  }
  const entries = Array.isArray(data.entries)
    ? (data.entries as PracticePartnerLeaderboardEntry[])
    : []
  const me =
    data.me && typeof data.me === 'object' ? (data.me as PracticePartnerLeaderboardEntry) : null
  const lim =
    typeof data.limit === 'number' && Number.isFinite(data.limit) ? Math.floor(data.limit) : limit
  return { entries, me, limit: lim }
}

/** Push this browser's lifetime totals. The server keeps the higher numbers. */
export async function putPracticePartnerLeaderboard(score: {
  xp: number
  bestStreak: number
  totalPasses: number
}): Promise<void> {
  const res = await apiFetch('/practice-partner/leaderboard', {
    method: 'PUT',
    body: JSON.stringify(score),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Could not sync Practice Partner score')
  }
}
