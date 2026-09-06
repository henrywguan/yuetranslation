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

/** Client IP behind Vercel / proxies — first X-Forwarded-For hop. */
export function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.trim()) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first
  }
  if (Array.isArray(xf) && xf[0]) {
    const first = String(xf[0]).split(',')[0]?.trim()
    if (first) return first
  }
  const real = req.headers['x-real-ip']
  if (typeof real === 'string' && real.trim()) return real.trim()
  return req.socket.remoteAddress || 'unknown'
}

function pruneIfStale(key: string, now: number) {
  const cur = windows.get(key)
  if (cur && cur.resetAt <= now) windows.delete(key)
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
  if (!Number.isFinite(limit) || limit <= 0) return true

  const now = Date.now()
  const ip = clientIp(req)
  const key = `${bucket}|${ip}`
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
      message: 'Too many requests from this network — wait a moment and try again.',
      retryAfterSeconds: retryAfterSec,
      bucket,
      limitPerMinute: limit,
    })
    return false
  }

  state.count += 1
  return true
}

/** Test helper — clear windows between smokes. */
export function resetGuestRateLimitWindowsForTests() {
  windows.clear()
}
