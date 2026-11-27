/**
 * Challenge → proof → opaque gate token for #/chat Family-equivalent access.
 */
import { guestDeviceHeaders } from './guestDevice'
import { saveChatGateSession } from './chatGateSession'
import { sanitizeApiBase } from './safeUrl'

function apiBase(): string {
  const fallback = (import.meta.env.VITE_API_BASE as string) || '/api'
  if (typeof window === 'undefined') return fallback
  const fromQuery = new URLSearchParams(window.location.search).get('api')
  return sanitizeApiBase(fromQuery, fallback, window.location.origin).replace(/\/$/, '')
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const dig = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Prove the quiet chord to the API and persist the opaque session token. */
export async function redeemChatGateChord(joinedCodes: string): Promise<boolean> {
  const base = apiBase()
  const challengeRes = await fetch(`${base}/chat/gate/challenge`, {
    credentials: 'include',
    headers: { ...guestDeviceHeaders() },
  })
  if (!challengeRes.ok) return false
  const challenge = (await challengeRes.json()) as { n?: string }
  if (!challenge.n) return false

  const seqDigest = await sha256Hex(joinedCodes)
  const proof = await sha256Hex(`${challenge.n}:${seqDigest}`)

  const unlockRes = await fetch(`${base}/chat/gate/unlock`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...guestDeviceHeaders(),
    },
    body: JSON.stringify({ n: challenge.n, p: proof }),
  })
  if (!unlockRes.ok) return false
  const body = (await unlockRes.json()) as { token?: string; exp?: number }
  if (!body.token || typeof body.exp !== 'number') return false
  saveChatGateSession(body.token, body.exp)
  return true
}
