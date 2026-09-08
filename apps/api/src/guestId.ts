import { createHash, randomUUID } from 'node:crypto'
import type { Request } from 'express'
import { clientIp } from './guestRateLimit.js'
import { getAdmin } from './supabase.js'
import { currentMonthKey } from './usage.js'

export const GUEST_DEVICE_HEADER = 'x-yue-guest-device'

/** In-memory fallback when Supabase admin is unavailable (dev / cold miss). */
const memNetwork = new Map<string, string>()
const memDevice = new Map<string, string>()

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export function hashGuestAnchor(kind: 'ip' | 'device', month: string, value: string): string {
  return createHash('sha256').update(`yue-guest-${kind}-v1|${month}|${value}`).digest('hex')
}

/**
 * Deterministic guest UUID from client IP + billing month (offline fallback).
 */
export function guestIdForIp(ip: string, month = currentMonthKey()): string {
  return uuidFromDigest(`yue-guest-v1|${month}|${ip}`)
}

/** Deterministic guest UUID from durable device id + month (survives IP change without DB). */
export function guestIdForDevice(deviceId: string, month = currentMonthKey()): string {
  return uuidFromDigest(`yue-guest-device-id-v1|${month}|${deviceId}`)
}

function uuidFromDigest(material: string): string {
  const digest = createHash('sha256').update(material).digest()
  const bytes = Buffer.from(digest.subarray(0, 16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x50
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function readGuestDeviceId(req: Request): string | null {
  const raw = req.headers[GUEST_DEVICE_HEADER]
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  return isUuid(trimmed) ? trimmed : null
}

async function lookupNetwork(ipHash: string, month: string): Promise<string | null> {
  const mem = memNetwork.get(`${month}|${ipHash}`)
  if (mem) return mem
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client
    .from('guest_network_trials')
    .select('guest_id')
    .eq('ip_hash', ipHash)
    .eq('month', month)
    .maybeSingle()
  if (error) {
    if (!/schema cache|Could not find the table|PGRST205/i.test(error.message)) {
      console.warn('[guest] network lookup failed', error.message)
    }
    return null
  }
  const gid = data?.guest_id ? String(data.guest_id) : null
  if (gid && isUuid(gid)) {
    memNetwork.set(`${month}|${ipHash}`, gid)
    return gid
  }
  return null
}

async function lookupDevice(deviceHash: string, month: string): Promise<string | null> {
  const mem = memDevice.get(`${month}|${deviceHash}`)
  if (mem) return mem
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client
    .from('guest_device_trials')
    .select('guest_id')
    .eq('device_hash', deviceHash)
    .eq('month', month)
    .maybeSingle()
  if (error) {
    console.warn('[guest] device lookup failed', error.message)
    return null
  }
  const gid = data?.guest_id ? String(data.guest_id) : null
  if (gid && isUuid(gid)) {
    memDevice.set(`${month}|${deviceHash}`, gid)
    return gid
  }
  return null
}

async function upsertNetwork(ipHash: string, month: string, guestId: string): Promise<void> {
  memNetwork.set(`${month}|${ipHash}`, guestId)
  const client = getAdmin()
  if (!client) return
  const { error } = await client.from('guest_network_trials').upsert(
    { ip_hash: ipHash, month, guest_id: guestId, updated_at: new Date().toISOString() },
    { onConflict: 'ip_hash,month', ignoreDuplicates: true },
  )
  if (error) console.warn('[guest] network upsert failed', error.message)
}

async function upsertDevice(deviceHash: string, month: string, guestId: string): Promise<void> {
  memDevice.set(`${month}|${deviceHash}`, guestId)
  const client = getAdmin()
  if (!client) return
  // Device may move networks — always keep device → guest binding current.
  const { error } = await client.from('guest_device_trials').upsert(
    { device_hash: deviceHash, month, guest_id: guestId, updated_at: new Date().toISOString() },
    { onConflict: 'device_hash,month' },
  )
  if (error) console.warn('[guest] device upsert failed', error.message)
}

export type ResolvedGuestIdentity = {
  guestId: string
  deviceId: string | null
  /** Guest ids that may hold meters for this request (merge on sign-in). */
  mergeCandidates: string[]
}

/**
 * Resolve guest metering identity:
 * 1) durable device id (header) — DB mapping or deterministic device UUID
 * 2) else IP/network registry this month (cookie wipe on same network; needs migration)
 * 3) else mint from IP (deterministic) and register
 *
 * Device wins over IP when both exist and differ (VPN / mobile IP change).
 * IP registry is insert-only so a traveler's device does not overwrite a café NAT binding.
 */
export async function resolveGuestIdentity(req: Request): Promise<ResolvedGuestIdentity> {
  const month = currentMonthKey()
  const ip = clientIp(req)
  const deviceId = readGuestDeviceId(req)
  const ipHash = hashGuestAnchor('ip', month, ip)
  const deviceHash = deviceId ? hashGuestAnchor('device', month, deviceId) : null

  const [fromDevice, fromNetwork] = await Promise.all([
    deviceHash ? lookupDevice(deviceHash, month) : Promise.resolve(null),
    lookupNetwork(ipHash, month),
  ])

  const candidates = new Set<string>()
  if (fromDevice) candidates.add(fromDevice)
  if (fromNetwork) candidates.add(fromNetwork)

  let guestId: string
  if (fromDevice) guestId = fromDevice
  else if (deviceId) guestId = guestIdForDevice(deviceId, month)
  else if (fromNetwork) guestId = fromNetwork
  else guestId = guestIdForIp(ip, month)

  candidates.add(guestId)
  // If device-derived id differs from prior network binding, keep both as merge candidates.
  if (fromNetwork) candidates.add(fromNetwork)

  const tasks: Promise<void>[] = []
  // Register IP only when unset — protects shared NAT from being stolen by a device-preferred id.
  if (!fromNetwork) tasks.push(upsertNetwork(ipHash, month, guestId))
  if (deviceHash) tasks.push(upsertDevice(deviceHash, month, guestId))
  await Promise.all(tasks)

  return { guestId, deviceId, mergeCandidates: [...candidates] }
}

/** @deprecated Prefer resolveGuestIdentity — sync IP-only helper for tests. */
export function guestIdForRequest(req: Request): string {
  return guestIdForIp(clientIp(req))
}

/** Test helper: clear in-memory anchor caches. */
export function resetGuestIdentityMemoryForTests() {
  memNetwork.clear()
  memDevice.clear()
}

export function newGuestDeviceIdForTests(): string {
  return randomUUID()
}
