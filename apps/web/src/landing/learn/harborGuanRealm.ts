/**
 * Guan Harbor · tropical voyage pocket.
 * Land silhouette + landmark layout mirrors classic Karamja geography
 * (Musa Point NE dock, Brimhaven NW, volcano between them, Musa Passage
 * inlet, southern jungle / Tai Bwo Wannai / Shilo, Cairn islet SW) —
 * original low-poly craft only (see RS-LIKE-CRAFT-BIBLE.md). User-facing
 * name stays Guan Harbor / 關港.
 *
 * Fidelity goal: dense grass tufts, multi-band shore / water, chunky town
 * buildings — a simulated tropical island you *run through*, not a sketch.
 */
import * as THREE from 'three'
import {
  HARBOR_CRAFT_PALETTE as P,
  hqBox,
  hqBoxTex,
  hqCanopy,
  hqCrate,
  hqDirtTexture,
  hqDoor,
  hqFence,
  hqGrassTexture,
  hqLavaTexture,
  hqMarketStall,
  hqMat,
  hqMatSmooth,
  hqMatTex,
  hqPondTexture,
  hqPost,
  hqRock,
  hqSandTexture,
  hqSnap,
  hqStampChairs,
  hqStampClutter,
  hqStoneTexture,
  hqThatchTexture,
  hqWoodTexture,
  hqWindow,
} from './harborCraft'
import { stampGuanArmoredPatrol } from './harborGuanPatrol'
import { buildNametagSprite } from './harborRemoteAvatars'

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
  fogDensity: 0.0065,
  amb: 0xfff4e8,
  ambI: 1.7,
  sun: 0xffe8c0,
  sunI: 2.65,
  hemiSky: 0xc8e8ff,
  hemiGround: 0x4a8a40,
  hemiI: 1.15,
  /** Deep ocean plate */
  water: 0x146888,
  waterOpacity: 0.94,
  sand: 0xd8c090,
  sandWet: 0xb89868,
  grass: 0x2a7a40,
  grassLite: 0x4a9a50,
  grassBlade: 0x6ab058,
  grassDeep: 0x1a5a30,
  /** Tan herb stalk + cream trifurcated crown (Habitat meadow read — original). */
  herbStalk: 0xd4b878,
  herbStalkDeep: 0xb89858,
  herbCrown: 0xf5f0e0,
  jungle: 0x165828,
  jungleDeep: 0x0e4820,
  dirt: 0x7a5830,
  dirtRich: 0x5a3e22,
  lagoon: 0x2a98a8,
  /** Shallow meadow pond (Habitat clearing read). */
  pond: 0x7a9ab0,
  pondDeep: 0x5a8098,
  stone: 0x8a8680,
  stoneLite: 0xa8a49a,
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
  /** Inland of the pier so stepping onto the dock does not auto-open Customs. */
  x: 7.0,
  z: 13.4,
  /** Tight stand-in radius — tap the officer / portal to open; pier stays clear. */
  radius: 1.05,
} as const

/** Display name above the Guan Customs officer. */
export const GUAN_CUSTOMS_OFFICER_NAME = '關吏 · Customs' as const

/**
 * Cape Loom — Brimhaven town trimmer (skillcape base claim + 10k coin trim).
 * Walkable landmark; tap the Trimmer NPC or stand in radius to open the panel.
 */
export const GUAN_CAPE_LOOM = {
  id: 'cape-loom' as const,
  name: { en: 'Cape Loom', zh: '披風金邊' },
  /** East of the Brimhaven tavern — cloth stall on the town path. */
  x: GUAN_LANDMARKS.brimhaven.x + 1.45,
  z: GUAN_LANDMARKS.brimhaven.z - 1.15,
  radius: 1.2,
} as const

/** Display name above the Guan Cape Trimmer. */
export const GUAN_CAPE_TRIMMER_NAME = '補邊匠 · Trimmer' as const

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

/**
 * Walkable terrace tops (OSRS-style height layers).
 * Sand → grass → jungle / ash — mesh tops and foot Y must stay in sync.
 */
export const GUAN_HEIGHT = {
  sand: 0.2,
  grass: 0.46,
  jungle: 0.72,
  ash: 0.8,
  cairnSand: 0.18,
  cairnGrass: 0.4,
} as const

function scaledOutline(scale: number): { x: number; z: number }[] {
  const c = outlineCentroid()
  return GUAN_LAND_OUTLINE.map((p) => ({
    x: c.x + (p.x - c.x) * scale,
    z: c.z + (p.z - c.z) * scale,
  }))
}

function inScaledOutline(x: number, z: number, scale: number): boolean {
  return pointInPoly(x, z, scaledOutline(scale))
}

/**
 * Foot / prop ground height for Guan Harbor.
 * Outside land returns 0 (ocean). Never let the scout sink through a terrace.
 */
export function guanGroundY(x: number, z: number): number {
  const cairn = GUAN_LANDMARKS.cairnIsle
  const cd = Math.hypot(x - cairn.x, z - cairn.z)
  if (cd <= cairn.r * 0.92) {
    return cd <= cairn.r * 0.7 ? GUAN_HEIGHT.cairnGrass : GUAN_HEIGHT.cairnSand
  }
  if (!pointInPoly(x, z, GUAN_LAND_OUTLINE)) return 0
  if (Math.hypot(x - GUAN_LANDMARKS.volcano.x, z - GUAN_LANDMARKS.volcano.z) < 4.1) {
    return GUAN_HEIGHT.ash
  }
  if (inScaledOutline(x, z, 0.55)) return GUAN_HEIGHT.jungle
  if (inScaledOutline(x, z, 0.84)) return GUAN_HEIGHT.grass
  return GUAN_HEIGHT.sand
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
  const h = 1.7 + rng() * 1.3
  const lean = (rng() - 0.5) * 0.18
  const trunk = hqPost(0.05, 0.1, h, 0x6a4a28, 0, h / 2, 0, 5)
  trunk.rotation.z = lean
  g.add(trunk)
  // Trunk ring bands (value steps — era “detail without verts”)
  for (let i = 0; i < 3; i++) {
    const y = h * (0.25 + i * 0.22)
    g.add(hqBox(0.14 + i * 0.02, 0.05, 0.14 + i * 0.02, i % 2 ? P.woodDark : P.woodDeep, lean * y * 0.3, y, 0))
  }
  const leaf = 0x2a8a40
  const leafLite = 0x3aaa50
  const leafDeep = 0x1a6a30
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.25
    const frond = hqBox(0.07, 0.035, 0.62 + rng() * 0.28, i % 3 === 0 ? leafDeep : i % 2 ? leaf : leafLite, 0, h + 0.05, 0)
    frond.rotation.y = a
    frond.rotation.x = -0.5 - rng() * 0.35
    frond.position.set(Math.cos(a) * 0.14, h + 0.02, Math.sin(a) * 0.14)
    g.add(frond)
  }
  g.add(hqCanopy(0.14, 0x4a3020, 0.05, h - 0.05, 0.04))
  // Coconut cluster
  if (rng() > 0.35) {
    g.add(hqBox(0.12, 0.1, 0.12, 0x5a3a18, 0.1, h - 0.15, 0.05))
    g.add(hqBox(0.1, 0.09, 0.1, 0x4a3010, -0.08, h - 0.12, 0.08))
  }
  return g
}

/** Musa Point banana plant — broad upright leaves + fruit bunch. */
function bananaPlant(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-banana'
  const h = 1.15 + rng() * 0.4
  g.add(hqPost(0.07, 0.11, h, 0x5a7a30, 0, h / 2, 0, 5))
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const leaf = hqBox(0.14, 0.03, 0.78, i % 2 ? 0x3a9a40 : 0x2a7a30, 0, h * 0.75, 0)
    leaf.rotation.y = a
    leaf.rotation.x = -0.3 - rng() * 0.2
    leaf.position.set(Math.cos(a) * 0.12, h * 0.68, Math.sin(a) * 0.12)
    g.add(leaf)
  }
  g.add(hqBox(0.16, 0.2, 0.12, 0xe8d040, 0.14, h * 0.55, 0))
  g.add(hqBox(0.1, 0.14, 0.08, 0xd0b828, 0.08, h * 0.48, 0.08))
  return g
}

function fernClump(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-fern'
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng() * 0.35
    const fr = hqBox(0.05, 0.02, 0.34 + rng() * 0.14, i % 2 ? 0x2a7a40 : 0x1a5a30, 0, 0.2, 0)
    fr.rotation.y = a
    fr.rotation.x = -0.8 - rng() * 0.25
    fr.position.set(Math.cos(a) * 0.09, 0.18, Math.sin(a) * 0.09)
    g.add(fr)
  }
  return g
}

/**
 * Broad spear-leaf plant — Habitat clearing foreground foliage (original craft).
 */
function spearPlant(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-spear-plant'
  const n = 5 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.4
    const len = 0.42 + rng() * 0.28
    const leaf = hqBox(
      0.1 + rng() * 0.04,
      0.025,
      len,
      i % 2 ? GUAN_TROPICAL_LOOK.grassDeep : GUAN_TROPICAL_LOOK.jungle,
      0,
      0.22,
      0,
    )
    leaf.rotation.y = a
    leaf.rotation.x = -0.55 - rng() * 0.35
    leaf.position.set(Math.cos(a) * 0.08, 0.12 + rng() * 0.1, Math.sin(a) * 0.08)
    g.add(leaf)
  }
  g.add(hqPost(0.03, 0.04, 0.2, GUAN_TROPICAL_LOOK.grassDeep, 0, 0.1, 0, 4))
  return g
}

/** Dark spiky clump — short Habitat scrub near ponds. */
function spikyBush(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-spiky-bush'
  const n = 5 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const h = 0.26 + rng() * 0.24
    g.add(
      grassBlade(
        h,
        i % 2 ? GUAN_TROPICAL_LOOK.grassDeep : GUAN_TROPICAL_LOOK.jungleDeep,
        (rng() - 0.5) * 0.24,
        (rng() - 0.5) * 0.24,
        (rng() - 0.5) * 0.5,
        (rng() - 0.5) * 0.35,
      ),
    )
  }
  return g
}

/**
 * Rounded canopy tree — thick trunk + intersecting leaf blobs
 * (Habitat clearing shade tree — original craft).
 */
function canopyTree(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-canopy-tree'
  const h = 1.35 + rng() * 0.55
  const wood = hqWoodTexture()
  g.add(hqBoxTex(0.22, h, 0.22, P.woodDeep, wood, 0, h / 2, 0))
  g.add(hqBoxTex(0.26, 0.08, 0.26, P.woodDark, wood, 0, h * 0.35, 0))
  // Dense rounded canopy as a few overlapping faceted blobs
  const canopyCols = [GUAN_TROPICAL_LOOK.jungle, GUAN_TROPICAL_LOOK.grassDeep, GUAN_TROPICAL_LOOK.jungleDeep]
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const r = 0.38 + rng() * 0.12
    const blob = hqCanopy(r, canopyCols[i % canopyCols.length]!, Math.cos(a) * 0.22, h + 0.15 + (i % 2) * 0.12, Math.sin(a) * 0.22)
    blob.scale.set(1.1, 0.75 + rng() * 0.2, 1.1)
    g.add(blob)
  }
  g.add(hqCanopy(0.48, GUAN_TROPICAL_LOOK.grassLite, 0, h + 0.35, 0))
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

/** Pointed low-poly blade — single tapered cone (cheap Habitat turf read). */
function grassBlade(
  h: number,
  color: number,
  x: number,
  z: number,
  leanX = 0,
  leanZ = 0,
): THREE.Mesh {
  const w = 0.035 + h * 0.03
  const blade = new THREE.Mesh(new THREE.ConeGeometry(w, h, 3), hqMat(color))
  blade.position.set(hqSnap(x), hqSnap(h / 2), hqSnap(z))
  blade.rotation.z = leanX
  blade.rotation.x = leanZ
  return blade
}

/** Dense RS-style grass tuft — bright blades over mottled turf, readable at foot level. */
function grassTuft(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-grass-tuft'
  // Lean blade count — look stays fuzzy; GPU stays calm
  const n = 3 + Math.floor(rng() * 2)
  for (let i = 0; i < n; i++) {
    const h = 0.22 + rng() * 0.28
    const lite = i % 3 !== 0
    const color = lite
      ? GUAN_TROPICAL_LOOK.grassBlade
      : i % 2
        ? GUAN_TROPICAL_LOOK.grassLite
        : GUAN_TROPICAL_LOOK.grassDeep
    g.add(
      grassBlade(
        h,
        color,
        (rng() - 0.5) * 0.2,
        (rng() - 0.5) * 0.2,
        (rng() - 0.5) * 0.35,
        (rng() - 0.5) * 0.25,
      ),
    )
  }
  return g
}

/**
 * Taller Habitat-style grass clump — broader dark blades + lime tips.
 * Used in meadows / beside dirt patches (original craft, not Jagex meshes).
 */
function tallGrassClump(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-tall-grass'
  const n = 4 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const h = 0.34 + rng() * 0.38
    if (i === 0) {
      const blade = hqBox(
        0.05 + rng() * 0.02,
        h,
        0.018,
        GUAN_TROPICAL_LOOK.grassDeep,
        (rng() - 0.5) * 0.22,
        h / 2,
        (rng() - 0.5) * 0.22,
      )
      blade.rotation.z = (rng() - 0.5) * 0.4
      blade.rotation.x = (rng() - 0.5) * 0.22
      g.add(blade)
    } else {
      g.add(
        grassBlade(
          h,
          i % 2 ? GUAN_TROPICAL_LOOK.grassBlade : GUAN_TROPICAL_LOOK.grassLite,
          (rng() - 0.5) * 0.26,
          (rng() - 0.5) * 0.26,
          (rng() - 0.5) * 0.45,
          (rng() - 0.5) * 0.3,
        ),
      )
    }
  }
  return g
}

/**
 * Meadow herb stalk — segmented tan cane + cream trifurcated crown.
 * Original craft mirroring Habitat soil-bed silhouette (not Jagex meshes).
 */
function herbStalk(rng: () => number, h = 0.85): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-herb-stalk'
  const segs = 3 + Math.floor(rng() * 2)
  const segH = h / segs
  for (let i = 0; i < segs; i++) {
    const y = segH * i + segH * 0.5
    g.add(
      hqBox(
        0.045 - i * 0.004,
        segH * 0.92,
        0.045 - i * 0.004,
        i % 2 ? GUAN_TROPICAL_LOOK.herbStalk : GUAN_TROPICAL_LOOK.herbStalkDeep,
        0,
        y,
        0,
      ),
    )
    // Node ring between segments
    if (i > 0) {
      g.add(hqBox(0.06, 0.025, 0.06, GUAN_TROPICAL_LOOK.herbStalkDeep, 0, segH * i, 0))
    }
  }
  // Cream three-prong crown (reads at distance like Habitat herbs)
  const crownY = h + 0.02
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const petal = hqBox(0.07, 0.03, 0.12, GUAN_TROPICAL_LOOK.herbCrown, 0, crownY, 0.06)
    petal.rotation.y = a
    petal.rotation.x = -0.55
    g.add(petal)
  }
  g.add(hqBox(0.05, 0.04, 0.05, GUAN_TROPICAL_LOOK.herbCrown, 0, crownY, 0))
  g.rotation.z = (rng() - 0.5) * 0.12
  g.rotation.x = (rng() - 0.5) * 0.1
  return g
}

/** Broad green basal leaf under herb beds. */
function basalLeaf(rng: () => number): THREE.Mesh {
  const leaf = hqBox(
    0.08 + rng() * 0.04,
    0.02,
    0.16 + rng() * 0.08,
    rng() > 0.5 ? GUAN_TROPICAL_LOOK.grassDeep : GUAN_TROPICAL_LOOK.grassLite,
    0,
    0.04,
    0.06,
  )
  leaf.rotation.x = -0.35 - rng() * 0.25
  leaf.rotation.y = rng() * Math.PI * 2
  leaf.rotation.z = (rng() - 0.5) * 0.4
  return leaf
}

/**
 * Open braced shipping crate with herb poles leaning out —
 * Habitat meadow prop vignette (original craft).
 */
function habitatCrate(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-habitat-crate'
  const wood = hqWoodTexture()
  const s = 0.42
  // Body — vertical plank feel via wood texel + side boards
  g.add(hqBoxTex(s, s * 0.78, s, P.woodMid, wood, 0, s * 0.39, 0))
  // Dark trim frame
  g.add(hqBox(s * 1.04, 0.04, s * 1.04, P.woodDeep, 0, 0.04, 0))
  g.add(hqBox(s * 1.04, 0.04, s * 1.04, P.woodDeep, 0, s * 0.78, 0))
  // Cross braces on +Z / −Z faces
  for (const side of [-1, 1] as const) {
    const braceA = hqBox(0.04, s * 0.7, 0.03, P.woodDeep, 0, s * 0.4, side * (s * 0.52))
    braceA.rotation.z = 0.55 * side
    g.add(braceA)
    const braceB = hqBox(0.04, s * 0.7, 0.03, P.woodDeep, 0, s * 0.4, side * (s * 0.52))
    braceB.rotation.z = -0.55 * side
    g.add(braceB)
  }
  // Open top rim (no full lid)
  g.add(hqBoxTex(s * 1.02, 0.035, 0.05, P.woodLight, wood, 0, s * 0.8, s * 0.45))
  g.add(hqBoxTex(s * 1.02, 0.035, 0.05, P.woodLight, wood, 0, s * 0.8, -s * 0.45))
  // Herb poles sticking out
  for (let i = 0; i < 3; i++) {
    const stalk = herbStalk(rng, 0.55 + rng() * 0.25)
    stalk.position.set((i - 1) * 0.1, s * 0.55, 0.05 + (i % 2) * 0.06)
    stalk.rotation.x = -0.35 - rng() * 0.25
    stalk.rotation.z = (rng() - 0.5) * 0.3
    stalk.scale.setScalar(0.75)
    g.add(stalk)
  }
  return g
}

/** Irregular oval dirt patch with herb stalks (Habitat soil bed — original craft). */
function dirtPatch(rng: () => number, radius = 0.55): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-dirt-patch'
  const dirt = hqDirtTexture()
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius, 0.07, 7),
    hqMatTex(GUAN_TROPICAL_LOOK.dirtRich, dirt),
  )
  base.position.y = 0.02
  g.add(base)
  // Jagged rim — overlapping disks so the edge isn't a perfect circle
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng() * 0.4
    const r = radius * (0.55 + rng() * 0.35)
    const blob = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.45, r * 0.5, 0.05, 6),
      hqMatTex(GUAN_TROPICAL_LOOK.dirt, dirt),
    )
    blob.position.set(Math.cos(a) * radius * 0.55, 0.025, Math.sin(a) * radius * 0.55)
    g.add(blob)
  }
  // Broad green leaves at the soil line
  const leafN = 4 + Math.floor(rng() * 3)
  for (let i = 0; i < leafN; i++) {
    const leaf = basalLeaf(rng)
    const a = (i / leafN) * Math.PI * 2 + rng() * 0.3
    leaf.position.set(Math.cos(a) * radius * 0.35, 0.03, Math.sin(a) * radius * 0.35)
    g.add(leaf)
  }
  // Cluster of tan herb stalks with cream crowns
  const stalks = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < stalks; i++) {
    const stalk = herbStalk(rng, 0.7 + rng() * 0.45)
    stalk.position.set((rng() - 0.5) * radius * 0.7, 0.04, (rng() - 0.5) * radius * 0.7)
    stalk.scale.setScalar(0.85 + rng() * 0.25)
    g.add(stalk)
  }
  // A little green grass mixed at the bed edge
  if (rng() > 0.35) {
    const edge = tallGrassClump(rng)
    edge.position.set(radius * 0.55, 0.04, (rng() - 0.5) * 0.2)
    edge.scale.setScalar(0.55)
    g.add(edge)
  }
  return g
}

function bush(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-bush'
  g.add(hqCanopy(0.28 + rng() * 0.12, GUAN_TROPICAL_LOOK.jungle, 0, 0.28, 0))
  g.add(hqCanopy(0.2, GUAN_TROPICAL_LOOK.grassLite, 0.12, 0.35, 0.08))
  if (rng() > 0.5) g.add(hqBox(0.08, 0.06, 0.08, 0xc04040, 0.1, 0.4, -0.05))
  return g
}

function thatchHut(rng: () => number, wide = false): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-hut'
  const w = wide ? 1.55 : 1.1
  const d = wide ? 1.25 : 0.95
  const thatch = hqThatchTexture()
  const wood = hqWoodTexture()
  const stone = hqStoneTexture()
  // Raised stilts / plinth
  g.add(hqBoxTex(w + 0.2, 0.14, d + 0.2, P.stone, stone, 0, 0.08, 0))
  g.add(hqBox(w, 0.78, d, P.plasterWarm, 0, 0.52, 0))
  g.add(hqBox(w * 0.98, 0.06, d * 0.98, P.plaster, 0, 0.88, 0))
  // Corner posts (value steps)
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      g.add(hqBoxTex(0.08, 0.85, 0.08, P.woodDeep, wood, sx * (w / 2 - 0.02), 0.5, sz * (d / 2 - 0.02)))
    }
  }
  // Layered thatch roof (chunky eaves)
  g.add(hqBoxTex(w * 1.28, 0.14, d * 1.28, P.straw, thatch, 0, 1.0, 0))
  g.add(hqBoxTex(w * 0.95, 0.12, d * 0.95, P.strawLite, thatch, 0, 1.14, 0))
  g.add(hqBoxTex(w * 0.55, 0.1, d * 0.55, P.strawDark, thatch, 0, 1.26, 0))
  g.add(hqDoor(0.3, 0.5, w * 0.1, 0.35, d * 0.52))
  g.add(hqWindow(0.24, 0.22, P.trimGold, P.glass, -w * 0.28, 0.58, d * 0.52))
  if (rng() > 0.4) {
    g.add(hqWindow(0.2, 0.18, P.trimGold, P.glass, w * 0.28, 0.58, d * 0.52))
  }
  // Under-eave beams + side shutter strip
  g.add(hqBoxTex(w * 0.95, 0.05, 0.06, P.woodMid, wood, 0, 0.9, d * 0.42))
  g.add(hqBoxTex(0.06, 0.05, d * 0.8, P.woodMid, wood, w * 0.42, 0.9, 0))
  // Yard fence stub
  if (rng() > 0.45) {
    const fence = hqFence(2)
    fence.position.set(w * 0.55, 0.05, -d * 0.2)
    fence.rotation.y = Math.PI * 0.5
    fence.scale.setScalar(0.75)
    g.add(fence)
  }
  return g
}

function pirateHouse(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-pirate-house'
  const w = 1.35 + rng() * 0.35
  const d = 1.15 + rng() * 0.15
  const wood = hqWoodTexture()
  const stone = hqStoneTexture()
  g.add(hqBoxTex(w + 0.15, 0.16, d + 0.15, P.stoneDark, stone, 0, 0.08, 0))
  g.add(hqBox(w, 0.95, d, P.brick, 0, 0.58, 0))
  // Course banding
  g.add(hqBox(w * 1.02, 0.08, d * 1.02, P.brickDark, 0, 0.35, 0))
  g.add(hqBox(w * 1.02, 0.06, d * 1.02, P.brickDark, 0, 0.75, 0))
  g.add(hqBoxTex(w * 1.18, 0.16, d * 1.18, P.roofClay, hqThatchTexture(), 0, 1.18, 0))
  g.add(hqBox(w * 0.7, 0.1, d * 0.7, P.roofTile, 0, 1.32, 0))
  g.add(hqDoor(0.32, 0.55, 0.12, 0.38, d * 0.52))
  g.add(hqWindow(0.28, 0.26, P.trimGold, P.glass, -w * 0.3, 0.68, d * 0.52))
  g.add(hqWindow(0.22, 0.22, P.trimGold, P.glass, w * 0.32, 0.7, d * 0.52))
  // Chimney + flag
  g.add(hqBox(0.22, 0.45, 0.22, P.brickDark, w * 0.35, 1.45, -d * 0.15))
  g.add(hqBox(0.08, 0.4, 0.04, P.ink, w * 0.48, 1.4, d * 0.15))
  g.add(hqBox(0.24, 0.14, 0.03, P.banner, w * 0.48, 1.28, d * 0.18))
  // Balcony plank
  g.add(hqBoxTex(w * 0.45, 0.08, 0.55, P.woodMid, wood, w * 0.2, 0.72, d * 0.45))
  g.add(hqPost(0.04, 0.05, 0.45, P.woodDark, w * 0.05, 0.95, d * 0.65, 5))
  g.add(hqPost(0.04, 0.05, 0.45, P.woodDark, w * 0.35, 0.95, d * 0.65, 5))
  return g
}

/** Larger Brimhaven tavern block — chunky RS pub silhouette. */
function pirateTavern(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-tavern'
  const wood = hqWoodTexture()
  const stone = hqStoneTexture()
  g.add(hqBoxTex(2.4, 0.18, 1.8, P.stone, stone, 0, 0.1, 0))
  g.add(hqBox(2.2, 1.15, 1.6, P.brick, 0, 0.7, 0))
  g.add(hqBox(2.25, 0.1, 1.65, P.brickDark, 0, 0.4, 0))
  g.add(hqBoxTex(2.5, 0.2, 1.9, P.roofClay, hqThatchTexture(), 0, 1.4, 0))
  g.add(hqBox(1.4, 0.12, 1.1, P.roofTile, 0, 1.58, 0))
  g.add(hqDoor(0.36, 0.65, 0, 0.42, 0.85))
  g.add(hqWindow(0.32, 0.3, P.trimGold, P.glass, -0.7, 0.8, 0.85))
  g.add(hqWindow(0.32, 0.3, P.trimGold, P.glass, 0.7, 0.8, 0.85))
  g.add(hqBoxTex(1.0, 0.1, 0.7, P.woodMid, wood, 0, 0.55, 0.95))
  g.add(hqBox(0.5, 0.35, 0.08, P.banner, 0, 1.55, 0.2))
  g.add(hqPost(0.06, 0.07, 1.6, P.woodDark, -1.0, 0.85, 0.95, 5))
  g.add(hqPost(0.06, 0.07, 1.6, P.woodDark, 1.0, 0.85, 0.95, 5))
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
  // Longer chunky pier into the approach water
  for (let i = 0; i < 8; i++) {
    g.add(hqBoxTex(1.85, 0.1, 0.55, i % 2 ? P.woodMid : P.woodLight, wood, 0, 0.22, i * 0.55))
  }
  for (let i = 0; i < 7; i++) {
    g.add(hqBox(1.8, 0.025, 0.04, P.woodDeep, 0, 0.28, i * 0.55 + 0.27))
  }
  // Side rails
  for (const x of [-0.85, 0.85]) {
    for (let i = 0; i < 5; i++) {
      g.add(hqPost(0.06, 0.08, 0.7, P.woodDark, x, 0.15, i * 0.85, 5))
      g.add(hqBoxTex(0.08, 0.06, 0.75, P.woodMid, wood, x, 0.55, i * 0.85 + 0.35))
    }
  }
  // Customs shed
  g.add(hqBox(1.35, 0.85, 1.15, P.plasterWarm, 0, 0.55, -1.05))
  g.add(hqBoxTex(1.5, 0.12, 1.3, P.roofTile, hqStoneTexture(), 0, 1.05, -1.05))
  g.add(hqDoor(0.3, 0.52, 0.1, 0.38, -0.42))
  g.add(hqWindow(0.26, 0.24, P.trimGold, P.glass, -0.4, 0.65, -0.42))
  g.add(hqWindow(0.22, 0.2, P.trimGold, P.glass, 0.4, 0.65, -0.42))
  const crate = hqCrate(() => 0.4)
  crate.position.set(0.6, 0.25, 1.0)
  crate.scale.setScalar(0.8)
  g.add(crate)
  const crate2 = hqCrate(() => 0.2)
  crate2.position.set(-0.55, 0.25, 1.6)
  crate2.scale.setScalar(0.7)
  g.add(crate2)
  return g
}

function brimhavenDock(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-brimhaven-dock'
  const wood = hqWoodTexture()
  for (let i = 0; i < 5; i++) {
    g.add(hqBoxTex(1.35, 0.1, 0.5, i % 2 ? P.woodMid : P.woodLight, wood, 0, 0.2, i * 0.5))
  }
  for (const x of [-0.55, 0.55]) {
    for (let i = 0; i < 3; i++) {
      g.add(hqPost(0.06, 0.07, 0.55, P.woodDark, x, 0.08, 0.25 + i * 0.7, 5))
    }
  }
  const crate = hqCrate(() => 0.6)
  crate.position.set(0.4, 0.22, 0.7)
  crate.scale.setScalar(0.7)
  g.add(crate)
  return g
}

function returnPortalMarker(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-return-portal'

  // Glowing jade/gold portal arch (cast-off gate)
  g.add(hqPost(0.1, 0.12, 1.65, P.woodDark, -0.55, 0.82, 0, 5))
  g.add(hqPost(0.1, 0.12, 1.65, P.woodDark, 0.55, 0.82, 0, 5))
  g.add(hqBox(1.35, 0.14, 0.14, P.trimGold, 0, 1.6, 0))
  g.add(hqBox(1.2, 0.06, 0.1, P.jade, 0, 1.48, 0.02))

  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.25),
    hqMat(0x5ec8e0, {
      emissive: 0x3dcfb6,
      emissiveIntensity: 1.15,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    }),
  )
  pane.position.set(0, 0.85, 0.02)
  pane.userData.specialHostGlow = true
  pane.userData.glowBaseIntensity = 1.15
  pane.name = 'guan-portal-veil'
  g.add(pane)

  // Second shimmer plane (offset) for richer glow without heavy shaders
  const shimmer = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 1.05),
    hqMat(0xffe080, {
      emissive: 0xffc020,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }),
  )
  shimmer.position.set(0, 0.85, -0.03)
  shimmer.userData.specialHostGlow = true
  shimmer.userData.glowBaseIntensity = 0.9
  g.add(shimmer)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.95, 10),
    hqMat(0xffd060, {
      emissive: 0xffa020,
      emissiveIntensity: 0.95,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.05
  ring.userData.specialHostGlow = true
  ring.userData.glowBaseIntensity = 0.95
  g.add(ring)

  const portalLight = new THREE.PointLight(0x5ec8e0, 1.8, 8, 2)
  portalLight.position.set(0, 1.0, 0.35)
  portalLight.userData.harborLanternLight = true
  portalLight.userData.baseIntensity = 1.8
  portalLight.userData.portalGlow = true
  g.add(portalLight)

  g.add(hqBox(0.28, 0.2, 0.08, 0x3dcfb6, 0, 1.72, 0.1))
  g.add(hqBox(0.5, 0.08, 0.06, P.trimGold, 0, 1.72, 0.12))

  // Unique Customs officer — tropical kit, distinct from river Save Keeper
  const officer = customsOfficer()
  officer.position.set(0.95, 0, 0.55)
  officer.rotation.y = -0.55
  g.add(officer)

  return g
}

/**
 * Guan Customs officer — talkable landmark host (opens Save / cast-off panel).
 * Unique tropical silhouette + username plate + Talk bubble.
 */
function customsOfficer(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-customs-officer'
  // Reuse save-shack landmark id so Talk opens the cast-off / Save panel
  g.userData.landmarkHost = 'save-shack'
  g.userData.hasDialogue = true
  g.userData.specialNpc = true
  g.userData.npc = 'save-shack'

  const skin = hqMat(P.skin)
  // Legs + sandals
  for (const sx of [-0.1, 0.1] as const) {
    g.add(hqPost(0.06, 0.07, 0.4, 0x2a4a58, sx, 0.22, 0))
    g.add(hqBox(0.11, 0.07, 0.16, P.woodDark, sx, 0.04, 0.03))
  }
  // Teal customs tunic + ivory sash (distinct from river vault keeper)
  g.add(hqBox(0.38, 0.5, 0.26, 0x1a6870, 0, 0.64, 0))
  g.add(hqBox(0.4, 0.1, 0.28, P.trimIvory, 0, 0.52, 0))
  g.add(hqBox(0.42, 0.08, 0.08, P.jade, 0, 0.88, 0.12))
  // Clipboard
  g.add(hqBox(0.14, 0.18, 0.03, P.woodLight, 0.28, 0.7, 0.14))
  g.add(hqBox(0.1, 0.12, 0.02, 0xfff8ec, 0.28, 0.7, 0.16))
  for (const sx of [-1, 1] as const) {
    g.add(hqPost(0.055, 0.065, 0.34, 0x1a6870, sx * 0.24, 0.72, 0))
    g.add(hqBox(0.1, 0.1, 0.1, P.skin, sx * 0.24, 0.52, 0.02))
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), skin)
  head.position.y = 1.1
  g.add(head)
  // Straw customs hat
  g.add(hqBox(0.42, 0.05, 0.42, P.straw, 0, 1.24, 0))
  g.add(hqPost(0.12, 0.14, 0.12, P.strawLite, 0, 1.32, 0, 6))
  g.add(hqBox(0.08, 0.04, 0.2, P.trimGold, 0, 1.22, 0.18))

  // Username plate — canvas sprite in browser; mesh placard for smoke / SSR
  if (typeof document !== 'undefined') {
    const tag = buildNametagSprite(GUAN_CUSTOMS_OFFICER_NAME)
    tag.name = 'npc-nametag'
    tag.userData.npcNametag = true
    tag.position.set(0, 1.95, 0)
    tag.scale.set(1.85, 0.4, 1)
    g.add(tag)
  } else {
    const plate = hqBox(0.85, 0.16, 0.04, 0x1a2830, 0, 1.95, 0)
    plate.name = 'npc-nametag'
    plate.userData.npcNametag = true
    g.add(plate)
    g.add(hqBox(0.78, 0.1, 0.03, P.trimGold, 0, 1.95, 0.02))
  }

  // Talk cue bubble
  const bubble = new THREE.Group()
  bubble.name = 'speech-bubble'
  bubble.userData.speechBubble = true
  bubble.userData.billboard = true
  bubble.userData.hasDialogue = true
  bubble.userData.landmarkHost = 'save-shack'
  bubble.add(hqBox(0.44, 0.32, 0.08, 0xfff8ec, 0, 0.1, 0))
  bubble.add(hqBox(0.48, 0.05, 0.09, 0xe8d8c0, 0, 0.28, 0))
  bubble.add(hqBox(0.48, 0.05, 0.09, 0xe8d8c0, 0, -0.08, 0))
  bubble.add(hqBox(0.5, 0.03, 0.06, P.trimGold, 0, 0.3, 0.01))
  for (const x of [-0.12, 0, 0.12] as const) {
    bubble.add(hqBox(0.06, 0.06, 0.05, 0x1a2830, x, 0.1, 0.05))
  }
  bubble.position.set(0.12, 2.4, 0.06)
  bubble.userData.bubbleBaseY = bubble.position.y
  g.add(bubble)

  // Soft host glow on tunic trim
  const glow = new THREE.PointLight(0x3dcfb6, 0.85, 4, 2)
  glow.position.set(0, 1.0, 0.3)
  glow.userData.harborLanternLight = true
  glow.userData.baseIntensity = 0.85
  glow.userData.specialHostGlow = true
  g.add(glow)

  return g
}

/**
 * Brimhaven Cape Loom — market stall + Trimmer NPC.
 * Talk / stand-in opens the cape-loom panel (99 claim + 10k trim).
 */
function capeLoomStall(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-cape-loom'
  g.userData.visitable = 'cape-loom'
  g.userData.uniqueLandmark = 'cape-loom'
  g.userData.landmarkHost = 'cape-loom'

  // Cloth stall body (original Harbor craft — not Jagex)
  const wood = hqWoodTexture()
  g.add(hqBoxTex(1.35, 0.12, 0.85, P.woodDark, wood, 0, 0.55, 0))
  g.add(hqPost(0.06, 0.07, 1.05, P.woodMid, -0.55, 0.55, -0.3, 5))
  g.add(hqPost(0.06, 0.07, 1.05, P.woodMid, 0.55, 0.55, -0.3, 5))
  g.add(hqPost(0.06, 0.07, 0.85, P.woodMid, -0.55, 0.45, 0.32, 5))
  g.add(hqPost(0.06, 0.07, 0.85, P.woodMid, 0.55, 0.45, 0.32, 5))
  // Awning — jade + gold trim (skillcape motif tease)
  g.add(hqBox(1.5, 0.06, 1.05, 0x1a5a48, 0, 1.15, 0))
  g.add(hqBox(1.55, 0.04, 0.12, P.trimGold, 0, 1.18, -0.48))
  g.add(hqBox(1.55, 0.04, 0.12, P.trimGold, 0, 1.18, 0.48))
  // Loom frame + hanging cape swatches
  g.add(hqBox(0.7, 0.55, 0.08, P.woodLight, 0, 0.85, -0.25))
  g.add(hqBox(0.55, 0.42, 0.04, 0x1e3a48, 0, 0.85, -0.2))
  g.add(hqBox(0.5, 0.08, 0.05, P.jade, 0, 1.02, -0.18))
  g.add(hqBox(0.5, 0.06, 0.05, P.trimGold, 0, 0.72, -0.18))
  // Thread spools
  g.add(hqPost(0.07, 0.08, 0.12, P.trimGold, -0.4, 0.68, 0.15, 6))
  g.add(hqPost(0.07, 0.08, 0.12, P.jade, -0.22, 0.68, 0.18, 6))
  g.add(hqPost(0.07, 0.08, 0.12, 0xc04068, 0.22, 0.68, 0.15, 6))

  // Soft loom glow
  const glow = new THREE.PointLight(0xc4a060, 1.1, 6, 2)
  glow.position.set(0, 1.0, 0.2)
  glow.userData.harborLanternLight = true
  glow.userData.baseIntensity = 1.1
  glow.userData.specialHostGlow = true
  g.add(glow)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.58, 16),
    new THREE.MeshLambertMaterial({
      color: 0xc4a060,
      emissive: 0xc4a060,
      emissiveIntensity: 0.75,
      flatShading: true,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.04
  ring.userData.specialHostGlow = true
  ring.userData.glowBaseIntensity = 0.75
  g.add(ring)

  const trimmer = capeTrimmerNpc()
  trimmer.position.set(0.55, 0, 0.55)
  trimmer.rotation.y = -0.7
  g.add(trimmer)

  return g
}

/**
 * Guan Cape Trimmer — talkable host for skillcape claim / trim.
 * Tropical clothier kit; distinct from Customs officer.
 */
function capeTrimmerNpc(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-cape-trimmer'
  g.userData.landmarkHost = 'cape-loom'
  g.userData.hasDialogue = true
  g.userData.specialNpc = true
  g.userData.npc = 'cape-loom'

  const skin = hqMat(P.skin)
  for (const sx of [-0.1, 0.1] as const) {
    g.add(hqPost(0.06, 0.07, 0.4, 0x3a3028, sx, 0.22, 0))
    g.add(hqBox(0.11, 0.07, 0.16, P.woodDark, sx, 0.04, 0.03))
  }
  // Plum clothier robe + gold sash + jade needle pouch
  g.add(hqBox(0.38, 0.5, 0.26, 0x5a2a48, 0, 0.64, 0))
  g.add(hqBox(0.4, 0.1, 0.28, P.trimGold, 0, 0.52, 0))
  g.add(hqBox(0.14, 0.16, 0.08, P.jade, 0.22, 0.7, 0.14))
  for (const sx of [-1, 1] as const) {
    g.add(hqPost(0.055, 0.065, 0.34, 0x5a2a48, sx * 0.24, 0.72, 0))
    g.add(hqBox(0.1, 0.1, 0.1, P.skin, sx * 0.24, 0.52, 0.02))
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), skin)
  head.position.y = 1.1
  g.add(head)
  // Soft clothier cap
  g.add(hqBox(0.34, 0.08, 0.3, 0x2a1828, 0, 1.22, 0))
  g.add(hqBox(0.12, 0.06, 0.12, P.trimGold, 0, 1.28, 0.02))
  // Gold needle + thread in hand
  g.add(hqBox(0.03, 0.22, 0.03, P.trimGold, -0.28, 0.78, 0.12))
  g.add(hqPost(0.05, 0.06, 0.08, P.jade, -0.28, 0.62, 0.12, 6))

  if (typeof document !== 'undefined') {
    const tag = buildNametagSprite(GUAN_CAPE_TRIMMER_NAME)
    tag.name = 'npc-nametag'
    tag.userData.npcNametag = true
    tag.position.set(0, 1.95, 0)
    tag.scale.set(1.85, 0.4, 1)
    g.add(tag)
  } else {
    const plate = hqBox(0.85, 0.16, 0.04, 0x1a2830, 0, 1.95, 0)
    plate.name = 'npc-nametag'
    plate.userData.npcNametag = true
    g.add(plate)
    g.add(hqBox(0.78, 0.1, 0.03, P.trimGold, 0, 1.95, 0.02))
  }

  const bubble = new THREE.Group()
  bubble.name = 'speech-bubble'
  bubble.userData.speechBubble = true
  bubble.userData.billboard = true
  bubble.userData.hasDialogue = true
  bubble.userData.landmarkHost = 'cape-loom'
  bubble.add(hqBox(0.44, 0.32, 0.08, 0xfff8ec, 0, 0.1, 0))
  bubble.add(hqBox(0.48, 0.05, 0.09, 0xe8d8c0, 0, 0.28, 0))
  bubble.add(hqBox(0.48, 0.05, 0.09, 0xe8d8c0, 0, -0.08, 0))
  bubble.add(hqBox(0.5, 0.03, 0.06, P.trimGold, 0, 0.3, 0.01))
  for (const x of [-0.12, 0, 0.12] as const) {
    bubble.add(hqBox(0.06, 0.06, 0.05, 0x1a2830, x, 0.1, 0.05))
  }
  bubble.position.set(0.12, 2.4, 0.06)
  bubble.userData.bubbleBaseY = bubble.position.y
  g.add(bubble)

  const hostGlow = new THREE.PointLight(0xc4a060, 0.9, 4, 2)
  hostGlow.position.set(0, 1.0, 0.3)
  hostGlow.userData.harborLanternLight = true
  hostGlow.userData.baseIntensity = 0.9
  hostGlow.userData.specialHostGlow = true
  g.add(hostGlow)

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

function extrudeOutline(
  poly: readonly { x: number; z: number }[],
  depth: number,
  scaleAbout: { x: number; z: number } | null,
  scale: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const map = (p: { x: number; z: number }) => {
    if (!scaleAbout) return { x: p.x, z: p.z }
    return {
      x: scaleAbout.x + (p.x - scaleAbout.x) * scale,
      z: scaleAbout.z + (p.z - scaleAbout.z) * scale,
    }
  }
  const first = map(poly[0]!)
  shape.moveTo(first.x, -first.z)
  for (let i = 1; i < poly.length; i++) {
    const p = map(poly[i]!)
    shape.lineTo(p.x, -p.z)
  }
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  })
  geo.rotateX(-Math.PI / 2)
  return geo
}

function outlineCentroid(): { x: number; z: number } {
  let cx = 0
  let cz = 0
  for (const p of GUAN_LAND_OUTLINE) {
    cx += p.x
    cz += p.z
  }
  return { x: cx / GUAN_LAND_OUTLINE.length, z: cz / GUAN_LAND_OUTLINE.length }
}

/** Dirt track ribbon between two landmarks (walkable visual path). */
function dirtPath(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  width = 0.85,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-dirt-path'
  const dx = bx - ax
  const dz = bz - az
  const len = Math.hypot(dx, dz)
  const dirt = hqDirtTexture().clone()
  dirt.needsUpdate = true
  dirt.wrapS = THREE.RepeatWrapping
  dirt.wrapT = THREE.RepeatWrapping
  dirt.repeat.set(Math.max(1.5, len * 0.85), 1.4)
  const midY = (guanGroundY(ax, az) + guanGroundY(bx, bz)) * 0.5 + 0.04
  const ang = Math.atan2(dx, dz)
  // Main packed track
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.07, len),
    hqMatTex(GUAN_TROPICAL_LOOK.dirt, dirt),
  )
  mesh.position.set((ax + bx) / 2, midY, (az + bz) / 2)
  mesh.rotation.y = ang
  g.add(mesh)
  // Soft shoulder ruts (slightly darker / offset)
  const shoulder = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.22, 0.04, len * 0.98),
    hqMatTex(GUAN_TROPICAL_LOOK.dirtRich, dirt),
  )
  shoulder.position.set((ax + bx) / 2, midY - 0.02, (az + bz) / 2)
  shoulder.rotation.y = ang
  g.add(shoulder)
  return g
}

/** Wet-sand strips on the beach terrace lip. */
function stampShoreDetail(root: THREE.Group) {
  const wetMat = hqMatTex(GUAN_TROPICAL_LOOK.sandWet, hqSandTexture())
  for (let i = 0; i < GUAN_LAND_OUTLINE.length; i++) {
    const a = GUAN_LAND_OUTLINE[i]!
    const b = GUAN_LAND_OUTLINE[(i + 1) % GUAN_LAND_OUTLINE.length]!
    const mx = (a.x + b.x) / 2
    const mz = (a.z + b.z) / 2
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    const ang = Math.atan2(b.x - a.x, b.z - a.z)
    const wet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, len * 0.95), wetMat)
    wet.position.set(mx, GUAN_HEIGHT.sand + 0.02, mz)
    wet.rotation.y = ang
    root.add(wet)
  }
}

/** Vertical cliff band between two terrace outlines (readable height steps). */
function stampCliffRing(
  root: THREE.Group,
  scale: number,
  y0: number,
  y1: number,
  color: number,
) {
  const poly = scaledOutline(scale)
  const h = Math.max(0.08, y1 - y0)
  const midY = (y0 + y1) * 0.5
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    if (len < 0.05) continue
    const cliff = hqBox(0.14, h, len * 0.98, color, (a.x + b.x) / 2, midY, (a.z + b.z) / 2)
    cliff.rotation.y = Math.atan2(b.x - a.x, b.z - a.z)
    cliff.name = 'guan-cliff'
    root.add(cliff)
  }
}

function buildLandMesh(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-island-main'
  const c = outlineCentroid()
  const sandTex = hqSandTexture().clone()
  sandTex.needsUpdate = true
  sandTex.wrapS = THREE.RepeatWrapping
  sandTex.wrapT = THREE.RepeatWrapping
  sandTex.repeat.set(6, 6)
  const grassTex = hqGrassTexture().clone()
  grassTex.needsUpdate = true
  grassTex.wrapS = THREE.RepeatWrapping
  grassTex.wrapT = THREE.RepeatWrapping
  grassTex.repeat.set(8, 8)

  // Layer 1 — beach sand plate (full silhouette)
  const sandGeo = extrudeOutline(GUAN_LAND_OUTLINE, GUAN_HEIGHT.sand, null, 1)
  const sand = new THREE.Mesh(sandGeo, hqMatTex(GUAN_TROPICAL_LOOK.sand, sandTex))
  sand.position.y = 0.01
  sand.name = 'guan-layer-sand'
  g.add(sand)

  // Layer 2 — grass terrace (inset) sitting atop sand
  const grassThick = GUAN_HEIGHT.grass - GUAN_HEIGHT.sand
  const grassGeo = extrudeOutline(GUAN_LAND_OUTLINE, grassThick, c, 0.84)
  const grass = new THREE.Mesh(grassGeo, hqMatTex(GUAN_TROPICAL_LOOK.grass, grassTex))
  grass.position.y = GUAN_HEIGHT.sand
  grass.name = 'guan-layer-grass'
  g.add(grass)
  stampCliffRing(g, 0.84, GUAN_HEIGHT.sand, GUAN_HEIGHT.grass, 0x5a6a40)

  // Layer 3 — jungle plateau (textured deep turf, not flat color)
  const jungleThick = GUAN_HEIGHT.jungle - GUAN_HEIGHT.grass
  const jungleGeo = extrudeOutline(GUAN_LAND_OUTLINE, jungleThick, c, 0.55)
  const jungleTex = hqGrassTexture().clone()
  jungleTex.needsUpdate = true
  jungleTex.wrapS = THREE.RepeatWrapping
  jungleTex.wrapT = THREE.RepeatWrapping
  jungleTex.repeat.set(7, 7)
  const jungle = new THREE.Mesh(
    jungleGeo,
    hqMatTex(GUAN_TROPICAL_LOOK.jungle, jungleTex),
  )
  jungle.position.y = GUAN_HEIGHT.grass
  jungle.name = 'guan-jungle-plate'
  g.add(jungle)
  stampCliffRing(g, 0.55, GUAN_HEIGHT.grass, GUAN_HEIGHT.jungle, 0x3a4a28)

  // Meadow patches on the grass terrace (northern towns) — brighter turf islands
  for (const [x, z, w, d] of [
    [8.5, 13.5, 5.5, 4.5],
    [-10.5, 11.5, 5.0, 4.0],
    [0.5, 15.5, 6.0, 3.5],
  ] as const) {
    const patch = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, d),
      hqMatTex(GUAN_TROPICAL_LOOK.grassLite, grassTex),
    )
    patch.position.set(x, GUAN_HEIGHT.grass + 0.04, z)
    patch.rotation.y = (rng() - 0.5) * 0.3
    g.add(patch)
  }

  // Volcano ash apron (highest local terrace)
  const ash = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.8, GUAN_HEIGHT.ash - GUAN_HEIGHT.grass, 7),
    hqMat(P.ash),
  )
  ash.position.set(
    GUAN_LANDMARKS.volcano.x,
    (GUAN_HEIGHT.grass + GUAN_HEIGHT.ash) * 0.5,
    GUAN_LANDMARKS.volcano.z,
  )
  ash.name = 'guan-layer-ash'
  g.add(ash)

  return g
}

function buildCairnIsle(rng: () => number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-island-cairn'
  const c = GUAN_LANDMARKS.cairnIsle
  const sand = new THREE.Mesh(
    new THREE.CylinderGeometry(c.r, c.r * 1.08, GUAN_HEIGHT.cairnSand, 7),
    hqMatTex(GUAN_TROPICAL_LOOK.sand, hqSandTexture()),
  )
  sand.position.y = GUAN_HEIGHT.cairnSand * 0.5
  g.add(sand)
  const grassThick = GUAN_HEIGHT.cairnGrass - GUAN_HEIGHT.cairnSand
  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(c.r * 0.72, c.r * 0.78, grassThick, 6),
    hqMatTex(GUAN_TROPICAL_LOOK.grass, hqGrassTexture()),
  )
  grass.position.y = GUAN_HEIGHT.cairnSand + grassThick * 0.5
  g.add(grass)
  for (let i = 0; i < 3; i++) {
    const palm = palmTree(rng)
    const a = (i / 3) * Math.PI * 2
    const lx = Math.cos(a) * 0.55
    const lz = Math.sin(a) * 0.55
    palm.position.set(lx, GUAN_HEIGHT.cairnGrass, lz)
    palm.scale.setScalar(0.75 + rng() * 0.2)
    g.add(palm)
  }
  const tuft = grassTuft(rng)
  tuft.position.set(-0.4, GUAN_HEIGHT.cairnGrass, 0.3)
  g.add(tuft)
  g.add(hqRock(rng, P.rock))
  g.children[g.children.length - 1]!.position.set(-0.8, GUAN_HEIGHT.cairnSand, 0.5)
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
    const r = radius * (0.12 + rng() * 0.82)
    const x = cx + Math.cos(a) * r
    const z = cz + Math.sin(a) * r
    if (!isGuanLand(x, z)) continue
    const roll = rng()
    let plant: THREE.Group
    if (roll > 0.62) plant = palmTree(rng)
    else if (roll > 0.42) plant = bush(rng)
    else if (roll > 0.22) plant = fernClump(rng)
    else plant = pineapplePlant(rng)
    plant.position.set(x, guanGroundY(x, z), z)
    plant.rotation.y = rng() * Math.PI
    if (heavy) plant.scale.setScalar(0.95 + rng() * 0.4)
    root.add(plant)
  }
}

function scatterGrassTufts(root: THREE.Group, rng: () => number, count: number) {
  let placed = 0
  let guard = 0
  while (placed < count && guard < count * 4) {
    guard++
    const x = GUAN_HARBOR_BOUNDS.minX + rng() * (GUAN_HARBOR_BOUNDS.maxX - GUAN_HARBOR_BOUNDS.minX)
    const z = GUAN_HARBOR_BOUNDS.minZ + rng() * (GUAN_HARBOR_BOUNDS.maxZ - GUAN_HARBOR_BOUNDS.minZ)
    if (!isGuanLand(x, z)) continue
    const nearTown =
      Math.hypot(x - GUAN_LANDMARKS.musaPoint.x, z - GUAN_LANDMARKS.musaPoint.z) < 1.4 ||
      Math.hypot(x - GUAN_LANDMARKS.brimhaven.x, z - GUAN_LANDMARKS.brimhaven.z) < 1.4 ||
      Math.hypot(x - GUAN_LANDMARKS.shilo.x, z - GUAN_LANDMARKS.shilo.z) < 1.3 ||
      Math.hypot(x - GUAN_LANDMARKS.taiBwoWannai.x, z - GUAN_LANDMARKS.taiBwoWannai.z) < 1.2
    if (nearTown && rng() > 0.35) continue
    const tuft = grassTuft(rng)
    tuft.position.set(x, guanGroundY(x, z), z)
    tuft.rotation.y = rng() * Math.PI
    root.add(tuft)
    placed++
  }
}

/** Habitat-style tall grass + dirt beds + stone-ring ponds on walkable terraces. */
function scatterHabitatGround(root: THREE.Group, rng: () => number) {
  // Tall grass clumps (meadow density — kept light for mobile GPU)
  let tall = 0
  let guard = 0
  while (tall < 28 && guard < 140) {
    guard++
    const x = GUAN_HARBOR_BOUNDS.minX + rng() * (GUAN_HARBOR_BOUNDS.maxX - GUAN_HARBOR_BOUNDS.minX)
    const z = GUAN_HARBOR_BOUNDS.minZ + rng() * (GUAN_HARBOR_BOUNDS.maxZ - GUAN_HARBOR_BOUNDS.minZ)
    if (!isGuanLand(x, z)) continue
    // Prefer grass / jungle terraces over beach sand
    const gy = guanGroundY(x, z)
    if (gy < GUAN_HEIGHT.grass - 0.02) continue
    const clump = tallGrassClump(rng)
    clump.position.set(x, gy, z)
    clump.rotation.y = rng() * Math.PI
    clump.scale.setScalar(0.9 + rng() * 0.35)
    root.add(clump)
    tall++
  }
  // Spear-leaf plants + spiky scrub for Habitat clearing variety
  let flora = 0
  guard = 0
  while (flora < 14 && guard < 70) {
    guard++
    const x = GUAN_HARBOR_BOUNDS.minX + rng() * (GUAN_HARBOR_BOUNDS.maxX - GUAN_HARBOR_BOUNDS.minX)
    const z = GUAN_HARBOR_BOUNDS.minZ + rng() * (GUAN_HARBOR_BOUNDS.maxZ - GUAN_HARBOR_BOUNDS.minZ)
    if (!isGuanLand(x, z)) continue
    const gy = guanGroundY(x, z)
    if (gy < GUAN_HEIGHT.grass - 0.02) continue
    const plant = rng() > 0.45 ? spearPlant(rng) : spikyBush(rng)
    plant.position.set(x, gy, z)
    plant.rotation.y = rng() * Math.PI
    plant.scale.setScalar(0.85 + rng() * 0.35)
    root.add(plant)
    flora++
  }
  // Rounded canopy shade trees in meadow clearings
  for (const [tx, tz] of [
    [6.5, 10.5],
    [-8.5, 9.0],
    [0.5, -10.5],
    [-4.5, 2.5],
    [5.0, -7.0],
  ] as const) {
    if (!isGuanLand(tx, tz)) continue
    const tree = canopyTree(rng)
    tree.position.set(tx, guanGroundY(tx, tz), tz)
    tree.rotation.y = rng() * Math.PI
    tree.scale.setScalar(0.9 + rng() * 0.25)
    root.add(tree)
  }
  // Irregular dirt patches with grass sprouting out
  const beds: { x: number; z: number; r: number }[] = [
    { x: 7.2, z: 12.8, r: 0.62 },
    { x: 10.0, z: 11.5, r: 0.48 },
    { x: -9.5, z: 10.5, r: 0.7 },
    { x: -11.8, z: 13.2, r: 0.45 },
    { x: -3.5, z: 0.5, r: 0.58 },
    { x: -1.0, z: -3.2, r: 0.5 },
    { x: 2.2, z: -12.5, r: 0.65 },
    { x: -0.5, z: -15.0, r: 0.42 },
    { x: 5.5, z: -5.5, r: 0.55 },
    { x: -7.0, z: 4.0, r: 0.5 },
    { x: 4.0, z: 8.5, r: 0.4 },
    { x: 8.8, z: -1.5, r: 0.48 },
  ]
  for (const bed of beds) {
    if (!isGuanLand(bed.x, bed.z)) continue
    const patch = dirtPatch(rng, bed.r)
    patch.position.set(bed.x, guanGroundY(bed.x, bed.z), bed.z)
    patch.rotation.y = rng() * Math.PI
    root.add(patch)
    // Open braced crate beside many beds (Habitat vignette pairing)
    if (rng() > 0.35) {
      const crate = habitatCrate(rng)
      const a = rng() * Math.PI * 2
      const cx = bed.x + Math.cos(a) * (bed.r + 0.55)
      const cz = bed.z + Math.sin(a) * (bed.r + 0.55)
      if (isGuanLand(cx, cz)) {
        crate.position.set(cx, guanGroundY(cx, cz), cz)
        crate.rotation.y = a + Math.PI
        root.add(crate)
      }
    }
  }
  // Stone-ring meadow ponds (two clearings — same look, less grass load)
  const ponds: { x: number; z: number; r: number }[] = [
    { x: 5.8, z: 9.2, r: 1.15 },
    { x: -8.2, z: 7.5, r: 0.95 },
  ]
  for (const p of ponds) {
    if (!isGuanLand(p.x, p.z)) continue
    // Keep ponds on grass terrace (not ash / open sand)
    if (guanGroundY(p.x, p.z) < GUAN_HEIGHT.grass - 0.02) continue
    root.add(stoneRingPond(rng, p.x, p.z, p.r))
  }
}

/**
 * Circular meadow pond with rippled water + individual stone border + fuzzy grass carpet.
 * Original craft mirroring Habitat clearing silhouette (not Jagex meshes).
 */
function stoneRingPond(rng: () => number, x: number, z: number, radius: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'guan-stone-pond'
  const gy = guanGroundY(x, z)
  g.position.set(x, gy, z)

  const pondTex = hqPondTexture().clone()
  pondTex.needsUpdate = true
  pondTex.wrapS = THREE.RepeatWrapping
  pondTex.wrapT = THREE.RepeatWrapping
  pondTex.repeat.set(2, 2)

  // Water disc slightly recessed into the terrace
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.92, radius * 0.95, 0.08, 12),
    hqMatTex(GUAN_TROPICAL_LOOK.pond, pondTex, { transparent: true, opacity: 0.92 }),
  )
  water.position.y = 0.02
  water.name = 'guan-pond-water'
  g.add(water)

  // Deeper centre tint
  const deep = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.45, radius * 0.5, 0.05, 8),
    hqMat(GUAN_TROPICAL_LOOK.pondDeep, { transparent: true, opacity: 0.85 }),
  )
  deep.position.y = 0.04
  g.add(deep)

  // Individual low-poly stones around the rim
  const stoneN = 14 + Math.floor(rng() * 6)
  for (let i = 0; i < stoneN; i++) {
    const a = (i / stoneN) * Math.PI * 2 + (rng() - 0.5) * 0.15
    const rr = radius * (0.95 + rng() * 0.12)
    const rock = hqRock(rng, i % 2 ? GUAN_TROPICAL_LOOK.stone : GUAN_TROPICAL_LOOK.stoneLite)
    rock.position.set(Math.cos(a) * rr, 0.06 + rng() * 0.04, Math.sin(a) * rr)
    rock.scale.setScalar(0.35 + rng() * 0.35)
    rock.rotation.y = rng() * Math.PI
    g.add(rock)
  }

  // Dense overlapping grass carpet around the pond (Habitat fuzzy turf — light count)
  const carpet = 12 + Math.floor(rng() * 6)
  for (let i = 0; i < carpet; i++) {
    const a = rng() * Math.PI * 2
    const d = radius * (1.15 + rng() * 1.4)
    const lx = Math.cos(a) * d
    const lz = Math.sin(a) * d
    const wx = x + lx
    const wz = z + lz
    if (!isGuanLand(wx, wz)) continue
    const tuft = rng() > 0.55 ? tallGrassClump(rng) : grassTuft(rng)
    // Local Y relative to pond group (group sits on gy)
    tuft.position.set(lx, guanGroundY(wx, wz) - gy, lz)
    tuft.rotation.y = rng() * Math.PI
    tuft.scale.setScalar(0.85 + rng() * 0.4)
    g.add(tuft)
  }

  // Spear / spiky accents at the water's edge
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng() * 0.5
    const d = radius * (1.35 + rng() * 0.4)
    const plant = i % 2 ? spearPlant(rng) : spikyBush(rng)
    plant.position.set(Math.cos(a) * d, 0.02, Math.sin(a) * d)
    plant.rotation.y = a
    plant.scale.setScalar(0.9 + rng() * 0.3)
    g.add(plant)
  }

  // One palm or canopy tree nearby for the vignette silhouette
  if (rng() > 0.3) {
    const a = rng() * Math.PI * 2
    const d = radius * (2.2 + rng() * 0.6)
    const tree = rng() > 0.5 ? canopyTree(rng) : palmTree(rng)
    tree.position.set(Math.cos(a) * d, 0.02, Math.sin(a) * d)
    tree.rotation.y = a + Math.PI
    tree.scale.setScalar(0.85 + rng() * 0.2)
    g.add(tree)
  }

  return g
}

/** Static Guan Harbor scene — dense tropical island sim (original craft). */
export function buildGuanHarborScene(): THREE.Group {
  const root = new THREE.Group()
  root.name = 'guan-harbor'
  const rng = mulberry32(0x6b617261) // 'kara'

  root.add(buildLandMesh(rng))
  stampShoreDetail(root)
  root.add(buildCairnIsle(rng))

  root.add(
    dirtPath(
      GUAN_LANDMARKS.musaPoint.x,
      GUAN_LANDMARKS.musaPoint.z,
      GUAN_LANDMARKS.volcano.x + 2.2,
      GUAN_LANDMARKS.volcano.z,
      0.95,
    ),
  )
  root.add(
    dirtPath(
      GUAN_LANDMARKS.volcano.x - 2.0,
      GUAN_LANDMARKS.volcano.z,
      GUAN_LANDMARKS.brimhaven.x,
      GUAN_LANDMARKS.brimhaven.z,
      0.9,
    ),
  )
  root.add(
    dirtPath(
      GUAN_LANDMARKS.volcano.x,
      GUAN_LANDMARKS.volcano.z - 2.5,
      GUAN_LANDMARKS.taiBwoWannai.x,
      GUAN_LANDMARKS.taiBwoWannai.z,
      0.85,
    ),
  )
  root.add(
    dirtPath(
      GUAN_LANDMARKS.taiBwoWannai.x,
      GUAN_LANDMARKS.taiBwoWannai.z,
      GUAN_LANDMARKS.shilo.x,
      GUAN_LANDMARKS.shilo.z,
      0.8,
    ),
  )
  root.add(
    dirtPath(
      GUAN_LANDMARKS.musaPoint.x,
      GUAN_LANDMARKS.musaPoint.z - 2,
      GUAN_LANDMARKS.shipYard.x,
      GUAN_LANDMARKS.shipYard.z,
      0.75,
    ),
  )

  const pier = musaPier()
  pier.position.set(GUAN_LANDMARKS.musaDock.x, 0, GUAN_LANDMARKS.musaDock.z)
  root.add(pier)

  const portal = returnPortalMarker()
  portal.position.set(
    GUAN_RETURN_PORTAL.x,
    guanGroundY(GUAN_RETURN_PORTAL.x, GUAN_RETURN_PORTAL.z),
    GUAN_RETURN_PORTAL.z,
  )
  portal.rotation.y = Math.PI * 0.1
  root.add(portal)

  for (let i = 0; i < 3; i++) {
    const hut = thatchHut(rng, i === 0)
    const hx = GUAN_LANDMARKS.musaPoint.x - 1.2 - i * 1.1
    const hz = GUAN_LANDMARKS.musaPoint.z - 0.5 + (i % 2) * 1.2
    hut.position.set(hx, guanGroundY(hx, hz), hz)
    hut.rotation.y = 0.3 + i * 0.4
    root.add(hut)
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const r = 1.0 + (i % 4) * 0.45
    const ban = bananaPlant(rng)
    const bx = GUAN_LANDMARKS.bananaGrove.x + Math.cos(a) * r
    const bz = GUAN_LANDMARKS.bananaGrove.z + Math.sin(a) * r * 0.75
    ban.position.set(bx, guanGroundY(bx, bz), bz)
    root.add(ban)
  }

  const volcano = volcanoCone()
  volcano.position.set(GUAN_LANDMARKS.volcano.x, GUAN_HEIGHT.ash, GUAN_LANDMARKS.volcano.z)
  root.add(volcano)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const rock = hqRock(rng, i % 2 ? 0x4a4540 : P.rock)
    const rx = GUAN_LANDMARKS.volcano.x + Math.cos(a) * (3.5 + rng() * 1.2)
    const rz = GUAN_LANDMARKS.volcano.z + Math.sin(a) * (3.5 + rng() * 1.2)
    rock.position.set(rx, guanGroundY(rx, rz), rz)
    rock.scale.setScalar(0.75 + rng() * 0.55)
    root.add(rock)
  }

  const tavern = pirateTavern()
  {
    const tx = GUAN_LANDMARKS.brimhaven.x - 0.4
    const tz = GUAN_LANDMARKS.brimhaven.z + 0.3
    tavern.position.set(tx, guanGroundY(tx, tz), tz)
  }
  tavern.rotation.y = 0.35
  root.add(tavern)

  // Cape Loom stall + Trimmer NPC (skillcape claim / 10k trim — see mmo-social-v1.md)
  {
    const loom = capeLoomStall()
    loom.position.set(
      GUAN_CAPE_LOOM.x,
      guanGroundY(GUAN_CAPE_LOOM.x, GUAN_CAPE_LOOM.z),
      GUAN_CAPE_LOOM.z,
    )
    loom.rotation.y = -0.85
    root.add(loom)
  }
  for (let i = 0; i < 7; i++) {
    const house = pirateHouse(rng)
    const a = (i / 7) * Math.PI * 1.4 - 0.5
    const hx = GUAN_LANDMARKS.brimhaven.x + Math.cos(a) * (2.0 + (i % 3) * 0.35)
    const hz = GUAN_LANDMARKS.brimhaven.z + Math.sin(a) * (1.7 + (i % 2) * 0.4)
    house.position.set(hx, guanGroundY(hx, hz), hz)
    house.rotation.y = a + Math.PI
    root.add(house)
  }
  const bDock = brimhavenDock()
  bDock.position.set(GUAN_LANDMARKS.brimhavenDock.x, 0, GUAN_LANDMARKS.brimhavenDock.z)
  bDock.rotation.y = -0.6
  root.add(bDock)
  for (let i = 0; i < 7; i++) {
    const pine = pineapplePlant(rng)
    const px = GUAN_LANDMARKS.brimhaven.x + 1.2 + rng() * 2.5
    const pz = GUAN_LANDMARKS.brimhaven.z - 2.2 - rng() * 2.5
    pine.position.set(px, guanGroundY(px, pz), pz)
    root.add(pine)
  }

  for (let i = 0; i < 6; i++) {
    const hut = thatchHut(rng, i === 0 || i === 3)
    const a = (i / 6) * Math.PI * 2
    const hx = GUAN_LANDMARKS.taiBwoWannai.x + Math.cos(a) * (1.7 + (i % 2) * 0.35)
    const hz = GUAN_LANDMARKS.taiBwoWannai.z + Math.sin(a) * (1.7 + (i % 2) * 0.35)
    hut.position.set(hx, guanGroundY(hx, hz), hz)
    hut.rotation.y = a + Math.PI
    root.add(hut)
  }
  const fire = hqBox(0.4, 0.16, 0.4, 0x3a3020, 0, 0.35, 0)
  fire.position.set(
    GUAN_LANDMARKS.taiBwoWannai.x,
    guanGroundY(GUAN_LANDMARKS.taiBwoWannai.x, GUAN_LANDMARKS.taiBwoWannai.z),
    GUAN_LANDMARKS.taiBwoWannai.z,
  )
  root.add(fire)
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.4, 4),
    hqMat(0xff8020, { emissive: 0xff5010, emissiveIntensity: 0.85 }),
  )
  flame.position.set(
    GUAN_LANDMARKS.taiBwoWannai.x,
    guanGroundY(GUAN_LANDMARKS.taiBwoWannai.x, GUAN_LANDMARKS.taiBwoWannai.z) + 0.28,
    GUAN_LANDMARKS.taiBwoWannai.z,
  )
  flame.userData.specialHostGlow = true
  flame.userData.glowBaseIntensity = 0.85
  root.add(flame)

  const ship = shipHullWreck(rng)
  ship.position.set(
    GUAN_LANDMARKS.shipYard.x,
    guanGroundY(GUAN_LANDMARKS.shipYard.x, GUAN_LANDMARKS.shipYard.z),
    GUAN_LANDMARKS.shipYard.z,
  )
  ship.rotation.y = 0.4
  root.add(ship)

  for (let i = 0; i < 7; i++) {
    const hut = thatchHut(rng, i % 2 === 0)
    const a = (i / 7) * Math.PI * 2
    const hx = GUAN_LANDMARKS.shilo.x + Math.cos(a) * (1.9 + (i % 3) * 0.25)
    const hz = GUAN_LANDMARKS.shilo.z + Math.sin(a) * (1.6 + (i % 2) * 0.3)
    hut.position.set(hx, guanGroundY(hx, hz), hz)
    hut.rotation.y = a + Math.PI
    root.add(hut)
  }

  scatterJungle(root, rng, GUAN_LANDMARKS.volcano.x, GUAN_LANDMARKS.volcano.z - 4.5, 5.5, 16)
  scatterJungle(root, rng, GUAN_LANDMARKS.taiBwoWannai.x, GUAN_LANDMARKS.taiBwoWannai.z, 7, 28, true)
  scatterJungle(root, rng, GUAN_LANDMARKS.shilo.x, GUAN_LANDMARKS.shilo.z + 4, 5.5, 20, true)
  scatterJungle(root, rng, -8, 4, 4.5, 14)
  scatterJungle(root, rng, 6, 10, 4, 12)
  scatterJungle(root, rng, 3, -8, 5, 16, true)
  scatterJungle(root, rng, -6, -6, 4.5, 12, true)
  scatterGrassTufts(root, rng, 90)
  scatterHabitatGround(root, rng)

  for (let i = 0; i < 8; i++) {
    const rock = hqRock(rng, i % 2 ? P.rock : P.rockWarm)
    const rx = 3.2 + i * 1.05
    const rz = 3.2 + (i % 2) * 1.0
    rock.position.set(rx, guanGroundY(rx, rz), rz)
    rock.scale.setScalar(0.5 + rng() * 0.45)
    root.add(rock)
  }

  const grapple = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.9, 0.38, 6),
    hqMatSmooth(0x6a7060),
  )
  grapple.position.set(GUAN_LANDMARKS.musaPassage.x, 0.12, GUAN_LANDMARKS.musaPassage.z)
  grapple.name = 'guan-grapple-isle'
  root.add(grapple)
  const strongTree = palmTree(rng)
  strongTree.position.set(GUAN_LANDMARKS.musaPassage.x, 0.28, GUAN_LANDMARKS.musaPassage.z)
  strongTree.scale.setScalar(0.8)
  root.add(strongTree)

  hqStampClutter(root, rng, GUAN_LANDMARKS.musaPoint.x, GUAN_LANDMARKS.musaPoint.z, 3.5, 8, isGuanLand, guanGroundY)
  hqStampClutter(root, rng, GUAN_LANDMARKS.brimhaven.x, GUAN_LANDMARKS.brimhaven.z, 4.0, 10, isGuanLand, guanGroundY)
  hqStampClutter(root, rng, GUAN_LANDMARKS.taiBwoWannai.x, GUAN_LANDMARKS.taiBwoWannai.z, 3.0, 6, isGuanLand, guanGroundY)
  hqStampClutter(root, rng, GUAN_LANDMARKS.shilo.x, GUAN_LANDMARKS.shilo.z, 3.2, 7, isGuanLand, guanGroundY)
  hqStampClutter(root, rng, GUAN_LANDMARKS.shipYard.x, GUAN_LANDMARKS.shipYard.z, 2.5, 5, isGuanLand, guanGroundY)

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
  ], rng, guanGroundY)

  const stall = hqMarketStall(rng)
  {
    const sx = GUAN_LANDMARKS.brimhaven.x + 2.2
    const sz = GUAN_LANDMARKS.brimhaven.z - 1.2
    stall.position.set(sx, guanGroundY(sx, sz), sz)
  }
  stall.rotation.y = 0.6
  root.add(stall)

  const stall2 = hqMarketStall(rng)
  {
    const sx = GUAN_LANDMARKS.brimhaven.x - 2.0
    const sz = GUAN_LANDMARKS.brimhaven.z + 1.0
    stall2.position.set(sx, guanGroundY(sx, sz), sz)
  }
  stall2.rotation.y = -0.8
  root.add(stall2)

  const musaStall = hqMarketStall(rng)
  {
    const sx = GUAN_LANDMARKS.bananaGrove.x - 1.8
    const sz = GUAN_LANDMARKS.bananaGrove.z + 0.5
    musaStall.position.set(sx, guanGroundY(sx, sz), sz)
  }
  musaStall.rotation.y = -0.4
  root.add(musaStall)

  // Original armored patrol brothers — roam with walk cycles (not Jagex IP)
  stampGuanArmoredPatrol(root, rng)

  return root
}
