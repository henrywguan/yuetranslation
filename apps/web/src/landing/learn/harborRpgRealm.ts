/**
 * HarborRPG · free-roam adventure continent (non-Cantonese).
 * Pocket realm mirrored on Guan’s remount pattern — procedural craft only in v0
 * so phone voyage does not preload KayKit/Quaternius packs.
 */
import * as THREE from 'three'
import { HARBOR_CRAFT_PALETTE as P, hqBox, hqMat, hqMatSmooth, hqPost } from './harborCraft'

export const HARBOR_RPG_META = { en: 'HarborRPG', zh: '冒險洲' } as const

/** Playable meadow AABB (foot clamp). */
export const HARBOR_RPG_BOUNDS = {
  minX: -28,
  maxX: 28,
  minZ: -28,
  maxZ: 28,
} as const

export const HARBOR_RPG_SPAWN = { x: 0, z: 8 } as const

export const HARBOR_RPG_LOOK = {
  sky: 0x8eb8e8,
  fog: 0xc8d8e8,
  fogDensity: 0.0085,
  amb: 0xfff4e8,
  ambI: 1.35,
  sun: 0xffe8c0,
  sunI: 2.4,
  hemiSky: 0xd8ecff,
  hemiGround: 0x4a7a48,
  hemiI: 0.95,
  grass: 0x3a9a4a,
  grassDeep: 0x2a7038,
  dirt: 0x6a5030,
  stone: 0x8a8680,
  shrine: 0xc8b898,
  dummy: 0xb08060,
} as const

/** Soft XP shrine — walk nearby to claim. */
export const HARBOR_RPG_SHRINE = {
  id: 'rpg-shrine' as const,
  x: 0,
  z: -10,
  radius: 2.4,
} as const

/** Training dummy — soft gold on “hit” (client). */
export const HARBOR_RPG_DUMMY = {
  id: 'rpg-dummy' as const,
  x: 8,
  z: -6,
  radius: 2.0,
} as const

export const HARBOR_RPG_RETURN = {
  id: 'rpg-return' as const,
  x: 0,
  z: 18,
  radius: 2.6,
} as const

export function isRpgLand(x: number, z: number): boolean {
  const b = HARBOR_RPG_BOUNDS
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ
}

export function clampRpgFootTarget(x: number, z: number): { x: number; z: number } {
  const b = HARBOR_RPG_BOUNDS
  return {
    x: Math.min(b.maxX, Math.max(b.minX, x)),
    z: Math.min(b.maxZ, Math.max(b.minZ, z)),
  }
}

function grassPlane(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(
    HARBOR_RPG_BOUNDS.maxX - HARBOR_RPG_BOUNDS.minX + 4,
    HARBOR_RPG_BOUNDS.maxZ - HARBOR_RPG_BOUNDS.minZ + 4,
  )
  const mesh = new THREE.Mesh(geo, hqMat(HARBOR_RPG_LOOK.grass))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0.01, 0)
  mesh.receiveShadow = false
  mesh.name = 'rpg-grass'
  return mesh
}

function ringPath(): THREE.Mesh {
  const geo = new THREE.RingGeometry(6, 7.2, 32)
  const mesh = new THREE.Mesh(geo, hqMat(HARBOR_RPG_LOOK.dirt))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0.02, -2)
  mesh.name = 'rpg-path-ring'
  return mesh
}

function shrine(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-shrine'
  g.position.set(HARBOR_RPG_SHRINE.x, 0, HARBOR_RPG_SHRINE.z)
  const base = hqBox(2.2, 0.35, 2.2, HARBOR_RPG_LOOK.stone)
  base.position.y = 0.18
  g.add(base)
  const pillar = hqBox(0.7, 2.2, 0.7, HARBOR_RPG_LOOK.shrine)
  pillar.position.y = 1.3
  g.add(pillar)
  const cap = hqBox(1.1, 0.25, 1.1, HARBOR_RPG_LOOK.stone)
  cap.position.y = 2.5
  g.add(cap)
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    hqMatSmooth(0xffe08a),
  )
  glow.position.y = 2.85
  glow.name = 'rpg-shrine-glow'
  g.add(glow)
  g.userData.rpgInteract = HARBOR_RPG_SHRINE.id
  return g
}

function trainingDummy(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-dummy'
  g.position.set(HARBOR_RPG_DUMMY.x, 0, HARBOR_RPG_DUMMY.z)
  const post = hqPost(0.18, 0.18, 1.6, HARBOR_RPG_LOOK.dirt)
  post.position.y = 0.8
  g.add(post)
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.65, 1.1, 10),
    hqMat(HARBOR_RPG_LOOK.dummy),
  )
  body.position.y = 1.35
  g.add(body)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    hqMat(P.skin),
  )
  head.position.y = 2.1
  g.add(head)
  g.userData.rpgInteract = HARBOR_RPG_DUMMY.id
  return g
}

function returnPortal(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-return-portal'
  g.position.set(HARBOR_RPG_RETURN.x, 0, HARBOR_RPG_RETURN.z)
  const pad = hqBox(2.4, 0.12, 2.4, 0x4a6888)
  pad.position.y = 0.06
  g.add(pad)
  const archL = hqBox(0.25, 2.4, 0.25, 0x6a88a8)
  archL.position.set(-0.9, 1.2, 0)
  g.add(archL)
  const archR = hqBox(0.25, 2.4, 0.25, 0x6a88a8)
  archR.position.set(0.9, 1.2, 0)
  g.add(archR)
  const lintel = hqBox(2.1, 0.25, 0.25, 0x6a88a8)
  lintel.position.set(0, 2.45, 0)
  g.add(lintel)
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 2.0),
    new THREE.MeshBasicMaterial({
      color: 0x88c8ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  veil.position.set(0, 1.2, 0)
  veil.name = 'rpg-portal-veil'
  g.add(veil)
  g.userData.rpgInteract = HARBOR_RPG_RETURN.id
  return g
}

/** Scatter a few low rocks for depth (no GLB preload). */
function scatterRocks(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-rocks'
  for (let i = 0; i < 14; i++) {
    const rock = hqBox(
      0.4 + rng() * 0.8,
      0.25 + rng() * 0.45,
      0.4 + rng() * 0.8,
      HARBOR_RPG_LOOK.stone,
    )
    const ang = rng() * Math.PI * 2
    const rad = 9 + rng() * 14
    rock.position.set(Math.cos(ang) * rad, 0.15, Math.sin(ang) * rad - 2)
    rock.rotation.y = rng() * Math.PI
    g.add(rock)
  }
  return g
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Static RPG continent scene — remounted when realm === 'rpg'. */
export function buildRpgContinentScene(): THREE.Group {
  const root = new THREE.Group()
  root.name = 'harbor-rpg'
  root.add(grassPlane())
  root.add(ringPath())
  root.add(shrine())
  root.add(trainingDummy())
  root.add(returnPortal())
  root.add(scatterRocks(mulberry32(0x48415242)))
  root.userData.rpgShrine = HARBOR_RPG_SHRINE
  root.userData.rpgDummy = HARBOR_RPG_DUMMY
  root.userData.rpgReturn = HARBOR_RPG_RETURN
  return root
}

export type HarborRpgInteractId =
  | typeof HARBOR_RPG_SHRINE.id
  | typeof HARBOR_RPG_DUMMY.id
  | typeof HARBOR_RPG_RETURN.id

export function nearestRpgInteract(
  x: number,
  z: number,
): HarborRpgInteractId | null {
  const targets = [HARBOR_RPG_SHRINE, HARBOR_RPG_DUMMY, HARBOR_RPG_RETURN] as const
  let best: HarborRpgInteractId | null = null
  let bestD = Infinity
  for (const t of targets) {
    const d = Math.hypot(t.x - x, t.z - z)
    if (d < t.radius && d < bestD) {
      bestD = d
      best = t.id
    }
  }
  return best
}
