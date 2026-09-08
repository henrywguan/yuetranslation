import { createHash } from 'node:crypto'
import type { Request } from 'express'
import { clientIp } from './guestRateLimit.js'
import { currentMonthKey } from './usage.js'

/**
 * Deterministic guest UUID from client IP + billing month.
 * Clearing the cookie no longer mints a fresh trial — same network reuses the same guest id.
 * Residual: shared NAT / VPN rotates identity with the IP (edge Firewall still applies).
 */
export function guestIdForIp(ip: string, month = currentMonthKey()): string {
  const digest = createHash('sha256').update(`yue-guest-v1|${month}|${ip}`).digest()
  const bytes = Buffer.from(digest.subarray(0, 16))
  // RFC 4122 variant + version 5-ish (name-based) bits.
  bytes[6] = (bytes[6]! & 0x0f) | 0x50
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function guestIdForRequest(req: Request): string {
  return guestIdForIp(clientIp(req))
}
