import type { Entitlement, Lang } from './types'
import { getAccessToken } from './auth'

function resolveApiBase(): string {
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

  return fetch(`${API_BASE}${path}`, {
    credentials: WP_NONCE ? 'include' : 'same-origin',
    ...init,
    headers,
  })
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

export async function translateText(
  text: string,
  from: Lang,
  to: Lang,
  opts?: { includeAlternatives?: boolean },
): Promise<{
  text: string
  definition?: string
  definitions?: string[]
  alternatives?: string[]
  engine: string
  stage?: string
  meta?: {
    dictionaryHit: boolean
    scrubbed: boolean
    colloquialScore: number
    rewritten: boolean
    notes: string[]
  }
}> {
  // Always final — the app never requests interim machine translations.
  const res = await apiFetch('/translate', {
    method: 'POST',
    body: JSON.stringify({
      text,
      from,
      to,
      includeAlternatives: Boolean(opts?.includeAlternatives),
      stage: 'final',
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
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

export async function fetchTtsAudio(text: string, lang: Lang): Promise<Blob | null> {
  const res = await apiFetch('/tts', {
    method: 'POST',
    body: JSON.stringify({ text, lang }),
  })
  if (!res.ok) return null
  return res.blob()
}
