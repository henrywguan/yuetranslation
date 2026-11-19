import type { Request, Response } from 'express'
import { env } from './env.js'
import type { AuthedRequest } from './auth.js'

export type GuestRateBucket =
  | 'translate'
  | 'breakdown'
  | 'speechToken'
  | 'cameraScan'

type WindowState = { count: number; resetAt: number }

/** In-memory fixed windows — best-effort on multi-instance / serverless. */
const windows = new Map<string, WindowState>()

const WINDOW_MS = 60_000

function limitFor(bucket: GuestRateBucket): number {
  switch (bucket) {
    case 'translate':
      return env.guestRlTranslatePerMin
    case 'breakdown':
      return env.guestRlBreakdownPerMin
    case 'speechToken':
      return env.guestRlSpeechTokenPerMin
    case 'cameraScan':
      return env.guestRlCameraScanPerMin
  }
}

/**
 * Client IP behind Vercel / one trusted reverse proxy.
 *
 * Prefer Express `req.ip` when `trust proxy` is enabled (proxy-addr picks the
 * left-of-trusted hop so a client-prepended X-Forwarded-For cannot trivially
 * spoof guest RL). Fall back to platform-controlled headers, then socket.
 */
export function clientIp(req: Request): string {
  const fromExpress = typeof req.ip === 'string' ? req.ip.trim() : ''
  if (fromExpress && fromExpress !== '::1' && fromExpress !== '127.0.0.1') {
    // Strip IPv6-mapped IPv4 for stable guest keys.
    if (fromExpress.startsWith('::ffff:')) return fromExpress.slice(7)
    return fromExpress
  }

  const vercel = req.headers['x-vercel-forwarded-for']
  if (typeof vercel === 'string' && vercel.trim()) {
    const first = vercel.split(',')[0]?.trim()
    if (first) return first
  }

  const real = req.headers['x-real-ip']
  if (typeof real === 'string' && real.trim()) return real.trim()

  // Last resort: with a single trusted proxy that *appends*, the rightmost
  // address is the connecting peer Vercel saw — safer than leftmost (spoofable).
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.trim()) {
    const parts = xf.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length === 1) return parts[0]!
    if (parts.length > 1) return parts[parts.length - 1]!
  }
  if (Array.isArray(xf) && xf[0]) {
    const parts = String(xf[0])
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length) return parts[parts.length - 1]!
  }

  if (fromExpress) {
    if (fromExpress.startsWith('::ffff:')) return fromExpress.slice(7)
    return fromExpress
  }
  return req.socket.remoteAddress || 'unknown'
}

function pruneIfStale(key: string, now: number) {
  const cur = windows.get(key)
  if (cur && cur.resetAt <= now) windows.delete(key)
}

/**
 * Fixed-window rate limit for an arbitrary key (IP, user id, …).
 * Returns true if the request may proceed; otherwise writes 429 and returns false.
 */
export function allowKeyedRateOrReject(
  res: Response,
  key: string,
  limit: number,
  bucket: string,
): boolean {
  if (!Number.isFinite(limit) || limit <= 0) return true

  const now = Date.now()
  pruneIfStale(key, now)

  let state = windows.get(key)
  if (!state) {
    state = { count: 0, resetAt: now + WINDOW_MS }
    windows.set(key, state)
  }

  if (state.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((state.resetAt - now) / 1000))
    res.setHeader('Retry-After', String(retryAfterSec))
    res.status(429).json({
      message: 'Too many requests — wait a moment and try again.',
      retryAfterSeconds: retryAfterSec,
      bucket,
      limitPerMinute: limit,
    })
    return false
  }

  state.count += 1
  return true
}

/**
 * Rate-limit **guests only** (no Bearer user). Signed-in users skip.
 * Returns true if the request may proceed; otherwise writes 429 and returns false.
 */
export function allowGuestIpOrReject(
  req: AuthedRequest,
  res: Response,
  bucket: GuestRateBucket,
): boolean {
  if (req.auth?.userId) return true
  const limit = limitFor(bucket)
  return allowKeyedRateOrReject(res, `${bucket}|${clientIp(req)}`, limit, bucket)
}

/** Rate-limit any caller by client IP (used for public push subscribe). */
export function allowIpRateOrReject(
  req: Request,
  res: Response,
  bucket: string,
  limit: number,
): boolean {
  return allowKeyedRateOrReject(res, `${bucket}|ip|${clientIp(req)}`, limit, bucket)
}

/** Rate-limit a signed-in user by user id (Harbor sync / gift). */
export function allowUserRateOrReject(
  res: Response,
  userId: string,
  bucket: string,
  limit: number,
): boolean {
  return allowKeyedRateOrReject(res, `${bucket}|user|${userId}`, limit, bucket)
}

/** Test helper — clear windows between smokes. */
export function resetGuestRateLimitWindowsForTests() {
  windows.clear()
}
