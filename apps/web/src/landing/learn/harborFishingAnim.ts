/**
 * Harbor Quest · fishing cast / wait / catch body poses + rod prop.
 * Procedural anime kit — rod on hand_r, line to water, bobber splash.
 */
import * as THREE from 'three'
import { HARBOR_CRAFT_PALETTE as P, hqMat, hqMatSmooth, hqWoodTexture, hqMatTex } from './harborCraft'

export type HarborFishAnimPhase = 'idle' | 'cast' | 'wait' | 'catch' | 'miss'

export type HarborFishAnimState = {
  phase: HarborFishAnimPhase
  /** Seconds in current phase. */
  t: number
  /** World aim yaw (face the water). */
  faceYaw: number
}

export const HARBOR_FISH_CAST_MS = 650
export const HARBOR_FISH_WAIT_MS = 1100
export const HARBOR_FISH_CATCH_MS = 1100
export const HARBOR_FISH_MISS_MS = 700

/** Full panel cast window: wind-up → splash → bite resolve. */
export const HARBOR_FISH_RESOLVE_MS = HARBOR_FISH_CAST_MS + HARBOR_FISH_WAIT_MS

const ROD_NAME = 'hq-fish-rod'
const LINE_NAME = 'hq-fish-line'
const BOBBER_NAME = 'hq-fish-bobber'
const CATCH_FISH_NAME = 'hq-fish-catch-fish'

function findNamed(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null
  root.traverse((o) => {
    if (o.name === name) found = o
  })
  return found
}

/** Soft jade fishing rod for the cast pose (temporary — not wardrobe). */
export function buildHarborFishingRod(): THREE.Group {
  const g = new THREE.Group()
  g.name = ROD_NAME
  g.userData.harborFishRod = true
  const wood = hqWoodTexture()
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.016, 0.1, 10),
    hqMatTex(P.woodDark, wood),
  )
  grip.position.set(0, 0.04, 0)
  g.add(grip)
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.012, 0.72, 10),
    hqMatSmooth(0x3dcfb6),
  )
  shaft.position.set(0, 0.42, 0)
  g.add(shaft)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), hqMat(P.trimGold))
  tip.position.set(0, 0.78, 0)
  tip.name = 'hq-fish-rod-tip'
  g.add(tip)
  const reel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.022, 12),
    hqMat(P.iron),
  )
  reel.rotation.z = Math.PI / 2
  reel.position.set(0.03, 0.12, 0)
  g.add(reel)
  const spool = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12), hqMat(P.trimGold))
  spool.rotation.y = Math.PI / 2
  spool.position.set(0.03, 0.12, 0)
  g.add(spool)
  return g
}

function buildLine(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 1, 6),
    hqMatSmooth(0xd8eef8),
  )
  mesh.name = LINE_NAME
  mesh.userData.harborFishLine = true
  mesh.visible = false
  return mesh
}

function buildBobber(): THREE.Group {
  const g = new THREE.Group()
  g.name = BOBBER_NAME
  g.userData.harborFishBobber = true
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), hqMat(0xe07070))
  body.scale.set(1, 1.25, 1)
  g.add(body)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), hqMat(0xf0f4ff))
  tip.position.y = 0.055
  g.add(tip)
  g.visible = false
  return g
}

function buildCatchFish(): THREE.Group {
  const g = new THREE.Group()
  g.name = CATCH_FISH_NAME
  g.userData.harborFishCatchFish = true
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), hqMatSmooth(0x5ab8d0))
  body.scale.set(1.6, 0.7, 0.85)
  g.add(body)
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.07, 6), hqMat(0x3a98b0))
  tail.rotation.z = Math.PI / 2
  tail.position.x = -0.09
  g.add(tail)
  g.visible = false
  return g
}

export type HarborFishingPropKit = {
  root: THREE.Group
  rod: THREE.Group
  line: THREE.Mesh
  bobber: THREE.Group
  catchFish: THREE.Group
}

/** Scene-level kit (line + bobber in world space; rod parented to scout hand). */
export function createHarborFishingPropKit(): HarborFishingPropKit {
  const root = new THREE.Group()
  root.name = 'hq-fish-prop-kit'
  const rod = buildHarborFishingRod()
  rod.visible = false
  const line = buildLine()
  const bobber = buildBobber()
  const catchFish = buildCatchFish()
  root.add(line)
  root.add(bobber)
  root.add(catchFish)
  return { root, rod, line, bobber, catchFish }
}

export function disposeHarborFishingPropKit(kit: HarborFishingPropKit): void {
  kit.rod.parent?.remove(kit.rod)
  kit.root.parent?.remove(kit.root)
  kit.root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry?.dispose()
      const mat = m.material
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose()
    }
  })
  kit.rod.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry?.dispose()
      const mat = m.material
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose()
    }
  })
}

function attachRodToScout(scout: THREE.Object3D, rod: THREE.Group): THREE.Object3D {
  let hand: THREE.Object3D | null = null
  let armR: THREE.Object3D | null = null
  scout.traverse((o) => {
    if (o.name === 'hand_r') hand = o
    if (o.name === 'hq-arm-r') armR = o
  })
  // Prefer the arm group so cast swings carry the rod; fall back to hand socket / root.
  const parent = armR ?? hand ?? scout
  if (rod.parent !== parent) {
    rod.parent?.remove(rod)
    parent.add(rod)
  }
  if (parent === armR) {
    // Approximate hand offset along the right arm
    rod.position.set(0.18, -0.42, 0.06)
    rod.rotation.set(0.35, 0.1, -0.55)
  } else if (parent === hand) {
    rod.position.set(0.02, 0.02, 0.02)
    rod.rotation.set(0.15, 0, -0.35)
  } else {
    rod.position.set(0.28, 0.95, 0.12)
    rod.rotation.set(0.15, 0, -0.35)
  }
  rod.scale.setScalar(1)
  return parent
}

function setLineBetween(
  line: THREE.Mesh,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): void {
  const dx = bx - ax
  const dy = by - ay
  const dz = bz - az
  const len = Math.hypot(dx, dy, dz)
  if (len < 0.01) {
    line.visible = false
    return
  }
  line.visible = true
  line.position.set((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5)
  line.scale.set(1, len, 1)
  line.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx, dy, dz).normalize(),
  )
}

function easeOutCubic(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return 1 - (1 - u) ** 3
}

function easeInOut(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2
}

/**
 * Apply cast / wait / catch / miss poses to the standing Scout + prop kit.
 * Returns whether the fishing session is still active.
 */
export function tickHarborFishingAnim(
  scout: THREE.Object3D | null,
  kit: HarborFishingPropKit,
  state: HarborFishAnimState,
  dt: number,
  opts: {
    reduced?: boolean
    /** Scout world X/Z (foot or boat). */
    x: number
    y: number
    z: number
    /** Cast toward water — world point for bobber. */
    waterX: number
    waterY: number
    waterZ: number
  },
): HarborFishAnimState {
  const next: HarborFishAnimState = { ...state, t: state.t + dt }
  const reduced = Boolean(opts.reduced)
  const armR = scout ? findNamed(scout, 'hq-arm-r') : null
  const armL = scout ? findNamed(scout, 'hq-arm-l') : null
  const tipLocal = new THREE.Vector3(0, 0.78, 0)

  if (state.phase === 'idle') {
    kit.rod.visible = false
    kit.line.visible = false
    kit.bobber.visible = false
    kit.catchFish.visible = false
    if (armR) {
      armR.rotation.x *= Math.max(0, 1 - dt * 8)
      armR.rotation.z *= Math.max(0, 1 - dt * 8)
    }
    return next
  }

  if (scout) {
    attachRodToScout(scout, kit.rod)
    kit.rod.visible = true
    scout.rotation.y = state.faceYaw
  }

  const tipWorld = tipLocal.clone()
  if (kit.rod.visible) {
    kit.rod.localToWorld(tipWorld)
  } else {
    tipWorld.set(opts.x, opts.y + 1.1, opts.z)
  }

  if (state.phase === 'cast') {
    const dur = HARBOR_FISH_CAST_MS / 1000
    const u = Math.min(1, next.t / dur)
    // Wind-up then fling
    const wind = u < 0.35 ? easeInOut(u / 0.35) : 1
    const fling = u < 0.35 ? 0 : easeOutCubic((u - 0.35) / 0.65)
    if (armR && !reduced) {
      armR.rotation.x = -0.85 * wind + 1.15 * fling
      armR.rotation.z = -0.25 + 0.35 * fling
    }
    if (armL && !reduced) {
      armL.rotation.x = 0.15 * fling
      armL.rotation.z = 0.12
    }
    kit.rod.rotation.x = -0.4 * wind + 0.55 * fling
    kit.rod.rotation.z = -0.35 + 0.2 * fling
    // Bobber flies out toward water
    const bx = THREE.MathUtils.lerp(tipWorld.x, opts.waterX, fling)
    const by = THREE.MathUtils.lerp(tipWorld.y, opts.waterY, fling) + Math.sin(fling * Math.PI) * 0.55
    const bz = THREE.MathUtils.lerp(tipWorld.z, opts.waterZ, fling)
    kit.bobber.visible = fling > 0.08
    kit.bobber.position.set(bx, by, bz)
    setLineBetween(kit.line, tipWorld.x, tipWorld.y, tipWorld.z, bx, by, bz)
    kit.catchFish.visible = false
    if (u >= 1) {
      next.phase = 'wait'
      next.t = 0
    }
  } else if (state.phase === 'wait') {
    const bob = Math.sin(next.t * 5.5) * (reduced ? 0.02 : 0.045)
    if (armR && !reduced) {
      armR.rotation.x = 0.35 + bob * 0.4
      armR.rotation.z = 0.12
    }
    kit.rod.rotation.x = 0.2 + bob * 0.5
    kit.bobber.visible = true
    kit.bobber.position.set(opts.waterX, opts.waterY + bob, opts.waterZ)
    kit.bobber.rotation.z = bob * 2
    setLineBetween(
      kit.line,
      tipWorld.x,
      tipWorld.y,
      tipWorld.z,
      opts.waterX,
      opts.waterY + bob,
      opts.waterZ,
    )
    kit.catchFish.visible = false
    // Wait stays until playFishingCatch / miss advances the phase
  } else if (state.phase === 'catch') {
    const dur = HARBOR_FISH_CATCH_MS / 1000
    const u = Math.min(1, next.t / dur)
    const lift = easeOutCubic(u)
    if (armR && !reduced) {
      armR.rotation.x = 0.35 - 1.35 * lift
      armR.rotation.z = 0.12 - 0.2 * lift
    }
    if (armL && !reduced) {
      armL.rotation.x = -0.25 * lift
      armL.rotation.z = -0.15 * lift
    }
    kit.rod.rotation.x = 0.2 - 0.85 * lift
    // Bobber + fish reel in toward tip
    const bx = THREE.MathUtils.lerp(opts.waterX, tipWorld.x, lift)
    const by = THREE.MathUtils.lerp(opts.waterY, tipWorld.y - 0.08, lift) + Math.sin(lift * Math.PI) * 0.35
    const bz = THREE.MathUtils.lerp(opts.waterZ, tipWorld.z, lift)
    kit.bobber.visible = lift < 0.92
    kit.bobber.position.set(bx, by, bz)
    kit.catchFish.visible = lift > 0.25
    kit.catchFish.position.set(bx, by - 0.04, bz)
    kit.catchFish.rotation.y = next.t * 8
    kit.catchFish.rotation.z = Math.sin(next.t * 10) * 0.4
    setLineBetween(kit.line, tipWorld.x, tipWorld.y, tipWorld.z, bx, by, bz)
    if (scout && !reduced) {
      scout.rotation.x = Math.sin(lift * Math.PI) * -0.08
    }
    if (u >= 1) {
      next.phase = 'idle'
      next.t = 0
      if (scout) scout.rotation.x = 0
      if (armR) {
        armR.rotation.x = 0
        armR.rotation.z = 0
      }
      if (armL) {
        armL.rotation.x = 0
        armL.rotation.z = 0
      }
      kit.rod.visible = false
      kit.line.visible = false
      kit.bobber.visible = false
      kit.catchFish.visible = false
    }
  } else if (state.phase === 'miss') {
    const dur = HARBOR_FISH_MISS_MS / 1000
    const u = Math.min(1, next.t / dur)
    const drop = easeInOut(u)
    if (armR && !reduced) {
      armR.rotation.x = 0.35 * (1 - drop)
      armR.rotation.z = 0.12 * (1 - drop)
    }
    kit.rod.rotation.x = 0.2 * (1 - drop)
    kit.bobber.visible = drop < 0.7
    const bx = THREE.MathUtils.lerp(opts.waterX, tipWorld.x, drop * 0.4)
    const by = opts.waterY - drop * 0.15
    const bz = THREE.MathUtils.lerp(opts.waterZ, tipWorld.z, drop * 0.4)
    kit.bobber.position.set(bx, by, bz)
    setLineBetween(kit.line, tipWorld.x, tipWorld.y, tipWorld.z, bx, by, bz)
    kit.catchFish.visible = false
    if (u >= 1) {
      next.phase = 'idle'
      next.t = 0
      if (armR) {
        armR.rotation.x = 0
        armR.rotation.z = 0
      }
      kit.rod.visible = false
      kit.line.visible = false
      kit.bobber.visible = false
    }
  }

  return next
}

export function startHarborFishCast(faceYaw: number): HarborFishAnimState {
  return { phase: 'cast', t: 0, faceYaw }
}

export function startHarborFishCatch(prev: HarborFishAnimState, ok: boolean): HarborFishAnimState {
  return {
    phase: ok ? 'catch' : 'miss',
    t: 0,
    faceYaw: prev.faceYaw,
  }
}
