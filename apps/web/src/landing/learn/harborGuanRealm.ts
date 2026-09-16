/**
 * Guan Harbor · tropical paradise voyage pocket (original RS-like craft).
 * Central island + three satellites, free-sail lagoon, return portal home.
 * Chunks stay lean: hqBox / hqPost / hqCanopy / hqRock, flat Lambert.
 */
import * as THREE from 'three'
import {
  HARBOR_CRAFT_PALETTE as P,
  hqBox,
  hqCanopy,
  hqMat,
  hqPost,
  hqRock,
} from './harborCraft'

export const GUAN_HARBOR_META = { en: 'Guan Harbor', zh: '關港' } as const

/** Playable lagoon AABB (boat clamp outer fence). */
export const GUAN_HARBOR_BOUNDS = {
  minX: -22,
  maxX: 22,
  minZ: -18,
  maxZ: 28,
} as const

/** Forced sunny tropical look — sky / fog / water (createHarborWorld applies these). */
export const GUAN_TROPICAL_LOOK = {
  sky: 0x7ec8f0,
  fog: 0xb8e8ff,
  fogDensity: 0.0085,
  amb: 0xfff8f0,
  ambI: 1.75,
  sun: 0xfff0d0,
  sunI: 2.7,
  hemiSky: 0xd8f0ff,
  hemiGround: 0x88b868,
  hemiI: 1.15,
  water: 0x2a98b8,
  waterOpacity: 0.9,
  sand: 0xe8d4a0,
  grass: 0x2a8a48,
  lagoon: 0x3ab8c8,
} as const

/** Boat spawn just off the central pier. */
export const GUAN_BOAT_START = { x: 2.4, z: 1.2 } as const

/** Return portal — opens Save Shack (cast off → river). */
export const GUAN_RETURN_PORTAL = {
  id: 'save-shack' as const,
  name: GUAN_HARBOR_META,
  x: -1.2,
  z: -2.8,
  radius: 2.4,
} as const

/** Island land discs — boat stays outside these radii; foot can walk inside. */
export const GUAN_ISLANDS = [
  { id: 'central', x: 0, z: 6, r: 5.2 },
  { id: 'east', x: 14, z: 4, r: 3.4 },
  { id: 'west', x: -13, z: 8, r: 3.1 },
  { id: 'north', x: 2, z: 18, r: 3.6 },
] as const

/** True when (x,z) is on a Guan island disc (for disembark / foot clamp). */
export function isGuanLand(x: number, z: number): boolean {
  for (const island of GUAN_ISLANDS) {
    if (Math.hypot(x - island.x, z - island.z) <= island.r * 0.92) return true
  }
  return false
}

/** Keep walking sailors on island discs (or snap to nearest shore). */
export function clampGuanFootTarget(x: number, z: number): { x: number; z: number } {
  if (isGuanLand(x, z)) return { x, z }
  let best = GUAN_ISLANDS[0]!
  let bestD = Infinity
  for (const island of GUAN_ISLANDS) {
    const d = Math.hypot(x - island.x, z - island.z)
    if (d < bestD) {
      bestD = d
      best = island
    }
  }
  const dx = x - best.x
  const dz = z - best.z
  const d = Math.hypot(dx, dz) || 1
  const shore = best.r * 0.85
  return { x: best.x + (dx / d) * shore, z: best.z + (dz / d) * shore }
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Keep the canoe in navigable lagoon water (outside island discs, inside bounds). */
export function clampGuanBoatTarget(x: number, z: number): { x: number; z: number } {
  let cx = Math.min(GUAN_HARBOR_BOUNDS.maxX, Math.max(GUAN_HARBOR_BOUNDS.minX, x))
  let cz = Math.min(GUAN_HARBOR_BOUNDS.maxZ, Math.max(GUAN_HARBOR_BOUNDS.minZ, z))
  for (const island of GUAN_ISLANDS) {
    const dx = cx - island.x
    const dz = cz - island.z
    const d = Math.hypot(dx, dz)
    const minR = island.r + 0.55
    if (d < minR && d > 1e-4) {
      const s = minR / d
      cx = island.x + dx * s
      cz = island.z + dz * s
    } else if (d <= 1e-4) {
      cx = island.x + minR
      cz = island.z
    }
  }
  cx = Math.min(GUAN_HARBOR_BOUNDS.maxX, Math.max(GUAN_HARBOR_BOUNDS.minX, cx))
  cz = Math.min(GUAN_HARBOR_BOUNDS.maxZ, Math.max(GUAN_HARBOR_BOUNDS.minZ, cz))
  return { x: cx, z: cz }
}

function palmTree(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-palm'
  const h = 1.6 + rng() * 1.1
  g.add(hqPost(0.05, 0.09, h, 0x6a4a28, 0, h / 2, 0, 5))
  const leaf = 0x2a8a40
  const leafLite = 0x3aaa50
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng() * 0.3
    const frond = hqBox(0.08, 0.04, 0.55 + rng() * 0.2, i % 2 ? leaf : leafLite, 0, h + 0.05, 0)
    frond.rotation.y = a
    frond.rotation.x = -0.55 - rng() * 0.25
    frond.position.set(Math.cos(a) * 0.12, h + 0.02, Math.sin(a) * 0.12)
    g.add(frond)
  }
  // Coconut cluster
  g.add(hqCanopy(0.12, 0x4a3020, 0.05, h - 0.05, 0.04))
  return g
}

function hibiscus(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-hibiscus'
  const h = 0.45 + rng() * 0.2
  g.add(hqPost(0.03, 0.04, h * 0.55, 0x2a1c14, 0, h * 0.28, 0, 4))
  g.add(hqCanopy(0.22 + rng() * 0.08, 0x2f7a40, 0, h * 0.5, 0))
  const petals = [0xe84878, 0xf06090, 0xff7098, 0xd03860]
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    g.add(
      hqBox(
        0.09,
        0.05,
        0.09,
        petals[Math.floor(rng() * petals.length)]!,
        Math.cos(a) * 0.1,
        h * 0.62,
        Math.sin(a) * 0.1,
      ),
    )
  }
  g.add(hqBox(0.05, 0.05, 0.05, 0xf0d040, 0, h * 0.68, 0))
  return g
}

function birdOfParadise(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-bop'
  const h = 0.7 + rng() * 0.25
  g.add(hqPost(0.035, 0.05, h, 0x2a6a38, 0, h / 2, 0, 4))
  // Fan leaves
  for (let i = 0; i < 3; i++) {
    const leaf = hqBox(0.06, 0.02, 0.42, 0x3a9a50, 0, h * 0.55, 0)
    leaf.rotation.y = (i - 1) * 0.55
    leaf.rotation.x = -0.4
    leaf.position.set((i - 1) * 0.08, h * 0.7, 0.05)
    g.add(leaf)
  }
  // Bright “bird” bloom
  g.add(hqBox(0.14, 0.06, 0.08, 0xf0a020, 0.12, h * 0.85, 0.02))
  g.add(hqBox(0.08, 0.05, 0.06, 0xe83848, 0.2, h * 0.9, 0.02))
  g.add(hqBox(0.04, 0.1, 0.03, 0x3060c0, 0.16, h * 0.98, 0))
  return g
}

function fernClump(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-fern'
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng() * 0.4
    const fr = hqBox(0.05, 0.02, 0.32 + rng() * 0.1, 0x2a7a40, 0, 0.2, 0)
    fr.rotation.y = a
    fr.rotation.x = -0.85
    fr.position.set(Math.cos(a) * 0.08, 0.18, Math.sin(a) * 0.08)
    g.add(fr)
  }
  return g
}

function coralTip(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-coral'
  const tones = [0xe87090, 0xf09070, 0xd05080, 0xf0a060]
  const c = tones[Math.floor(rng() * tones.length)]!
  g.add(hqPost(0.04, 0.07, 0.28 + rng() * 0.15, c, 0, 0.18, 0, 5))
  g.add(hqPost(0.03, 0.04, 0.18, c, 0.08, 0.22, 0.04, 4))
  g.add(hqPost(0.03, 0.04, 0.16, c, -0.06, 0.2, -0.05, 4))
  return g
}

function islandDisc(
  radius: number,
  sandColor: number,
  grassColor: number,
  rng: () => number,
): THREE.Group {
  const g = new THREE.Group()
  // Chunky stepped discs (not smooth cylinders)
  const sand = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.08, 0.28, 8),
    hqMat(sandColor),
  )
  sand.position.y = 0.08
  g.add(sand)
  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius * 0.78, 0.22, 7),
    hqMat(grassColor),
  )
  grass.position.y = 0.28
  g.add(grass)
  // Beach rocks
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng() * 0.5
    const r = radius * (0.85 + rng() * 0.15)
    const rock = hqRock(rng, rng() > 0.5 ? P.rock : P.rockWarm)
    rock.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r)
    rock.scale.setScalar(0.7 + rng() * 0.5)
    g.add(rock)
  }
  return g
}

function pierGazebo(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-gazebo'
  // Pier planks toward open water (−Z from island edge)
  for (let i = 0; i < 5; i++) {
    g.add(hqBox(1.4, 0.08, 0.55, P.woodMid, 0, 0.18, -i * 0.55))
  }
  // Posts in water
  for (const x of [-0.55, 0.55]) {
    for (const z of [0, -1.1, -2.2]) {
      g.add(hqPost(0.06, 0.07, 0.55, P.woodDark, x, 0.05, z, 5))
    }
  }
  // Gazebo canopy at pier head
  const gz = -2.4
  for (const [x, z] of [
    [-0.55, gz - 0.4],
    [0.55, gz - 0.4],
    [-0.55, gz + 0.35],
    [0.55, gz + 0.35],
  ] as const) {
    g.add(hqPost(0.05, 0.06, 1.1, P.woodLight, x, 0.7, z, 5))
  }
  g.add(hqBox(1.5, 0.08, 1.2, P.straw, 0, 1.35, gz))
  // Peak
  g.add(hqBox(0.9, 0.08, 0.7, 0xd4b070, 0, 1.48, gz))
  g.add(hqBox(0.12, 0.2, 0.12, P.trimGold, 0, 1.62, gz))
  // Bench
  g.add(hqBox(0.9, 0.08, 0.28, P.woodMid, 0, 0.42, gz + 0.1))
  return g
}

function returnPortalMarker(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-return-portal'
  g.add(hqPost(0.08, 0.1, 1.4, P.woodDark, -0.45, 0.7, 0, 5))
  g.add(hqPost(0.08, 0.1, 1.4, P.woodDark, 0.45, 0.7, 0, 5))
  g.add(hqBox(1.1, 0.12, 0.12, P.woodMid, 0, 1.35, 0))
  // Gold portal glow pane
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.75, 1.0),
    hqMat(0xffe080, { emissive: 0xffc020, emissiveIntensity: 0.85, transparent: true, opacity: 0.85 }),
  )
  pane.position.set(0, 0.75, 0.02)
  pane.userData.specialHostGlow = true
  pane.userData.glowBaseIntensity = 0.85
  g.add(pane)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 8),
    hqMat(0xffd060, { emissive: 0xffa020, emissiveIntensity: 0.7, side: THREE.DoubleSide }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.06
  ring.userData.specialHostGlow = true
  ring.userData.glowBaseIntensity = 0.7
  g.add(ring)
  // Small jade chop on the lintel
  g.add(hqBox(0.22, 0.18, 0.06, 0x3dcfb6, 0, 1.5, 0.08))
  return g
}

function dressIsland(
  root: THREE.Group,
  island: (typeof GUAN_ISLANDS)[number],
  rng: () => number,
  heavy: boolean,
) {
  const palms = heavy ? 5 : 3
  for (let i = 0; i < palms; i++) {
    const a = (i / palms) * Math.PI * 2 + rng() * 0.4
    const r = island.r * (0.35 + rng() * 0.4)
    const p = palmTree(rng)
    p.position.set(island.x + Math.cos(a) * r, 0.25, island.z + Math.sin(a) * r)
    p.rotation.y = rng() * Math.PI
    root.add(p)
  }
  const shrubs = heavy ? 6 : 3
  for (let i = 0; i < shrubs; i++) {
    const a = rng() * Math.PI * 2
    const r = island.r * (0.2 + rng() * 0.45)
    const flower = rng() > 0.45 ? hibiscus(rng) : birdOfParadise(rng)
    flower.position.set(island.x + Math.cos(a) * r, 0.28, island.z + Math.sin(a) * r)
    root.add(flower)
  }
  for (let i = 0; i < (heavy ? 4 : 2); i++) {
    const a = rng() * Math.PI * 2
    const r = island.r * (0.25 + rng() * 0.35)
    const f = fernClump(rng)
    f.position.set(island.x + Math.cos(a) * r, 0.28, island.z + Math.sin(a) * r)
    root.add(f)
  }
}

/** Static Guan Harbor scene — central paradise + 3 satellites + pier + return portal. */
export function buildGuanHarborScene(): THREE.Group {
  const root = new THREE.Group()
  root.name = 'guan-harbor'
  const rng = mulberry32(0x6775616e) // 'guan'

  for (const island of GUAN_ISLANDS) {
    const disc = islandDisc(
      island.r,
      GUAN_TROPICAL_LOOK.sand,
      island.id === 'central' ? GUAN_TROPICAL_LOOK.grass : 0x2f7a42,
      rng,
    )
    disc.position.set(island.x, 0, island.z)
    disc.name = `guan-island-${island.id}`
    root.add(disc)
    dressIsland(root, island, rng, island.id === 'central')
  }

  // Lagoon rocks + coral tips between islands
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const r = 7.5 + (i % 3) * 1.2
    const rock = hqRock(rng, i % 2 ? 0x7a8078 : 0x6a7080)
    rock.position.set(Math.cos(a) * r, 0.05, 6 + Math.sin(a) * r * 0.7)
    rock.scale.setScalar(0.55 + rng() * 0.4)
    root.add(rock)
    if (i % 2 === 0) {
      const coral = coralTip(rng)
      coral.position.set(Math.cos(a + 0.3) * (r + 0.8), 0.02, 6 + Math.sin(a + 0.3) * (r * 0.7 + 0.5))
      root.add(coral)
    }
  }

  // Gathering pier / gazebo on the south edge of the central island
  const pier = pierGazebo()
  pier.position.set(0.2, 0, 6 - 4.6)
  root.add(pier)

  // Return portal near boat spawn / south lagoon
  const portal = returnPortalMarker()
  portal.position.set(GUAN_RETURN_PORTAL.x, 0, GUAN_RETURN_PORTAL.z)
  portal.rotation.y = Math.PI * 0.15
  root.add(portal)

  // Soft lagoon shelf ring (visual only)
  const shelf = new THREE.Mesh(
    new THREE.RingGeometry(9.5, 11.2, 12),
    hqMat(0xc8b888, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  )
  shelf.rotation.x = -Math.PI / 2
  shelf.position.set(0, 0.04, 6)
  root.add(shelf)

  return root
}
