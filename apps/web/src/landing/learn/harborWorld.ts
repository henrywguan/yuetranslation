/**
 * Harbor Quest · continuous river voyage (original low-poly world).
 * Built to docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md — chunky silhouettes,
 * flat Lambert, locked palette, extruded openings. Original IP (not Jagex).
 */
import * as THREE from 'three'
import {
  HARBOR_CRAFT_PALETTE as P,
  hqBox,
  hqCanopy,
  hqMat,
  hqPost,
  hqRock,
  hqWindow,
} from './harborCraft'
import { buildHarborProtagonist } from './harborProtagonist'

export type HarborHue = 'jade' | 'harbor' | 'ink' | 'gold'

export type HarborWeather = 'sunny' | 'cloudy' | 'rainy' | 'night'

export type HarborWorldOptions = {
  hue?: HarborHue
  reducedMotion?: boolean
  /** Quest progress 0…1 — canoe eases down the stream. */
  progress?: number
  /** Force a weather scene (otherwise random per session). */
  weather?: HarborWeather
}

export type HarborWorldHandle = {
  /** Active weather / time-of-day for this session. */
  weather: HarborWeather
  setProgress: (t: number) => void
  setFlash: (flash: 'ok' | 'no' | null) => void
  setHue: (hue: HarborHue) => void
  setReducedMotion: (on: boolean) => void
  resize: () => void
  dispose: () => void
}

export type BiomeId = 'village' | 'forest' | 'reeds' | 'pier' | 'hills'

const CHUNK = 28
const BANK = 7.2
const RIVER = 3.4

/** Spacing between quiz pier stops along +Z (smoke-tested). */
export const HARBOR_DOCK_SPACING = 22
/** Sideways offset from river center when the canoe is docked. */
export const HARBOR_DOCK_X = RIVER + 0.55

/** Chinese clothing roles for bank / pier NPCs (smoke-tested). */
export const HARBOR_NPC_ROLES = [
  'villager',
  'scholar',
  'fisherman',
  'merchant',
  'child',
  'ferryman',
] as const
export type HarborNpcRole = (typeof HARBOR_NPC_ROLES)[number]

/**
 * Discrete pier stop for a quest progress value (0…1).
 * Alternates bank so each answer docks at a fresh landing.
 */
export function dockPoseForProgress(progress: number): { z: number; side: 1 | -1; slot: number } {
  const t = Math.min(1, Math.max(0, progress))
  const maxZ = 240
  const rawZ = t * maxZ
  const slot = Math.max(0, Math.round(rawZ / HARBOR_DOCK_SPACING))
  return {
    slot,
    z: slot * HARBOR_DOCK_SPACING + 6,
    side: slot % 2 === 0 ? 1 : -1,
  }
}

/** Water tint per brand hue — weather may override for rain/night. */
const WATER: Record<HarborHue, number> = {
  jade: 0x3ab89a,
  harbor: 0x3aa8c8,
  ink: 0x4a7898,
  gold: 0x5a9890,
}

/** Scene weather / time-of-day — picked at random each session. */
export const HARBOR_WEATHERS: readonly HarborWeather[] = [
  'sunny',
  'cloudy',
  'rainy',
  'night',
] as const

type WeatherLook = {
  sky: number
  fog: number
  fogDensity: number
  amb: number
  ambI: number
  sun: number
  sunI: number
  hemiSky: number
  hemiGround: number
  hemiI: number
  cloudTones: number[]
  cloudCount: number
  cloudOpacity: number
  rain: boolean
  stars: boolean
}

/** Max-bright sunny + distinct cloudy / rainy / night looks. */
export const HARBOR_WEATHER_LOOK: Record<HarborWeather, WeatherLook> = {
  sunny: {
    sky: 0xc8f0ff,
    fog: 0xe8f8ff,
    fogDensity: 0.0028,
    amb: 0xffffff,
    ambI: 1.65,
    sun: 0xfffaf0,
    sunI: 2.55,
    hemiSky: 0xf0fbff,
    hemiGround: 0x98b878,
    hemiI: 1.05,
    cloudTones: [0xffffff, 0xfffaf5, 0xfff5e8],
    cloudCount: 9,
    cloudOpacity: 0.92,
    rain: false,
    stars: false,
  },
  cloudy: {
    sky: 0x9ab0c0,
    fog: 0xb0c0cc,
    fogDensity: 0.008,
    amb: 0xd8e0e8,
    ambI: 1.15,
    sun: 0xe8eef4,
    sunI: 0.75,
    hemiSky: 0xc8d4e0,
    hemiGround: 0x6a7a68,
    hemiI: 0.7,
    cloudTones: [0xd0d4d8, 0xc0c8d0, 0xb8c0c8, 0xe0e4e8],
    cloudCount: 18,
    cloudOpacity: 0.88,
    rain: false,
    stars: false,
  },
  rainy: {
    sky: 0x6a7888,
    fog: 0x788898,
    fogDensity: 0.014,
    amb: 0xb0bcc8,
    ambI: 0.95,
    sun: 0xc8d0d8,
    sunI: 0.45,
    hemiSky: 0x98a8b8,
    hemiGround: 0x4a5a50,
    hemiI: 0.55,
    cloudTones: [0x687888, 0x788898, 0x586878, 0x8898a8],
    cloudCount: 20,
    cloudOpacity: 0.9,
    rain: true,
    stars: false,
  },
  night: {
    sky: 0x0a1830,
    fog: 0x102038,
    fogDensity: 0.006,
    amb: 0x607898,
    ambI: 0.55,
    sun: 0xc8d8ff,
    sunI: 0.35,
    hemiSky: 0x183058,
    hemiGround: 0x1a2830,
    hemiI: 0.4,
    cloudTones: [0x304868, 0x283858, 0x406080],
    cloudCount: 7,
    cloudOpacity: 0.55,
    rain: false,
    stars: true,
  },
}

/** Default fog density for sunny daylight (smoke-tested). */
export const HARBOR_FOG_DENSITY = HARBOR_WEATHER_LOOK.sunny.fogDensity

/** Pick a random weather scene (deterministic when `seed` is set). */
export function pickHarborWeather(seed?: number): HarborWeather {
  const rng = mulberry32((seed ?? (Date.now() ^ (Math.random() * 0x7fffffff))) >>> 0)
  return HARBOR_WEATHERS[Math.floor(rng() * HARBOR_WEATHERS.length)]!
}
/** Deterministic biome for a chunk index (smoke-tested). */
export function biomeForChunk(i: number): BiomeId {
  const cycle: BiomeId[] = ['pier', 'village', 'forest', 'reeds', 'hills', 'forest', 'village']
  return cycle[((i % cycle.length) + cycle.length) % cycle.length]
}

/** Mobile OSRS-style orbit: yaw wraps freely; pitch is clamped. */
export const ORBIT_PITCH_MIN = 0.22
export const ORBIT_PITCH_MAX = 1.12
export const ORBIT_DISTANCE = 8.6

export function clampOrbitPitch(pitch: number): number {
  return Math.min(ORBIT_PITCH_MAX, Math.max(ORBIT_PITCH_MIN, pitch))
}

/**
 * Camera offset from the look-at point.
 * yaw 0 = behind the canoe (−Z), increasing yaw orbits clockwise when viewed from above.
 */
export function orbitCameraOffset(yaw: number, pitch: number, distance = ORBIT_DISTANCE) {
  const cosP = Math.cos(pitch)
  return {
    x: Math.sin(yaw) * cosP * distance,
    y: Math.sin(pitch) * distance,
    z: -Math.cos(yaw) * cosP * distance,
  }
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

function mat(color: number, extra?: ConstructorParameters<typeof THREE.MeshLambertMaterial>[0]) {
  return hqMat(color, extra)
}

/** Faceted oak/pine stand-in — icosa canopy, 6-gon trunk (bible §4.2). */
function tree(rng: () => number, leaf: number) {
  const g = new THREE.Group()
  const h = 1.1 + rng() * 0.9
  g.add(hqPost(0.12, 0.2, h, P.woodMid, 0, h / 2, 0))
  g.add(hqCanopy(0.55 + rng() * 0.4, leaf, 0, h + 0.35, 0))
  if (rng() > 0.55) {
    g.add(
      hqCanopy(
        0.32 + rng() * 0.22,
        leaf,
        (rng() - 0.5) * 0.5,
        h + 0.12,
        (rng() - 0.5) * 0.5,
      ),
    )
  }
  return g
}

/**
 * Jiangnan riverside dwelling — whitewash walls, dark tile hip roof, timber door.
 * Low-poly Cantonese / water-town village silhouette (original kit).
 */
/**
 * Jiangnan riverside dwelling — thick walls, extruded window/door,
 * chunky hip roof (bible §4.1). Original kit.
 */
function house(rng: () => number) {
  const g = new THREE.Group()
  const w = 1.5 + rng() * 0.9
  const d = 1.15 + rng() * 0.45
  const h = 0.95 + rng() * 0.35
  const wall = rng() > 0.45 ? P.plaster : P.plasterWarm
  g.add(hqBox(w, h, d, wall, 0, h / 2, 0))
  // Thick timber corner posts
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      g.add(hqBox(0.08, h, 0.08, P.woodDeep, sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02)))
    }
  }
  // Pitched tile roof (two slabs) + ridge
  const roofColor = rng() > 0.5 ? P.roofTile : 0x3a3430
  const pitch = 0.42 + rng() * 0.12
  const overhang = 0.2
  const left = hqBox(w + overhang * 2, 0.1, d * 0.72, roofColor, 0, h + pitch * 0.35, -d * 0.12)
  left.rotation.x = 0.48
  g.add(left)
  const right = hqBox(w + overhang * 2, 0.1, d * 0.72, roofColor, 0, h + pitch * 0.35, d * 0.12)
  right.rotation.x = -0.48
  g.add(right)
  g.add(hqBox(w + overhang * 2.2, 0.12, 0.14, P.ink, 0, h + pitch * 0.72, 0))
  // Chunky eave tips
  for (const z of [-1, 1] as const) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), hqMat(roofColor))
    tip.position.set(w / 2 + overhang * 0.6, h + pitch * 0.45, z * (d * 0.35))
    tip.rotation.z = -0.9
    g.add(tip)
    const tipL = tip.clone()
    tipL.position.x = -(w / 2 + overhang * 0.6)
    tipL.rotation.z = 0.9
    g.add(tipL)
  }
  // Extruded door slab
  g.add(hqBox(0.34, 0.58, 0.08, P.woodDark, -w * 0.15, 0.3, d / 2 + 0.04))
  // Extruded window (not a flat decal)
  g.add(hqWindow(0.36, 0.3, P.trimGold, 0x1a3040, w * 0.22, h * 0.55, d / 2 + 0.05))
  // Stone plinth
  g.add(hqBox(w + 0.18, 0.14, d + 0.18, P.stone, 0, 0.05, 0))
  return g
}


/** Compact courtyard wing — grey brick, terracotta tiles, extruded door. */
function courtyardWing(rng: () => number) {
  const g = new THREE.Group()
  const w = 1.1 + rng() * 0.5
  const d = 0.95 + rng() * 0.35
  const h = 0.75 + rng() * 0.25
  g.add(hqBox(w, h, d, P.brick, 0, h / 2, 0))
  const roof = hqBox(w + 0.28, 0.12, d + 0.22, P.roofClay, 0, h + 0.14, 0)
  roof.rotation.x = -0.15
  g.add(roof)
  g.add(hqBox(0.26, 0.44, 0.06, P.woodDeep, 0, 0.24, d / 2 + 0.03))
  g.add(hqWindow(0.28, 0.24, P.trimGold, 0x1a3040, w * 0.28, h * 0.55, d / 2 + 0.04))
  return g
}


/** Raised riverside shop — thick stilts, chunky deck, extruded banner. */
function stiltShop(rng: () => number) {
  const g = new THREE.Group()
  const w = 1.2 + rng() * 0.5
  const d = 1.0 + rng() * 0.35
  const deckY = 0.45 + rng() * 0.15
  const h = 0.7 + rng() * 0.25
  for (const x of [-w * 0.4, w * 0.4] as const) {
    for (const z of [-d * 0.35, d * 0.35] as const) {
      g.add(hqPost(0.06, 0.08, deckY + 0.12, P.woodDark, x, (deckY + 0.12) / 2, z, 5))
    }
  }
  g.add(hqBox(w + 0.18, 0.1, d + 0.18, P.woodLight, 0, deckY, 0))
  g.add(hqBox(w, h, d, 0xd8c8a8, 0, deckY + h / 2 + 0.05, 0))
  const roof = hqBox(w + 0.32, 0.1, d + 0.28, P.roofTile, 0, deckY + h + 0.22, 0)
  roof.rotation.x = -0.2
  g.add(roof)
  g.add(hqBox(0.1, 0.48, 0.04, P.banner, w * 0.35, deckY + h * 0.7, d / 2 + 0.06))
  g.add(hqWindow(0.3, 0.26, P.trimGold, 0x1a3040, -w * 0.2, deckY + h * 0.55, d / 2 + 0.04))
  return g
}


/** Round earth-building / watch hut — soft vernacular silhouette for hills. */
/** Small tiled cottage — chunky roof slabs + extruded door (bible §4.1). */
function hut(rng: () => number) {
  // Mix: half courtyard wing, half small tiled cottage so villages feel varied
  if (rng() > 0.55) return courtyardWing(rng)
  const g = new THREE.Group()
  const w = 1.0 + rng() * 0.4
  const d = 0.9 + rng() * 0.3
  const h = 0.7 + rng() * 0.3
  g.add(hqBox(w, h, d, P.plasterWarm, 0, h / 2, 0))
  const roofL = hqBox(w + 0.32, 0.1, d * 0.65, P.roofTile, 0, h + 0.18, -d * 0.1)
  roofL.rotation.x = 0.5
  g.add(roofL)
  const roofR = hqBox(w + 0.32, 0.1, d * 0.65, P.roofTile, 0, h + 0.18, d * 0.1)
  roofR.rotation.x = -0.5
  g.add(roofR)
  g.add(hqBox(0.24, 0.42, 0.06, P.woodDark, 0, 0.22, d / 2 + 0.03))
  g.add(hqWindow(0.26, 0.22, P.trimGold, 0x1a3040, w * 0.22, h * 0.55, d / 2 + 0.04))
  g.add(hqBox(w + 0.12, 0.1, d + 0.12, P.stone, 0, 0.04, 0))
  return g
}


/** Village home kinds placed along the voyage (smoke-tested). */
export const HARBOR_VILLAGE_HOMES = ['jiangnan', 'courtyard', 'stilt', 'cottage'] as const
export type HarborVillageHome = (typeof HARBOR_VILLAGE_HOMES)[number]

function rock(rng: () => number) {
  return hqRock(rng, rng() > 0.5 ? P.rock : P.rockWarm)
}


function reed(rng: () => number) {
  const g = new THREE.Group()
  const n = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const h = 0.6 + rng() * 0.9
    g.add(hqPost(0.03, 0.04, h, P.reed, (rng() - 0.5) * 0.35, h / 2, (rng() - 0.5) * 0.35, 4))
    g.add(hqBox(0.08, 0.1, 0.08, P.reedTip, (rng() - 0.5) * 0.35, h + 0.04, (rng() - 0.5) * 0.35))
  }
  return g
}


function flower(rng: () => number) {
  const g = new THREE.Group()
  g.add(hqPost(0.02, 0.03, 0.35, P.leafMid, 0, 0.18, 0, 4))
  g.add(hqBox(0.14, 0.12, 0.14, rng() > 0.5 ? P.blossom : P.leafGold, 0, 0.4, 0))
  return g
}


function lantern() {
  const g = new THREE.Group()
  g.add(hqPost(0.05, 0.07, 1.5, P.woodDark, 0, 0.75, 0, 5))
  g.add(hqBox(0.3, 0.34, 0.3, P.lantern, 0, 1.55, 0))
  g.add(hqBox(0.34, 0.04, 0.34, P.woodDeep, 0, 1.74, 0))
  return g
}


function pierSegment() {
  const g = new THREE.Group()
  // Thick deck planks (readable boards, not a paper plane)
  g.add(hqBox(2.4, 0.16, 3.6, P.woodLight, 0, 0.55, 0))
  for (const z of [-1.1, 0, 1.1] as const) {
    g.add(hqBox(2.35, 0.04, 0.08, P.woodDark, 0, 0.64, z))
  }
  // Gangplank toward the river
  const plank = hqBox(0.95, 0.1, 1.15, P.woodMid, -0.95, 0.5, 0)
  plank.rotation.z = 0.12
  g.add(plank)
  // Chunky piles (6-gon)
  for (const x of [-0.95, 0.95]) {
    for (const z of [-1.3, 1.3]) {
      g.add(hqPost(0.11, 0.14, 1.15, P.woodDark, x, 0.15, z))
    }
  }
  // Bollard
  g.add(hqPost(0.08, 0.1, 0.38, P.woodDeep, 0.7, 0.74, 1.2))
  g.userData.pier = true
  return g
}


/**
 * Low-poly Chinese-styled figure — RS-era proportions (oversized head,
 * mitten hands, 6-gon limbs) + Harbor clothing kit by role.
 */
function chineseNpc(role: HarborNpcRole, rng: () => number) {
  const g = new THREE.Group()
  const child = role === 'child'
  const scale = child ? 0.72 : 1
  const skin = hqMat(P.skin)
  const hair = hqMat(P.hair)

  const palette: Record<HarborNpcRole, { robe: number; trim: number; pants: number }> = {
    villager: { robe: P.clothNavy, trim: P.trimGold, pants: P.pants },
    scholar: { robe: P.clothGrey, trim: P.trimIvory, pants: 0x4a4850 },
    fisherman: { robe: P.clothSage, trim: P.straw, pants: 0x4a3a28 },
    merchant: { robe: P.clothCrimson, trim: P.trimGold, pants: 0x3a2820 },
    child: { robe: P.clothChild, trim: P.trimChild, pants: 0x3a4a68 },
    ferryman: { robe: P.clothTeal, trim: 0x8a6a40, pants: P.pants },
  }
  const colors = palette[role]

  // Short thick legs
  for (const sx of [-0.1, 0.1] as const) {
    g.add(hqPost(0.06, 0.07, 0.4, colors.pants, sx, 0.22, 0))
    g.add(hqBox(0.11, 0.07, 0.16, P.woodDark, sx, 0.04, 0.03))
  }
  // Stocky torso
  const torsoH = role === 'scholar' || role === 'merchant' ? 0.52 : 0.4
  g.add(hqBox(0.36, torsoH, 0.24, colors.robe, 0, 0.42 + torsoH / 2 - 0.05, 0))
  g.add(hqBox(0.38, 0.08, 0.26, colors.trim, 0, 0.55, 0))
  if (role === 'scholar' || role === 'merchant') {
    g.add(hqBox(0.36, 0.28, 0.2, colors.robe, 0, 0.38, 0))
  }
  // Arms + mittens
  for (const sx of [-1, 1] as const) {
    g.add(hqPost(0.055, 0.065, 0.32, colors.robe, sx * 0.24, 0.72, 0))
    g.add(hqBox(0.1, 0.1, 0.1, P.skin, sx * 0.24, 0.52, 0.02))
  }
  // Oversized head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), skin)
  head.position.y = 1.08
  g.add(head)
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), hair)
  bun.position.set(0, 1.2, -0.03)
  g.add(bun)

  if (role === 'scholar') {
    g.add(hqBox(0.3, 0.1, 0.26, P.ink, 0, 1.22, 0))
    g.add(hqBox(0.15, 0.12, 0.15, P.ink, 0, 1.34, 0))
  } else if (role === 'fisherman' || role === 'ferryman') {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.14, 7), hqMat(P.straw))
    hat.position.y = 1.24
    g.add(hat)
  } else if (role === 'merchant') {
    g.add(hqPost(0.11, 0.12, 0.08, 0x2a1810, 0, 1.2, 0))
  } else if (role === 'villager') {
    g.add(hqBox(0.28, 0.06, 0.24, 0x2a2820, 0, 1.18, 0))
  }

  if (role === 'fisherman' && rng() > 0.35) {
    const pole = hqPost(0.02, 0.025, 1.4, P.woodMid, 0.28, 0.85, 0, 4)
    pole.rotation.z = -0.55
    g.add(pole)
  }
  if (role === 'scholar' && rng() > 0.4) {
    const scroll = hqPost(0.04, 0.04, 0.28, P.trimIvory, 0.22, 0.62, 0.12, 5)
    scroll.rotation.z = Math.PI / 2
    g.add(scroll)
  }

  g.scale.setScalar(scale * (0.92 + rng() * 0.12))
  g.userData.npc = role
  return g
}


function randomNpcRole(rng: () => number): HarborNpcRole {
  return HARBOR_NPC_ROLES[Math.floor(rng() * HARBOR_NPC_ROLES.length)]!
}

/** Seated River Scout — original RS-era-proportion mannequin (see harborProtagonist.ts). */
function playerTraveler() {
  return buildHarborProtagonist({ pose: 'seated' })
}

function bird() {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 4), mat(0xd8e0e8))
  mesh.rotation.z = Math.PI / 2
  return mesh
}

/** Low-poly deer silhouette along the bank. */
/** Low-poly deer — box body, short faceted legs (readable bank fauna). */
function deer(rng: () => number) {
  const g = new THREE.Group()
  g.add(hqBox(0.55, 0.32, 0.24, 0x8a6040, 0, 0.55, 0))
  const neck = hqBox(0.14, 0.35, 0.12, 0x8a6040, 0.28, 0.72, 0)
  neck.rotation.z = -0.35
  g.add(neck)
  g.add(hqBox(0.22, 0.14, 0.14, 0x7a5038, 0.42, 0.9, 0))
  for (const x of [-0.18, 0.12] as const) {
    for (const z of [-0.08, 0.08] as const) {
      g.add(hqPost(0.03, 0.04, 0.4, 0x5a3a28, x, 0.2, z, 4))
    }
  }
  if (rng() > 0.45) {
    const ant = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 4), hqMat(0xc4a070))
    ant.position.set(0.4, 1.1, -0.05)
    g.add(ant)
    const ant2 = ant.clone()
    ant2.position.z = 0.05
    g.add(ant2)
  }
  return g
}


function fish() {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 5), mat(0x5a9ab0))
  mesh.rotation.z = Math.PI / 2
  return mesh
}

function pine(rng: () => number) {
  const g = new THREE.Group()
  const h = 1.6 + rng() * 1.2
  g.add(hqPost(0.1, 0.16, h, P.woodDark, 0, h / 2, 0, 5))
  // Stacked cones / icosa for needle tiers
  for (let i = 0; i < 3; i++) {
    const y = h * (0.45 + i * 0.22)
    const r = 0.55 - i * 0.12 + rng() * 0.08
    const tier = new THREE.Mesh(new THREE.ConeGeometry(r, 0.55, 6), hqMat(P.leafDeep))
    tier.position.y = y
    g.add(tier)
  }
  return g
}


/** Low-poly sakura — dark trunk + clustered pink blossom clouds. */
function cherryBlossom(rng: () => number) {
  const g = new THREE.Group()
  const h = 1.2 + rng() * 0.8
  g.add(hqPost(0.08, 0.14, h, 0x3a2a28, 0, h / 2, 0, 5))
  const fork = hqPost(0.05, 0.08, 0.55, 0x3a2a28, 0.15, h + 0.1, 0, 4)
  fork.rotation.z = -0.5
  g.add(fork)
  const pinks = [P.blossom, P.blossomDeep, 0xf0c0d0]
  for (let i = 0; i < 3; i++) {
    g.add(
      hqCanopy(
        0.35 + rng() * 0.2,
        pinks[Math.floor(rng() * pinks.length)]!,
        (rng() - 0.5) * 0.5,
        h + 0.25 + rng() * 0.25,
        (rng() - 0.5) * 0.4,
      ),
    )
  }
  return g
}


function ginkgo(rng: () => number) {
  const g = new THREE.Group()
  const h = 1.3 + rng() * 0.9
  g.add(hqPost(0.1, 0.16, h, P.woodMid, 0, h / 2, 0, 5))
  const golds = [P.leafGold, 0xd4b050, 0xe8c060]
  g.add(hqCanopy(0.7 + rng() * 0.25, golds[Math.floor(rng() * golds.length)]!, 0, h + 0.35, 0))
  g.add(
    hqCanopy(
      0.4 + rng() * 0.15,
      golds[Math.floor(rng() * golds.length)]!,
      (rng() - 0.5) * 0.4,
      h + 0.15,
      (rng() - 0.5) * 0.3,
    ),
  )
  return g
}


function poplar(rng: () => number) {
  const g = new THREE.Group()
  const h = 2.0 + rng() * 1.2
  g.add(hqPost(0.07, 0.12, h, P.woodMid, 0, h / 2, 0, 5))
  // Tall column of faceted blobs
  const greens = [P.leafMid, P.leafLite, 0x4a8a50]
  for (let i = 0; i < 4; i++) {
    const y = h * (0.35 + i * 0.18)
    g.add(hqCanopy(0.28 + rng() * 0.1, greens[Math.floor(rng() * greens.length)]!, 0, y, 0))
  }
  return g
}


/** Tree kinds placed along the voyage (smoke-tested). */
export const HARBOR_SCENIC_TREES = ['cherry', 'ginkgo', 'poplar', 'pine', 'oak'] as const
export type HarborScenicTree = (typeof HARBOR_SCENIC_TREES)[number]

/** Distant Wulingyuan-style karst backdrop is present in the voyage. */
export const HARBOR_WULINGYUAN = true as const

/** 祥云 auspicious clouds fill the Harbor Quest sky. */
export const HARBOR_XIANGYUN = true as const

function bridge() {
  const g = new THREE.Group()
  const deck = new THREE.Mesh(new THREE.BoxGeometry(RIVER * 2.2, 0.12, 1.4), mat(0x7a5a3a))
  deck.position.y = 0.85
  g.add(deck)
  for (const x of [-RIVER * 0.95, RIVER * 0.95] as const) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.6, 5), mat(0x5a4030))
    post.position.set(x, 0.4, 0)
    g.add(post)
  }
  return g
}

function canoe() {
  const g = new THREE.Group()
  // Boxy hull + blunt bow/stern (not a smooth capsule)
  g.add(hqBox(2.2, 0.32, 0.72, P.woodMid, 0, 0.22, 0))
  g.add(hqBox(0.35, 0.28, 0.55, P.woodDark, 1.15, 0.24, 0))
  g.add(hqBox(0.35, 0.28, 0.55, P.woodDark, -1.15, 0.24, 0))
  // Thick gunwales
  g.add(hqBox(2.15, 0.08, 0.08, P.woodDeep, 0, 0.4, 0.34))
  g.add(hqBox(2.15, 0.08, 0.08, P.woodDeep, 0, 0.4, -0.34))
  // Seat plank
  g.add(hqBox(0.55, 0.08, 0.4, P.woodDark, 0, 0.38, 0))
  // Stubby mast + jade sail plane
  g.add(hqPost(0.035, 0.045, 1.05, P.woodDeep, 0.12, 0.9, 0, 5))
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.85), hqMat(P.jade))
  sail.position.set(0.12, 0.95, 0.02)
  g.add(sail)
  // You — original River Scout mannequin (seated)
  const you = playerTraveler()
  you.position.set(0, 0.38, -0.05)
  you.rotation.y = Math.PI
  g.add(you)
  return g
}


/**
 * Distant Wulingyuan-inspired sandstone pillars — tall thin karst stacks
 * with green caps (original low-poly homage, not a real-world scan).
 */
function wulingPillar(rng: () => number) {
  const g = new THREE.Group()
  const h = 4.5 + rng() * 9
  const r = 0.35 + rng() * 0.55
  const rockTones = [0x8a8578, 0x7a7668, 0x9a9588, 0x6a6860]
  const tone = rockTones[Math.floor(rng() * rockTones.length)]!
  // Stacked tapered boxes for the classic pillar silhouette
  const layers = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < layers; i++) {
    const t = i / Math.max(1, layers - 1)
    const w = r * (1.15 - t * 0.45)
    const layerH = h / layers
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(w * 0.85, w, layerH, 5),
      mat(tone),
    )
    stone.position.y = layerH * i + layerH / 2
    stone.rotation.y = rng() * Math.PI
    g.add(stone)
  }
  // Green vegetation crown
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.9, 5, 4),
    mat(rng() > 0.5 ? 0x2f6a40 : 0x3a7a48),
  )
  crown.position.y = h + 0.15
  crown.scale.set(1, 0.55, 1)
  g.add(crown)
  // Occasional mid-ledge shrub
  if (rng() > 0.55) {
    const ledge = new THREE.Mesh(new THREE.SphereGeometry(r * 0.35, 4, 3), mat(0x3a6a40))
    ledge.position.set(r * 0.5, h * (0.4 + rng() * 0.3), 0)
    ledge.scale.y = 0.5
    g.add(ledge)
  }
  return g
}

/** Parallax mountain range group — follows the voyage at a slower Z. */
function wulingyuanRange(seed: number) {
  const root = new THREE.Group()
  const rng = mulberry32(seed)
  const count = 28
  for (let i = 0; i < count; i++) {
    const pillar = wulingPillar(rng)
    const side = i % 2 === 0 ? 1 : -1
    const x = side * (22 + rng() * 16 + (i % 5) * 1.2)
    const z = (rng() - 0.5) * 90
    pillar.position.set(x, -0.2, z)
    pillar.scale.setScalar(0.85 + rng() * 0.55)
    root.add(pillar)
  }
  // A few closer “gateway” pillars for depth
  for (let i = 0; i < 6; i++) {
    const pillar = wulingPillar(rng)
    const side = i % 2 === 0 ? 1 : -1
    pillar.position.set(side * (16 + rng() * 5), -0.1, -20 + i * 12)
    pillar.scale.setScalar(0.7 + rng() * 0.35)
    root.add(pillar)
  }
  root.userData.wulingyuan = true
  return root
}

/**
 * Single 祥云 (xiangyun) auspicious cloud — ruyi-head lobes + trailing swirls
 * in the classic Chinese decorative silhouette (not fluffy Western cumulus).
 */
function xiangyunCloud(rng: () => number, tones: number[], opacity: number) {
  const g = new THREE.Group()
  const tone = tones[Math.floor(rng() * tones.length)]!
  const cloudMat = mat(tone, { transparent: true, opacity })
  const rimMat = mat(0xe8c878, { transparent: true, opacity: Math.min(0.7, opacity * 0.7) })

  const lobe = (sx: number, sy: number, sz: number, x: number, y: number, z: number, rim = false) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 5), rim ? rimMat : cloudMat)
    mesh.scale.set(sx, sy, sz)
    mesh.position.set(x, y, z)
    g.add(mesh)
  }

  lobe(1.35, 0.55, 0.95, 0, 0.15, 0)
  lobe(0.95, 0.48, 0.75, -0.85, 0.35, 0.1)
  lobe(0.95, 0.48, 0.75, 0.85, 0.35, -0.05)
  lobe(0.7, 0.4, 0.55, 0, 0.7, 0.05, true)
  const trail = 2 + Math.floor(rng() * 3)
  for (let i = 0; i < trail; i++) {
    const t = (i + 1) / (trail + 1)
    lobe(
      0.85 - t * 0.35,
      0.38 - t * 0.08,
      0.65 - t * 0.2,
      -1.2 - i * 0.85,
      0.1 + Math.sin(t * Math.PI) * 0.25,
      (rng() - 0.5) * 0.3,
      i === trail - 1,
    )
  }
  lobe(0.45, 0.28, 0.4, 0.35, -0.15, 0.2)

  g.userData.xiangyun = true
  g.userData.phase = rng() * Math.PI * 2
  g.userData.drift = 0.15 + rng() * 0.35
  return g
}

/** Sky field of 祥云 — density/tone follow the weather look. */
function xiangyunSky(seed: number, look: WeatherLook) {
  const root = new THREE.Group()
  const rng = mulberry32(seed)
  const count = look.cloudCount
  for (let i = 0; i < count; i++) {
    const cloud = xiangyunCloud(rng, look.cloudTones, look.cloudOpacity)
    const side = i % 2 === 0 ? 1 : -1
    cloud.position.set(side * (6 + rng() * 22 + (i % 4) * 1.5), 9 + rng() * 7, (rng() - 0.5) * 100)
    cloud.rotation.y = (rng() - 0.5) * 0.8
    cloud.scale.setScalar(1.4 + rng() * 2.2)
    cloud.scale.y *= 0.75 + rng() * 0.2
    root.add(cloud)
  }
  const near = Math.max(2, Math.floor(count / 3))
  for (let i = 0; i < near; i++) {
    const cloud = xiangyunCloud(rng, look.cloudTones, look.cloudOpacity)
    cloud.position.set((rng() - 0.5) * 18, 7.5 + rng() * 3, -8 + i * 16)
    cloud.scale.setScalar(1.1 + rng() * 1.2)
    cloud.scale.y *= 0.7
    root.add(cloud)
  }
  root.userData.xiangyunSky = true
  return root
}

/** Falling rain streaks parented near the canoe. */
function rainField(seed: number) {
  const rng = mulberry32(seed)
  const count = 700
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rng() - 0.5) * 36
    positions[i * 3 + 1] = rng() * 22
    positions[i * 3 + 2] = (rng() - 0.5) * 50
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xb8d0e8,
      size: 0.09,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  )
  pts.userData.rain = true
  pts.frustumCulled = false
  return pts
}

/** Night sky field + a few streaking shooting stars. */
function nightSkyField(seed: number) {
  const root = new THREE.Group()
  const rng = mulberry32(seed)
  const count = 220
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = rng() * Math.PI * 2
    const phi = rng() * 0.55
    const r = 40 + rng() * 30
    positions[i * 3] = Math.sin(theta) * Math.cos(phi) * r
    positions[i * 3 + 1] = 8 + Math.sin(phi) * r * 0.85
    positions[i * 3 + 2] = Math.cos(theta) * Math.cos(phi) * r
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xfff8e0,
      size: 0.18,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  )
  stars.userData.stars = true
  root.add(stars)

  const streaks: THREE.Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const streak = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 2.8),
      mat(0xfff5d0, { transparent: true, opacity: 0 }),
    )
    streak.userData.shooting = true
    streak.userData.delay = rng() * 8
    streak.userData.life = 0
    streak.visible = false
    root.add(streak)
    streaks.push(streak)
  }
  root.userData.streaks = streaks
  root.userData.nightSky = true
  return root
}
function place(
  group: THREE.Group,
  rng: () => number,
  n: number,
  factory: () => THREE.Object3D,
  xMin: number,
  xMax: number,
  z0: number,
) {
  for (let i = 0; i < n; i++) {
    const obj = factory()
    const side = rng() > 0.5 ? 1 : -1
    obj.position.set(side * (xMin + rng() * (xMax - xMin)), 0, z0 + 1.5 + rng() * (CHUNK - 3))
    obj.rotation.y = rng() * Math.PI * 2
    obj.scale.setScalar(0.85 + rng() * 0.4)
    group.add(obj)
  }
}

/** Place a pier + Chinese NPC at each quiz dock slot that falls in this chunk. */
function placeDockStops(group: THREE.Group, chunkIndex: number, rng: () => number) {
  const z0 = chunkIndex * CHUNK
  const z1 = z0 + CHUNK
  for (let slot = 0; slot < 40; slot++) {
    const z = slot * HARBOR_DOCK_SPACING + 6
    if (z < z0 || z >= z1) continue
    const side: 1 | -1 = slot % 2 === 0 ? 1 : -1
    const pier = pierSegment()
    pier.position.set(side * (RIVER + 1.35), 0, z)
    pier.rotation.y = side > 0 ? -0.2 : Math.PI + 0.2
    pier.userData.dockSlot = slot
    group.add(pier)

    const role = HARBOR_NPC_ROLES[slot % HARBOR_NPC_ROLES.length]!
    const npc = chineseNpc(role, rng)
    // Stand on the pier deck, facing the river
    npc.position.set(side * (RIVER + 1.55), 0.55, z + (rng() - 0.5) * 0.6)
    npc.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2
    group.add(npc)

    // Extra villager variety near the landing
    if (rng() > 0.45) {
      const extra = chineseNpc(randomNpcRole(rng), rng)
      extra.position.set(side * (RIVER + 2.4 + rng() * 0.8), 0, z + (rng() - 0.5) * 1.4)
      extra.rotation.y = side > 0 ? -Math.PI / 2 + (rng() - 0.5) * 0.6 : Math.PI / 2 + (rng() - 0.5) * 0.6
      group.add(extra)
    }
  }
}

function populateChunk(
  chunkIndex: number,
  group: THREE.Group,
  mats: { grass: THREE.Material; sand: THREE.Material },
) {
  const biome = biomeForChunk(chunkIndex)
  const rng = mulberry32((chunkIndex + 17) * 9973)
  const z0 = chunkIndex * CHUNK
  const leaf = biome === 'hills' ? 0x6a8a50 : biome === 'reeds' ? 0x4a8a58 : 0x2f7a48

  for (const side of [-1, 1] as const) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, CHUNK + 0.2), mats.grass)
    bank.position.set(side * (BANK + 2.2), -0.05, z0 + CHUNK / 2)
    group.add(bank)
    const shore = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, CHUNK + 0.2), mats.sand)
    shore.position.set(side * (RIVER + 1.1), 0.02, z0 + CHUNK / 2)
    group.add(shore)
  }

  // Quiz pier landings (every chunk may host one or more dock slots)
  placeDockStops(group, chunkIndex, rng)

  if (biome === 'forest' || biome === 'hills') {
    place(group, rng, 4, () => tree(rng, leaf), BANK - 0.2, BANK + 4.5, z0)
    place(group, rng, 3, () => pine(rng), BANK, BANK + 5, z0)
    place(group, rng, 3, () => poplar(rng), BANK - 0.3, BANK + 3.5, z0)
    place(group, rng, 2, () => ginkgo(rng), BANK + 0.5, BANK + 4.5, z0)
    place(group, rng, 5, () => rock(rng), BANK - 0.5, BANK + 3, z0)
    place(group, rng, 5, () => flower(rng), BANK - 0.3, BANK + 2.5, z0)
    if (rng() > 0.4) place(group, rng, 1, () => deer(rng), BANK + 0.5, BANK + 3.5, z0)
  }
  if (biome === 'village') {
    place(group, rng, 3, () => house(rng), BANK + 0.5, BANK + 4, z0)
    place(group, rng, 2, () => hut(rng), BANK + 1, BANK + 4.5, z0)
    place(group, rng, 1, () => stiltShop(rng), BANK - 0.2, BANK + 1.8, z0)
    place(group, rng, 2, () => tree(rng, leaf), BANK + 2, BANK + 5, z0)
    place(group, rng, 3, () => cherryBlossom(rng), BANK - 0.2, BANK + 3.5, z0)
    place(group, rng, 1, () => ginkgo(rng), BANK + 1.5, BANK + 4, z0)
    place(group, rng, 2, () => lantern(), BANK - 0.2, BANK + 1.2, z0)
    place(group, rng, 4, () => flower(rng), BANK - 0.4, BANK + 2, z0)
    // Villagers & merchants strolling the lane
    place(group, rng, 2, () => chineseNpc(randomNpcRole(rng), rng), BANK + 0.3, BANK + 2.5, z0)
    if (rng() > 0.55) {
      const br = bridge()
      br.position.set(0, 0, z0 + CHUNK * (0.35 + rng() * 0.3))
      group.add(br)
    }
  }
  if (biome === 'reeds') {
    place(group, rng, 12, () => reed(rng), RIVER + 0.4, BANK + 1.5, z0)
    place(group, rng, 3, () => rock(rng), BANK, BANK + 2, z0)
    place(group, rng, 3, () => poplar(rng), BANK + 0.5, BANK + 3.5, z0)
    place(group, rng, 1, () => tree(rng, 0x4a7a40), BANK + 1, BANK + 4, z0)
    place(group, rng, 3, () => flower(rng), BANK - 0.2, BANK + 1.8, z0)
    if (rng() > 0.5) place(group, rng, 1, () => chineseNpc('fisherman', rng), RIVER + 0.8, BANK + 1.2, z0)
  }
  if (biome === 'pier') {
    for (const side of [-1, 1] as const) {
      const p1 = pierSegment()
      p1.position.set(side * (RIVER + 1.4), 0, z0 + CHUNK * 0.35)
      p1.rotation.y = side > 0 ? -0.15 : 0.15
      group.add(p1)
      const p2 = pierSegment()
      p2.position.set(side * (RIVER + 1.4), 0, z0 + CHUNK * 0.7)
      group.add(p2)
    }
    place(group, rng, 2, () => lantern(), BANK - 0.5, BANK + 0.8, z0)
    place(group, rng, 2, () => house(rng), BANK + 1, BANK + 3.5, z0)
    place(group, rng, 2, () => stiltShop(rng), BANK - 0.1, BANK + 2.2, z0)
    place(group, rng, 1, () => hut(rng), BANK + 2, BANK + 4, z0)
    place(group, rng, 2, () => cherryBlossom(rng), BANK + 0.5, BANK + 3, z0)
    place(group, rng, 2, () => chineseNpc(randomNpcRole(rng), rng), BANK - 0.2, BANK + 1.5, z0)
    place(group, rng, 1, () => chineseNpc('ferryman', rng), RIVER + 1.2, RIVER + 2.2, z0)
  }
  if (biome === 'hills') {
    place(group, rng, 2, () => hut(rng), BANK + 1.5, BANK + 4, z0)
    place(group, rng, 2, () => ginkgo(rng), BANK + 1, BANK + 4.5, z0)
    if (rng() > 0.5) place(group, rng, 1, () => chineseNpc('scholar', rng), BANK + 1, BANK + 3, z0)
  }

  // Fauna: birds overhead + occasional fish leap near the canoe lane
  const birdCount = 1 + Math.floor(rng() * 2)
  for (let i = 0; i < birdCount; i++) {
    if (rng() > 0.25) {
      const b = bird()
      b.position.set((rng() - 0.5) * 14, 2.2 + rng() * 1.5, z0 + rng() * CHUNK)
      b.userData.bird = true
      b.userData.phase = rng() * Math.PI * 2
      group.add(b)
    }
  }
  if (rng() > 0.5) {
    const f = fish()
    f.position.set((rng() - 0.5) * RIVER * 1.2, 0.15, z0 + 4 + rng() * (CHUNK - 8))
    f.userData.fish = true
    f.userData.phase = rng() * Math.PI * 2
    group.add(f)
  }
}

/**
 * Mount a continuous sailing river on a canvas.
 * Canoe stays framed; world scrolls along +Z. Quest progress eases travel;
 * a gentle drift keeps scenery moving between answers.
 */
export function createHarborWorld(
  canvas: HTMLCanvasElement,
  options: HarborWorldOptions = {},
): HarborWorldHandle {
  let hue: HarborHue = options.hue ?? 'harbor'
  let reduced = Boolean(options.reducedMotion)
  let progress = Math.min(1, Math.max(0, options.progress ?? 0))
  let flash: 'ok' | 'no' | null = null
  let flashUntil = 0
  let disposed = false
  const weather: HarborWeather = options.weather ?? pickHarborWeather()
  const look = HARBOR_WEATHER_LOOK[weather]

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5))
  renderer.setClearColor(look.sky, 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  // Sunny pushes exposure high so the voyage reads full daylight
  renderer.toneMappingExposure =
    weather === 'sunny' ? 1.42 : weather === 'cloudy' ? 1.12 : weather === 'rainy' ? 1.0 : 0.92

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(look.fog, look.fogDensity)
  scene.background = new THREE.Color(look.sky)

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220)
  camera.position.set(0, 4.2, -6.5)

  const amb = new THREE.AmbientLight(look.amb, look.ambI)
  scene.add(amb)
  const sun = new THREE.DirectionalLight(look.sun, look.sunI)
  sun.position.set(weather === 'night' ? 2 : -4, weather === 'night' ? 6 : 14, 2)
  scene.add(sun)
  const fill = new THREE.HemisphereLight(look.hemiSky, look.hemiGround, look.hemiI)
  scene.add(fill)

  const world = new THREE.Group()
  scene.add(world)

  const waterTint =
    weather === 'night' ? 0x1a3048 : weather === 'rainy' ? 0x3a6078 : weather === 'cloudy' ? 0x4a8898 : WATER[hue]
  const waterMat = mat(waterTint, {
    transparent: true,
    opacity: weather === 'rainy' ? 0.92 : weather === 'night' ? 0.9 : 0.88,
  })
  const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER * 2.4, 400, 1, 40), waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.set(0, 0.02, 80)
  scene.add(water)

  const grassMat = mat(0x2a5a38)
  const sandMat = mat(0xc2b280)
  const chunkGroups = new Map<number, THREE.Group>()
  const ACTIVE = 6

  const ensureChunks = (centerZ: number) => {
    const center = Math.floor(centerZ / CHUNK)
    const need = new Set<number>()
    for (let i = center - 1; i <= center + ACTIVE; i++) need.add(i)
    for (const [idx, g] of chunkGroups) {
      if (!need.has(idx)) {
        world.remove(g)
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose()
        })
        chunkGroups.delete(idx)
      }
    }
    for (const idx of need) {
      if (chunkGroups.has(idx)) continue
      const g = new THREE.Group()
      populateChunk(idx, g, { grass: grassMat, sand: sandMat })
      world.add(g)
      chunkGroups.set(idx, g)
    }
  }

  const boat = canoe()
  boat.position.set(0, 0.05, 0)
  scene.add(boat)

  // Distant Wulingyuan-style karst pillars (parallax backdrop)
  const mountains = wulingyuanRange(42)
  scene.add(mountains)

  // 祥云 — density/tone follow the weather look
  const clouds = xiangyunSky(77, look)
  scene.add(clouds)

  const rain = look.rain ? rainField(0x51f1e ^ (hue.charCodeAt(0) << 8)) : null
  if (rain) scene.add(rain)

  const nightSky = look.stars ? nightSkyField(0x33a11 ^ (hue.charCodeAt(0) << 4)) : null
  if (nightSky) scene.add(nightSky)

  const wakeMat = mat(0xa8d8e8, { transparent: true, opacity: 0.35 })
  const wakes: THREE.Mesh[] = []
  for (let i = 0; i < 5; i++) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.15 + i * 0.05, 6), wakeMat)
    w.rotation.x = -Math.PI / 2
    scene.add(w)
    wakes.push(w)
  }

  const startDock = dockPoseForProgress(progress)
  let voyageZ = startDock.z
  let boatX = startDock.side * HARBOR_DOCK_X * 0.35
  let waterPhase = 0
  let raf = 0
  let last = performance.now()

  // Finger / mouse orbit — grab-the-world: drag right → camera left, drag down → camera up
  let yaw = 0
  let pitch = 0.52
  let yawTarget = 0
  let pitchTarget = 0.52
  let dragging = false
  let lastPtrX = 0
  let lastPtrY = 0
  let activePointer: number | null = null
  const ORBIT_SENS = 0.0052

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (activePointer !== null) return
    activePointer = e.pointerId
    dragging = true
    lastPtrX = e.clientX
    lastPtrY = e.clientY
    canvas.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== activePointer) return
    const dx = e.clientX - lastPtrX
    const dy = e.clientY - lastPtrY
    lastPtrX = e.clientX
    lastPtrY = e.clientY
    // Horizontal: drag right → camera left (grab-the-world)
    yawTarget -= dx * ORBIT_SENS
    // Vertical: natural — drag down tips the view down
    pitchTarget = clampOrbitPitch(pitchTarget + dy * ORBIT_SENS)
  }
  const endDrag = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return
    dragging = false
    activePointer = null
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  canvas.addEventListener('lostpointercapture', endDrag)

  const resize = () => {
    const w = canvas.clientWidth || canvas.width || 1
    const h = canvas.clientHeight || canvas.height || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()

  const applyHue = () => {
    // Weather owns sky/fog; hue only retints the river when daylight allows it
    scene.background = new THREE.Color(look.sky)
    scene.fog = new THREE.FogExp2(look.fog, look.fogDensity)
    renderer.setClearColor(look.sky, 1)
    if (weather === 'sunny') {
      waterMat.color.setHex(WATER[hue])
    }
  }

  const tick = (now: number) => {
    if (disposed) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    // Sail toward the pier stop for this quest step, then ease sideways to dock
    const dock = dockPoseForProgress(progress)
    const distZ = dock.z - voyageZ
    const approaching = Math.abs(distZ) < 10
    const docked = Math.abs(distZ) < 1.25
    voyageZ += distZ * Math.min(1, dt * 2.1)
    // Light forward drift only while sailing between piers
    if (!docked) {
      const cruise = reduced ? 0.15 : 0.55
      voyageZ += dt * cruise * Math.sign(distZ || 1)
    }
    const sway = reduced || approaching ? 0 : Math.sin(waterPhase * 0.7) * 0.18
    const targetX = dock.side * HARBOR_DOCK_X * (approaching || docked ? 1 : 0.2) + sway
    boatX += (targetX - boatX) * Math.min(1, dt * 3.2)

    waterPhase += dt * (reduced ? 0.4 : 1.2)
    const bob = reduced ? 0 : Math.sin(waterPhase * 2.2) * 0.04
    boat.position.set(boatX, 0.08 + bob, voyageZ)
    // Nose toward the pier when docking
    const yawBoat = docked || approaching ? dock.side * 0.35 : reduced ? 0 : Math.sin(waterPhase * 1.1) * 0.04
    boat.rotation.y += (yawBoat - boat.rotation.y) * Math.min(1, dt * 4)
    boat.rotation.z = reduced ? 0 : Math.sin(waterPhase * 1.7) * 0.03

    for (let i = 0; i < wakes.length; i++) {
      const w = wakes[i]!
      w.position.set(boat.position.x * (1 - i * 0.12), 0.04, boat.position.z - 0.7 - i * 0.55)
      w.scale.setScalar(1 + Math.sin(waterPhase * 3 + i) * 0.15)
      ;(w.material as THREE.MeshLambertMaterial).opacity = docked ? 0.12 - i * 0.02 : 0.28 - i * 0.04
    }

    water.position.z = voyageZ + 60
    water.position.y = 0.02 + Math.sin(waterPhase) * 0.015

    // Parallax: mountains drift slower than the canoe
    mountains.position.z = voyageZ * 0.35
    mountains.position.x = boatX * 0.15

    // 祥云 drift even slower — painted sky scrolls sliding with the voyage
    clouds.position.z = voyageZ * 0.22
    clouds.position.x = boatX * 0.08
    if (!reduced) {
      clouds.children.forEach((child, i) => {
        if (child.userData.baseY == null) child.userData.baseY = child.position.y
        const phase = ((child.userData.phase as number) || 0) + waterPhase * ((child.userData.drift as number) || 0.25)
        child.position.y = (child.userData.baseY as number) + Math.sin(phase + i) * 0.35
        child.rotation.z = Math.sin(phase * 0.5) * 0.04
      })
    }

    // Rain sheet follows the canoe and falls
    if (rain) {
      rain.position.set(boat.position.x, 0, boat.position.z)
      if (!reduced) {
        const pos = rain.geometry.getAttribute('position') as THREE.BufferAttribute
        const arr = pos.array as Float32Array
        const fall = dt * 18
        for (let i = 1; i < arr.length; i += 3) {
          arr[i]! -= fall
          if (arr[i]! < 0) arr[i]! += 22
        }
        pos.needsUpdate = true
      }
    }

    // Night stars follow canoe; shooting stars streak across the sky
    if (nightSky) {
      nightSky.position.set(boat.position.x, 0, boat.position.z)
      if (!reduced) {
        const streaks = (nightSky.userData.streaks as THREE.Mesh[]) || []
        for (const streak of streaks) {
          let life = (streak.userData.life as number) || 0
          let delay = (streak.userData.delay as number) || 0
          if (life <= 0) {
            delay -= dt
            streak.userData.delay = delay
            if (delay <= 0) {
              streak.userData.life = 0.9 + Math.random() * 0.5
              streak.userData.delay = 4 + Math.random() * 10
              streak.visible = true
              streak.position.set((Math.random() - 0.5) * 28, 12 + Math.random() * 8, (Math.random() - 0.5) * 20)
              streak.rotation.set(0, Math.random() * Math.PI * 2, -0.55 - Math.random() * 0.35)
              ;(streak.material as THREE.MeshLambertMaterial).opacity = 0.95
            } else {
              streak.visible = false
            }
          } else {
            life -= dt
            streak.userData.life = life
            streak.position.x += Math.sin(streak.rotation.y) * dt * 22
            streak.position.y -= dt * 10
            streak.position.z += Math.cos(streak.rotation.y) * dt * 22
            ;(streak.material as THREE.MeshLambertMaterial).opacity = Math.max(0, life * 1.1)
            if (life <= 0) streak.visible = false
          }
        }
      }
    }

    // Ease orbit toward finger drag (snappy, still smooth)
    const orbitLerp = Math.min(1, dt * 14)
    yaw += (yawTarget - yaw) * orbitLerp
    pitch += (pitchTarget - pitch) * orbitLerp

    const lookX = boat.position.x
    const lookY = 0.75
    const lookZ = boat.position.z + 1.2
    const off = orbitCameraOffset(yaw, pitch)
    const bobY = reduced ? 0 : Math.sin(waterPhase * 0.5) * 0.06
    camera.position.set(lookX + off.x, lookY + off.y + bobY, lookZ + off.z)
    camera.lookAt(lookX, lookY, lookZ)

    ensureChunks(voyageZ)

    for (const g of chunkGroups.values()) {
      g.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return
        if (o.userData.bird) {
          const phase = (o.userData.phase as number) + waterPhase
          o.position.y = 2.2 + Math.sin(phase * 2) * 0.35
          o.position.x += Math.sin(phase) * 0.01
        }
        if (o.userData.fish) {
          const phase = (o.userData.phase as number) + waterPhase * 1.8
          o.position.y = 0.08 + Math.max(0, Math.sin(phase)) * 0.55
          o.rotation.z = Math.PI / 2 + Math.sin(phase) * 0.4
        }
        if (o.userData.petal && !reduced) {
          const phase = (o.userData.phase as number) + waterPhase * 1.4
          const baseY = (o.userData.baseY as number) ?? o.position.y
          o.position.y = baseY + Math.sin(phase) * 0.25 - (phase % 2.4) * 0.08
          o.position.x += Math.sin(phase * 0.7) * 0.008
          o.rotation.z += 0.02
        }
      })
    }

    if (flash && now < flashUntil) {
      amb.color.lerp(new THREE.Color(flash === 'ok' ? 0x3dcfb6 : 0xe07070), 0.15)
    } else {
      amb.color.lerp(new THREE.Color(look.amb), 0.08)
      if (now >= flashUntil) flash = null
    }

    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }

  ensureChunks(voyageZ)
  raf = requestAnimationFrame(tick)

  return {
    weather,
    setProgress(t) {
      progress = Math.min(1, Math.max(0, t))
    },
    setFlash(f) {
      flash = f
      flashUntil = performance.now() + 420
    },
    setHue(h) {
      hue = h
      applyHue()
    },
    setReducedMotion(on) {
      reduced = on
    },
    resize,
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      canvas.removeEventListener('lostpointercapture', endDrag)
      for (const g of chunkGroups.values()) {
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose()
        })
      }
      chunkGroups.clear()
      water.geometry.dispose()
      waterMat.dispose()
      grassMat.dispose()
      sandMat.dispose()
      wakeMat.dispose()
      if (rain) {
        rain.geometry.dispose()
        ;(rain.material as THREE.PointsMaterial).dispose()
      }
      if (nightSky) {
        nightSky.traverse((o) => {
          if (o instanceof THREE.Points) {
            o.geometry.dispose()
            ;(o.material as THREE.PointsMaterial).dispose()
          }
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose()
            ;(o.material as THREE.Material).dispose()
          }
        })
      }
      renderer.dispose()
    },
  }
}
