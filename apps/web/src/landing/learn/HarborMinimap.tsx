import { useMemo } from 'react'
import {
  HARBOR_VISITABLES,
  type HarborVisitableId,
} from './harborWorld'
import type { HarborRemotePlayer } from './harborPresence'

/** World units shown from the sailor to the minimap edge. */
export const HARBOR_MINIMAP_RADIUS = 28

const BLIP_COLOR: Record<HarborVisitableId, string> = {
  'save-shack': '#ffd060',
  outfitter: '#ff80c0',
  bank: '#60ffe0',
  arena: '#ff6040',
  barber: '#ff7090',
}

export type HarborMinimapPose = {
  x: number
  z: number
  yaw: number
}

type Props = {
  pose: HarborMinimapPose | null
  remotes?: readonly HarborRemotePlayer[]
  /** Hide while a visit panel owns the left dock. */
  hidden?: boolean
}

type Blip = {
  key: string
  kind: 'npc' | 'remote' | 'you'
  label: string
  color: string
  /** Normalised -1…1 in map space (x right, y up = -world Z). */
  nx: number
  ny: number
  inRange: boolean
}

function project(
  originX: number,
  originZ: number,
  yaw: number,
  targetX: number,
  targetZ: number,
  radius: number,
): { nx: number; ny: number; dist: number } {
  const dx = targetX - originX
  const dz = targetZ - originZ
  const dist = Math.hypot(dx, dz)
  // Rotate into sailor-forward frame (yaw 0 → -Z)
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const localX = dx * c + dz * s
  const localZ = -dx * s + dz * c
  const scale = 0.92 / radius
  return {
    nx: localX * scale,
    ny: -localZ * scale,
    dist,
  }
}

/**
 * Top-left vicinity radar — landmark host NPCs + nearby sailors.
 */
export function HarborMinimap({ pose, remotes = [], hidden = false }: Props) {
  const blips = useMemo(() => {
    if (!pose) return [] as Blip[]
    const out: Blip[] = []
    out.push({
      key: 'you',
      kind: 'you',
      label: 'You',
      color: '#3dcfb6',
      nx: 0,
      ny: 0,
      inRange: true,
    })
    for (const v of HARBOR_VISITABLES) {
      const p = project(pose.x, pose.z, pose.yaw, v.x, v.z, HARBOR_MINIMAP_RADIUS)
      if (p.dist > HARBOR_MINIMAP_RADIUS * 1.05) continue
      out.push({
        key: v.id,
        kind: 'npc',
        label: v.name.en,
        color: BLIP_COLOR[v.id],
        nx: Math.max(-0.92, Math.min(0.92, p.nx)),
        ny: Math.max(-0.92, Math.min(0.92, p.ny)),
        inRange: p.dist <= HARBOR_MINIMAP_RADIUS,
      })
    }
    for (const r of remotes) {
      const p = project(pose.x, pose.z, pose.yaw, r.x, r.z, HARBOR_MINIMAP_RADIUS)
      if (p.dist > HARBOR_MINIMAP_RADIUS) continue
      out.push({
        key: `remote-${r.userId}`,
        kind: 'remote',
        label: r.username,
        color: '#dff6ff',
        nx: Math.max(-0.92, Math.min(0.92, p.nx)),
        ny: Math.max(-0.92, Math.min(0.92, p.ny)),
        inRange: true,
      })
    }
    return out
  }, [pose, remotes])

  if (hidden) return null

  const nearbyNpcs = blips.filter((b) => b.kind === 'npc')
  const nearbyRemotes = blips.filter((b) => b.kind === 'remote')

  return (
    <div className="hq-minimap" role="img" aria-label="Harbor vicinity map">
      <p className="hq-minimap-kicker">Vicinity · 附近</p>
      <div className="hq-minimap-disc" aria-hidden="true">
        <span className="hq-minimap-ring hq-minimap-ring--outer" />
        <span className="hq-minimap-ring hq-minimap-ring--mid" />
        <span className="hq-minimap-cross" />
        <span className="hq-minimap-n">N</span>
        {blips.map((b) => (
          <span
            key={b.key}
            className={`hq-minimap-blip hq-minimap-blip--${b.kind}`}
            style={{
              left: `${50 + b.nx * 50}%`,
              top: `${50 + b.ny * 50}%`,
              background: b.color,
              boxShadow: `0 0 8px ${b.color}`,
            }}
            title={b.label}
          />
        ))}
      </div>
      <ul className="hq-minimap-legend" aria-label="Nearby hosts">
        {nearbyNpcs.length === 0 && nearbyRemotes.length === 0 ? (
          <li className="hq-minimap-empty">No hosts nearby</li>
        ) : null}
        {nearbyNpcs.map((b) => (
          <li key={b.key}>
            <span className="hq-minimap-dot" style={{ background: b.color }} aria-hidden="true" />
            <span>{b.label}</span>
          </li>
        ))}
        {nearbyRemotes.map((b) => (
          <li key={b.key}>
            <span className="hq-minimap-dot hq-minimap-dot--remote" aria-hidden="true" />
            <span>{b.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
