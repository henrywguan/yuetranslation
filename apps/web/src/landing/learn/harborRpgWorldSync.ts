/**
 * HarborRPG shared world tick (soft Realtime).
 * Zone host = lexicographically lowest userId present in the zone.
 * Host broadcasts monster snapshots; clients apply if newer.
 */
import type { HarborRpgZoneId } from './harborRpgData'
import type { HarborRpgMonsterRuntime } from './harborRpgCombat'

export const HARBOR_RPG_WORLD_EVENT = 'harbor-rpg-world' as const
/** ~5 Hz soft sync. */
export const HARBOR_RPG_WORLD_TICK_MS = 200

export type HarborRpgWorldMobSnap = {
  id: string
  kind: string
  x: number
  z: number
  hp: number
  maxHp: number
  alive: boolean
  phase?: number
}

export type HarborRpgWorldPacket = {
  hostId: string
  zone: HarborRpgZoneId
  t: number
  mobs: HarborRpgWorldMobSnap[]
}

export function electRpgZoneHost(userIds: string[]): string | null {
  const ids = userIds.filter((id) => typeof id === 'string' && id.length > 0)
  if (ids.length === 0) return null
  return [...ids].sort()[0]!
}

export function isRpgZoneHost(selfId: string, userIdsInZone: string[]): boolean {
  return electRpgZoneHost(userIdsInZone) === selfId
}

export function snapshotRpgMonsters(
  monsters: HarborRpgMonsterRuntime[],
): HarborRpgWorldMobSnap[] {
  return monsters.map((m) => ({
    id: m.id,
    kind: m.kind,
    x: Math.round(m.x * 100) / 100,
    z: Math.round(m.z * 100) / 100,
    hp: Math.max(0, Math.floor(m.hp)),
    maxHp: Math.max(1, Math.floor(m.maxHp)),
    alive: m.alive,
    phase: m.phase,
  }))
}

export function sanitizeRpgWorldPacket(raw: unknown): HarborRpgWorldPacket | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.hostId !== 'string' || !o.hostId) return null
  if (typeof o.zone !== 'string' || o.zone.length > 20) return null
  if (!Array.isArray(o.mobs)) return null
  const mobs: HarborRpgWorldMobSnap[] = []
  for (const row of o.mobs) {
    if (!row || typeof row !== 'object') continue
    const m = row as Record<string, unknown>
    if (typeof m.id !== 'string' || typeof m.kind !== 'string') continue
    mobs.push({
      id: m.id.slice(0, 40),
      kind: m.kind.slice(0, 24),
      x: typeof m.x === 'number' && Number.isFinite(m.x) ? m.x : 0,
      z: typeof m.z === 'number' && Number.isFinite(m.z) ? m.z : 0,
      hp: typeof m.hp === 'number' && Number.isFinite(m.hp) ? Math.max(0, Math.floor(m.hp)) : 0,
      maxHp:
        typeof m.maxHp === 'number' && Number.isFinite(m.maxHp)
          ? Math.max(1, Math.floor(m.maxHp))
          : 1,
      alive: m.alive !== false,
      phase:
        typeof m.phase === 'number' && Number.isFinite(m.phase)
          ? Math.max(0, Math.floor(m.phase))
          : undefined,
    })
    if (mobs.length >= 64) break
  }
  return {
    hostId: o.hostId.slice(0, 64),
    zone: o.zone as HarborRpgZoneId,
    t: typeof o.t === 'number' && Number.isFinite(o.t) ? o.t : Date.now(),
    mobs,
  }
}

/** Apply host snapshot onto local monster runtimes (match by id). */
export function applyRpgWorldSnapshot(
  local: HarborRpgMonsterRuntime[],
  packet: HarborRpgWorldPacket,
  now: number,
): HarborRpgMonsterRuntime[] {
  if (packet.mobs.length === 0) return local
  const byId = new Map(packet.mobs.map((m) => [m.id, m]))
  return local.map((m) => {
    const snap = byId.get(m.id)
    if (!snap) return m
    return {
      ...m,
      x: snap.x,
      z: snap.z,
      hp: snap.hp,
      maxHp: snap.maxHp,
      alive: snap.alive,
      phase: snap.phase ?? m.phase,
      respawnAt: snap.alive ? m.respawnAt : Math.max(m.respawnAt, now + 1),
    }
  })
}
