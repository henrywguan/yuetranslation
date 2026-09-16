/**
 * Guan Harbor · tropical voyage pocket.
 * Land silhouette + landmark layout mirrors classic Karamja geography
 * (Musa Point NE dock, Brimhaven NW, volcano between them, Musa Passage
 * inlet, southern jungle / Tai Bwo Wannai / Shilo, Cairn islet SW) —
 * original low-poly craft only (see RS-LIKE-CRAFT-BIBLE.md). User-facing
 * name stays Guan Harbor / 關港.
 */
import * as THREE from 'three'
import {
  HARBOR_CRAFT_PALETTE as P,
  hqBox,
  hqBoxTex,
  hqCanopy,
  hqCrate,
  hqDoor,
  hqLavaTexture,
  hqMarketStall,
  hqMat,
  hqMatSmooth,
  hqMatTex,
  hqPost,
  hqRock,
  hqStampChairs,
  hqStampClutter,
  hqStoneTexture,
  hqThatchTexture,
  hqWoodTexture,
  hqWindow,
} from './harborCraft'

export const GUAN_HARBOR_META = { en: 'Guan Harbor', zh: '關港' } as const

/** Playable ocean AABB (boat clamp outer fence). */
export const GUAN_HARBOR_BOUNDS = {
  minX: -20,
  maxX: 18,
  minZ: -22,
  maxZ: 24,
} as const

/** Water plane centre / size — keep in sync with createHarborWorld. */
export const GUAN_WATER_PLANE = { x: 0, z: 2, size: 72 } as const

/** Forced sunny tropical look — sky / fog / water (createHarborWorld applies these). */
export const GUAN_TROPICAL_LOOK = {
  sky: 0x6eb8e8,
  fog: 0xa8d8f0,
  fogDensity: 0.0075,
  amb: 0xfff4e8,
  ambI: 1.65,
  sun: 0xffe8c0,
  sunI: 2.55,
  hemiSky: 0xc8e8ff,
  hemiGround: 0x4a8a40,
  hemiI: 1.1,
  water: 0x1a7898,
  waterOpacity: 0.92,
  sand: 0xd8c090,
  grass: 0x1f6a38,
  jungle: 0x165828,
  lagoon: 0x2a98a8,
} as const

/**
 * Named landmark anchors (Karamja layout, compressed to play scale).
 * +Z = north (ferry approach), +X = east.
 */
export const GUAN_LANDMARKS = {
  musaPoint: { x: 9.2, z: 14.5 },
  musaDock: { x: 9.5, z: 16.2 },
  bananaGrove: { x: 7.5, z: 12.2 },
  volcano: { x: -1.2, z: 11.5 },
  brimhaven: { x: -11.2, z: 12.0 },
  brimhavenDock: { x: -13.5, z: 14.2 },
  taiBwoWannai: { x: -2.5, z: -1.5 },
  shipYard: { x: 8.5, z: -3.5 },
  shilo: { x: 1.0, z: -14.0 },
  cairnIsle: { x: -12.5, z: -11.5, r: 2.2 },
  musaPassage: { x: 6.5, z: 3.5 },
} as const

/** Boat spawn just off the Musa Point pier (north approach). */
export const GUAN_BOAT_START = { x: 10.2, z: 19.4 } as const

/** Return portal — Customs at Musa Point (cast off → river / Save Shack). */
export const GUAN_RETURN_PORTAL = {
  id: 'save-shack' as const,
  name: GUAN_HARBOR_META,
  x: 8.2,
  z: 14.8,
  radius: 2.6,
} as const

/**
 * Main island outline (CCW). East-facing notch = Musa Passage separating
 * northern lobe (Musa / volcano / Brimhaven) from southern jungle / Shilo.
 */
export const GUAN_LAND_OUTLINE: readonly { x: number; z: number }[] = [
  { x: 9.0, z: 18.5 }, // Musa Point tip
  { x: 11.5, z: 16.5 },
  { x: 12.5, z: 13.0 },
  { x: 12.0, z: 9.0 },
  { x: 10.5, z: 7.0 }, // passage N lip
  { x: 4.5, z: 5.5 },
  { x: 1.5, z: 4.8 }, // passage inner N
  { x: 1.5, z: 2.2 }, // passage inner S
  { x: 4.5, z: 1.5 },
  { x: 10.5, z: 0.0 }, // passage S lip
  { x: 12.0, z: -3.5 }, // ship yard coast
  { x: 11.0, z: -9.0 },
  { x: 7.5, z: -14.5 },
  { x: 3.0, z: -17.5 }, // Shilo tip
  { x: -2.0, z: -17.0 },
  { x: -6.5, z: -14.0 },
  { x: -10.0, z: -9.5 },
  { x: -12.5, z: -4.0 },
  { x: -14.0, z: 2.0 },
  { x: -14.5, z: 8.0 },
  { x: -15.0, z: 12.5 }, // Brimhaven west
  { x: -12.5, z: 16.0 },
  { x: -7.0, z: 18.0 },
  { x: -2.0, z: 19.0 }, // north of volcano
  { x: 3.5, z: 19.2 },
  { x: 7.0, z: 18.8 },
]

/** @deprecated Prefer GUAN_LAND_OUTLINE + GUAN_LANDMARKS — kept for smoke/compat. */
export const GUAN_ISLANDS = [
  { id: 'musa', x: GUAN_LANDMARKS.musaPoint.x, z: GUAN_LANDMARKS.musaPoint.z, r: 4.2 },
  { id: 'brimhaven', x: GUAN_LANDMARKS.brimhaven.x, z: GUAN_LANDMARKS.brimhaven.z, r: 3.8 },
  { id: 'volcano', x: GUAN_LANDMARKS.volcano.x, z: GUAN_LANDMARKS.volcano.z, r: 3.2 },
  { id: 'shilo', x: GUAN_LANDMARKS.shilo.x, z: GUAN_LANDMARKS.shilo.z, r: 3.5 },
  { id: 'cairn', x: GUAN_LANDMARKS.cairnIsle.x, z: GUAN_LANDMARKS.cairnIsle.z, r: GUAN_LANDMARKS.cairnIsle.r },
] as const

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

function pointInPoly(x: number, z: number, poly: readonly { x: number; z: number }[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]!.x
    const zi = poly[i]!.z
    const xj = poly[j]!.x
    const zj = poly[j]!.z
    const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function distPointSeg(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): { x: number; z: number; d: number } {
  const abx = bx - ax
  const abz = bz - az
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz + 1e-12)))
  const x = ax + abx * t
  const z = az + abz * t
  return { x, z, d: Math.hypot(px - x, pz - z) }
}

function nearestOnOutline(
  x: number,
  z: number,
  poly: readonly { x: number; z: number }[],
): { x: number; z: number; d: number } {
  let best = { x: poly[0]!.x, z: poly[0]!.z, d: Infinity }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const hit = distPointSeg(x, z, a.x, a.z, b.x, b.z)
    if (hit.d < best.d) best = hit
  }
  return best
}

function isCairnLand(x: number, z: number): boolean {
  const c = GUAN_LANDMARKS.cairnIsle
  return Math.hypot(x - c.x, z - c.z) <= c.r * 0.92
}

/** True when (x,z) is on the main island or Cairn islet. */
export function isGuanLand(x: number, z: number): boolean {
  return pointInPoly(x, z, GUAN_LAND_OUTLINE) || isCairnLand(x, z)
}

/** Keep walking sailors on land (snap to nearest shore if they step off). */
export function clampGuanFootTarget(x: number, z: number): { x: number; z: number } {
  if (isGuanLand(x, z)) return { x, z }
  const main = nearestOnOutline(x, z, GUAN_LAND_OUTLINE)
  const c = GUAN_LANDMARKS.cairnIsle
  const cairnD = Math.hypot(x - c.x, z - c.z)
  const cairnShore = Math.abs(cairnD - c.r * 0.85)
  if (cairnShore < main.d) {
    const d = cairnD || 1
    return { x: c.x + ((x - c.x) / d) * c.r * 0.85, z: c.z + ((z - c.z) / d) * c.r * 0.85 }
  }
  // Nudge slightly inland from the edge
  const midX = (GUAN_HARBOR_BOUNDS.minX + GUAN_HARBOR_BOUNDS.maxX) * 0.5
  const midZ = (GUAN_HARBOR_BOUNDS.minZ + GUAN_HARBOR_BOUNDS.maxZ) * 0.35
  const ix = midX - main.x
  const iz = midZ - main.z
  const il = Math.hypot(ix, iz) || 1
  return { x: main.x + (ix / il) * 0.35, z: main.z + (iz / il) * 0.35 }
}

/** Keep the canoe in navigable water (outside land, inside ocean bounds). */
export function clampGuanBoatTarget(x: number, z: number): { x: number; z: number } {
  let cx = Math.min(GUAN_HARBOR_BOUNDS.maxX, Math.max(GUAN_HARBOR_BOUNDS.minX, x))
  let cz = Math.min(GUAN_HARBOR_BOUNDS.maxZ, Math.max(GUAN_HARBOR_BOUNDS.minZ, z))

  if (pointInPoly(cx, cz, GUAN_LAND_OUTLINE)) {
    const edge = nearestOnOutline(cx, cz, GUAN_LAND_OUTLINE)
    const ox = cx - edge.x
    const oz = cz - edge.z
    const ol = Math.hypot(ox, oz)
    if (ol > 1e-4) {
      cx = edge.x - (ox / ol) * 0.7
      cz = edge.z - (oz / ol) * 0.7
    } else {
      cx = edge.x + 0.7
      cz = edge.z
    }
    // If still inland (concave notch), push east into Musa Passage / open sea
    if (pointInPoly(cx, cz, GUAN_LAND_OUTLINE)) {
      cx = Math.max(cx, 11.5)
      cz = GUAN_LANDMARKS.musaPassage.z
    }
  }

  const c = GUAN_LANDMARKS.cairnIsle
  const dx = cx - c.x
  const dz = cz - c.z
  const d = Math.hypot(dx, dz)
  const minR = c.r + 0.55
  if (d < minR && d > 1e-4) {
    const s = minR / d
    cx = c.x + dx * s
    cz = c.z + dz * s
  } else if (d <= 1e-4) {
    cx = c.x + minR
    cz = c.z
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
  g.add(hqCanopy(0.12, 0x4a3020, 0.05, h - 0.05, 0.04))
  return g
}

/** Musa Point banana plant — broad upright leaves + fruit bunch. */
function bananaPlant(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-banana'
  const h = 1.1 + rng() * 0.35
  g.add(hqPost(0.06, 0.1, h, 0x5a7a30, 0, h / 2, 0, 5))
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    const leaf = hqBox(0.12, 0.03, 0.7, 0x3a9a40, 0, h * 0.75, 0)
    leaf.rotation.y = a
    leaf.rotation.x = -0.35
    leaf.position.set(Math.cos(a) * 0.1, h * 0.7, Math.sin(a) * 0.1)
    g.add(leaf)
  }
  g.add(hqBox(0.14, 0.18, 0.1, 0xe8d040, 0.12, h * 0.55, 0))
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

function pineapplePlant(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-pineapple'
  g.add(hqPost(0.04, 0.05, 0.35, 0x3a6a28, 0, 0.2, 0, 4))
  g.add(hqBox(0.16, 0.22, 0.16, 0xd4a020, 0, 0.45, 0))
  g.add(hqBox(0.08, 0.12, 0.04, 0x2a8a38, 0, 0.62, 0))
  if (rng() > 0.3) g.add(hqBox(0.08, 0.12, 0.04, 0x2a8a38, 0.04, 0.6, 0.03))
  return g
}

function thatchHut(rng: () => number, wide = false): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-hut'
  const w = wide ? 1.4 : 1.0
  const d = wide ? 1.1 : 0.85
  const thatch = hqThatchTexture()
  const wood = hqWoodTexture()
  g.add(hqBox(w, 0.7, d, P.plasterWarm, 0, 0.45, 0))
  // Corner posts (value steps)
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      g.add(hqBox(0.07, 0.7, 0.07, P.woodDeep, sx * (w / 2 - 0.02), 0.45, sz * (d / 2 - 0.02)))
    }
  }
  g.add(hqBoxTex(w * 1.15, 0.12, d * 1.15, P.straw, thatch, 0, 0.95, 0))
  g.add(hqBoxTex(w * 0.7, 0.1, d * 0.7, P.strawDark, thatch, 0, 1.1, 0))
  g.add(hqDoor(0.28, 0.45, w * 0.12, 0.32, d * 0.52))
  if (rng() > 0.35) {
    g.add(hqWindow(0.22, 0.2, P.trimGold, P.glass, -w * 0.25, 0.55, d * 0.52))
  }
  g.add(hqBoxTex(w + 0.12, 0.1, d + 0.12, P.stone, hqStoneTexture(), 0, 0.05, 0))
  // Under-eave beam
  g.add(hqBoxTex(w * 0.9, 0.05, 0.06, P.woodMid, wood, 0, 0.82, d * 0.4))
  return g
}

function pirateHouse(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-pirate-house'
  const w = 1.3 + rng() * 0.3
  const wood = hqWoodTexture()
  g.add(hqBox(w, 0.85, 1.1, P.brick, 0, 0.5, 0))
  g.add(hqBox(w * 1.05, 0.12, 1.15, P.brickDark, 0, 0.12, 0))
  g.add(hqBoxTex(w * 1.1, 0.14, 1.2, P.roofClay, hqThatchTexture(), 0, 1.05, 0))
  g.add(hqDoor(0.3, 0.5, 0.15, 0.35, 0.58))
  g.add(hqWindow(0.26, 0.24, P.trimGold, P.glass, -w * 0.28, 0.6, 0.58))
  g.add(hqBox(0.08, 0.35, 0.04, P.ink, w * 0.45, 1.25, 0))
  g.add(hqBox(0.22, 0.12, 0.03, P.banner, w * 0.45, 1.15, 0.02))
  g.add(hqBoxTex(0.2, 0.08, 0.5, P.woodMid, wood, w * 0.35, 0.55, 0.4))
  return g
}

function volcanoCone(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-volcano'
  const rock = P.rock
  const ash = P.ash
  const base = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.2, 7), hqMatSmooth(rock))
  base.position.y = 1.1
  g.add(base)
  const mid = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.6, 6), hqMatSmooth(ash))
  mid.position.y = 2.4
  g.add(mid)
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.35, 0.35, 6),
    hqMat(P.stoneDark),
  )
  rim.position.y = 3.15
  g.add(rim)
  const lava = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 6),
    hqMatTex(P.lava, hqLavaTexture(), {
      emissive: P.lavaDeep,
      emissiveIntensity: 0.9,
      flatShading: false,
    }),
  )
  lava.rotation.x = -Math.PI / 2
  lava.position.y = 3.05
  lava.userData.specialHostGlow = true
  lava.userData.glowBaseIntensity = 0.9
  g.add(lava)
  for (const [x, z] of [
    [-1.6, 0.8],
    [1.4, -0.6],
    [0.2, 1.5],
  ] as const) {
    g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, x, 1.6, z, 4))
  }
  return g
}

function musaPier(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-musa-pier'
  const wood = hqWoodTexture()
  for (let i = 0; i < 6; i++) {
    g.add(hqBoxTex(1.6, 0.08, 0.55, i % 2 ? P.woodMid : P.woodLight, wood, 0, 0.2, i * 0.55))
  }
  // Seam strips between planks
  for (let i = 0; i < 5; i++) {
    g.add(hqBox(1.55, 0.02, 0.04, P.woodDeep, 0, 0.25, i * 0.55 + 0.27))
  }
  for (const x of [-0.6, 0.6]) {
    for (let i = 0; i < 4; i++) {
      g.add(hqPost(0.07, 0.08, 0.55, P.woodDark, x, 0.05, i * 0.7, 5))
    }
  }
  g.add(hqBox(1.2, 0.75, 1.0, P.plasterWarm, 0, 0.5, -0.9))
  g.add(hqBoxTex(1.35, 0.1, 1.15, P.roofTile, hqStoneTexture(), 0, 0.95, -0.9))
  g.add(hqDoor(0.28, 0.48, 0.12, 0.35, -0.35))
  g.add(hqWindow(0.24, 0.22, P.trimGold, P.glass, -0.35, 0.6, -0.35))
  const crate = hqCrate(() => 0.4)
  crate.position.set(0.55, 0.22, 0.8)
  crate.scale.setScalar(0.75)
  g.add(crate)
  return g
}

function brimhavenDock(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-brimhaven-dock'
  const wood = hqWoodTexture()
  for (let i = 0; i < 4; i++) {
    g.add(hqBoxTex(1.2, 0.08, 0.5, i % 2 ? P.woodMid : P.woodLight, wood, 0, 0.18, i * 0.5))
  }
  for (const x of [-0.45, 0.45]) {
    g.add(hqPost(0.06, 0.07, 0.5, P.woodDark, x, 0.05, 0.3, 5))
    g.add(hqPost(0.06, 0.07, 0.5, P.woodDark, x, 0.05, 1.3, 5))
  }
  const crate = hqCrate(() => 0.6)
  crate.position.set(0.35, 0.2, 0.6)
  crate.scale.setScalar(0.65)
  g.add(crate)
  return g
}

function returnPortalMarker(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-return-portal'
  g.add(hqPost(0.08, 0.1, 1.4, P.woodDark, -0.45, 0.7, 0, 5))
  g.add(hqPost(0.08, 0.1, 1.4, P.woodDark, 0.45, 0.7, 0, 5))
  g.add(hqBox(1.1, 0.12, 0.12, P.woodMid, 0, 1.35, 0))
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
  g.add(hqBox(0.22, 0.18, 0.06, 0x3dcfb6, 0, 1.5, 0.08))
  return g
}

function shipHullWreck(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-ship-yard'
  const wood = hqWoodTexture()
  g.add(hqBoxTex(2.4, 0.35, 0.9, P.woodDark, wood, 0, 0.25, 0))
  g.add(hqBoxTex(2.0, 0.25, 0.7, P.woodMid, wood, 0, 0.5, 0))
  g.add(hqPost(0.06, 0.08, 1.4, P.woodLight, 0.3, 1.0, 0, 5))
  if (rng() > 0.3) g.add(hqBox(0.08, 0.9, 0.5, P.trimIvory, 0.3, 1.4, 0.05))
  const crate = hqCrate(rng)
  crate.position.set(-0.8, 0.15, 0.4)
  crate.scale.setScalar(0.7)
  g.add(crate)
  return g
}

function buildLandMesh(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-island-main'

  // Shape is XY; Extrude +Z then rotateX(-90) mirrors Z — feed −z so map north stays +Z.
  const shape = new THREE.Shape()
  const first = GUAN_LAND_OUTLINE[0]!
  shape.moveTo(first.x, -first.z)
  for (let i = 1; i < GUAN_LAND_OUTLINE.length; i++) {
    const p = GUAN_LAND_OUTLINE[i]!
    shape.lineTo(p.x, -p.z)
  }
  shape.closePath()

  const sandGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.28,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  })
  sandGeo.rotateX(-Math.PI / 2)
  const sand = new THREE.Mesh(sandGeo, hqMat(GUAN_TROPICAL_LOOK.sand))
  sand.position.y = 0.02
  g.add(sand)

  // Inset grass plate (scaled about centroid)
  let cx = 0
  let cz = 0
  for (const p of GUAN_LAND_OUTLINE) {
    cx += p.x
    cz += p.z
  }
  cx /= GUAN_LAND_OUTLINE.length
  cz /= GUAN_LAND_OUTLINE.length
  const grassShape = new THREE.Shape()
  const scale = 0.82
  const g0x = cx + (first.x - cx) * scale
  const g0z = cz + (first.z - cz) * scale
  grassShape.moveTo(g0x, -g0z)
  for (let i = 1; i < GUAN_LAND_OUTLINE.length; i++) {
    const p = GUAN_LAND_OUTLINE[i]!
    grassShape.lineTo(cx + (p.x - cx) * scale, -(cz + (p.z - cz) * scale))
  }
  grassShape.closePath()
  const grassGeo = new THREE.ExtrudeGeometry(grassShape, {
    depth: 0.2,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  })
  grassGeo.rotateX(-Math.PI / 2)
  const grass = new THREE.Mesh(grassGeo, hqMat(GUAN_TROPICAL_LOOK.grass))
  grass.position.y = 0.28
  g.add(grass)

  return g
}

function buildCairnIsle(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-island-cairn'
  const c = GUAN_LANDMARKS.cairnIsle
  const sand = new THREE.Mesh(
    new THREE.CylinderGeometry(c.r, c.r * 1.08, 0.28, 7),
    hqMat(GUAN_TROPICAL_LOOK.sand),
  )
  sand.position.y = 0.1
  g.add(sand)
  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(c.r * 0.7, c.r * 0.75, 0.2, 6),
    hqMat(0x2a7a40),
  )
  grass.position.y = 0.28
  g.add(grass)
  const palm = palmTree(rng)
  palm.position.set(0.3, 0.25, -0.2)
  g.add(palm)
  g.add(hqRock(rng, P.rock))
  g.children[g.children.length - 1]!.position.set(-0.8, 0.15, 0.5)
  g.position.set(c.x, 0, c.z)
  return g
}

function scatterJungle(
  root: THREE.Group,
  rng: () => number,
  cx: number,
  cz: number,
  radius: number,
  count: number,
  heavy = false,
) {
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2
    const r = radius * (0.15 + rng() * 0.75)
    const x = cx + Math.cos(a) * r
    const z = cz + Math.sin(a) * r
    if (!isGuanLand(x, z)) continue
    const roll = rng()
    let plant: THREE.Group
    if (roll > 0.55) plant = palmTree(rng)
    else if (roll > 0.3) plant = fernClump(rng)
    else plant = pineapplePlant(rng)
    plant.position.set(x, 0.3, z)
    plant.rotation.y = rng() * Math.PI
    if (heavy) plant.scale.setScalar(0.9 + rng() * 0.35)
    root.add(plant)
  }
}

/** Static Guan Harbor scene — Karamja silhouette + landmark towns. */
export function buildGuanHarborScene(): THREE.Group {
  const root = new THREE.Group()
  root.name = 'guan-harbor'
  const rng = mulberry32(0x6b617261) // 'kara'

  root.add(buildLandMesh())
  root.add(buildCairnIsle(rng))

  // —— Musa Point (NE) ——
  const pier = musaPier()
  pier.position.set(GUAN_LANDMARKS.musaDock.x, 0, GUAN_LANDMARKS.musaDock.z)
  root.add(pier)

  const portal = returnPortalMarker()
  portal.position.set(GUAN_RETURN_PORTAL.x, 0, GUAN_RETURN_PORTAL.z)
  portal.rotation.y = Math.PI * 0.1
  root.add(portal)

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const r = 1.2 + (i % 3) * 0.55
    const ban = bananaPlant(rng)
    ban.position.set(
      GUAN_LANDMARKS.bananaGrove.x + Math.cos(a) * r,
      0.3,
      GUAN_LANDMARKS.bananaGrove.z + Math.sin(a) * r * 0.7,
    )
    root.add(ban)
  }

  // —— Volcano (between Musa & Brimhaven) ——
  const volcano = volcanoCone()
  volcano.position.set(GUAN_LANDMARKS.volcano.x, 0, GUAN_LANDMARKS.volcano.z)
  root.add(volcano)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const rock = hqRock(rng, i % 2 ? 0x4a4540 : P.rock)
    rock.position.set(
      GUAN_LANDMARKS.volcano.x + Math.cos(a) * (3.6 + rng() * 0.6),
      0.15,
      GUAN_LANDMARKS.volcano.z + Math.sin(a) * (3.6 + rng() * 0.6),
    )
    rock.scale.setScalar(0.8 + rng() * 0.5)
    root.add(rock)
  }

  // —— Brimhaven (NW pirate town) ——
  for (let i = 0; i < 5; i++) {
    const house = pirateHouse(rng)
    const a = (i / 5) * Math.PI * 1.2 - 0.4
    house.position.set(
      GUAN_LANDMARKS.brimhaven.x + Math.cos(a) * 1.8,
      0.28,
      GUAN_LANDMARKS.brimhaven.z + Math.sin(a) * 1.5,
    )
    house.rotation.y = a + Math.PI
    root.add(house)
  }
  const bDock = brimhavenDock()
  bDock.position.set(GUAN_LANDMARKS.brimhavenDock.x, 0, GUAN_LANDMARKS.brimhavenDock.z)
  bDock.rotation.y = -0.6
  root.add(bDock)
  for (let i = 0; i < 4; i++) {
    const pine = pineapplePlant(rng)
    pine.position.set(
      GUAN_LANDMARKS.brimhaven.x + 1.5 + rng() * 2,
      0.3,
      GUAN_LANDMARKS.brimhaven.z - 2.5 - rng() * 2,
    )
    root.add(pine)
  }

  // —— Tai Bwo Wannai (central southern jungle village) ——
  for (let i = 0; i < 4; i++) {
    const hut = thatchHut(rng, i === 0)
    const a = (i / 4) * Math.PI * 2
    hut.position.set(
      GUAN_LANDMARKS.taiBwoWannai.x + Math.cos(a) * 1.6,
      0.28,
      GUAN_LANDMARKS.taiBwoWannai.z + Math.sin(a) * 1.6,
    )
    hut.rotation.y = a + Math.PI
    root.add(hut)
  }
  // Cooking fire
  const fire = hqBox(0.35, 0.15, 0.35, 0x3a3020, 0, 0.35, 0)
  fire.position.set(GUAN_LANDMARKS.taiBwoWannai.x, 0.28, GUAN_LANDMARKS.taiBwoWannai.z)
  root.add(fire)
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.35, 4),
    hqMat(0xff8020, { emissive: 0xff5010, emissiveIntensity: 0.8 }),
  )
  flame.position.set(GUAN_LANDMARKS.taiBwoWannai.x, 0.55, GUAN_LANDMARKS.taiBwoWannai.z)
  flame.userData.specialHostGlow = true
  flame.userData.glowBaseIntensity = 0.8
  root.add(flame)

  // —— Ship Yard (SE coast, south of Musa Passage) ——
  const ship = shipHullWreck(rng)
  ship.position.set(GUAN_LANDMARKS.shipYard.x, 0.15, GUAN_LANDMARKS.shipYard.z)
  ship.rotation.y = 0.4
  root.add(ship)

  // —— Shilo Village (southern tip) ——
  for (let i = 0; i < 5; i++) {
    const hut = thatchHut(rng, i % 2 === 0)
    const a = (i / 5) * Math.PI * 2
    hut.position.set(
      GUAN_LANDMARKS.shilo.x + Math.cos(a) * 1.8,
      0.28,
      GUAN_LANDMARKS.shilo.z + Math.sin(a) * 1.5,
    )
    hut.rotation.y = a + Math.PI
    root.add(hut)
  }

  // Jungle fill — northern fringe, passage banks, southern canopy
  scatterJungle(root, rng, GUAN_LANDMARKS.volcano.x, GUAN_LANDMARKS.volcano.z - 4, 5, 10)
  scatterJungle(root, rng, GUAN_LANDMARKS.taiBwoWannai.x, GUAN_LANDMARKS.taiBwoWannai.z, 6, 18, true)
  scatterJungle(root, rng, GUAN_LANDMARKS.shilo.x, GUAN_LANDMARKS.shilo.z + 4, 5, 12, true)
  scatterJungle(root, rng, -8, 4, 4, 8)
  scatterJungle(root, rng, 6, 10, 3.5, 6)

  // Musa Passage shoreline rocks
  for (let i = 0; i < 5; i++) {
    const rock = hqRock(rng, i % 2 ? P.rock : P.rockWarm)
    rock.position.set(3.5 + i * 1.2, 0.08, 3.5 + (i % 2) * 0.8)
    rock.scale.setScalar(0.55 + rng() * 0.4)
    root.add(rock)
  }

  // Grapple islet in Musa Passage (visual only)
  const grapple = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.85, 0.35, 6),
    hqMatSmooth(0x6a7060),
  )
  grapple.position.set(GUAN_LANDMARKS.musaPassage.x, 0.12, GUAN_LANDMARKS.musaPassage.z)
  grapple.name = 'guan-grapple-isle'
  root.add(grapple)
  const strongTree = palmTree(rng)
  strongTree.position.set(GUAN_LANDMARKS.musaPassage.x, 0.25, GUAN_LANDMARKS.musaPassage.z)
  strongTree.scale.setScalar(0.75)
  root.add(strongTree)

  // Clutter density — crates / barrels / sacks / fence bits at towns (RS “detail”)
  hqStampClutter(root, rng, GUAN_LANDMARKS.musaPoint.x, GUAN_LANDMARKS.musaPoint.z, 3.2, 5, isGuanLand)
  hqStampClutter(root, rng, GUAN_LANDMARKS.brimhaven.x, GUAN_LANDMARKS.brimhaven.z, 3.5, 6, isGuanLand)
  hqStampClutter(root, rng, GUAN_LANDMARKS.taiBwoWannai.x, GUAN_LANDMARKS.taiBwoWannai.z, 2.8, 4, isGuanLand)
  hqStampClutter(root, rng, GUAN_LANDMARKS.shilo.x, GUAN_LANDMARKS.shilo.z, 3.0, 5, isGuanLand)
  hqStampClutter(root, rng, GUAN_LANDMARKS.shipYard.x, GUAN_LANDMARKS.shipYard.z, 2.2, 3, isGuanLand)

  // Sit-able chairs / stools around town plazas
  hqStampChairs(root, [
    { x: GUAN_LANDMARKS.musaPoint.x - 1.6, z: GUAN_LANDMARKS.musaPoint.z + 0.8, yaw: Math.PI * 0.15 },
    { x: GUAN_LANDMARKS.musaPoint.x - 2.2, z: GUAN_LANDMARKS.musaPoint.z - 0.4, yaw: -0.4, stool: true },
    { x: GUAN_LANDMARKS.musaDock.x - 1.1, z: GUAN_LANDMARKS.musaDock.z - 0.8, yaw: Math.PI },
    { x: GUAN_LANDMARKS.brimhaven.x + 1.4, z: GUAN_LANDMARKS.brimhaven.z - 0.6, yaw: 0.9 },
    { x: GUAN_LANDMARKS.brimhaven.x + 0.6, z: GUAN_LANDMARKS.brimhaven.z + 1.5, yaw: Math.PI * 1.1, stool: true },
    { x: GUAN_LANDMARKS.brimhaven.x - 1.2, z: GUAN_LANDMARKS.brimhaven.z + 0.4, yaw: -0.3 },
    { x: GUAN_LANDMARKS.taiBwoWannai.x + 1.3, z: GUAN_LANDMARKS.taiBwoWannai.z + 0.9, yaw: Math.PI * 0.7 },
    { x: GUAN_LANDMARKS.taiBwoWannai.x - 1.1, z: GUAN_LANDMARKS.taiBwoWannai.z - 0.8, yaw: -0.5, stool: true },
    { x: GUAN_LANDMARKS.shilo.x + 1.5, z: GUAN_LANDMARKS.shilo.z + 0.5, yaw: Math.PI * 0.2 },
    { x: GUAN_LANDMARKS.shilo.x - 1.0, z: GUAN_LANDMARKS.shilo.z + 1.2, yaw: Math.PI * 1.2, stool: true },
    { x: GUAN_LANDMARKS.shipYard.x - 1.4, z: GUAN_LANDMARKS.shipYard.z + 0.6, yaw: Math.PI * 0.85 },
    { x: GUAN_LANDMARKS.bananaGrove.x + 0.8, z: GUAN_LANDMARKS.bananaGrove.z - 1.2, yaw: -0.2, stool: true },
  ], rng)

  const stall = hqMarketStall(rng)
  stall.position.set(GUAN_LANDMARKS.brimhaven.x + 2.2, 0.28, GUAN_LANDMARKS.brimhaven.z - 1.2)
  stall.rotation.y = 0.6
  root.add(stall)

  const musaStall = hqMarketStall(rng)
  musaStall.position.set(GUAN_LANDMARKS.bananaGrove.x - 1.8, 0.28, GUAN_LANDMARKS.bananaGrove.z + 0.5)
  musaStall.rotation.y = -0.4
  root.add(musaStall)

  return root
}
