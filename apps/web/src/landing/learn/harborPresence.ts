/**
 * Harbor Quest · signed-in open-world presence (Supabase Realtime).
 * Ghost multiplayer: positions + looks + usernames; no shared quest authority.
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { HARBOR_DEFAULT_LOOK, type HarborLook } from './harborGear'

export const HARBOR_PRESENCE_CHANNEL = 'harbor-quest-river' as const

export type HarborTravelMode = 'boat' | 'foot'

/** Pose + identity broadcast to other sailors. */
export type HarborPresenceState = {
  userId: string
  username: string
  x: number
  z: number
  yaw: number
  mode: HarborTravelMode
  look: HarborLook
  updatedAt: number
}

export type HarborRemotePlayer = HarborPresenceState

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
  const updatedAt =
    typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt)
      ? o.updatedAt
      : Date.now()
  return { userId, username, x, z, yaw, mode, look, updatedAt }
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
  track: (pose: Omit<HarborPresenceState, 'userId' | 'username' | 'updatedAt'> & {
    username?: string
  }) => Promise<void>
  stop: () => Promise<void>
}

/**
 * Join the shared river presence channel. Caller must be signed in.
 * `onRemotes` fires on sync / join / leave.
 */
export function startHarborPresence(opts: {
  supabase: SupabaseClient
  userId: string
  username: string
  onRemotes: (remotes: HarborRemotePlayer[]) => void
}): HarborPresenceSession {
  const { supabase, userId, username, onRemotes } = opts
  const channel = supabase.channel(HARBOR_PRESENCE_CHANNEL, {
    config: { presence: { key: userId } },
  })

  const emit = () => {
    const state = channel.presenceState() as Record<string, unknown[]>
    onRemotes(remotesFromPresenceState(state, userId))
  }

  channel
    .on('presence', { event: 'sync' }, emit)
    .on('presence', { event: 'join' }, emit)
    .on('presence', { event: 'leave' }, emit)

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
        updatedAt: Date.now(),
      }
      await channel.track(payload)
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
