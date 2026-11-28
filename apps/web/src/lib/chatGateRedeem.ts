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

export type ChatGateRedeemResult =
  | { ok: true }
  | { ok: false; message: string; code?: string }

async function readError(res: Response): Promise<{ message: string; code?: string }> {
  try {
    const body = (await res.json()) as { message?: string; code?: string }
    if (body?.message) return { message: body.message, code: body.code }
  } catch {
    /* ignore */
  }
  if (res.status === 429) return { message: 'Too many unlock attempts. Wait a minute and try again.', code: 'rate_limited' }
  if (res.status === 503) {
    return {
      message:
        'Chat gate unlock is not configured. Set YUE_CHAT_GATE_SECRET on Vercel, then redeploy.',
      code: 'chat_gate_misconfigured',
    }
  }
  return { message: 'Unlock failed. Try again.', code: 'chat_gate_failed' }
}

/** Prove the quiet chord to the API and persist the opaque session token. */
export async function redeemChatGateChord(joinedCodes: string): Promise<ChatGateRedeemResult> {
  try {
    const base = apiBase()
    const challengeRes = await fetch(`${base}/chat/gate/challenge`, {
      credentials: 'include',
      headers: { ...guestDeviceHeaders() },
    })
    if (!challengeRes.ok) {
      return { ok: false, ...(await readError(challengeRes)) }
    }
    const challenge = (await challengeRes.json()) as { n?: string; exp?: number; s?: string }
    if (!challenge.n || typeof challenge.exp !== 'number' || !challenge.s) {
      return {
        ok: false,
        message: 'Unlock challenge incomplete. Redeploy may still be rolling out — refresh and retry.',
        code: 'chat_gate_challenge_incomplete',
      }
    }

    const seqDigest = await sha256Hex(joinedCodes)
    const proof = await sha256Hex(`${challenge.n}:${seqDigest}`)

    const unlockRes = await fetch(`${base}/chat/gate/unlock`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...guestDeviceHeaders(),
      },
      body: JSON.stringify({ n: challenge.n, exp: challenge.exp, s: challenge.s, p: proof }),
    })
    if (!unlockRes.ok) {
      return { ok: false, ...(await readError(unlockRes)) }
    }
    const body = (await unlockRes.json()) as { token?: string; exp?: number }
    if (!body.token || typeof body.exp !== 'number') {
      return { ok: false, message: 'Unlock response incomplete.', code: 'chat_gate_bad_response' }
    }
    saveChatGateSession(body.token, body.exp)
    return { ok: true }
  } catch {
    return {
      ok: false,
      message: 'Could not reach unlock API. Check network and try again.',
      code: 'chat_gate_network',
    }
  }
}
