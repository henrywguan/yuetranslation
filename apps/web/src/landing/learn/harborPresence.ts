/**
 * Harbor Quest · signed-in open-world presence (Supabase Realtime).
 * Presence = who is here (join/leave + identity).
 * Broadcast = near-instant pose sync (~10 Hz) so others see you move live.
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { HARBOR_DEFAULT_LOOK, type HarborLook } from './harborGear'
import {
  HARBOR_DEFAULT_APPEARANCE,
  sanitizeHarborAppearance,
  sanitizeHarborGender,
  type HarborAppearance,
  type HarborGender,
} from './harborAppearance'

export const HARBOR_PRESENCE_CHANNEL = 'harbor-quest-river' as const
/** Lightweight pose packets (no look / gear) — high frequency. */
export const HARBOR_POSE_EVENT = 'harbor-pose' as const

export type HarborTravelMode = 'boat' | 'foot'

/** Full identity + pose (Presence track — infrequent). */
export type HarborPresenceState = {
  userId: string
  username: string
  x: number
  z: number
  yaw: number
  mode: HarborTravelMode
  look: HarborLook
  gender: HarborGender
  appearance: HarborAppearance
  updatedAt: number
}

export type HarborRemotePlayer = HarborPresenceState

/** Slim pose for Broadcast (keep packets tiny). */
export type HarborPosePacket = {
  userId: string
  x: number
  z: number
  yaw: number
  mode: HarborTravelMode
  t: number
}

const USERNAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Prefer Account Hub username; otherwise a stable random-looking 5–15 char
 * handle derived from userId (same sailor → same fallback every session).
 */
export function harborDisplayUsername(
  preferred: string | null | undefined,
  userId: string,
): string {
  const trimmed = typeof preferred === 'string' ? preferred.trim() : ''
  if (trimmed.length > 0) return trimmed.slice(0, 24)

  let h = 2166136261 >>> 0
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  const len = 5 + (h % 11) // 5…15
  let out = ''
  let x = h
  for (let i = 0; i < len; i++) {
    out += USERNAME_CHARS[x % USERNAME_CHARS.length]!
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
  }
  return out
}

function isLook(raw: unknown): raw is HarborLook {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return (
    typeof o.hat === 'string' &&
    typeof o.top === 'string' &&
    typeof o.bottom === 'string' &&
    typeof o.shoes === 'string' &&
    typeof o.hand === 'string' &&
    typeof o.boat === 'string' &&
    typeof o.lantern === 'string'
  )
}

export function sanitizePresencePayload(
  raw: unknown,
  fallbackUserId: string,
): HarborPresenceState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const userId = typeof o.userId === 'string' && o.userId ? o.userId : fallbackUserId
  if (!userId) return null
  const x = typeof o.x === 'number' && Number.isFinite(o.x) ? o.x : 0
  const z = typeof o.z === 'number' && Number.isFinite(o.z) ? o.z : 0
  const yaw = typeof o.yaw === 'number' && Number.isFinite(o.yaw) ? o.yaw : 0
  const mode: HarborTravelMode = o.mode === 'foot' ? 'foot' : 'boat'
  const username = harborDisplayUsername(
    typeof o.username === 'string' ? o.username : null,
    userId,
  )
  const look = isLook(o.look) ? o.look : { ...HARBOR_DEFAULT_LOOK }
  const gender = sanitizeHarborGender(o.gender)
  const appearance = sanitizeHarborAppearance(o.appearance)
  const updatedAt =
    typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt)
      ? o.updatedAt
      : Date.now()
  return { userId, username, x, z, yaw, mode, look, gender, appearance, updatedAt }
}

export function sanitizePosePacket(raw: unknown): HarborPosePacket | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const userId = typeof o.userId === 'string' && o.userId ? o.userId : null
  if (!userId) return null
  const x = typeof o.x === 'number' && Number.isFinite(o.x) ? o.x : null
  const z = typeof o.z === 'number' && Number.isFinite(o.z) ? o.z : null
  if (x == null || z == null) return null
  const yaw = typeof o.yaw === 'number' && Number.isFinite(o.yaw) ? o.yaw : 0
  const mode: HarborTravelMode = o.mode === 'foot' ? 'foot' : 'boat'
  const t = typeof o.t === 'number' && Number.isFinite(o.t) ? o.t : Date.now()
  return { userId, x, z, yaw, mode, t }
}

/** Flatten Supabase presence state → remote players (excludes self). */
export function remotesFromPresenceState(
  state: Record<string, unknown[]>,
  selfUserId: string,
): HarborRemotePlayer[] {
  const out: HarborRemotePlayer[] = []
  const seen = new Set<string>()
  for (const [key, metas] of Object.entries(state)) {
    if (!Array.isArray(metas) || metas.length === 0) continue
    const parsed = sanitizePresencePayload(metas[0], key)
    if (!parsed) continue
    if (parsed.userId === selfUserId) continue
    if (seen.has(parsed.userId)) continue
    seen.add(parsed.userId)
    out.push(parsed)
  }
  return out
}

export type HarborPresenceSession = {
  channel: RealtimeChannel
  /** Infrequent Presence upsert (identity + look + pose snapshot). */
  track: (
    pose: Omit<HarborPresenceState, 'userId' | 'username' | 'updatedAt'> & {
      username?: string
    },
  ) => Promise<void>
  /** High-frequency pose Broadcast (no await / no Presence write). */
  broadcastPose: (pose: Omit<HarborPosePacket, 'userId' | 't'>) => void
  stop: () => Promise<void>
}

/**
 * Join the shared river channel.
 * - Presence: who is online (sync / join / leave) → `onRemotes`
 * - Broadcast: live pose packets → `onPose` (near-instant movement)
 */
export function startHarborPresence(opts: {
  supabase: SupabaseClient
  userId: string
  username: string
  onRemotes: (remotes: HarborRemotePlayer[]) => void
  onPose?: (pose: HarborPosePacket) => void
}): HarborPresenceSession {
  const { supabase, userId, username, onRemotes, onPose } = opts
  const channel = supabase.channel(HARBOR_PRESENCE_CHANNEL, {
    config: {
      presence: { key: userId },
      broadcast: { self: false },
    },
  })

  const emitRemotes = () => {
    const state = channel.presenceState() as Record<string, unknown[]>
    onRemotes(remotesFromPresenceState(state, userId))
  }

  channel
    .on('presence', { event: 'sync' }, emitRemotes)
    .on('presence', { event: 'join' }, emitRemotes)
    .on('presence', { event: 'leave' }, emitRemotes)
    .on('broadcast', { event: HARBOR_POSE_EVENT }, ({ payload }) => {
      const pose = sanitizePosePacket(payload)
      if (!pose || pose.userId === userId) return
      onPose?.(pose)
    })

  void channel.subscribe()

  return {
    channel,
    async track(pose) {
      const payload: HarborPresenceState = {
        userId,
        username: pose.username?.trim() || username,
        x: pose.x,
        z: pose.z,
        yaw: pose.yaw,
        mode: pose.mode,
        look: pose.look,
        gender: pose.gender ?? 'male',
        appearance: pose.appearance ?? { ...HARBOR_DEFAULT_APPEARANCE },
        updatedAt: Date.now(),
      }
      await channel.track(payload)
    },
    broadcastPose(pose) {
      const packet: HarborPosePacket = {
        userId,
        x: pose.x,
        z: pose.z,
        yaw: pose.yaw,
        mode: pose.mode,
        t: Date.now(),
      }
      // Fire-and-forget — do not await (keeps the game loop snappy)
      void channel.send({
        type: 'broadcast',
        event: HARBOR_POSE_EVENT,
        payload: packet,
      })
    },
    async stop() {
      try {
        await channel.untrack()
      } catch {
        /* ignore */
      }
      await supabase.removeChannel(channel)
    },
  }
}
