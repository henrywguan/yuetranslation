/**
 * Harbor Quest · landmark NPC roam.
 *
 * Building hosts (Save / Outfitter / Bank / …) pace a small radius around
 * their stamped home so the dock feels alive without wandering off-plot.
 * Uses the Scout auto-rig walk / idle cycle (`tickHarborCastAnim`).
 */
import * as THREE from 'three'
import { tickHarborCastAnim } from './harborProtagonistAnim'

export type HarborNpcRoamState = {
  homeX: number
  homeY: number
  homeZ: number
  /** Max distance from home (local XZ). */
  roam: number
  tx: number
  tz: number
  speed: number
  pause: number
  /** Resting yaw when idle at a pause. */
  faceHome: number
}

const USERDATA_KEY = 'npcRoam'

function pickLocalRoam(
  homeX: number,
  homeZ: number,
  roam: number,
  rng: () => number,
): { x: number; z: number } {
  const a = rng() * Math.PI * 2
  const r = roam * (0.2 + rng() * 0.8)
  return {
    x: homeX + Math.cos(a) * r,
    z: homeZ + Math.sin(a) * r,
  }
}

/**
 * Stamp a roam home from the NPC's current local pose.
 * Idempotent — safe to call after attach / Guan stamp.
 */
export function stampHarborNpcRoam(
  npc: THREE.Object3D,
  opts: { roam?: number; faceYaw?: number; rng?: () => number } = {},
): void {
  if (npc.userData[USERDATA_KEY]) return
  const rng = opts.rng ?? Math.random
  const roam = opts.roam ?? 1.35
  const homeX = npc.position.x
  const homeY = npc.position.y
  const homeZ = npc.position.z
  const faceHome = opts.faceYaw ?? npc.rotation.y
  const dest = pickLocalRoam(homeX, homeZ, roam * 0.45, rng)
  const state: HarborNpcRoamState = {
    homeX,
    homeY,
    homeZ,
    roam,
    tx: dest.x,
    tz: dest.z,
    speed: 0.5 + rng() * 0.35,
    // Stagger first steps so hosts don't all start marching together.
    pause: 0.6 + rng() * 2.2 + (npc.id % 7) * 0.15,
    faceHome,
  }
  npc.userData[USERDATA_KEY] = state
}

export function hasHarborNpcRoam(npc: THREE.Object3D): boolean {
  return Boolean(npc.userData[USERDATA_KEY])
}

/**
 * Advance local-XZ roam + Scout walk/idle. Keeps Y at the stamped home
 * (building terrace / pier height). Returns the locomotion mode applied.
 */
export function tickHarborNpcRoam(
  npc: THREE.Object3D,
  dt: number,
  reduced: boolean,
): 'walk' | 'idle' {
  const state = npc.userData[USERDATA_KEY] as HarborNpcRoamState | undefined
  if (!state) {
    tickHarborCastAnim(npc, dt, { reduced, mode: 'idle' })
    return 'idle'
  }

  if (state.pause > 0) {
    state.pause -= dt
    // Ease yaw back toward the building front while chatting / waiting.
    let dy = state.faceHome - npc.rotation.y
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    npc.rotation.y += dy * Math.min(1, dt * 3)
    npc.position.y = state.homeY
    tickHarborCastAnim(npc, dt, { reduced, mode: 'idle' })
    if (state.pause <= 0) {
      const next = pickLocalRoam(state.homeX, state.homeZ, state.roam, Math.random)
      state.tx = next.x
      state.tz = next.z
    }
    return 'idle'
  }

  const dx = state.tx - npc.position.x
  const dz = state.tz - npc.position.z
  const dist = Math.hypot(dx, dz)
  if (dist < 0.22) {
    state.pause = 1.4 + Math.random() * 2.8
    tickHarborCastAnim(npc, dt, { reduced, mode: 'idle' })
    return 'idle'
  }

  const step = Math.min(dist, state.speed * (reduced ? 0.4 : 1) * dt)
  npc.position.x += (dx / dist) * step
  npc.position.z += (dz / dist) * step
  npc.position.y = state.homeY
  // Soft leash — if a step drifts past roam, pull back toward home.
  const hx = npc.position.x - state.homeX
  const hz = npc.position.z - state.homeZ
  const away = Math.hypot(hx, hz)
  if (away > state.roam * 1.05) {
    const s = (state.roam * 0.95) / away
    npc.position.x = state.homeX + hx * s
    npc.position.z = state.homeZ + hz * s
    const retarget = pickLocalRoam(state.homeX, state.homeZ, state.roam * 0.6, Math.random)
    state.tx = retarget.x
    state.tz = retarget.z
  }

  const face = Math.atan2(dx, dz)
  let dy = face - npc.rotation.y
  while (dy > Math.PI) dy -= Math.PI * 2
  while (dy < -Math.PI) dy += Math.PI * 2
  npc.rotation.y += dy * Math.min(1, dt * 7)

  tickHarborCastAnim(npc, dt, { reduced, mode: 'walk' })
  return 'walk'
}
