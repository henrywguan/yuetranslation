import type { Request, Response, NextFunction } from 'express'
import { mergeGuestUsageIntoUser } from './usage.js'
import type { AuthedRequest } from './auth.js'
import { resolveGuestIdentity } from './guestId.js'

export const GUEST_COOKIE = 'yue_guest_id'
const ONE_YEAR_S = 60 * 60 * 24 * 365

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    if (!key) continue
    try {
      out[key] = decodeURIComponent(val)
    } catch {
      out[key] = val
    }
  }
  return out
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export function readGuestId(req: Request): string | null {
  const raw = parseCookies(req.headers.cookie)[GUEST_COOKIE]
  if (!raw || !isUuid(raw)) return null
  return raw
}

function cookieSecure(req: Request): boolean {
  if (process.env.NODE_ENV === 'production') return true
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0]?.trim()
  return proto === 'https'
}

export function setGuestCookie(req: Request, res: Response, guestId: string) {
  const parts = [
    `${GUEST_COOKIE}=${encodeURIComponent(guestId)}`,
    'Path=/',
    `Max-Age=${ONE_YEAR_S}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (cookieSecure(req)) parts.push('Secure')
  res.append('Set-Cookie', parts.join('; '))
}

export function clearGuestCookie(req: Request, res: Response) {
  const parts = [
    `${GUEST_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (cookieSecure(req)) parts.push('Secure')
  res.append('Set-Cookie', parts.join('; '))
}

export type GuestRequest = AuthedRequest & {
  guestId?: string
}

/**
 * Attach guest metering identity:
 * - durable device id (X-Yue-Guest-Device) survives IP/VPN changes
 * - IP/network registry survives HttpOnly cookie wipe on the same network
 * - cookie mirrors the resolved guest id
 * On sign-in, fold all related guest meter rows into the user.
 */
export async function attachGuest(req: GuestRequest, res: Response, next: NextFunction) {
  try {
    const existingCookie = readGuestId(req)
    const identity = await resolveGuestIdentity(req)

    if (req.auth?.userId) {
      const toMerge = new Set<string>(identity.mergeCandidates)
      if (existingCookie) toMerge.add(existingCookie)
      for (const gid of toMerge) {
        await mergeGuestUsageIntoUser(gid, req.auth.userId)
      }
      if (existingCookie) clearGuestCookie(req, res)
      req.guestId = undefined
      next()
      return
    }

    req.guestId = identity.guestId
    if (existingCookie !== identity.guestId) setGuestCookie(req, res, identity.guestId)
    next()
  } catch (err) {
    console.warn('[guest] attachGuest failed', err instanceof Error ? err.message : err)
    next()
  }
}
