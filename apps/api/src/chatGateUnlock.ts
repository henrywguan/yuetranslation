/**
 * Owner-fallback chat unlock — opaque HMAC session after proving a key sequence.
 * Grants Family-equivalent DeepSeek Chat only (not full Family billing).
 * True secrecy is impossible client-side; this is practical hardening + server verify.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from './auth.js'
import {
  addDeepseekChatTurns,
  canUseDeepseekChat,
  deepseekChatTurnLimit,
  getDeepseekChatTurns,
} from './deepseekChat.js'
import { env } from './env.js'
import { resolveEntitlement } from './entitlements.js'
import { allowIpRateOrReject, allowUserRateOrReject, clientIp } from './guestRateLimit.js'
import type { GuestRequest } from './guest.js'

/** sha256("ArrowUp|…|KeyA") — sequence never stored as plaintext codes here. */
const SEQ_DIGEST_HEX =
  'd22a4df7b8813bec0669fb233dafee7bc7abe426c9281e8f7ea873263072537c'

const GATE_HEADER = 'x-yue-chat-gate'
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const CHALLENGE_TTL_MS = 1000 * 60 * 5

type Challenge = { exp: number }
const challenges = new Map<string, Challenge>()

/** Best-effort Family turn meter for anonymous gate subjects (no auth.users row). */
const gateTurnMonths = new Map<string, { month: string; count: number }>()

export type ChatCaller = {
  userId: string
  plan: string
  isAdmin: boolean
  viaGate: boolean
  upgradeUrl?: string
}

function gateSecret(): Buffer {
  const raw = (
    env.chatGateSecret ||
    env.chatSecretsKey ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'yue-dev-chat-gate'
  ).trim()
  return createHash('sha256').update(`cg1:${raw}`).digest()
}

function b64url(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
  return b.toString('base64url')
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, 'base64url')
}

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}_${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function pruneChallenges(now = Date.now()) {
  for (const [k, v] of challenges) {
    if (v.exp <= now) challenges.delete(k)
  }
}

function readGateHeader(req: AuthedRequest): string {
  const raw = req.headers[GATE_HEADER]
  if (typeof raw === 'string') return raw.trim()
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim()
  return ''
}

type GatePayload = { v: 1; sub: string; scope: 'fc'; iat: number; exp: number }

function signPayload(payload: GatePayload): string {
  const body = b64url(JSON.stringify(payload))
  const sig = createHmac('sha256', gateSecret()).update(body).digest()
  return `v1.${body}.${b64url(sig)}`
}

export function verifyChatGateToken(token: string): GatePayload | null {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return null
  const [, body, sig] = parts
  if (!body || !sig) return null
  let expected: Buffer
  try {
    expected = createHmac('sha256', gateSecret()).update(body).digest()
    const got = fromB64url(sig)
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null
  } catch {
    return null
  }
  try {
    const parsed = JSON.parse(fromB64url(body).toString('utf8')) as GatePayload
    if (parsed?.v !== 1 || parsed.scope !== 'fc' || typeof parsed.sub !== 'string') return null
    if (!parsed.sub || parsed.sub.length > 80) return null
    if (typeof parsed.exp !== 'number' || parsed.exp * 1000 <= Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

function subjectFor(req: GuestRequest): string {
  if (req.auth?.userId) return `u:${req.auth.userId}`
  if (req.guestId) return `g:${req.guestId}`
  return `ip:${clientIp(req)}`
}

/** GET /api/chat/gate/challenge */
export function getChatGateChallenge(req: AuthedRequest, res: Response) {
  if (!allowIpRateOrReject(req, res, 'chatGateChallenge', env.chatGateChallengeRlPerMin)) return
  pruneChallenges()
  const nonce = b64url(randomBytes(18))
  const exp = Date.now() + CHALLENGE_TTL_MS
  challenges.set(nonce, { exp })
  res.json({ n: nonce, exp })
}

const UnlockBody = z.object({
  n: z.string().trim().min(8).max(64),
  /** sha256 hex of `${nonce}:${sequenceJoined}` */
  p: z.string().trim().regex(/^[a-f0-9]{64}$/i),
})

/** POST /api/chat/gate/unlock */
export function postChatGateUnlock(req: GuestRequest, res: Response) {
  if (!allowIpRateOrReject(req, res, 'chatGateUnlock', env.chatGateUnlockRlPerMin)) return
  pruneChallenges()

  const parsed = UnlockBody.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid unlock payload.', code: 'chat_gate_invalid' })
    return
  }

  const { n, p } = parsed.data
  const ch = challenges.get(n)
  challenges.delete(n)
  if (!ch || ch.exp <= Date.now()) {
    res.status(400).json({ message: 'Challenge expired.', code: 'chat_gate_challenge_expired' })
    return
  }

  const expectedProof = createHash('sha256')
    .update(`${n}:${SEQ_DIGEST_HEX}`)
    .digest('hex')

  // Client sends sha256(nonce + ":" + sha256(sequence)). Compare to server digest chain.
  const got = Buffer.from(p.toLowerCase())
  const want = Buffer.from(expectedProof)
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    res.status(403).json({ message: 'Unlock failed.', code: 'chat_gate_denied' })
    return
  }

  const now = Math.floor(Date.now() / 1000)
  const payload: GatePayload = {
    v: 1,
    sub: subjectFor(req),
    scope: 'fc',
    iat: now,
    exp: now + Math.floor(TOKEN_TTL_MS / 1000),
  }
  const token = signPayload(payload)
  res.json({
    ok: true,
    token,
    exp: payload.exp,
    plan: 'family',
    scope: 'chat',
  })
}

function getGateTurns(sub: string): number {
  const month = monthKey()
  const row = gateTurnMonths.get(sub)
  if (!row || row.month !== month) return 0
  return row.count
}

function addGateTurns(sub: string, turns = 1): number {
  const month = monthKey()
  const row = gateTurnMonths.get(sub)
  if (!row || row.month !== month) {
    const count = Math.max(0, turns)
    gateTurnMonths.set(sub, { month, count })
    return count
  }
  row.count += Math.max(0, turns)
  return row.count
}

/**
 * Resolve Family/Business/admin auth, or a valid owner-fallback gate token.
 * Gate grants Family-equivalent chat access only.
 */
export async function resolveChatCaller(
  req: GuestRequest,
  res: Response,
): Promise<ChatCaller | null> {
  if (req.auth?.userId) {
    const entitlement = await resolveEntitlement(req.auth)
    if (entitlement.disabled) {
      res.status(403).json({ message: 'Account disabled.', code: 'account_disabled' })
      return null
    }
    if (canUseDeepseekChat(entitlement.plan, entitlement.isAdmin)) {
      return {
        userId: req.auth.userId,
        plan: entitlement.plan,
        isAdmin: entitlement.isAdmin,
        viaGate: false,
        upgradeUrl: entitlement.upgradeUrl,
      }
    }
  }

  const token = readGateHeader(req)
  const payload = token ? verifyChatGateToken(token) : null
  if (payload) {
    // Prefer durable auth user id for metering when signed in (Free + gate).
    const userId = req.auth?.userId || `gate:${payload.sub}`
    return {
      userId,
      plan: 'family',
      isAdmin: false,
      viaGate: true,
      upgradeUrl: undefined,
    }
  }

  if (!req.auth?.userId) {
    res.status(401).json({ message: 'Sign in required.', code: 'chat_auth_required' })
    return null
  }

  const entitlement = await resolveEntitlement(req.auth)
  res.status(403).json({
    message: 'DeepSeek Chat is included with Family and Business.',
    code: 'chat_plan_required',
    upgradeUrl: entitlement.upgradeUrl,
  })
  return null
}

export async function enforceChatCallerQuota(
  res: Response,
  caller: ChatCaller,
): Promise<boolean> {
  const turnLimit = deepseekChatTurnLimit(caller.plan, caller.isAdmin)
  if (!(turnLimit > 0) || env.openMode) return true

  if (caller.viaGate && caller.userId.startsWith('gate:')) {
    const used = getGateTurns(caller.userId)
    if (used >= turnLimit) {
      res.status(402).json({
        message: 'Monthly DeepSeek Chat limit reached.',
        code: 'chat_quota_exhausted',
        used,
        limit: turnLimit,
      })
      return false
    }
    return true
  }

  const used = await getDeepseekChatTurns(caller.userId)
  if (used >= turnLimit) {
    res.status(402).json({
      message: 'Monthly DeepSeek Chat limit reached.',
      code: 'chat_quota_exhausted',
      used,
      limit: turnLimit,
      upgradeUrl: caller.upgradeUrl,
    })
    return false
  }
  return true
}

export function recordChatCallerTurn(caller: ChatCaller): void {
  if (caller.viaGate && caller.userId.startsWith('gate:')) {
    addGateTurns(caller.userId, 1)
    return
  }
  void addDeepseekChatTurns(caller.userId, 1)
}

export function allowChatCallerRate(
  res: Response,
  caller: ChatCaller,
  bucket: string,
  limit: number,
): boolean {
  return allowUserRateOrReject(res, caller.userId, bucket, limit)
}

/** Test helpers */
export function resetChatGateStateForTests() {
  challenges.clear()
  gateTurnMonths.clear()
}

export function __testSignGateToken(sub: string, ttlSec = 3600): string {
  const now = Math.floor(Date.now() / 1000)
  return signPayload({ v: 1, sub, scope: 'fc', iat: now, exp: now + ttlSec })
}

export { GATE_HEADER, SEQ_DIGEST_HEX, getGateTurns, addGateTurns }
