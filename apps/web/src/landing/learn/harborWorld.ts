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
import {
  HARBOR_DEFAULT_APPEARANCE,
  type HarborAppearance,
  type HarborGender,
} from './harborAppearance'
import {
  applyLookToProtagonist,
  harborGearById,
  HARBOR_DEFAULT_LOOK,
  type HarborLook,
} from './harborGear'
import type { HarborRemotePlayer } from './harborPresence'
import {
  buildChatBubbleSprite,
  buildNametagSprite,
  buildRemoteSailor,
  disposeChatBubbleSprite,
  disposeNametagSprite,
  disposeRemoteSailor,
  remoteUserIdFromHits,
  setRemoteSailorPoseTarget,
  tickRemoteSailorPose,
  updateNametagSprite,
  updateRemoteSailor,
} from './harborRemoteAvatars'
import type { HarborPosePacket } from './harborPresence'

export type HarborHue = 'jade' | 'harbor' | 'ink' | 'gold'

/** Voyage dressing — river harbor vs Lingnan bamboo academy garden. */
export type HarborRealmId = 'river' | 'bamboo'

export type HarborWeather = 'sunny' | 'cloudy' | 'rainy' | 'night'

export type HarborWorldOptions = {
  hue?: HarborHue
  reducedMotion?: boolean
  /** Quest progress 0…1 — canoe eases down the stream. */
  progress?: number
  /** Force a weather scene (otherwise random per session). */
  weather?: HarborWeather
  /** Equipped character look (recolors River Scout + handheld). */
  look?: HarborLook
  /** Body type from character creation. */
  gender?: HarborGender
  /** Skin / hair cosmetics from character creation. */
  appearance?: HarborAppearance
  /** Campaign biome dressing (flora / fauna / bank tint). */
  realm?: HarborRealmId
  /** Fires when the canoe enters / leaves a visitable landmark. */
  onVisitable?: (id: HarborVisitableId | null) => void
  /** Tap a remote sailor (signed-in multiplayer). */
  onRemotePlayerSelect?: (userId: string) => void
}

export type HarborWorldHandle = {
  /** Active weather / time-of-day for this session. */
  weather: HarborWeather
  setProgress: (t: number) => void
  setFlash: (flash: 'ok' | 'no' | null) => void
  setHue: (hue: HarborHue) => void
  setReducedMotion: (on: boolean) => void
  setLook: (look: HarborLook) => void
  setCharacter: (next: {
    gender?: HarborGender
    appearance?: HarborAppearance
  }) => void
  /** Pause the render loop (chart overlay / background tab). */
  setPaused: (on: boolean) => void
  /** Replace remote sailor avatars (open-world presence join/leave). */
  setRemotePlayers: (players: HarborRemotePlayer[]) => void
  /** High-frequency Broadcast pose — lerp toward target (no React). */
  applyRemotePose: (pose: HarborPosePacket) => void
  /** Local pose for presence / broadcast. */
  getLocalPose: () => {
    x: number
    z: number
    yaw: number
    /**
     * Orbit camera yaw (`orbitCameraOffset` φ). Minimap “up” = look direction past the boat.
     * yaw 0 → looking +Z; increases clockwise from above.
     */
    viewYaw: number
    mode: 'boat' | 'foot'
    look: HarborLook
    gender: HarborGender
    appearance: HarborAppearance
  }
  /** Username shown above the local scout (all sailors get nametags). */
  setLocalUsername: (username: string) => void
  /** RuneScape-style say text floating above a sailor (local or remote userId). */
  showSpeechBubble: (who: 'local' | string, text: string, durationMs?: number) => void
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

/** In-world visitables — Save Shack + Outfitter + Bank + Chinese Arena (fixed riverside stops). */
export type HarborVisitableId = 'save-shack' | 'outfitter' | 'bank' | 'arena' | 'barber'

export type HarborVisitable = {
  id: HarborVisitableId
  name: { en: string; zh: string }
  x: number
  z: number
}

/** Fixed landmark poses — smoke-tested kit. */
export const HARBOR_VISITABLES: readonly HarborVisitable[] = [
  {
    id: 'save-shack',
    name: { en: 'Save Shack', zh: '存檔小屋' },
    x: HARBOR_DOCK_X + 1.1,
    z: 3.5,
  },
  {
    id: 'outfitter',
    name: { en: 'River Outfitter', zh: '河畔衣鋪' },
    x: -(HARBOR_DOCK_X + 1.1),
    z: 16,
  },
  {
    id: 'bank',
    name: { en: 'Harbor Bank', zh: '港灣錢莊' },
    x: HARBOR_DOCK_X + 1.1,
    z: 28,
  },
  {
    id: 'arena',
    name: { en: 'Chinese Arena', zh: '擂台' },
    x: -(HARBOR_DOCK_X + 1.1),
    z: 40,
  },
  {
    id: 'barber',
    name: { en: 'Harbor Barber', zh: '港灣理髮' },
    x: HARBOR_DOCK_X + 1.1,
    z: 52,
  },
] as const

/** Arrival radius to open a visitable panel. */
export const HARBOR_VISIT_RADIUS = 2.4

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

/**
 * Weather looks — fogDensity raised so distant chunks fade sooner (shorter draw).
 * FogExp2 visibility ≈ 1/density; sunny ~180u (was ~360u).
 */
export const HARBOR_WEATHER_LOOK: Record<HarborWeather, WeatherLook> = {
  sunny: {
    sky: 0xc8f0ff,
    fog: 0xe8f8ff,
    fogDensity: 0.0056,
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
    fogDensity: 0.012,
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
    fogDensity: 0.018,
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
    fogDensity: 0.01,
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
/** Default camera distance (OSRS mid-zoom). */
export const ORBIT_DISTANCE = 8.6
/** Pinch / wheel zoom limits — close enough to read docks, far enough for the river. */
export const ORBIT_DISTANCE_MIN = 4.2
export const ORBIT_DISTANCE_MAX = 16.5

export function clampOrbitPitch(pitch: number): number {
  return Math.min(ORBIT_PITCH_MAX, Math.max(ORBIT_PITCH_MIN, pitch))
}

export function clampOrbitDistance(distance: number): number {
  return Math.min(ORBIT_DISTANCE_MAX, Math.max(ORBIT_DISTANCE_MIN, distance))
}

/**
 * Maps-style pinch → orbit distance.
 * Fingers spreading apart → zoom in (closer camera); pinching together → zoom out (farther).
 */
export function orbitDistanceFromPinch(
  startDistance: number,
  startSpan: number,
  span: number,
): number {
  if (startSpan <= 1) return clampOrbitDistance(startDistance)
  const scale = startSpan / Math.max(1, span)
  return clampOrbitDistance(startDistance * scale)
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

/** Screen-pixel slop — motion under this is a tap, not an orbit drag (OSRS click). */
export const HARBOR_TAP_SLOP_PX = 10
/** Canoe paddle / walk speed in world units per second. */
export const HARBOR_TAP_MOVE_SPEED = 4.2
/** Stop when this close to the destination marker. */
export const HARBOR_TAP_ARRIVE = 0.4

/**
 * |x| beyond this is walkable bank — the canoe stays in the river channel.
 * Tap land to disembark; tap the moored boat (or water beside it) to board again.
 */
export const HARBOR_LAND_EDGE = RIVER + 0.9
/** On-foot walk speed (OSRS click-to-walk). */
export const HARBOR_WALK_SPEED = 3.4
/** Reach the moored canoe to board again. */
export const HARBOR_REBOARD_RADIUS = 1.75

export function isHarborLand(x: number): boolean {
  return Math.abs(x) >= HARBOR_LAND_EDGE
}

/** Clamp a free-move point onto the playable river corridor. */
/** How far inland the Scout may walk (bank lanes → foothill roads). */
export const HARBOR_EXPLORE_X = 14.5

export function clampHarborMoveTarget(x: number, z: number): { x: number; z: number } {
  const maxX = HARBOR_EXPLORE_X
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    z: Math.min(248, Math.max(-4, z)),
  }
}

/** Keep the canoe in the river / pier lane (no driving through inland roads). */
export function clampHarborBoatTarget(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.min(HARBOR_LAND_EDGE, Math.max(-HARBOR_LAND_EDGE, x)),
    z: Math.min(248, Math.max(-4, z)),
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

/** China tea-cup rose — soft pink cups on a low leafy mound. */
function chinaTeaCupRose(rng: () => number) {
  const g = new THREE.Group()
  g.name = 'china-tea-cup-rose'
  const h = 0.45 + rng() * 0.2
  g.add(hqPost(0.04, 0.06, h * 0.55, 0x3a2a28, 0, h * 0.28, 0, 4))
  g.add(hqCanopy(0.32 + rng() * 0.1, P.leafMid, 0, h * 0.55, 0))
  g.add(
    hqCanopy(
      0.22 + rng() * 0.08,
      P.leafDeep,
      (rng() - 0.5) * 0.25,
      h * 0.45,
      (rng() - 0.5) * 0.25,
    ),
  )
  const cups = [P.blossom, P.blossomDeep, 0xf8d0dc, 0xf0a8b8]
  const n = 4 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.4
    const r = 0.12 + rng() * 0.18
    const cup = new THREE.Mesh(
      new THREE.ConeGeometry(0.06 + rng() * 0.03, 0.07 + rng() * 0.03, 5),
      mat(cups[Math.floor(rng() * cups.length)]!),
    )
    cup.position.set(Math.cos(a) * r, h * 0.7 + rng() * 0.12, Math.sin(a) * r)
    cup.rotation.x = Math.PI
    g.add(cup)
  }
  return g
}

/** Hawthorn berry bush — white blossom clusters + red haws. */
function hawthornBush(rng: () => number) {
  const g = new THREE.Group()
  g.name = 'hawthorn-berry'
  const h = 0.7 + rng() * 0.35
  g.add(hqPost(0.05, 0.08, h * 0.65, 0x2e2418, 0, h * 0.32, 0, 5))
  // Twiggy forks
  for (let i = 0; i < 2; i++) {
    const twig = hqPost(0.03, 0.04, 0.28, 0x2e2418, (i ? 0.12 : -0.1), h * 0.55, (rng() - 0.5) * 0.1, 4)
    twig.rotation.z = (i ? -0.55 : 0.55)
    g.add(twig)
  }
  const greens = [P.leafMid, P.leafDeep, 0x3a7048]
  for (let i = 0; i < 3; i++) {
    g.add(
      hqCanopy(
        0.28 + rng() * 0.12,
        greens[Math.floor(rng() * greens.length)]!,
        (rng() - 0.5) * 0.35,
        h * (0.55 + i * 0.12),
        (rng() - 0.5) * 0.35,
      ),
    )
  }
  // White spring blossom flecks
  for (let i = 0; i < 5; i++) {
    g.add(
      hqBox(
        0.06,
        0.05,
        0.06,
        0xf5f0e8,
        (rng() - 0.5) * 0.45,
        h * 0.7 + rng() * 0.2,
        (rng() - 0.5) * 0.45,
      ),
    )
  }
  // Red haws
  for (let i = 0; i < 6; i++) {
    const berry = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 + rng() * 0.015, 4, 3),
      mat(rng() > 0.4 ? 0xc03028 : 0xa02020),
    )
    berry.position.set((rng() - 0.5) * 0.5, h * 0.55 + rng() * 0.35, (rng() - 0.5) * 0.5)
    g.add(berry)
  }
  return g
}

/** Chinese fringe flower (Loropetalum) — burgundy foliage + magenta fringe. */
function chineseFringeFlower(rng: () => number) {
  const g = new THREE.Group()
  g.name = 'chinese-fringe-flower'
  const h = 0.55 + rng() * 0.3
  g.add(hqPost(0.045, 0.07, h * 0.5, 0x2a1c18, 0, h * 0.25, 0, 4))
  const foliage = [0x4a2038, 0x3a1828, 0x5a2840]
  for (let i = 0; i < 3; i++) {
    g.add(
      hqCanopy(
        0.3 + rng() * 0.12,
        foliage[Math.floor(rng() * foliage.length)]!,
        (rng() - 0.5) * 0.28,
        h * (0.5 + i * 0.1),
        (rng() - 0.5) * 0.28,
      ),
    )
  }
  // Magenta fringe sprays (thin cones)
  const fringe = [0xc02068, 0xd03878, 0xa01850]
  const n = 5 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.5
    const r = 0.1 + rng() * 0.22
    const spray = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.14 + rng() * 0.06, 4),
      mat(fringe[Math.floor(rng() * fringe.length)]!),
    )
    spray.position.set(Math.cos(a) * r, h * 0.75 + rng() * 0.1, Math.sin(a) * r)
    spray.rotation.x = -0.35 + rng() * 0.2
    spray.rotation.z = (rng() - 0.5) * 0.4
    g.add(spray)
  }
  return g
}


/** Warm point-light strength — brighter at night / dark weather. */
export function harborLanternIntensity(weather: HarborWeather): number {
  if (weather === 'night') return 1.65
  if (weather === 'rainy') return 1.1
  if (weather === 'cloudy') return 0.55
  return 0.14
}

function glowMat(color: number, emissive: number, intensity = 0.9) {
  return new THREE.MeshLambertMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    flatShading: true,
  })
}

function attachLanternLight(
  parent: THREE.Object3D,
  weather: HarborWeather,
  y = 1.55,
  color = 0xffb060,
  scale = 1,
) {
  const base = harborLanternIntensity(weather) * scale
  const light = new THREE.PointLight(color, base, 7.5, 2)
  light.position.set(0, y, 0)
  light.userData.harborLanternLight = true
  light.userData.baseIntensity = base
  parent.add(light)
  return light
}

/** Paper lantern on a post — emits ambiance light (stronger at night / rain). */
function lantern(weather: HarborWeather = 'sunny') {
  const g = new THREE.Group()
  g.userData.harborLantern = true
  g.add(hqPost(0.05, 0.07, 1.5, P.woodDark, 0, 0.75, 0, 5))
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.34, 0.3),
    glowMat(P.lantern, 0xffa040, weather === 'sunny' ? 0.28 : 0.95),
  )
  lamp.position.set(0, 1.55, 0)
  g.add(lamp)
  g.add(hqBox(0.34, 0.04, 0.34, P.woodDeep, 0, 1.74, 0))
  attachLanternLight(g, weather, 1.55)
  return g
}

/** Compact gunwale lantern — lights the canoe so night reads as night, not underexposure. */
function boatLantern(
  weather: HarborWeather = 'sunny',
  lanternId: string = HARBOR_DEFAULT_LOOK.lantern,
) {
  const item = harborGearById(lanternId) ?? harborGearById(HARBOR_DEFAULT_LOOK.lantern)!
  const paper = item.color
  const glowCol = item.accent ?? paper
  const g = new THREE.Group()
  g.userData.harborLantern = true
  g.userData.boatLantern = true
  g.userData.vesselPart = true
  g.name = 'boat-lantern'
  const id = item.id
  if (id.startsWith('lantern-silk') || id === 'lantern-phoenix' || id === 'lantern-starlight') {
    g.add(hqPost(0.025, 0.035, 0.5, P.woodDark, 0, 0.26, 0, 5))
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.28, 6),
      glowMat(paper, glowCol, weather === 'sunny' ? 0.4 : 1.2),
    )
    lamp.position.set(0, 0.55, 0)
    g.add(lamp)
    g.add(hqBox(0.14, 0.03, 0.14, P.woodDeep, 0, 0.7, 0))
    attachLanternLight(g, weather, 0.55, glowCol, id === 'lantern-starlight' ? 1.55 : 1.3)
  } else if (id.startsWith('lantern-glass') || id === 'lantern-porcelain') {
    g.add(hqPost(0.028, 0.038, 0.45, P.woodDark, 0, 0.24, 0, 5))
    const lamp = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      glowMat(paper, glowCol, weather === 'sunny' ? 0.45 : 1.25),
    )
    lamp.position.set(0, 0.52, 0)
    g.add(lamp)
    attachLanternLight(g, weather, 0.52, glowCol, 1.35)
  } else if (id === 'lantern-oil-iron' || id === 'lantern-dragon') {
    g.add(hqPost(0.03, 0.04, 0.4, P.woodDark, 0, 0.22, 0, 5))
    g.add(hqBox(0.16, 0.2, 0.16, paper, 0, 0.5, 0))
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.1),
      glowMat(glowCol, glowCol, weather === 'sunny' ? 0.5 : 1.35),
    )
    core.position.set(0, 0.5, 0)
    g.add(core)
    attachLanternLight(g, weather, 0.5, glowCol, id === 'lantern-dragon' ? 1.5 : 1.2)
  } else {
    g.add(hqPost(0.03, 0.04, 0.42, P.woodDark, 0, 0.22, 0, 5))
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.2, 0.18),
      glowMat(paper, glowCol, weather === 'sunny' ? 0.35 : 1.1),
    )
    lamp.position.set(0, 0.5, 0)
    g.add(lamp)
    g.add(hqBox(0.2, 0.03, 0.2, P.woodDeep, 0, 0.62, 0))
    attachLanternLight(g, weather, 0.5, glowCol, 1.25)
  }
  return g
}

/** Packed-earth lane with wheel ruts — riverside + inland walkways. */
function dirtRoadStrip(length: number, width = 1.1) {
  const g = new THREE.Group()
  g.userData.dirtRoad = true
  g.add(hqBox(width, 0.05, length, 0x6a4828, 0, 0.06, 0))
  g.add(hqBox(0.12, 0.02, length * 0.96, 0x4a3018, -width * 0.22, 0.09, 0))
  g.add(hqBox(0.12, 0.02, length * 0.96, 0x4a3018, width * 0.22, 0.09, 0))
  return g
}

/** Flagstone / cobble ribbon for village approaches (still walkable). */
function stoneRoadStrip(length: number, width = 1.15) {
  const g = new THREE.Group()
  g.userData.dirtRoad = true
  g.userData.stoneRoad = true
  g.add(hqBox(width, 0.06, length, 0x7a7870, 0, 0.05, 0))
  for (let i = 0; i < 5; i++) {
    const z = -length * 0.35 + i * (length * 0.18)
    g.add(hqBox(width * 0.42, 0.04, length * 0.12, i % 2 ? 0x8a8880 : 0x6a6860, -width * 0.18, 0.09, z))
    g.add(hqBox(width * 0.42, 0.04, length * 0.12, i % 2 ? 0x6a6860 : 0x8a8880, width * 0.18, 0.09, z))
  }
  return g
}

/** Chinese roadside 路牌 — timber post + hanging board with glyph blocks. */
const ROAD_SIGN_KINDS = [
  { id: 'ferry', glyph: '渡', en: 'Ferry' },
  { id: 'village', glyph: '村', en: 'Village' },
  { id: 'mountain', glyph: '山', en: 'Mountain' },
  { id: 'ford', glyph: '津', en: 'Ford' },
  { id: 'pavilion', glyph: '亭', en: 'Pavilion' },
  { id: 'road', glyph: '路', en: 'Road' },
  { id: 'bridge', glyph: '橋', en: 'Bridge' },
  { id: 'temple', glyph: '廟', en: 'Temple' },
] as const

function roadSign(kindIndex: number, rng: () => number) {
  const kind = ROAD_SIGN_KINDS[kindIndex % ROAD_SIGN_KINDS.length]!
  const g = new THREE.Group()
  g.name = `road-sign-${kind.id}`
  g.userData.roadSign = true
  g.userData.roadSignKind = kind.id
  g.userData.roadSignGlyph = kind.glyph
  // Post + arm
  g.add(hqPost(0.07, 0.09, 2.45, P.woodDark, 0, 1.22, 0, 5))
  g.add(hqBox(0.95, 0.08, 0.08, P.woodMid, 0.35, 2.2, 0))
  // Hanging lacquer board
  g.add(hqBox(0.58, 0.78, 0.07, 0x142828, 0.7, 1.88, 0))
  g.add(hqBox(0.64, 0.08, 0.09, P.trimGold, 0.7, 2.3, 0))
  g.add(hqBox(0.64, 0.08, 0.09, P.trimGold, 0.7, 1.46, 0))
  // Abstract Chinese glyph in jade / ivory blocks (readable as a character mark)
  const ink = rng() > 0.45 ? P.jade : 0xf0e8d0
  g.add(hqBox(0.28, 0.07, 0.04, ink, 0.7, 2.08, 0.05))
  g.add(hqBox(0.07, 0.32, 0.04, ink, 0.7, 1.9, 0.05))
  g.add(hqBox(0.22, 0.07, 0.04, ink, 0.7, 1.72, 0.05))
  if (kind.id === 'mountain' || kind.id === 'temple') {
    g.add(hqBox(0.18, 0.07, 0.04, P.trimGold, 0.7, 1.58, 0.05))
  }
  // Small roof cap on the post
  g.add(hqBox(0.28, 0.06, 0.28, P.woodDeep, 0, 2.48, 0))
  g.add(hqBox(0.18, 0.05, 0.18, P.trimGold, 0, 2.55, 0))
  return g
}

function placeDirtRoads(
  group: THREE.Group,
  chunkIndex: number,
  rng: () => number,
  weather: HarborWeather = 'sunny',
) {
  const z0 = chunkIndex * CHUNK
  const mid = z0 + CHUNK / 2
  const inlandX = BANK + 6.4
  for (const side of [-1, 1] as const) {
    // Riverside packed-earth lane
    const road = dirtRoadStrip(CHUNK - 0.35, 1.05 + rng() * 0.2)
    road.position.set(side * (BANK + 0.25), 0, mid)
    group.add(road)
    // Parallel inland walkway toward the karst foothills
    const inland = dirtRoadStrip(CHUNK - 0.45, 0.95 + rng() * 0.15)
    inland.userData.inlandRoad = true
    inland.position.set(side * inlandX, 0.01, mid)
    group.add(inland)
    // Village chunks get a short stone approach on the inland road
    if (biomeForChunk(chunkIndex) === 'village' && rng() > 0.35) {
      const stone = stoneRoadStrip(CHUNK * 0.45, 1.2)
      stone.position.set(side * inlandX, 0.02, z0 + CHUNK * 0.55)
      group.add(stone)
    }
    // Cross-path linking river lane ↔ inland road (walkable roadway)
    if (rng() > 0.2) {
      const crossLen = inlandX - (BANK + 0.25)
      const cross = dirtRoadStrip(crossLen, 0.85)
      cross.userData.crossPath = true
      cross.rotation.y = Math.PI / 2
      cross.position.set(side * ((BANK + 0.25 + inlandX) / 2), 0.01, z0 + 4 + rng() * (CHUNK - 8))
      group.add(cross)
    }
    // Spur toward shore / pier landings
    if (rng() > 0.25) {
      const spur = dirtRoadStrip(2.8, 0.8)
      spur.rotation.y = Math.PI / 2
      spur.position.set(side * (RIVER + 2.35), 0, z0 + 3.5 + rng() * (CHUNK - 7))
      group.add(spur)
    }
    // Foothill path stub reaching toward mountain mist
    if (rng() > 0.4) {
      const foothillPath = dirtRoadStrip(3.4, 0.75)
      foothillPath.userData.foothillPath = true
      foothillPath.rotation.y = Math.PI / 2
      foothillPath.position.set(side * (inlandX + 2.2), 0.03, z0 + 6 + rng() * (CHUNK - 10))
      group.add(foothillPath)
    }
    // Roadside lanterns along both lanes
    for (const t of [0.2, 0.5, 0.8] as const) {
      if (rng() > 0.4) continue
      const lamp = lantern(weather)
      const onInland = rng() > 0.45
      const laneX = onInland ? inlandX : BANK + 0.25
      lamp.position.set(
        side * (laneX + (rng() > 0.5 ? 0.55 : -0.55)),
        0,
        z0 + CHUNK * t + (rng() - 0.5) * 1.2,
      )
      lamp.rotation.y = rng() * Math.PI * 2
      group.add(lamp)
    }
    // Chinese road signs at junctions
    if (rng() > 0.28) {
      const sign = roadSign(Math.floor(rng() * ROAD_SIGN_KINDS.length), rng)
      sign.position.set(
        side * (BANK + 0.9 + rng() * 0.6),
        0,
        z0 + 5 + rng() * (CHUNK - 10),
      )
      sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2
      group.add(sign)
    }
    if (rng() > 0.5) {
      const sign2 = roadSign(Math.floor(rng() * ROAD_SIGN_KINDS.length), rng)
      sign2.position.set(side * (inlandX + 0.7), 0, z0 + 8 + rng() * (CHUNK - 12))
      sign2.rotation.y = side > 0 ? -0.4 : 0.4
      group.add(sign2)
    }
  }
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



/** Floating speech bubble — OSRS-style cue that this NPC has dialogue. */
export const HARBOR_DIALOGUE_BUBBLE = true as const

function speechBubbleIcon() {
  const g = new THREE.Group()
  g.name = 'speech-bubble'
  g.userData.speechBubble = true
  g.userData.billboard = true
  // Parchment bubble body
  g.add(hqBox(0.44, 0.32, 0.08, 0xfff8ec, 0, 0.1, 0))
  g.add(hqBox(0.48, 0.05, 0.09, 0xe8d8c0, 0, 0.28, 0))
  g.add(hqBox(0.48, 0.05, 0.09, 0xe8d8c0, 0, -0.08, 0))
  // Soft gold rim (readable against sky / trees)
  g.add(hqBox(0.5, 0.03, 0.06, P.trimGold, 0, 0.3, 0.01))
  g.add(hqBox(0.5, 0.03, 0.06, P.trimGold, 0, -0.1, 0.01))
  // Tail pointing down toward the head
  g.add(hqBox(0.1, 0.1, 0.07, 0xfff8ec, -0.08, -0.18, 0))
  g.add(hqBox(0.07, 0.08, 0.07, 0xfff8ec, -0.12, -0.26, 0))
  // Three ink dots (…)
  for (const x of [-0.12, 0, 0.12] as const) {
    g.add(hqBox(0.06, 0.06, 0.05, 0x1a2830, x, 0.1, 0.05))
  }
  return g
}

/** Mark an NPC as talkable and hover a speech bubble above their head. */
function attachDialogueBubble(npc: THREE.Object3D) {
  npc.userData.hasDialogue = true
  // Avoid double-attaching if chunk rebuilds call this twice
  if (npc.getObjectByName('speech-bubble')) return
  const bubble = speechBubbleIcon()
  // Local Y sits above the oversized head (group scale still applies)
  bubble.position.set(0.12, 1.68, 0.06)
  bubble.userData.bubbleBaseY = bubble.position.y
  npc.add(bubble)
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



/** Landmark host roles — one special NPC per visitable building (smoke-tested). */
export const HARBOR_LANDMARK_HOSTS = [
  'save-shack',
  'outfitter',
  'bank',
  'arena',
  'barber',
] as const satisfies readonly HarborVisitableId[]
export type HarborLandmarkHostId = (typeof HARBOR_LANDMARK_HOSTS)[number]

const LANDMARK_GLOW: Record<HarborLandmarkHostId, number> = {
  'save-shack': 0xffd060,
  outfitter: 0xff80c0,
  bank: 0x60ffe0,
  arena: 0xff6040,
  barber: 0xff7090,
}

/** Soft pulsing ground ring + aura light — flags a landmark host as special. */
function attachSpecialHostGlow(npc: THREE.Object3D, tint: number, weather: HarborWeather) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.55, 16),
    new THREE.MeshLambertMaterial({
      color: tint,
      emissive: tint,
      emissiveIntensity: weather === 'night' ? 1.35 : 0.85,
      flatShading: true,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.04
  ring.name = 'special-host-glow'
  ring.userData.specialHostGlow = true
  ring.userData.glowBaseIntensity = weather === 'night' ? 1.35 : 0.85
  npc.add(ring)

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.045, 6, 14),
    glowMat(tint, tint, weather === 'night' ? 1.2 : 0.7),
  )
  halo.rotation.x = Math.PI / 2
  halo.position.y = 0.9
  halo.name = 'special-host-halo'
  halo.userData.specialHostGlow = true
  halo.userData.glowBaseIntensity = weather === 'night' ? 1.2 : 0.7
  npc.add(halo)

  const light = new THREE.PointLight(
    tint,
    weather === 'night' ? 1.35 : weather === 'sunny' ? 0.45 : 0.85,
    5.5,
    2,
  )
  light.position.set(0, 1.15, 0.15)
  light.userData.harborLanternLight = true
  light.userData.baseIntensity = light.intensity
  light.userData.specialHostLight = true
  npc.add(light)
}

/** Golden glowing floppy disk — Save Shack prop. */
function glowingFloppyDisk() {
  const g = new THREE.Group()
  g.name = 'floppy-disk'
  g.add(hqBox(0.22, 0.02, 0.22, 0xd4a020, 0, 0, 0))
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.015, 0.2),
    glowMat(0xffe080, 0xffc020, 1.15),
  )
  face.position.y = 0.012
  g.add(face)
  g.add(hqBox(0.08, 0.02, 0.1, 0x1a2830, 0, 0.02, 0.02))
  g.add(hqBox(0.05, 0.018, 0.05, 0xfff0a0, -0.05, 0.022, -0.06))
  const spark = new THREE.PointLight(0xffd060, 0.55, 2.2, 2)
  spark.position.set(0, 0.08, 0)
  spark.userData.harborLanternLight = true
  spark.userData.baseIntensity = 0.55
  g.add(spark)
  return g
}

/** Cloth sack spilling gold taels — Bank prop. */
function goldTaelBag() {
  const g = new THREE.Group()
  g.name = 'tael-bag'
  g.add(hqBox(0.18, 0.16, 0.16, 0x6a4428, 0, 0.08, 0))
  g.add(hqBox(0.1, 0.06, 0.1, 0x8a5a30, 0, 0.18, 0))
  // Drawstring
  g.add(hqPost(0.015, 0.018, 0.08, 0xd4a040, 0, 0.24, 0, 5))
  for (const [x, z] of [
    [0.1, 0.02],
    [0.08, -0.06],
    [-0.02, 0.08],
  ] as const) {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.015, 8),
      glowMat(0xffd060, 0xffb020, 0.7),
    )
    coin.rotation.x = Math.PI / 2
    coin.position.set(x, 0.04, z)
    g.add(coin)
  }
  return g
}

/** Lit cigarette + rising smoke puffs (Outfitter host). */
function cigaretteWithSmoke() {
  const g = new THREE.Group()
  g.name = 'cigarette'
  g.userData.cigaretteSmoke = true
  g.add(hqPost(0.012, 0.014, 0.14, 0xf0e8d0, 0, 0.07, 0, 5))
  g.add(hqBox(0.02, 0.02, 0.02, 0xc04020, 0, 0.15, 0))
  const ember = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 5, 4),
    glowMat(0xff6020, 0xff4010, 1.4),
  )
  ember.position.set(0, 0.16, 0)
  g.add(ember)
  for (let i = 0; i < 3; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 + i * 0.012, 5, 4),
      new THREE.MeshLambertMaterial({
        color: 0xd8d8d8,
        transparent: true,
        opacity: 0.45 - i * 0.1,
        flatShading: true,
      }),
    )
    puff.position.set(0.02 + i * 0.01, 0.22 + i * 0.1, 0)
    puff.userData.smokePuff = true
    puff.userData.smokeIndex = i
    g.add(puff)
  }
  return g
}

/** Long ji / halberd — Arena Lu Bu homage prop. */
function luBuHalberd() {
  const g = new THREE.Group()
  g.name = 'halberd'
  g.add(hqPost(0.03, 0.035, 1.55, 0x4a3020, 0, 0.78, 0, 5))
  g.add(hqBox(0.08, 0.28, 0.04, 0xc0c8d0, 0.06, 1.45, 0))
  g.add(hqBox(0.18, 0.08, 0.03, 0xa8b0b8, 0.14, 1.52, 0))
  g.add(hqBox(0.05, 0.12, 0.03, 0xd4a040, 0, 1.3, 0))
  g.rotation.z = -0.35
  return g
}


/** Open scissors — Barber host prop. */
function barberScissors() {
  const g = new THREE.Group()
  g.name = 'scissors'
  // Pivot handles
  g.add(hqPost(0.012, 0.015, 0.28, 0xc0c8d0, -0.04, 0.14, 0, 5))
  g.add(hqPost(0.012, 0.015, 0.28, 0xc0c8d0, 0.04, 0.14, 0, 5))
  const bladeL = hqBox(0.04, 0.02, 0.22, 0xe8eef2, -0.03, 0.34, 0)
  bladeL.rotation.z = 0.35
  g.add(bladeL)
  const bladeR = hqBox(0.04, 0.02, 0.22, 0xe8eef2, 0.03, 0.34, 0)
  bladeR.rotation.z = -0.35
  g.add(bladeR)
  g.add(hqPost(0.025, 0.028, 0.04, 0xd4a040, 0, 0.18, 0, 6))
  return g
}

/**
 * Landmark host figure — oversized-head RS proportions, unique kit per building.
 * Homage silhouettes (landlady / Lu Bu) — original low-poly kit, not ripped meshes.
 */
function landmarkHostNpc(id: HarborLandmarkHostId, weather: HarborWeather) {
  const g = new THREE.Group()
  g.name = `landmark-host-${id}`
  g.userData.npc = id
  g.userData.landmarkHost = id
  g.userData.specialNpc = true

  const skin = hqMat(P.skin)
  const hair = hqMat(P.hair)

  if (id === 'save-shack') {
    // Vault keeper in teal robes, golden floppy disk
    for (const sx of [-0.1, 0.1] as const) {
      g.add(hqPost(0.06, 0.07, 0.4, 0x1a3a38, sx, 0.22, 0))
      g.add(hqBox(0.11, 0.07, 0.16, P.woodDark, sx, 0.04, 0.03))
    }
    g.add(hqBox(0.36, 0.48, 0.24, 0x1e5a58, 0, 0.62, 0))
    g.add(hqBox(0.38, 0.08, 0.26, P.trimGold, 0, 0.55, 0))
    g.add(hqBox(0.2, 0.14, 0.06, 0xffe080, 0, 0.78, 0.13)) // chest badge
    for (const sx of [-1, 1] as const) {
      g.add(hqPost(0.055, 0.065, 0.32, 0x1e5a58, sx * 0.24, 0.72, 0))
      g.add(hqBox(0.1, 0.1, 0.1, P.skin, sx * 0.24, 0.52, 0.02))
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), skin)
    head.position.y = 1.08
    g.add(head)
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), hair)
    bun.position.set(0, 1.2, -0.04)
    g.add(bun)
    g.add(hqBox(0.28, 0.08, 0.24, 0x1a3030, 0, 1.2, 0)) // cap
    const disk = glowingFloppyDisk()
    disk.position.set(0.28, 0.62, 0.14)
    disk.rotation.x = -0.4
    disk.rotation.z = 0.35
    g.add(disk)
  } else if (id === 'bank') {
    // Banker — ink coat, gold trim, tael bag
    for (const sx of [-0.1, 0.1] as const) {
      g.add(hqPost(0.06, 0.07, 0.42, 0x1a1a22, sx, 0.22, 0))
      g.add(hqBox(0.12, 0.07, 0.16, 0x2a2a30, sx, 0.04, 0.03))
    }
    g.add(hqBox(0.38, 0.55, 0.26, 0x1e2430, 0, 0.68, 0))
    g.add(hqBox(0.4, 0.1, 0.28, P.trimGold, 0, 0.58, 0))
    g.add(hqBox(0.42, 0.08, 0.08, P.jade, 0, 0.95, 0.1)) // collar jade
    for (const sx of [-1, 1] as const) {
      g.add(hqPost(0.055, 0.065, 0.34, 0x1e2430, sx * 0.25, 0.74, 0))
      g.add(hqBox(0.1, 0.1, 0.1, P.skin, sx * 0.25, 0.54, 0.02))
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), skin)
    head.position.y = 1.1
    g.add(head)
    // Skullcap + queue nod (hair mat under ink cap)
    const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), hair)
    topknot.position.set(0, 1.28, -0.02)
    g.add(topknot)
    g.add(hqPost(0.12, 0.13, 0.1, 0x12141a, 0, 1.22, 0))
    g.add(hqBox(0.04, 0.04, 0.22, 0x1a1a22, 0, 1.18, -0.16))
    const bag = goldTaelBag()
    bag.position.set(0.3, 0.42, 0.12)
    bag.rotation.y = -0.4
    g.add(bag)
  } else if (id === 'outfitter') {
    // Landlady homage — rollers, stern qipao stripes, cigarette
    for (const sx of [-0.1, 0.1] as const) {
      g.add(hqPost(0.06, 0.07, 0.38, 0x3a2030, sx, 0.2, 0))
      g.add(hqBox(0.11, 0.06, 0.15, 0x2a1820, sx, 0.04, 0.03))
    }
    g.add(hqBox(0.36, 0.5, 0.24, 0xc04068, 0, 0.62, 0))
    // Stripe trim
    for (const y of [0.48, 0.62, 0.76] as const) {
      g.add(hqBox(0.38, 0.04, 0.26, 0xf0e0c8, 0, y, 0))
    }
    for (const sx of [-1, 1] as const) {
      g.add(hqPost(0.055, 0.065, 0.3, 0xc04068, sx * 0.24, 0.72, 0))
      g.add(hqBox(0.1, 0.1, 0.1, P.skin, sx * 0.24, 0.52, 0.02))
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), skin)
    head.position.y = 1.06
    g.add(head)
    // Hair rollers
    for (const [x, z] of [
      [-0.1, -0.02],
      [0.1, -0.02],
      [0, 0.06],
      [-0.06, 0.08],
      [0.06, 0.08],
    ] as const) {
      const roller = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.07, 6),
        hqMat(0xf0d0e0),
      )
      roller.rotation.z = Math.PI / 2
      roller.position.set(x, 1.22, z)
      g.add(roller)
    }
    // Stern brows
    g.add(hqBox(0.08, 0.02, 0.02, 0x1a1a22, -0.06, 1.1, 0.13))
    g.add(hqBox(0.08, 0.02, 0.02, 0x1a1a22, 0.06, 1.1, 0.13))
    const cig = cigaretteWithSmoke()
    cig.position.set(0.3, 0.7, 0.12)
    cig.rotation.z = 0.9
    cig.rotation.x = -0.3
    g.add(cig)
  } else if (id === 'barber') {
    // Harbor barber — striped apron, tidy topknot, scissors
    for (const sx of [-0.1, 0.1] as const) {
      g.add(hqPost(0.06, 0.07, 0.4, 0x1a2830, sx, 0.22, 0))
      g.add(hqBox(0.11, 0.07, 0.16, 0x2a3840, sx, 0.04, 0.03))
    }
    g.add(hqBox(0.36, 0.5, 0.24, 0xf2efe8, 0, 0.62, 0))
    // Red / white / blue apron stripes
    for (const [y, c] of [
      [0.48, 0xc02838],
      [0.58, 0xf8f4ec],
      [0.68, 0x2a58a8],
      [0.78, 0xf8f4ec],
    ] as const) {
      g.add(hqBox(0.38, 0.05, 0.26, c, 0, y, 0))
    }
    for (const sx of [-1, 1] as const) {
      g.add(hqPost(0.055, 0.065, 0.32, 0xf2efe8, sx * 0.24, 0.72, 0))
      g.add(hqBox(0.1, 0.1, 0.1, P.skin, sx * 0.24, 0.52, 0.02))
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), skin)
    head.position.y = 1.08
    g.add(head)
    const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), hair)
    topknot.position.set(0, 1.26, -0.02)
    g.add(topknot)
    g.add(hqBox(0.3, 0.06, 0.26, 0x1a1a22, 0, 1.2, 0))
    // Comb tucked in apron
    g.add(hqBox(0.04, 0.16, 0.02, 0xd4a040, -0.2, 0.7, 0.14))
    const shears = barberScissors()
    shears.position.set(0.3, 0.55, 0.12)
    shears.rotation.z = -0.7
    shears.rotation.x = 0.25
    g.add(shears)
  } else {
    // Arena Lu Bu homage — tall red/black armor, horned helm, halberd
    g.scale.setScalar(1.12)
    for (const sx of [-0.12, 0.12] as const) {
      g.add(hqPost(0.07, 0.08, 0.45, 0x1a1018, sx, 0.24, 0))
      g.add(hqBox(0.14, 0.08, 0.18, 0x2a1820, sx, 0.04, 0.04))
    }
    g.add(hqBox(0.42, 0.55, 0.28, 0x8a1828, 0, 0.7, 0))
    g.add(hqBox(0.46, 0.12, 0.3, 0xd4a040, 0, 0.58, 0))
    g.add(hqBox(0.5, 0.08, 0.1, 0x1a1018, 0, 0.92, 0.12)) // chest plate
    // Cape
    g.add(hqBox(0.5, 0.7, 0.06, 0x5a1020, 0, 0.75, -0.18))
    for (const sx of [-1, 1] as const) {
      g.add(hqPost(0.06, 0.07, 0.36, 0x8a1828, sx * 0.28, 0.78, 0))
      g.add(hqBox(0.11, 0.11, 0.11, P.skin, sx * 0.28, 0.56, 0.02))
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), skin)
    head.position.y = 1.14
    g.add(head)
    // Horned helmet
    g.add(hqBox(0.34, 0.14, 0.3, 0x2a1a20, 0, 1.28, 0))
    for (const sx of [-1, 1] as const) {
      const horn = hqPost(0.03, 0.04, 0.28, 0xd4a040, sx * 0.14, 1.42, -0.02, 5)
      horn.rotation.z = sx * 0.55
      g.add(horn)
    }
    const halberd = luBuHalberd()
    halberd.position.set(0.38, 0.15, 0.05)
    g.add(halberd)
  }

  attachSpecialHostGlow(g, LANDMARK_GLOW[id], weather)
  attachDialogueBubble(g)
  return g
}

/** Place the matching landmark host just river-side of each special building. */
function attachLandmarkHost(building: THREE.Group, id: HarborLandmarkHostId, weather: HarborWeather) {
  const host = landmarkHostNpc(id, weather)
  // Local +Z faces the river approach on every landmark mesh
  const pose: Record<HarborLandmarkHostId, [number, number, number]> = {
    'save-shack': [0.85, 0.5, 2.35],
    outfitter: [0.95, 0.7, 1.15],
    bank: [0.95, 0.35, 1.55],
    arena: [1.05, 0.12, 1.35],
    barber: [0.9, 0.4, 1.45],
  }
  const [x, y, z] = pose[id]
  host.position.set(x, y, z)
  // Face slightly toward the river path
  host.rotation.y = -0.35
  building.add(host)
}

/** Seated River Scout — original RS-era-proportion mannequin (see harborProtagonist.ts). */
function playerTraveler(opts?: {
  gender?: HarborGender
  appearance?: HarborAppearance
}) {
  return buildHarborProtagonist({
    pose: 'seated',
    gender: opts?.gender,
    appearance: opts?.appearance,
  })
}

function bird() {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 4), mat(0xd8e0e8))
  mesh.rotation.z = Math.PI / 2
  return mesh
}

/** Low-poly deer — box body, short faceted legs (readable bank fauna). */
function deer(rng: () => number) {
  const g = new THREE.Group()
  g.userData.fauna = 'deer'
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

/** Giant panda — chunky black/white blocks (forest / hill banks). */
function panda(_rng: () => number) {
  const g = new THREE.Group()
  g.userData.fauna = 'panda'
  g.add(hqBox(0.55, 0.38, 0.36, 0xf2f2f0, 0, 0.55, 0))
  g.add(hqBox(0.28, 0.26, 0.26, 0xf2f2f0, 0.34, 0.78, 0))
  // Ear patches + eye spots
  g.add(hqBox(0.1, 0.1, 0.06, 0x1a1a1a, 0.42, 0.96, 0.1))
  g.add(hqBox(0.1, 0.1, 0.06, 0x1a1a1a, 0.42, 0.96, -0.1))
  g.add(hqBox(0.08, 0.06, 0.04, 0x1a1a1a, 0.46, 0.82, 0.08))
  g.add(hqBox(0.08, 0.06, 0.04, 0x1a1a1a, 0.46, 0.82, -0.08))
  // Black limbs
  for (const x of [-0.16, 0.14] as const) {
    for (const z of [-0.12, 0.12] as const) {
      g.add(hqPost(0.07, 0.09, 0.36, 0x1a1a1a, x, 0.2, z, 5))
    }
  }
  g.add(hqBox(0.18, 0.14, 0.22, 0x1a1a1a, -0.32, 0.62, 0)) // shoulder band
  return g
}

/** South China tiger — amber coat, ink stripes (rare hill fauna). */
function southChinaTiger(_rng: () => number) {
  const g = new THREE.Group()
  g.userData.fauna = 'tiger'
  const coat = 0xd4882a
  g.add(hqBox(0.75, 0.34, 0.28, coat, 0, 0.55, 0))
  const neck = hqBox(0.16, 0.28, 0.16, coat, 0.4, 0.7, 0)
  neck.rotation.z = -0.25
  g.add(neck)
  g.add(hqBox(0.26, 0.18, 0.2, coat, 0.55, 0.86, 0))
  // Stripe accents
  for (const x of [-0.2, 0, 0.2] as const) {
    g.add(hqBox(0.05, 0.28, 0.3, 0x2a1810, x, 0.56, 0))
  }
  g.add(hqBox(0.08, 0.06, 0.04, 0x1a1a1a, 0.64, 0.92, 0.07))
  g.add(hqBox(0.08, 0.06, 0.04, 0x1a1a1a, 0.64, 0.92, -0.07))
  for (const x of [-0.22, 0.18] as const) {
    for (const z of [-0.09, 0.09] as const) {
      g.add(hqPost(0.04, 0.05, 0.42, 0xc07020, x, 0.22, z, 4))
    }
  }
  // Tail
  const tail = hqBox(0.08, 0.08, 0.45, coat, -0.48, 0.62, 0)
  g.add(tail)
  return g
}

/** Crested ibis (朱鷶) — pale body, rose wash, crimson face/crest. */
function crestedIbis(_rng: () => number) {
  const g = new THREE.Group()
  g.userData.fauna = 'ibis'
  g.userData.bird = true // shares gentle soar animation
  g.add(hqBox(0.22, 0.14, 0.12, 0xf4ebe0, 0, 0.12, 0))
  g.add(hqBox(0.14, 0.1, 0.1, 0xf0d8d0, 0.14, 0.16, 0))
  // Crimson face + crest
  g.add(hqBox(0.08, 0.07, 0.07, 0xc02828, 0.22, 0.2, 0))
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), hqMat(0xc02828))
  crest.position.set(0.2, 0.3, 0)
  g.add(crest)
  // Long down-curved bill
  const bill = hqBox(0.18, 0.03, 0.03, 0xc02828, 0.34, 0.16, 0)
  bill.rotation.z = 0.35
  g.add(bill)
  // Wings (rose-washed)
  g.add(hqBox(0.08, 0.04, 0.28, 0xe8b0a8, -0.02, 0.14, 0.16))
  g.add(hqBox(0.08, 0.04, 0.28, 0xe8b0a8, -0.02, 0.14, -0.16))
  // Legs
  g.add(hqPost(0.015, 0.02, 0.18, 0xc02828, 0.02, 0.02, 0.04, 4))
  g.add(hqPost(0.015, 0.02, 0.18, 0xc02828, 0.02, 0.02, -0.04, 4))
  return g
}

/** Chinese giant salamander — long low body along the waterline. */
function giantSalamander(_rng: () => number) {
  const g = new THREE.Group()
  g.userData.fauna = 'salamander'
  const skin = 0x6a5a48
  g.add(hqBox(0.7, 0.14, 0.22, skin, 0, 0.1, 0))
  g.add(hqBox(0.22, 0.14, 0.2, 0x5a4a3a, 0.4, 0.12, 0))
  // Tiny eyes
  g.add(hqBox(0.04, 0.04, 0.03, 0x1a1810, 0.48, 0.18, 0.06))
  g.add(hqBox(0.04, 0.04, 0.03, 0x1a1810, 0.48, 0.18, -0.06))
  // Frilled sides
  g.add(hqBox(0.45, 0.04, 0.06, 0x4a3a30, 0, 0.1, 0.14))
  g.add(hqBox(0.45, 0.04, 0.06, 0x4a3a30, 0, 0.1, -0.14))
  // Short limbs
  for (const x of [-0.2, 0.15] as const) {
    for (const z of [-0.12, 0.12] as const) {
      g.add(hqBox(0.08, 0.05, 0.1, skin, x, 0.05, z))
    }
  }
  // Tail
  g.add(hqBox(0.35, 0.1, 0.12, skin, -0.48, 0.09, 0))
  return g
}

/** Ambient China-native fauna kinds (smoke-tested). */
export const HARBOR_AMBIENT_FAUNA = ['panda', 'tiger', 'ibis', 'salamander', 'deer', 'bird', 'fish'] as const
export type HarborAmbientFauna = (typeof HARBOR_AMBIENT_FAUNA)[number]

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

/** Garden / roadside shrubs along the voyage (smoke-tested). */
export const HARBOR_SCENIC_SHRUBS = [
  'china-tea-cup-rose',
  'hawthorn-berry',
  'chinese-fringe-flower',
] as const
export type HarborScenicShrub = (typeof HARBOR_SCENIC_SHRUBS)[number]

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

function buildBoatHull(boatId: string): THREE.Group {
  const item = harborGearById(boatId) ?? harborGearById(HARBOR_DEFAULT_LOOK.boat)!
  const hull = item.color
  const trim = item.accent ?? P.jade
  const g = new THREE.Group()
  g.userData.vesselPart = true
  g.name = 'boat-hull'
  const id = item.id
  const length =
    id.includes('barge') || id.includes('imperial') || id.includes('pearl')
      ? 2.7
      : id.includes('junk') || id.includes('merchant') || id.includes('dragon')
        ? 2.5
        : id.includes('bamboo') || id.includes('reed')
          ? 2.0
          : 2.2
  const width =
    id.includes('barge') || id.includes('imperial')
      ? 0.95
      : id.includes('junk') || id.includes('merchant')
        ? 0.85
        : id.includes('reed') || id.includes('bamboo')
          ? 0.62
          : 0.72
  const height = id.includes('pearl') || id.includes('imperial') ? 0.4 : 0.32
  g.add(hqBox(length, height, width, hull, 0, 0.22, 0))
  g.add(hqBox(0.35, height * 0.88, width * 0.78, P.woodDark, length * 0.52, 0.24, 0))
  g.add(hqBox(0.35, height * 0.88, width * 0.78, P.woodDark, -length * 0.52, 0.24, 0))
  g.add(hqBox(length * 0.98, 0.08, 0.08, P.woodDeep, 0, 0.4, width * 0.48))
  g.add(hqBox(length * 0.98, 0.08, 0.08, P.woodDeep, 0, 0.4, -width * 0.48))
  g.add(hqBox(0.55, 0.08, 0.4, P.woodDark, 0, 0.38, 0))
  const mastH =
    id.includes('imperial') || id.includes('pearl') ? 1.35 : id.includes('junk') || id.includes('merchant') ? 1.2 : 1.05
  g.add(hqPost(0.035, 0.045, mastH, P.woodDeep, 0.12, 0.9, 0, 5))
  const sailW = id.includes('barge') || id.includes('imperial') ? 0.95 : 0.7
  const sailH = id.includes('junk') || id.includes('merchant') ? 1.05 : 0.85
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(sailW, sailH), hqMat(trim))
  sail.position.set(0.12, 0.95 + (mastH - 1.05) * 0.35, 0.02)
  g.add(sail)
  if (id === 'boat-dragon' || id === 'boat-imperial') {
    g.add(hqBox(0.45, 0.22, 0.28, trim, length * 0.55, 0.55, 0))
    g.add(hqBox(0.18, 0.12, 0.12, 0xf0d060, length * 0.62, 0.68, 0))
  }
  if (id === 'boat-pearl' || id === 'boat-imperial') {
    g.add(hqBox(0.9, 0.06, width * 0.9, trim, -0.15, 0.95, 0))
    g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, -0.45, 0.7, width * 0.28, 5))
    g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, -0.45, 0.7, -width * 0.28, 5))
    g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, 0.2, 0.7, width * 0.28, 5))
    g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, 0.2, 0.7, -width * 0.28, 5))
  }
  if (id === 'boat-bamboo') {
    for (const x of [-0.6, -0.2, 0.2, 0.6] as const) {
      g.add(hqBox(0.08, 0.1, width * 0.95, trim, x, 0.3, 0))
    }
  }
  if (id === 'boat-reed') {
    g.add(hqBox(length * 0.8, 0.06, width * 1.05, trim, 0, 0.36, 0))
  }
  if (id === 'boat-junk' || id === 'boat-merchant') {
    g.add(hqBox(0.55, 0.35, width * 0.7, hull, -length * 0.28, 0.55, 0))
  }
  if (id === 'boat-jade') {
    g.add(hqBox(length * 0.9, 0.04, 0.06, trim, 0, 0.45, width * 0.5))
    g.add(hqBox(length * 0.9, 0.04, 0.06, trim, 0, 0.45, -width * 0.5))
  }
  return g
}

function canoe(
  weather: HarborWeather = 'sunny',
  boatId: string = HARBOR_DEFAULT_LOOK.boat,
  lanternId: string = HARBOR_DEFAULT_LOOK.lantern,
  gender: HarborGender = 'male',
  appearance: HarborAppearance = HARBOR_DEFAULT_APPEARANCE,
) {
  const g = new THREE.Group()
  g.name = 'river-boat'
  g.add(buildBoatHull(boatId))
  const you = playerTraveler({ gender, appearance })
  you.name = 'river-scout'
  you.position.set(0, 0.38, -0.05)
  you.rotation.y = Math.PI
  g.add(you)
  const beam = boatId.includes('barge') || boatId.includes('imperial') ? 0.52 : 0.4
  for (const z of [beam, -beam] as const) {
    const lamp = boatLantern(weather, lanternId)
    lamp.position.set(0.25, 0.35, z)
    g.add(lamp)
  }
  return g
}

/** Rebuild hull + lanterns on an existing boat; keep the River Scout child. */
function applyVesselLook(boat: THREE.Object3D, weather: HarborWeather, look: HarborLook) {
  const doomed: THREE.Object3D[] = []
  for (const child of boat.children) {
    if (child.userData.vesselPart || child.userData.boatLantern || child.name === 'boat-hull' || child.name === 'boat-lantern') {
      doomed.push(child)
    }
  }
  for (const child of doomed) {
    boat.remove(child)
    child.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry?.dispose?.()
      const mat = mesh.material as THREE.Material | THREE.Material[]
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
      else mat?.dispose?.()
    })
  }
  boat.add(buildBoatHull(look.boat))
  const beam = look.boat.includes('barge') || look.boat.includes('imperial') ? 0.52 : 0.4
  for (const z of [beam, -beam] as const) {
    const lamp = boatLantern(weather, look.lantern)
    lamp.position.set(0.25, 0.35, z)
    boat.add(lamp)
  }
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

/** Soft fog veil that hides the empty foot of a karst pillar. */
function mountainMistVeil(width: number, height: number, fogHex: number) {
  const matMist = new THREE.MeshLambertMaterial({
    color: fogHex,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    flatShading: true,
    side: THREE.DoubleSide,
  })
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(width, height), matMist)
  veil.userData.mountainMist = true
  return veil
}

/** Parallax mountain range — foothills + fog veils so pillars no longer float. */
function wulingyuanRange(seed: number, fogHex = 0xe8f8ff) {
  const root = new THREE.Group()
  const rng = mulberry32(seed)
  const count = 32
  for (let i = 0; i < count; i++) {
    const pillar = wulingPillar(rng)
    const side = i % 2 === 0 ? 1 : -1
    // Push the range farther inland so expanded banks meet the foothills
    const x = side * (28 + rng() * 18 + (i % 5) * 1.4)
    const z = (rng() - 0.5) * 110
    pillar.position.set(x, 0.15, z)
    pillar.scale.setScalar(0.9 + rng() * 0.6)
    root.add(pillar)
    // Rocky / grassy foothill mound under each pillar (fills the empty base)
    const mound = new THREE.Mesh(
      new THREE.ConeGeometry(1.6 + rng() * 1.4, 1.1 + rng() * 0.9, 5),
      hqMat(rng() > 0.5 ? 0x5a7a48 : 0x6a6860),
    )
    mound.position.set(x, 0.35, z)
    mound.userData.foothill = true
    root.add(mound)
    // Horizontal fog sheet wrapping the base — reads as mist in the valleys
    const mist = mountainMistVeil(5.5 + rng() * 3, 2.2 + rng() * 1.2, fogHex)
    mist.position.set(x - side * 0.8, 1.1 + rng() * 0.4, z)
    mist.rotation.y = side > 0 ? -0.5 : 0.5
    root.add(mist)
  }
  // Closer gateway pillars with their own mist skirts
  for (let i = 0; i < 8; i++) {
    const pillar = wulingPillar(rng)
    const side = i % 2 === 0 ? 1 : -1
    const x = side * (20 + rng() * 6)
    const z = -24 + i * 14
    pillar.position.set(x, 0.1, z)
    pillar.scale.setScalar(0.75 + rng() * 0.4)
    root.add(pillar)
    const mound = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 1.0, 5),
      hqMat(0x4a6a40),
    )
    mound.position.set(x, 0.3, z)
    mound.userData.foothill = true
    root.add(mound)
    const mist = mountainMistVeil(6.5, 2.6, fogHex)
    mist.position.set(x - side * 0.5, 1.2, z)
    mist.rotation.y = side > 0 ? -0.35 : 0.35
    root.add(mist)
  }
  // Continuous low ridge so the horizon never shows a bare gap
  for (const side of [-1, 1] as const) {
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(10, 1.4, 130),
      hqMat(0x3a5a38),
    )
    ridge.position.set(side * 24, 0.2, 0)
    ridge.userData.foothillRidge = true
    root.add(ridge)
    const ridgeMist = mountainMistVeil(14, 3.2, fogHex)
    ridgeMist.position.set(side * 22, 1.6, 0)
    ridgeMist.rotation.y = side > 0 ? -0.2 : 0.2
    root.add(ridgeMist)
  }
  root.userData.wulingyuan = true
  root.userData.mountainMist = true
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
    // Pier hosts are quest speakers — show Talk cue above their head
    attachDialogueBubble(npc)
    group.add(npc)
    // Decorative bank NPCs removed — only dialogue hosts stay (GPU + clarity)
  }
}


/** Bamboo culm cluster — Lingnan academy garden (Campaign 2 realm). */
function bambooClump(rng: () => number) {
  const g = new THREE.Group()
  g.name = 'bamboo-clump'
  const n = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const h = 1.4 + rng() * 1.8
    const x = (rng() - 0.5) * 0.55
    const z = (rng() - 0.5) * 0.55
    g.add(hqPost(0.04, 0.055, h, 0x3a7a48, x, h / 2, z, 5))
    // Node rings
    for (let k = 1; k <= 3; k++) {
      g.add(hqBox(0.07, 0.03, 0.07, 0x2a5a38, x, (h * k) / 4, z))
    }
    // Leaf sprays
    g.add(hqCanopy(0.22 + rng() * 0.1, 0x4a9a58, x + 0.12, h * 0.85, z))
    if (rng() > 0.4) g.add(hqCanopy(0.18, 0x3a8a48, x - 0.1, h * 0.7, z + 0.08))
  }
  return g
}

/** Osmanthus shrub — soft gold blossoms for the bamboo realm. */
function osmanthusBush(rng: () => number) {
  const g = new THREE.Group()
  g.name = 'osmanthus'
  const h = 0.55 + rng() * 0.25
  g.add(hqPost(0.04, 0.06, h * 0.5, 0x2a1c14, 0, h * 0.25, 0, 4))
  g.add(hqCanopy(0.34 + rng() * 0.1, 0x3a6a40, 0, h * 0.55, 0))
  const golds = [0xe8c060, 0xd4a848, 0xf0d078]
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng() * 0.4
    const r = 0.12 + rng() * 0.16
    g.add(
      hqBox(
        0.07,
        0.06,
        0.07,
        golds[Math.floor(rng() * golds.length)]!,
        Math.cos(a) * r,
        h * 0.65 + rng() * 0.12,
        Math.sin(a) * r,
      ),
    )
  }
  return g
}

/** Lotus pad + bloom on pond margins (bamboo realm reeds/pier). */
function lotusPad(rng: () => number) {
  const g = new THREE.Group()
  g.name = 'lotus'
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.28 + rng() * 0.12, 7), mat(0x2f7a48))
  pad.rotation.x = -Math.PI / 2
  pad.position.y = 0.04
  g.add(pad)
  if (rng() > 0.35) {
    const bloom = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 5), mat(0xf0c0d0))
    bloom.position.y = 0.14
    g.add(bloom)
  }
  return g
}

/** Magpie — classic Chinese omen bird for the bamboo realm. */
function magpie(rng: () => number) {
  const g = new THREE.Group()
  g.name = 'magpie'
  g.userData.fauna = 'magpie'
  g.userData.phase = rng() * Math.PI * 2
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), mat(0x1a1a22))
  body.scale.set(1.2, 0.7, 0.8)
  body.position.y = 0.2
  g.add(body)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 3), mat(0xf0f0f2))
  belly.position.set(0, 0.16, 0.06)
  g.add(belly)
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.12), mat(0x2a2a38))
  wing.position.set(0, 0.22, 0)
  g.add(wing)
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.22), mat(0x1a1a28))
  tail.position.set(0, 0.2, -0.16)
  g.add(tail)
  return g
}

/** Koi flash under garden ponds (bamboo realm). */
function koi(rng: () => number) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.26, 5),
    mat(rng() > 0.5 ? 0xe85830 : 0xf0c040),
  )
  mesh.rotation.z = Math.PI / 2
  mesh.name = 'koi'
  mesh.userData.fauna = 'koi'
  mesh.userData.fish = true
  mesh.userData.phase = rng() * Math.PI * 2
  return mesh
}

export const HARBOR_BAMBOO_FLORA = ['bamboo-clump', 'osmanthus', 'lotus'] as const
export const HARBOR_BAMBOO_FAUNA = ['magpie', 'koi'] as const

function populateChunk(
  chunkIndex: number,
  group: THREE.Group,
  mats: { grass: THREE.Material; sand: THREE.Material },
  weather: HarborWeather = 'sunny',
  realm: HarborRealmId = 'river',
) {
  const biome = biomeForChunk(chunkIndex)
  const rng = mulberry32((chunkIndex + 17) * 9973 + (realm === 'bamboo' ? 42 : 0))
  const z0 = chunkIndex * CHUNK
  const leaf =
    realm === 'bamboo'
      ? biome === 'hills'
        ? 0x5a9a58
        : biome === 'reeds'
          ? 0x3a8a60
          : 0x2f8a50
      : biome === 'hills'
        ? 0x6a8a50
        : biome === 'reeds'
          ? 0x4a8a58
          : 0x2f7a48

  for (const side of [-1, 1] as const) {
    // Near bank (river edge)
    const bank = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, CHUNK + 0.2), mats.grass)
    bank.position.set(side * (BANK + 2.2), -0.05, z0 + CHUNK / 2)
    group.add(bank)
    // Inland shelf — expands the walkable world toward the karst
    const inland = new THREE.Mesh(new THREE.BoxGeometry(11, 0.32, CHUNK + 0.2), mats.grass)
    inland.position.set(side * (BANK + 10.2), -0.06, z0 + CHUNK / 2)
    inland.userData.inlandShelf = true
    group.add(inland)
    // Rising foothill berm (reads as land under distant mountains)
    const foothill = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.7, CHUNK + 0.2),
      mats.grass,
    )
    foothill.position.set(side * (BANK + 17.5), 0.12, z0 + CHUNK / 2)
    foothill.userData.foothillShelf = true
    group.add(foothill)
    const shore = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, CHUNK + 0.2), mats.sand)
    shore.position.set(side * (RIVER + 1.1), 0.02, z0 + CHUNK / 2)
    group.add(shore)
  }

  // Dirt / stone roads, cross-paths, and Chinese road signs
  placeDirtRoads(group, chunkIndex, rng, weather)

  // Quiz pier landings (every chunk may host one or more dock slots)
  placeDockStops(group, chunkIndex, rng)

  if (biome === 'forest' || biome === 'hills') {
    place(group, rng, 5, () => tree(rng, leaf), BANK - 0.2, BANK + 9, z0)
    place(group, rng, 4, () => pine(rng), BANK, BANK + 10, z0)
    place(group, rng, 3, () => poplar(rng), BANK - 0.3, BANK + 3.5, z0)
    place(group, rng, 2, () => ginkgo(rng), BANK + 0.5, BANK + 4.5, z0)
    place(group, rng, 5, () => rock(rng), BANK - 0.5, BANK + 3, z0)
    place(group, rng, 5, () => flower(rng), BANK - 0.3, BANK + 2.5, z0)
    place(group, rng, 2, () => hawthornBush(rng), BANK + 0.5, BANK + 4.5, z0)
    place(group, rng, 2, () => chineseFringeFlower(rng), BANK + 1, BANK + 5.5, z0)
    if (rng() > 0.55) place(group, rng, 1, () => chinaTeaCupRose(rng), BANK + 0.2, BANK + 2.8, z0)
    if (rng() > 0.4) place(group, rng, 1, () => deer(rng), BANK + 0.5, BANK + 3.5, z0)
    // China-native ambient fauna
    if (rng() > 0.45) place(group, rng, 1, () => panda(rng), BANK + 1.5, BANK + 5.5, z0)
    if (biome === 'hills' && rng() > 0.62) place(group, rng, 1, () => southChinaTiger(rng), BANK + 2.5, BANK + 7, z0)
    else if (rng() > 0.78) place(group, rng, 1, () => southChinaTiger(rng), BANK + 3, BANK + 8, z0)
    place(group, rng, 1, () => lantern(weather), BANK + 0.2, BANK + 1.8, z0)
  }
  if (biome === 'village') {
    place(group, rng, 3, () => house(rng), BANK + 0.5, BANK + 8, z0)
    place(group, rng, 2, () => hut(rng), BANK + 1, BANK + 4.5, z0)
    place(group, rng, 1, () => stiltShop(rng), BANK - 0.2, BANK + 1.8, z0)
    place(group, rng, 2, () => tree(rng, leaf), BANK + 2, BANK + 5, z0)
    place(group, rng, 3, () => cherryBlossom(rng), BANK - 0.2, BANK + 3.5, z0)
    place(group, rng, 1, () => ginkgo(rng), BANK + 1.5, BANK + 4, z0)
    place(group, rng, 3, () => lantern(weather), BANK - 0.2, BANK + 1.4, z0)
    place(group, rng, 4, () => flower(rng), BANK - 0.4, BANK + 2, z0)
    // Village garden shrubs — tea roses, hawthorn, fringe flower
    place(group, rng, 3, () => chinaTeaCupRose(rng), BANK - 0.3, BANK + 2.2, z0)
    place(group, rng, 2, () => hawthornBush(rng), BANK + 0.8, BANK + 3.5, z0)
    place(group, rng, 2, () => chineseFringeFlower(rng), BANK + 0.4, BANK + 2.8, z0)
    // Ambient lane NPCs omitted — pier dialogue hosts are the only people
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
    place(group, rng, 1, () => lantern(weather), BANK - 0.3, BANK + 1.0, z0)
  
    // Waterline fauna — giant salamanders + crested ibis
    if (rng() > 0.35) place(group, rng, 1, () => giantSalamander(rng), RIVER + 0.6, BANK + 0.8, z0)
    if (rng() > 0.4) {
      const nIbis = 1 + Math.floor(rng() * 2)
      for (let i = 0; i < nIbis; i++) {
        const ibis = crestedIbis(rng)
        const side = rng() > 0.5 ? 1 : -1
        const soar = rng() > 0.55
        ibis.position.set(
          side * (RIVER + 0.8 + rng() * 1.6),
          soar ? 1.5 + rng() * 0.8 : 0.05,
          z0 + 2 + rng() * (CHUNK - 4),
        )
        ibis.rotation.y = rng() * Math.PI * 2
        ibis.userData.phase = rng() * Math.PI * 2
        ibis.userData.baseX = ibis.position.x
        group.add(ibis)
      }
    }
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
    place(group, rng, 3, () => lantern(weather), BANK - 0.5, BANK + 1.0, z0)
    place(group, rng, 2, () => house(rng), BANK + 1, BANK + 3.5, z0)
    place(group, rng, 2, () => stiltShop(rng), BANK - 0.1, BANK + 2.2, z0)
    place(group, rng, 1, () => hut(rng), BANK + 2, BANK + 4, z0)
    place(group, rng, 2, () => cherryBlossom(rng), BANK + 0.5, BANK + 3, z0)
    place(group, rng, 2, () => chinaTeaCupRose(rng), BANK - 0.2, BANK + 1.8, z0)
    place(group, rng, 1, () => chineseFringeFlower(rng), BANK + 0.5, BANK + 2.5, z0)

    if (rng() > 0.4) place(group, rng, 1, () => crestedIbis(rng), RIVER + 1.0, BANK + 1.8, z0)
}
  if (biome === 'hills') {
    place(group, rng, 2, () => hut(rng), BANK + 1.5, BANK + 4, z0)
    place(group, rng, 2, () => ginkgo(rng), BANK + 1, BANK + 4.5, z0)
    place(group, rng, 2, () => hawthornBush(rng), BANK + 1.2, BANK + 4, z0)
    place(group, rng, 1, () => chineseFringeFlower(rng), BANK + 0.8, BANK + 3.2, z0)
    place(group, rng, 1, () => lantern(weather), BANK + 0.5, BANK + 2.2, z0)
  }


  // Campaign realm dressing — bamboo academy garden (still Chinese-themed)
  if (realm === 'bamboo') {
    if (biome === 'forest' || biome === 'hills' || biome === 'village') {
      place(group, rng, 4, () => bambooClump(rng), BANK + 0.5, BANK + 6, z0)
      place(group, rng, 2, () => osmanthusBush(rng), BANK - 0.2, BANK + 3.5, z0)
    }
    if (biome === 'reeds' || biome === 'pier') {
      place(group, rng, 3, () => lotusPad(rng), RIVER + 0.5, BANK + 1.2, z0)
      if (rng() > 0.4) place(group, rng, 1, () => koi(rng), RIVER * 0.4, RIVER + 0.8, z0)
    }
    if (rng() > 0.45) place(group, rng, 1, () => magpie(rng), BANK + 1, BANK + 5, z0)
    // Soften river fauna mix — fewer tigers, more garden birds
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
  // Crested ibis wading / short hops near the shore
  if (rng() > 0.55) {
    const ibis = crestedIbis(rng)
    const side = rng() > 0.5 ? 1 : -1
    ibis.position.set(side * (RIVER + 0.9 + rng() * 1.4), 0.05, z0 + 3 + rng() * (CHUNK - 6))
    ibis.rotation.y = rng() * Math.PI * 2
    ibis.userData.phase = rng() * Math.PI * 2
    ibis.userData.baseX = ibis.position.x
    group.add(ibis)
  }
  // Giant salamander along the wet bank
  if (rng() > 0.6) {
    const sal = giantSalamander(rng)
    const side = rng() > 0.5 ? 1 : -1
    sal.position.set(side * (RIVER + 0.55 + rng() * 0.7), 0.02, z0 + 2 + rng() * (CHUNK - 4))
    sal.rotation.y = side > 0 ? 0.2 : Math.PI - 0.2
    sal.userData.phase = rng() * Math.PI * 2
    sal.userData.baseX = sal.position.x
    group.add(sal)
  }

}


/** OSRS-style yellow destination X on the ground plane. */
function clickMarker() {
  const g = new THREE.Group()
  const m = mat(0xffe566, { transparent: true, opacity: 0.95, depthWrite: false })
  const armA = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.045, 0.12), m)
  armA.rotation.y = Math.PI / 4
  const armB = armA.clone()
  armB.rotation.y = -Math.PI / 4
  g.add(armA, armB)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.48, 16), m)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.02
  g.add(ring)
  g.visible = false
  g.userData.clickMarker = true
  return g
}

/**
 * Mount a continuous sailing river on a canvas.
 * Canoe stays framed; world scrolls along +Z. Quest progress eases travel;
 * a gentle drift keeps scenery moving between answers.
 */

/** Save Shack on a pier dock — gold portal + hanging sign (unique landmark). */
function saveShackBuilding(weather: HarborWeather = 'sunny') {
  const g = new THREE.Group()
  g.name = 'save-shack'
  g.userData.visitable = 'save-shack'
  g.userData.uniqueLandmark = 'save-shack'

  // Long pier dock toward the river (+Z)
  g.add(hqBox(2.2, 0.14, 4.2, P.woodLight, 0, 0.42, 1.6))
  for (const z of [0.2, 1.4, 2.6, 3.6] as const) {
    g.add(hqBox(2.1, 0.03, 0.06, P.woodDark, 0, 0.5, z))
  }
  for (const x of [-0.85, 0.85] as const) {
    for (const z of [0.4, 1.8, 3.2] as const) {
      g.add(hqPost(0.09, 0.11, 0.95, P.woodDark, x, 0.1, z))
    }
  }
  // Railings
  for (const x of [-1.0, 1.0] as const) {
    for (const z of [0.6, 2.0, 3.4] as const) {
      g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, x, 0.75, z, 5))
    }
    g.add(hqBox(0.05, 0.06, 3.0, P.woodMid, x, 1.0, 2.0))
  }

  // Teal vault drum (distinct from plaster village homes)
  g.add(hqPost(0.85, 0.95, 1.15, 0x1e4a48, 0, 0.95, 0.2, 8))
  g.add(hqBox(1.5, 0.12, 1.5, P.stone, 0, 0.38, 0.2))
  // Gold pagoda roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 0.55, 8),
    glowMat(0xd4a040, 0xffc050, 0.4),
  )
  roof.position.set(0, 1.75, 0.2)
  g.add(roof)
  g.add(hqPost(0.06, 0.08, 0.35, P.trimGold, 0, 2.15, 0.2, 5))
  g.add(hqBox(0.32, 0.55, 0.08, P.woodDeep, 0, 0.72, 0.95))
  g.add(hqWindow(0.22, 0.22, P.trimGold, 0x102828, 0.45, 1.05, 0.75))

  // Visible hanging SAVE sign
  g.add(hqPost(0.05, 0.06, 2.1, P.woodDark, -1.15, 1.1, 1.1, 5))
  g.add(hqBox(0.08, 0.08, 0.7, P.woodMid, -0.75, 2.0, 1.1))
  g.add(hqBox(0.72, 0.5, 0.08, 0x1a3030, -0.35, 1.85, 1.1))
  g.add(hqBox(0.78, 0.08, 0.1, P.trimGold, -0.35, 2.12, 1.1))
  g.add(hqBox(0.78, 0.08, 0.1, P.trimGold, -0.35, 1.58, 1.1))
  // Glyph blocks ≈ 存
  g.add(hqBox(0.35, 0.08, 0.04, P.jade, -0.35, 1.95, 1.15))
  g.add(hqBox(0.08, 0.28, 0.04, P.jade, -0.35, 1.82, 1.15))
  g.add(hqBox(0.28, 0.08, 0.04, 0xffe080, -0.35, 1.72, 1.15))

  // Golden glowing portal at the pier tip
  const portal = new THREE.Group()
  portal.name = 'save-portal'
  portal.userData.goldenPortal = true
  portal.position.set(0, 0.55, 3.55)
  for (const x of [-0.55, 0.55] as const) {
    portal.add(hqPost(0.07, 0.09, 1.5, P.trimGold, x, 0.75, 0, 6))
  }
  portal.add(hqBox(1.3, 0.12, 0.12, P.trimGold, 0, 1.55, 0))
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.07, 6, 12),
    glowMat(0xffe080, 0xffc020, weather === 'night' ? 1.4 : 1.0),
  )
  ring.position.set(0, 0.85, 0.05)
  portal.add(ring)
  const veil = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 12),
    new THREE.MeshLambertMaterial({
      color: 0xffe8a0,
      emissive: 0xffb020,
      emissiveIntensity: weather === 'night' ? 1.2 : 0.7,
      transparent: true,
      opacity: 0.55,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  )
  veil.position.set(0, 0.85, 0)
  portal.add(veil)
  const portalLight = new THREE.PointLight(
    0xffc040,
    weather === 'night' ? 2.2 : weather === 'sunny' ? 0.85 : 1.4,
    9,
    2,
  )
  portalLight.position.set(0, 0.9, 0.2)
  portalLight.userData.harborLanternLight = true
  portalLight.userData.baseIntensity = portalLight.intensity
  portalLight.userData.portalGlow = true
  portal.add(portalLight)
  g.add(portal)

  attachLandmarkHost(g, 'save-shack', weather)
  return g
}

/** River Outfitter — crimson pavilion clothier (distinct from stilt shops). */
function outfitterBuilding(weather: HarborWeather = 'sunny') {
  const g = new THREE.Group()
  g.name = 'outfitter'
  g.userData.visitable = 'outfitter'
  g.userData.uniqueLandmark = 'outfitter'

  // Wide raised deck
  for (const x of [-0.9, 0, 0.9] as const) {
    for (const z of [-0.55, 0.55] as const) {
      g.add(hqPost(0.07, 0.09, 0.7, P.woodDark, x, 0.35, z, 5))
    }
  }
  g.add(hqBox(2.4, 0.12, 1.8, P.woodLight, 0, 0.7, 0))
  // Cream shop body
  g.add(hqBox(2.1, 1.05, 1.45, 0xf2e6d0, 0, 1.28, -0.05))
  // Deep crimson roof + gold ridge
  const roof = hqBox(2.55, 0.12, 1.85, 0x9a2038, 0, 1.95, -0.05)
  roof.rotation.x = -0.12
  g.add(roof)
  g.add(hqBox(2.6, 0.1, 0.16, P.trimGold, 0, 2.12, -0.05))
  // Striped awning
  for (let i = 0; i < 6; i++) {
    const stripe = hqBox(
      0.32,
      0.06,
      0.85,
      i % 2 === 0 ? 0xc04040 : 0xf0e8d8,
      -0.9 + i * 0.36,
      1.72,
      0.85,
    )
    stripe.rotation.x = 0.35
    g.add(stripe)
  }
  // Hanging garments rack
  g.add(hqBox(1.4, 0.04, 0.04, P.woodDark, 0, 1.55, 0.55))
  const garmentColors = [0x2a3a6a, 0x8a3048, 0x3dcfb6, 0xc4a060, 0x5a6a48]
  garmentColors.forEach((c, i) => {
    g.add(hqBox(0.18, 0.45, 0.06, c, -0.55 + i * 0.28, 1.28, 0.55))
  })
  // Tall shop sign pole with 衣 banner
  g.add(hqPost(0.06, 0.08, 2.8, P.woodDeep, 1.35, 1.4, 0.7, 5))
  g.add(hqBox(0.45, 1.1, 0.06, 0x1e3a48, 1.35, 2.2, 0.7))
  g.add(hqBox(0.5, 0.08, 0.08, P.trimGold, 1.35, 2.78, 0.7))
  g.add(hqBox(0.5, 0.08, 0.08, P.trimGold, 1.35, 1.62, 0.7))
  g.add(hqBox(0.28, 0.08, 0.04, 0xf0d060, 1.35, 2.45, 0.74))
  g.add(hqBox(0.08, 0.4, 0.04, 0xf0d060, 1.35, 2.15, 0.74))
  g.add(hqBox(0.32, 0.08, 0.04, P.jade, 1.35, 1.9, 0.74))
  g.add(hqWindow(0.5, 0.4, P.trimGold, 0x1a2840, -0.55, 1.25, 0.72))
  // Warm shop lanterns under the awning
  for (const x of [-0.7, 0.7] as const) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.24, 0.2),
      glowMat(P.lantern, 0xff9040, weather === 'sunny' ? 0.3 : 1.0),
    )
    lamp.position.set(x, 1.58, 0.95)
    g.add(lamp)
    const light = new THREE.PointLight(0xffa050, harborLanternIntensity(weather) * 0.85, 6.5, 2)
    light.position.copy(lamp.position)
    light.userData.harborLanternLight = true
    light.userData.baseIntensity = light.intensity
    g.add(light)
  }
  // Approach plank
  g.add(hqBox(1.2, 0.1, 1.8, P.woodMid, 0, 0.12, 1.4))
  attachLandmarkHost(g, 'outfitter', weather)
  return g
}


/** Harbor Bank — jade vault + cyan portal (distinct from the Save Shack gold portal). */
function bankBuilding(weather: HarborWeather = 'sunny') {
  const g = new THREE.Group()
  g.name = 'bank'
  g.userData.visitable = 'bank'
  g.userData.uniqueLandmark = 'bank'

  // Raised stone plinth
  g.add(hqBox(2.4, 0.18, 2.6, P.stone, 0, 0.35, 0.2))
  for (const x of [-0.95, 0.95] as const) {
    for (const z of [-0.7, 0.9] as const) {
      g.add(hqPost(0.1, 0.12, 0.7, P.woodDark, x, 0.2, z, 5))
    }
  }
  // Ink-stone vault body (deeper than Save Shack teal)
  g.add(hqBox(1.9, 1.25, 1.7, 0x243038, 0, 1.15, 0.15))
  g.add(hqBox(2.05, 0.14, 1.85, P.stone, 0, 0.55, 0.15))
  // Jade ridge roof (not gold pagoda)
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.35, 0.5, 6),
    glowMat(0x2a8a78, 0x3dcfb6, 0.35),
  )
  roof.position.set(0, 2.05, 0.15)
  g.add(roof)
  g.add(hqPost(0.07, 0.09, 0.3, P.jade, 0, 2.4, 0.15, 5))
  // Iron vault door
  g.add(hqBox(0.55, 0.85, 0.08, 0x1a2228, 0, 0.95, 1.0))
  g.add(hqBox(0.12, 0.12, 0.06, P.jade, 0.12, 0.95, 1.05))
  g.add(hqBox(0.35, 0.08, 0.05, P.trimGold, 0, 1.45, 1.05))

  // Hanging 銀 bank sign (jade glyphs — distinct from Save 存)
  g.add(hqPost(0.05, 0.06, 2.0, P.woodDark, 1.2, 1.15, 0.9, 5))
  g.add(hqBox(0.08, 0.08, 0.65, P.woodMid, 0.85, 2.05, 0.9))
  g.add(hqBox(0.7, 0.55, 0.08, 0x102028, 0.45, 1.9, 0.9))
  g.add(hqBox(0.76, 0.08, 0.1, P.jade, 0.45, 2.2, 0.9))
  g.add(hqBox(0.76, 0.08, 0.1, P.jade, 0.45, 1.6, 0.9))
  g.add(hqBox(0.32, 0.08, 0.04, 0xa8ffe8, 0.45, 2.0, 0.95))
  g.add(hqBox(0.08, 0.28, 0.04, 0xa8ffe8, 0.45, 1.85, 0.95))
  g.add(hqBox(0.22, 0.08, 0.04, P.trimGold, 0.45, 1.72, 0.95))

  // Coin relief on facade
  for (const x of [-0.55, 0.55] as const) {
    const coin = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.04, 4, 10),
      glowMat(0xd4a040, 0xffc050, 0.25),
    )
    coin.position.set(x, 1.25, 1.02)
    g.add(coin)
  }

  // Jade / cyan portal — uniquely identifiable vs Save Shack gold portal
  const portal = new THREE.Group()
  portal.name = 'bank-portal'
  portal.userData.jadePortal = true
  portal.userData.bankPortal = true
  portal.position.set(0, 0.5, 2.35)
  for (const x of [-0.5, 0.5] as const) {
    portal.add(hqPost(0.08, 0.1, 1.55, 0x1a4840, x, 0.78, 0, 6))
    portal.add(hqPost(0.05, 0.06, 1.55, P.jade, x, 0.78, 0.06, 6))
  }
  portal.add(hqBox(1.2, 0.12, 0.12, P.jade, 0, 1.6, 0))
  portal.add(hqBox(1.15, 0.06, 0.08, 0xa8ffe8, 0, 1.68, 0))
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.065, 6, 14),
    glowMat(0x3dcfb6, 0x70ffe0, weather === 'night' ? 1.5 : 1.05),
  )
  ring.position.set(0, 0.85, 0.05)
  portal.add(ring)
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.035, 5, 12),
    glowMat(0xa8ffe8, 0x3dcfb6, weather === 'night' ? 1.2 : 0.85),
  )
  inner.position.set(0, 0.85, 0.08)
  portal.add(inner)
  const veil = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 14),
    new THREE.MeshLambertMaterial({
      color: 0x80ffe8,
      emissive: 0x1a8a78,
      emissiveIntensity: weather === 'night' ? 1.15 : 0.75,
      transparent: true,
      opacity: 0.5,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  )
  veil.position.set(0, 0.85, 0)
  portal.add(veil)
  const portalLight = new THREE.PointLight(
    0x50e8c8,
    weather === 'night' ? 2.4 : weather === 'sunny' ? 0.95 : 1.5,
    9,
    2,
  )
  portalLight.position.set(0, 0.9, 0.25)
  portalLight.userData.harborLanternLight = true
  portalLight.userData.baseIntensity = portalLight.intensity
  portalLight.userData.portalGlow = true
  portalLight.userData.jadePortal = true
  portal.add(portalLight)
  g.add(portal)

  // Approach stones
  g.add(hqBox(1.1, 0.1, 1.4, P.stone, 0, 0.12, 1.7))
  attachLandmarkHost(g, 'bank', weather)
  return g
}

/** Chinese Arena (擂台) — crimson pavilion + amber portal for Match the Definition. */
function arenaBuilding(weather: HarborWeather = 'sunny') {
  const g = new THREE.Group()
  g.name = 'arena'
  g.userData.visitable = 'arena'
  g.userData.uniqueLandmark = 'arena'

  // Raised stone plinth
  g.add(hqBox(2.5, 0.16, 2.4, P.stone, 0, 0.32, 0.1))
  for (const x of [-0.95, 0.95] as const) {
    for (const z of [-0.7, 0.8] as const) {
      g.add(hqPost(0.1, 0.12, 0.65, P.woodDark, x, 0.18, z, 5))
    }
  }
  // Deep crimson hall body
  g.add(hqBox(2.0, 1.15, 1.65, 0x5a2a28, 0, 1.1, 0.05))
  g.add(hqBox(2.15, 0.12, 1.8, 0x3a1515, 0, 0.52, 0.05))
  // Gold-trim pagoda roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.4, 0.55, 6),
    glowMat(0x8b2e2e, 0xc4a35a, 0.35),
  )
  roof.position.set(0, 1.95, 0.05)
  g.add(roof)
  g.add(hqPost(0.07, 0.09, 0.32, P.trimGold, 0, 2.35, 0.05, 5))
  // Pillars framing the gate
  for (const x of [-0.7, 0.7] as const) {
    g.add(hqPost(0.12, 0.14, 1.2, 0x2a1810, x, 0.95, 0.85, 6))
    g.add(hqPost(0.06, 0.07, 1.2, P.trimGold, x, 0.95, 0.92, 6))
  }
  g.add(hqBox(1.55, 0.1, 0.12, P.trimGold, 0, 1.55, 0.88))

  // Hanging 擂 banner
  g.add(hqPost(0.05, 0.06, 2.1, P.woodDark, -1.25, 1.15, 0.7, 5))
  g.add(hqBox(0.08, 0.08, 0.7, P.woodMid, -0.85, 2.05, 0.7))
  g.add(hqBox(0.7, 0.55, 0.08, 0x1a1010, -0.45, 1.9, 0.7))
  g.add(hqBox(0.76, 0.08, 0.1, P.trimGold, -0.45, 2.2, 0.7))
  g.add(hqBox(0.76, 0.08, 0.1, P.trimGold, -0.45, 1.6, 0.7))
  g.add(hqBox(0.32, 0.08, 0.04, 0xf0d080, -0.45, 2.0, 0.75))
  g.add(hqBox(0.08, 0.28, 0.04, 0xf0d080, -0.45, 1.85, 0.75))
  g.add(hqBox(0.22, 0.08, 0.04, P.jade, -0.45, 1.72, 0.75))

  // Amber / gold arena portal (distinct from Save gold + Bank jade)
  const portal = new THREE.Group()
  portal.name = 'arena-portal'
  portal.userData.arenaPortal = true
  portal.userData.amberPortal = true
  portal.position.set(0, 0.48, 2.15)
  for (const x of [-0.5, 0.5] as const) {
    portal.add(hqPost(0.08, 0.1, 1.5, 0x3a1515, x, 0.75, 0, 6))
    portal.add(hqPost(0.05, 0.06, 1.5, P.trimGold, x, 0.75, 0.06, 6))
  }
  portal.add(hqBox(1.2, 0.12, 0.12, P.trimGold, 0, 1.55, 0))
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.07, 6, 14),
    glowMat(0xf0d080, 0xffa020, weather === 'night' ? 1.5 : 1.1),
  )
  ring.position.set(0, 0.82, 0.05)
  portal.add(ring)
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.04, 5, 12),
    glowMat(0x3dcfb6, 0xf0d080, weather === 'night' ? 1.2 : 0.9),
  )
  inner.position.set(0, 0.82, 0.08)
  portal.add(inner)
  const veil = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 14),
    new THREE.MeshLambertMaterial({
      color: 0xffe8a0,
      emissive: 0xc07020,
      emissiveIntensity: weather === 'night' ? 1.2 : 0.8,
      transparent: true,
      opacity: 0.52,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  )
  veil.position.set(0, 0.82, 0)
  portal.add(veil)
  const portalLight = new THREE.PointLight(
    0xffb040,
    weather === 'night' ? 2.4 : weather === 'sunny' ? 0.95 : 1.5,
    9,
    2,
  )
  portalLight.position.set(0, 0.88, 0.25)
  portalLight.userData.harborLanternLight = true
  portalLight.userData.baseIntensity = portalLight.intensity
  portalLight.userData.portalGlow = true
  portalLight.userData.arenaPortal = true
  portal.add(portalLight)
  g.add(portal)

  g.add(hqBox(1.15, 0.1, 1.5, P.woodMid, 0, 0.12, 1.55))
  attachLandmarkHost(g, 'arena', weather)
  return g
}


/** Spinning barber pole — classic red / white / blue helix (animated in tick). */
function spinningBarberPole(weather: HarborWeather) {
  const pole = new THREE.Group()
  pole.name = 'barber-pole'
  pole.userData.barberPole = true
  // Brass caps
  pole.add(hqPost(0.07, 0.08, 0.12, 0xd4a040, 0, 0.06, 0, 8))
  pole.add(hqPost(0.07, 0.08, 0.12, 0xd4a040, 0, 1.55, 0, 8))
  // Striped barrel (stacked rings read as a helix when spinning)
  const stripes: Array<[number, number]> = [
    [0xc02838, 0.22],
    [0xf8f4ec, 0.34],
    [0x2a58a8, 0.46],
    [0xf8f4ec, 0.58],
    [0xc02838, 0.7],
    [0xf8f4ec, 0.82],
    [0x2a58a8, 0.94],
    [0xf8f4ec, 1.06],
    [0xc02838, 1.18],
    [0xf8f4ec, 1.3],
    [0x2a58a8, 1.42],
  ]
  for (const [color, y] of stripes) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10),
      glowMat(color, color === 0xf8f4ec ? 0xffe8e0 : color, weather === 'night' ? 0.55 : 0.25),
    )
    ring.position.y = y
    pole.add(ring)
  }
  const tip = new THREE.PointLight(
    0xff8098,
    weather === 'night' ? 1.4 : weather === 'sunny' ? 0.45 : 0.85,
    5,
    2,
  )
  tip.position.set(0, 1.65, 0)
  tip.userData.harborLanternLight = true
  tip.userData.baseIntensity = tip.intensity
  pole.add(tip)
  return pole
}

/** Harbor Barber — striped shop, spinning pole, rose portal, barber NPC. */
function barberBuilding(weather: HarborWeather = 'sunny') {
  const g = new THREE.Group()
  g.name = 'barber'
  g.userData.visitable = 'barber'
  g.userData.uniqueLandmark = 'barber'

  // Raised plank walk
  g.add(hqBox(2.3, 0.14, 2.2, P.woodLight, 0, 0.32, 0.15))
  for (const x of [-0.9, 0.9] as const) {
    for (const z of [-0.65, 0.75] as const) {
      g.add(hqPost(0.09, 0.11, 0.65, P.woodDark, x, 0.18, z, 5))
    }
  }
  // Cream shop body with rose trim
  g.add(hqBox(1.85, 1.1, 1.55, 0xf4eee4, 0, 1.05, 0.05))
  g.add(hqBox(2.0, 0.12, 1.7, 0xc02838, 0, 0.52, 0.05))
  // Soft rose roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.3, 0.48, 6),
    glowMat(0xa83858, 0xff7090, 0.3),
  )
  roof.position.set(0, 1.9, 0.05)
  g.add(roof)
  g.add(hqPost(0.06, 0.08, 0.28, 0xd4a040, 0, 2.25, 0.05, 5))
  // Shop window + door
  g.add(hqWindow(0.45, 0.4, 0xd4a040, 0x1a2840, -0.45, 1.1, 0.82))
  g.add(hqBox(0.42, 0.7, 0.08, 0x3a2a28, 0.45, 0.9, 0.82))
  g.add(hqBox(0.06, 0.06, 0.05, 0xd4a040, 0.58, 0.9, 0.86))

  // Hanging 髮 banner
  g.add(hqPost(0.05, 0.06, 2.0, P.woodDark, -1.2, 1.15, 0.65, 5))
  g.add(hqBox(0.08, 0.08, 0.65, P.woodMid, -0.85, 2.05, 0.65))
  g.add(hqBox(0.68, 0.55, 0.08, 0x1a1018, -0.45, 1.9, 0.65))
  g.add(hqBox(0.74, 0.08, 0.1, 0xff7090, -0.45, 2.2, 0.65))
  g.add(hqBox(0.74, 0.08, 0.1, 0xff7090, -0.45, 1.6, 0.65))
  g.add(hqBox(0.3, 0.08, 0.04, 0xf8f4ec, -0.45, 2.0, 0.7))
  g.add(hqBox(0.08, 0.28, 0.04, 0xf8f4ec, -0.45, 1.85, 0.7))
  g.add(hqBox(0.22, 0.08, 0.04, 0x2a58a8, -0.45, 1.72, 0.7))

  // Animated spinning pole out front
  const pole = spinningBarberPole(weather)
  pole.position.set(1.15, 0.45, 1.15)
  g.add(pole)

  // Rose / stripe portal (distinct from Save gold, Bank jade, Arena amber)
  const portal = new THREE.Group()
  portal.name = 'barber-portal'
  portal.userData.barberPortal = true
  portal.userData.rosePortal = true
  portal.position.set(0, 0.48, 2.05)
  for (const x of [-0.5, 0.5] as const) {
    portal.add(hqPost(0.08, 0.1, 1.5, 0x3a1518, x, 0.75, 0, 6))
    portal.add(hqPost(0.05, 0.06, 1.5, 0xff7090, x, 0.75, 0.06, 6))
  }
  portal.add(hqBox(1.2, 0.12, 0.12, 0xff7090, 0, 1.55, 0))
  portal.add(hqBox(1.15, 0.05, 0.08, 0x2a58a8, 0, 1.62, 0))
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.07, 6, 14),
    glowMat(0xff90a8, 0xff4060, weather === 'night' ? 1.5 : 1.1),
  )
  ring.position.set(0, 0.82, 0.05)
  portal.add(ring)
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.04, 5, 12),
    glowMat(0xf8f4ec, 0x2a58a8, weather === 'night' ? 1.15 : 0.85),
  )
  inner.position.set(0, 0.82, 0.08)
  portal.add(inner)
  const veil = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 14),
    new THREE.MeshLambertMaterial({
      color: 0xffd0d8,
      emissive: 0xa03048,
      emissiveIntensity: weather === 'night' ? 1.15 : 0.75,
      transparent: true,
      opacity: 0.52,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  )
  veil.position.set(0, 0.82, 0)
  portal.add(veil)
  const portalLight = new THREE.PointLight(
    0xff7090,
    weather === 'night' ? 2.4 : weather === 'sunny' ? 0.95 : 1.5,
    9,
    2,
  )
  portalLight.position.set(0, 0.88, 0.25)
  portalLight.userData.harborLanternLight = true
  portalLight.userData.baseIntensity = portalLight.intensity
  portalLight.userData.portalGlow = true
  portalLight.userData.barberPortal = true
  portal.add(portalLight)
  g.add(portal)

  g.add(hqBox(1.15, 0.1, 1.45, P.woodMid, 0, 0.12, 1.5))
  attachLandmarkHost(g, 'barber', weather)
  return g
}

function nearestVisitable(x: number, z: number): HarborVisitableId | null {
  let best: HarborVisitableId | null = null
  let bestDist = HARBOR_VISIT_RADIUS
  for (const v of HARBOR_VISITABLES) {
    const d = Math.hypot(v.x - x, v.z - z)
    if (d < bestDist) {
      bestDist = d
      best = v.id
    }
  }
  return best
}

export function createHarborWorld(
  canvas: HTMLCanvasElement,
  options: HarborWorldOptions = {},
): HarborWorldHandle {
  let hue: HarborHue = options.hue ?? 'harbor'
  let reduced = Boolean(options.reducedMotion)
  let progress = Math.min(1, Math.max(0, options.progress ?? 0))
  const realm: HarborRealmId = options.realm ?? 'river'
  let flash: 'ok' | 'no' | null = null
  let flashUntil = 0
  let disposed = false
  let paused = false
  const weather: HarborWeather = options.weather ?? pickHarborWeather()
  const look = HARBOR_WEATHER_LOOK[weather]

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.25))
  renderer.setClearColor(look.sky, 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  // Sunny pushes exposure high so the voyage reads full daylight
  renderer.toneMappingExposure =
    weather === 'sunny' ? 1.42 : weather === 'cloudy' ? 1.12 : weather === 'rainy' ? 1.0 : 0.92

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(look.fog, look.fogDensity)
  scene.background = new THREE.Color(look.sky)

  // Far plane matches denser fog — no GPU spend past the veil
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180)
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

  // Bamboo academy: slightly greener pond + jade bank (still Chinese-themed).
  const waterTint =
    realm === 'bamboo'
      ? weather === 'night'
        ? 0x1a3840
        : weather === 'rainy'
          ? 0x3a7070
          : weather === 'cloudy'
            ? 0x4a9088
            : 0x3a8878
      : weather === 'night'
        ? 0x1a3048
        : weather === 'rainy'
          ? 0x3a6078
          : weather === 'cloudy'
            ? 0x4a8898
            : WATER[hue]
  const waterMat = mat(waterTint, {
    transparent: true,
    opacity: weather === 'rainy' ? 0.92 : weather === 'night' ? 0.9 : 0.88,
  })
  const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER * 2.4, 400, 1, 20), waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.set(0, 0.02, 80)
  scene.add(water)

  const grassMat = mat(realm === 'bamboo' ? 0x2a6a42 : 0x2a5a38)
  const sandMat = mat(realm === 'bamboo' ? 0xb8b078 : 0xc2b280)
  const chunkGroups = new Map<number, THREE.Group>()
  /** Chunks ahead of the canoe — 3 = leaner GPU, earlier pop-in than 4. */
  const ACTIVE = 3
  /** Cached PointLights for flicker (avoids full scene.traverse each frame). */
  const lanternLights: THREE.PointLight[] = []
  /** Cached fauna / bubbles / petals for idle motion (avoids per-chunk traverse). */
  const animNodes: THREE.Object3D[] = []
  let fxIndexDirty = true
  let rebuildFxIndex: () => void = () => {
    fxIndexDirty = true
  }

  const ensureChunks = (centerZ: number) => {
    const center = Math.floor(centerZ / CHUNK)
    const need = new Set<number>()
    for (let i = center - 1; i <= center + ACTIVE; i++) need.add(i)
    let dirty = false
    for (const [idx, g] of chunkGroups) {
      if (!need.has(idx)) {
        world.remove(g)
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose()
        })
        chunkGroups.delete(idx)
        dirty = true
      }
    }
    for (const idx of need) {
      if (chunkGroups.has(idx)) continue
      const g = new THREE.Group()
      populateChunk(idx, g, { grass: grassMat, sand: sandMat }, weather, realm)
      world.add(g)
      chunkGroups.set(idx, g)
      dirty = true
    }
    if (dirty) fxIndexDirty = true
  }

  let currentLook: HarborLook = options.look ? { ...options.look } : { ...HARBOR_DEFAULT_LOOK }
  let currentGender: HarborGender = options.gender === 'female' ? 'female' : 'male'
  let currentAppearance: HarborAppearance = options.appearance
    ? { ...options.appearance }
    : { ...HARBOR_DEFAULT_APPEARANCE }
  const boat = canoe(weather, currentLook.boat, currentLook.lantern, currentGender, currentAppearance)
  boat.position.set(0, 0.05, 0)
  scene.add(boat)

  // Fixed visitables — Save Shack + Outfitter + Bank + Arena (always on the chart)
  const visitablesRoot = new THREE.Group()
  visitablesRoot.name = 'harbor-visitables'
  for (const v of HARBOR_VISITABLES) {
    const building =
      v.id === 'save-shack'
        ? saveShackBuilding(weather)
        : v.id === 'bank'
          ? bankBuilding(weather)
          : v.id === 'arena'
            ? arenaBuilding(weather)
            : v.id === 'barber'
              ? barberBuilding(weather)
              : outfitterBuilding(weather)
    building.position.set(v.x, 0, v.z)
    // Face the river
    building.rotation.y = v.x > 0 ? -Math.PI / 2 : Math.PI / 2
    visitablesRoot.add(building)
  }
  scene.add(visitablesRoot)

  rebuildFxIndex = () => {
    lanternLights.length = 0
    animNodes.length = 0
    const isAnimNode = (o: THREE.Object3D) =>
      !!(
        o.userData.speechBubble ||
        o.userData.fauna ||
        o.userData.bird ||
        o.userData.fish ||
        o.userData.petal ||
        o.userData.specialHostGlow ||
        o.userData.cigaretteSmoke ||
        o.userData.barberPole
      )
    const indexRoot = (root: THREE.Object3D) => {
      root.traverse((o) => {
        if (o instanceof THREE.PointLight && o.userData.harborLanternLight) {
          lanternLights.push(o)
        } else if (isAnimNode(o)) {
          animNodes.push(o)
        }
      })
    }
    for (const g of chunkGroups.values()) indexRoot(g)
    indexRoot(visitablesRoot)
    indexRoot(boat)
    fxIndexDirty = false
  }

  let scout = boat.getObjectByName('river-scout') as THREE.Object3D | null
  if (scout) applyLookToProtagonist(scout, currentLook)
  else applyLookToProtagonist(boat, currentLook)
  // Standing Scout for banks / roads — canoe stays moored while they walk
  const scoutWalk = buildHarborProtagonist({ pose: 'standing', gender: currentGender, appearance: currentAppearance })
  scoutWalk.name = 'river-scout-walk'
  scoutWalk.visible = false
  scene.add(scoutWalk)
  applyLookToProtagonist(scoutWalk, currentLook)

  // Open-world multiplayer ghosts + local nametag
  const remotesRoot = new THREE.Group()
  remotesRoot.name = 'harbor-remotes'
  scene.add(remotesRoot)
  const remoteById = new Map<string, THREE.Group>()
  let localUsername = 'sailor'
  const localNametag = buildNametagSprite(localUsername)
  scene.add(localNametag)
  let localSpeechBubble: THREE.Sprite | null = null
  let localSpeechUntil = 0
  const remoteSpeech = new Map<string, { sprite: THREE.Sprite; until: number }>()

  const clearSpeechBubble = (sprite: THREE.Sprite | null, parent?: THREE.Object3D | null) => {
    if (!sprite) return
    parent?.remove(sprite)
    if (sprite.parent) sprite.parent.remove(sprite)
    disposeChatBubbleSprite(sprite)
  }

  const showSpeechBubble = (who: 'local' | string, text: string, durationMs = 4500) => {
    const cleaned = text.trim()
    if (!cleaned) return
    const until = performance.now() + Math.max(1200, durationMs)
    if (who === 'local') {
      clearSpeechBubble(localSpeechBubble, scene)
      localSpeechBubble = buildChatBubbleSprite(cleaned)
      localSpeechBubble.position.copy(localNametag.position)
      localSpeechBubble.position.y += 0.55
      scene.add(localSpeechBubble)
      localSpeechUntil = until
      return
    }
    const root = remoteById.get(who)
    if (!root) return
    const prev = remoteSpeech.get(who)
    if (prev) {
      root.remove(prev.sprite)
      disposeChatBubbleSprite(prev.sprite)
    }
    const sprite = buildChatBubbleSprite(cleaned)
    const mode = (root.userData.remoteMode as string | undefined) ?? 'boat'
    sprite.position.set(0, mode === 'foot' ? 2.55 : 2.35, 0)
    root.add(sprite)
    remoteSpeech.set(who, { sprite, until })
  }


  const syncRemotePlayers = (players: HarborRemotePlayer[]) => {
    const keep = new Set(players.map((p) => p.userId))
    for (const [id, root] of remoteById) {
      if (keep.has(id)) continue
      remotesRoot.remove(root)
      disposeRemoteSailor(root)
      remoteById.delete(id)
    }
    for (const player of players) {
      const existing = remoteById.get(player.userId)
      if (existing) {
        updateRemoteSailor(existing, player)
      } else {
        const root = buildRemoteSailor(player)
        root.userData.remoteUserId = player.userId
        remotesRoot.add(root)
        remoteById.set(player.userId, root)
      }
    }
  }

  const applyPoseToRemote = (pose: HarborPosePacket) => {
    const root = remoteById.get(pose.userId)
    if (!root) return
    setRemoteSailorPoseTarget(root, {
      x: pose.x,
      z: pose.z,
      yaw: pose.yaw,
      mode: pose.mode,
    })
  }


  let activeVisitable: HarborVisitableId | null = null
  const emitVisitable = (id: HarborVisitableId | null) => {
    if (id === activeVisitable) return
    activeVisitable = id
    options.onVisitable?.(id)
  }


  // Distant Wulingyuan-style karst pillars (parallax backdrop)
  const mountains = wulingyuanRange(42, look.fog)
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

    // OSRS tap-to-move: destination on the ground plane (quest docks seed the first target)
  let moveTarget = { x: startDock.side * HARBOR_DOCK_X, z: startDock.z }
  let playerDirected = false
  /** Crew the canoe (`boat`) or walk the Scout on land (`foot`). */
  let travelMode: 'boat' | 'foot' = 'boat'
  let footX = boatX
  let footZ = voyageZ
  let wantBoard = false
  const scoutSeat = { x: 0, y: 0.38, z: -0.05 }

  const destMarker = clickMarker()
  scene.add(destMarker)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const ndc = new THREE.Vector2()
  const hitPoint = new THREE.Vector3()
  const raycaster = new THREE.Raycaster()

  const setMoveTarget = (x: number, z: number, fromPlayer: boolean) => {
    const clamped =
      travelMode === 'boat' ? clampHarborBoatTarget(x, z) : clampHarborMoveTarget(x, z)
    moveTarget = clamped
    playerDirected = fromPlayer
    destMarker.position.set(clamped.x, 0.06, clamped.z)
    destMarker.visible = fromPlayer
  }

  const disembark = (towardX: number) => {
    if (travelMode === 'foot' || !scout) return
    const side = towardX === 0 ? (boatX >= 0 ? 1 : -1) : Math.sign(towardX) || 1
    // Keep seated Scout in the moored canoe (hidden); walk with standing mesh
    scout.visible = false
    footX = boatX + side * 0.9
    footZ = voyageZ
    if (Math.abs(footX) < HARBOR_LAND_EDGE) footX = side * HARBOR_LAND_EDGE
    scoutWalk.visible = true
    scoutWalk.position.set(footX, 0, footZ)
    scoutWalk.rotation.set(0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0)
    travelMode = 'foot'
    wantBoard = false
  }

  const boardBoat = () => {
    if (travelMode !== 'foot' || !scout) return
    scoutWalk.visible = false
    scout.visible = true
    scout.position.set(scoutSeat.x, scoutSeat.y, scoutSeat.z)
    scout.rotation.set(0, Math.PI, 0)
    travelMode = 'boat'
    wantBoard = false
    footX = boatX
    footZ = voyageZ
  }

  const tryTapMove = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, camera)
    // Prefer picking a remote sailor over ground move
    if (remotesRoot.children.length > 0) {
      const hits = raycaster.intersectObjects(remotesRoot.children, true)
      const remoteId = remoteUserIdFromHits(hits)
      if (remoteId) {
        options.onRemotePlayerSelect?.(remoteId)
        return
      }
    }
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return
    const tx = hitPoint.x
    const tz = hitPoint.z
    if (travelMode === 'boat') {
      if (isHarborLand(tx)) {
        disembark(tx)
        setMoveTarget(tx, tz, true)
      } else {
        setMoveTarget(tx, tz, true)
      }
      return
    }
    // On foot: walk inland, or return to the moored canoe to board
    const distBoat = Math.hypot(tx - boatX, tz - voyageZ)
    if (!isHarborLand(tx) || distBoat <= HARBOR_REBOARD_RADIUS * 0.7) {
      wantBoard = true
      const side = Math.sign(footX || boatX) || 1
      setMoveTarget(boatX + side * 0.2, voyageZ, true)
    } else {
      wantBoard = false
      setMoveTarget(tx, tz, true)
    }
  }

  // Finger / mouse: drag = orbit; pinch / wheel = zoom; tap = move-to-location
  let yaw = 0
  let pitch = 0.52
  let yawTarget = 0
  let pitchTarget = 0.52
  let distance = ORBIT_DISTANCE
  let distanceTarget = ORBIT_DISTANCE
  let dragging = false
  let ptrDragged = false
  let pinching = false
  let ptrStartX = 0
  let ptrStartY = 0
  let lastPtrX = 0
  let lastPtrY = 0
  let activePointer: number | null = null
  const ORBIT_SENS = 0.0052
  const WHEEL_ZOOM_SENS = 0.012
  /** Active pointers for maps-style pinch zoom (two fingers). */
  const pointers = new Map<number, { x: number; y: number }>()
  let pinchStartSpan = 0
  let pinchStartDistance = ORBIT_DISTANCE

  const pointerSpan = () => {
    if (pointers.size < 2) return 0
    const [a, b] = pointers.values()
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const beginPinch = () => {
    pinching = true
    ptrDragged = true // suppress tap-to-move after a pinch
    dragging = false
    activePointer = null
    pinchStartSpan = pointerSpan()
    pinchStartDistance = distanceTarget
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch {
      /* capture optional */
    }
    if (pointers.size >= 2) {
      beginPinch()
      return
    }
    // Single finger / mouse — start orbit drag (or pending tap)
    activePointer = e.pointerId
    dragging = true
    ptrDragged = false
    pinching = false
    ptrStartX = e.clientX
    ptrStartY = e.clientY
    lastPtrX = e.clientX
    lastPtrY = e.clientY
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two-finger pinch → zoom (spread = zoom in, pinch = zoom out)
    if (pointers.size >= 2) {
      if (!pinching) beginPinch()
      const span = pointerSpan()
      if (pinchStartSpan > 1) {
        distanceTarget = orbitDistanceFromPinch(pinchStartDistance, pinchStartSpan, span)
      }
      return
    }

    if (!dragging || e.pointerId !== activePointer || pinching) return
    const dx = e.clientX - lastPtrX
    const dy = e.clientY - lastPtrY
    lastPtrX = e.clientX
    lastPtrY = e.clientY
    if (!ptrDragged) {
      const slop = Math.hypot(e.clientX - ptrStartX, e.clientY - ptrStartY)
      if (slop < HARBOR_TAP_SLOP_PX) return
      ptrDragged = true
    }
    // Horizontal: drag right → camera left (grab-the-world)
    yawTarget -= dx * ORBIT_SENS
    // Vertical: natural — drag down tips the view down
    pitchTarget = clampOrbitPitch(pitchTarget + dy * ORBIT_SENS)
  }
  const endDrag = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return
    const wasDrag = ptrDragged || pinching
    const upX = e.clientX
    const upY = e.clientY
    pointers.delete(e.pointerId)
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }

    if (pointers.size >= 2) {
      beginPinch()
      return
    }
    if (pointers.size === 1) {
      // Drop back to single-finger orbit with the remaining touch
      const [id, pt] = [...pointers.entries()][0]!
      pinching = false
      pinchStartSpan = 0
      activePointer = id
      dragging = true
      ptrDragged = true
      lastPtrX = pt.x
      lastPtrY = pt.y
      ptrStartX = pt.x
      ptrStartY = pt.y
      return
    }

    // All pointers up
    const allowTap = !wasDrag && !pinching
    dragging = false
    ptrDragged = false
    pinching = false
    pinchStartSpan = 0
    activePointer = null
    // Tap (no drag / pinch) → paddle / walk to the ground hit
    if (allowTap) tryTapMove(upX, upY)
  }

  /** Desktop / trackpad: scroll to zoom (OSRS mouse-wheel camera). */
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    // Scroll down / pinch-out on trackpad → zoom out (farther camera)
    distanceTarget = clampOrbitDistance(distanceTarget + e.deltaY * WHEEL_ZOOM_SENS)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  canvas.addEventListener('lostpointercapture', endDrag)
  canvas.addEventListener('wheel', onWheel, { passive: false })

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
      // Bamboo realm keeps jade pond tint; Sounds campaign uses pier hue water.
      waterMat.color.setHex(realm === 'bamboo' ? 0x3a8878 : WATER[hue])
    }
  }

  const tick = (now: number) => {
    if (disposed) return
    raf = requestAnimationFrame(tick)
    if (paused || (typeof document !== 'undefined' && document.hidden)) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    // OSRS tap-to-move: paddle on water or walk on land (quest docks when crewing)
    if (!playerDirected && travelMode === 'boat') {
      const dock = dockPoseForProgress(progress)
      moveTarget = { x: dock.side * HARBOR_DOCK_X, z: dock.z }
    }

    if (travelMode === 'boat') {
      const dx = moveTarget.x - boatX
      const dz = moveTarget.z - voyageZ
      const dist = Math.hypot(dx, dz)
      const arrived = dist < HARBOR_TAP_ARRIVE
      if (!arrived) {
        const speed = reduced ? HARBOR_TAP_MOVE_SPEED * 0.45 : HARBOR_TAP_MOVE_SPEED
        const step = Math.min(dist, speed * dt)
        boatX += (dx / dist) * step
        voyageZ += (dz / dist) * step
        const face = Math.atan2(dx, dz)
        boat.rotation.y += (face - boat.rotation.y) * Math.min(1, dt * 6)
      } else if (playerDirected) {
        destMarker.visible = false
      }
      const approaching = !playerDirected && dist < 10

      // Pulse the yellow destination X while en route
      if (destMarker.visible && !reduced) {
        const pulse = 1 + Math.sin(now * 0.012) * 0.12
        destMarker.scale.setScalar(pulse)
      }

      waterPhase += dt * (reduced ? 0.4 : 1.2)
      const bob = reduced ? 0 : Math.sin(waterPhase * 2.2) * 0.04
      const sway = reduced || approaching || playerDirected ? 0 : Math.sin(waterPhase * 0.7) * 0.18
      boat.position.set(boatX + sway, 0.08 + bob, voyageZ)
      // Open Save Shack / Outfitter when the canoe paddles up
      emitVisitable(nearestVisitable(boatX, voyageZ))
    } else {
      // On foot — OSRS click-to-walk toward the yellow X
      const dx = moveTarget.x - footX
      const dz = moveTarget.z - footZ
      const dist = Math.hypot(dx, dz)
      const arrived = dist < HARBOR_TAP_ARRIVE
      if (!arrived) {
        const speed = reduced ? HARBOR_WALK_SPEED * 0.5 : HARBOR_WALK_SPEED
        const step = Math.min(dist, speed * dt)
        footX += (dx / dist) * step
        footZ += (dz / dist) * step
        const face = Math.atan2(dx, dz)
        scoutWalk.rotation.y += (face - scoutWalk.rotation.y) * Math.min(1, dt * 8)
        const walkBob = reduced ? 0 : Math.abs(Math.sin(now * 0.014)) * 0.05
        scoutWalk.position.set(footX, walkBob, footZ)
      } else {
        if (playerDirected) destMarker.visible = false
        if (wantBoard) boardBoat()
      }

      if (destMarker.visible && !reduced) {
        const pulse = 1 + Math.sin(now * 0.012) * 0.12
        destMarker.scale.setScalar(pulse)
      }

      // Moored canoe bobbing at the bank
      waterPhase += dt * (reduced ? 0.4 : 1.0)
      const bob = reduced ? 0 : Math.sin(waterPhase * 2.2) * 0.03
      boat.position.set(boatX, 0.08 + bob, voyageZ)
      emitVisitable(nearestVisitable(footX, footZ))
    }
    if (travelMode === 'boat' && !playerDirected) {
      const dock = dockPoseForProgress(progress)
      const atDock =
        Math.hypot(dock.side * HARBOR_DOCK_X - boatX, dock.z - voyageZ) < HARBOR_TAP_ARRIVE
      if (atDock) {
        const yawBoat = dock.side * 0.35
        boat.rotation.y += (yawBoat - boat.rotation.y) * Math.min(1, dt * 4)
      }
    }
    if (travelMode === 'boat') {
      boat.rotation.z = reduced ? 0 : Math.sin(waterPhase * 1.7) * 0.03
    } else {
      boat.rotation.z *= Math.max(0, 1 - dt * 4)
    }

    for (let i = 0; i < wakes.length; i++) {
      const w = wakes[i]!
      w.position.set(boat.position.x * (1 - i * 0.12), 0.04, boat.position.z - 0.7 - i * 0.55)
      w.scale.setScalar(1 + Math.sin(waterPhase * 3 + i) * 0.15)
      ;(w.material as THREE.MeshLambertMaterial).opacity =
        travelMode === 'foot' ? 0.06 - i * 0.01 : 0.28 - i * 0.04
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
    distance += (distanceTarget - distance) * orbitLerp

    const lookX = travelMode === 'foot' ? scoutWalk.position.x : boat.position.x
    const lookY = travelMode === 'foot' ? 0.95 : 0.75
    const lookZ = (travelMode === 'foot' ? scoutWalk.position.z : boat.position.z) + 1.2
    const off = orbitCameraOffset(yaw, pitch, distance)
    const bobY = reduced ? 0 : Math.sin(waterPhase * 0.5) * 0.06
    camera.position.set(lookX + off.x, lookY + off.y + bobY, lookZ + off.z)
    camera.lookAt(lookX, lookY, lookZ)

    // Local username plate follows boat / walking scout
    localNametag.position.set(
      travelMode === 'foot' ? scoutWalk.position.x : boat.position.x,
      travelMode === 'foot' ? 2.05 : 1.85,
      travelMode === 'foot' ? scoutWalk.position.z : boat.position.z,
    )
    if (localSpeechBubble) {
      localSpeechBubble.position.set(
        localNametag.position.x,
        localNametag.position.y + 0.55,
        localNametag.position.z,
      )
      if (performance.now() > localSpeechUntil) {
        clearSpeechBubble(localSpeechBubble, scene)
        localSpeechBubble = null
      }
    }
    if (remoteSpeech.size > 0) {
      const now = performance.now()
      for (const [id, entry] of remoteSpeech) {
        if (now > entry.until) {
          entry.sprite.parent?.remove(entry.sprite)
          disposeChatBubbleSprite(entry.sprite)
          remoteSpeech.delete(id)
        }
      }
    }

    // Ease remote sailors toward latest Broadcast / Presence pose targets
    for (const root of remoteById.values()) {
      tickRemoteSailorPose(root, reduced ? 1 : 0.32)
    }


    ensureChunks(voyageZ)
    if (fxIndexDirty) rebuildFxIndex()

    for (const o of animNodes) {
      // Speech bubbles face the camera and gently bob (OSRS Talk cue)
      if (o.userData.speechBubble) {
        o.lookAt(camera.position)
        const base = (o.userData.bubbleBaseY as number | undefined) ?? o.position.y
        o.userData.bubbleBaseY = base
        if (!reduced) {
          o.position.y = base + Math.sin(waterPhase * 2.6 + base * 10) * 0.045
        }
        continue
      }
      if (o.userData.specialHostGlow && !reduced) {
        const mat = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined
        const base = (o.userData.glowBaseIntensity as number) ?? 0.85
        if (mat && 'emissiveIntensity' in mat) {
          mat.emissiveIntensity = base * (0.82 + Math.sin(waterPhase * 2.4 + o.id) * 0.18)
        }
        o.rotation.z = Math.sin(waterPhase * 1.2 + o.id) * 0.08
        continue
      }
            if (o.userData.barberPole && !reduced) {
        o.rotation.y += 0.035
        continue
      }
if (o.userData.cigaretteSmoke && !reduced) {
        o.traverse((child) => {
          if (!child.userData.smokePuff) return
          const i = (child.userData.smokeIndex as number) ?? 0
          const t = waterPhase * 1.8 + i * 0.9
          child.position.y = 0.22 + i * 0.1 + (t % 1.4) * 0.12
          child.position.x = 0.02 + i * 0.01 + Math.sin(t) * 0.03
          const m = (child as THREE.Mesh).material as THREE.MeshLambertMaterial
          if (m && 'opacity' in m) m.opacity = Math.max(0.08, 0.45 - i * 0.1 - (t % 1.4) * 0.2)
        })
        continue
      }
      const fauna = o.userData.fauna as string | undefined
      if (fauna === 'panda' && !reduced) {
        const phase = ((o.userData.phase as number) ?? o.id) + waterPhase * 0.7
        o.rotation.y += Math.sin(phase) * 0.002
        o.position.y = Math.sin(phase * 0.5) * 0.012
      }
      if (fauna === 'tiger' && !reduced) {
        const phase = ((o.userData.phase as number) ?? o.id) + waterPhase * 0.55
        const baseX = (o.userData.baseX as number | undefined) ?? o.position.x
        o.userData.baseX = baseX
        o.position.x = baseX + Math.sin(phase) * 0.35
      }
      if (fauna === 'ibis') {
        const phase = ((o.userData.phase as number) ?? 0) + waterPhase * 1.6
        // Alternate: short hop on bank vs low soar
        if (o.userData.bird && o.position.y > 0.4) {
          o.position.y = 1.4 + Math.sin(phase * 2) * 0.25
          o.position.x += Math.sin(phase) * 0.012
        } else if (!reduced) {
          o.position.y = 0.05 + Math.max(0, Math.sin(phase * 1.2)) * 0.12
          o.rotation.z = Math.sin(phase) * 0.08
        }
      }
      if (fauna === 'salamander' && !reduced) {
        const phase = ((o.userData.phase as number) ?? o.id) + waterPhase * 0.8
        const baseX = (o.userData.baseX as number | undefined) ?? o.position.x
        o.userData.baseX = baseX
        o.position.x = baseX + Math.sin(phase) * 0.12
        o.rotation.y += Math.sin(phase * 0.5) * 0.01
      }
      if (fauna === 'deer' && !reduced) {
        const phase = ((o.userData.phase as number) ?? o.id) + waterPhase * 0.6
        o.rotation.y += Math.sin(phase) * 0.0015
      }
      if (fauna === 'magpie' && !reduced) {
        const phase = ((o.userData.phase as number) ?? o.id) + waterPhase * 1.4
        o.position.y = 0.08 + Math.max(0, Math.sin(phase * 1.8)) * 0.18
        o.rotation.y += Math.sin(phase) * 0.004
      }
      if (fauna === 'koi' && !reduced) {
        const phase = ((o.userData.phase as number) ?? o.id) + waterPhase * 1.6
        o.position.y = 0.06 + Math.max(0, Math.sin(phase)) * 0.22
        o.rotation.z = Math.PI / 2 + Math.sin(phase) * 0.25
      }
      if (!(o instanceof THREE.Mesh)) continue
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
    }

    if (flash && now < flashUntil) {
      amb.color.lerp(new THREE.Color(flash === 'ok' ? 0x3dcfb6 : 0xe07070), 0.15)
    } else {
      amb.color.lerp(new THREE.Color(look.amb), 0.08)
      if (now >= flashUntil) flash = null
    }

    // Lantern / portal flicker — reads strongest at night & dark weather
    if (!reduced) {
      for (const light of lanternLights) {
        const base = (light.userData.baseIntensity as number) ?? light.intensity
        light.intensity = base * (0.88 + Math.sin(waterPhase * 3.2 + light.id) * 0.12)
      }
    }

    renderer.render(scene, camera)
  }

  ensureChunks(voyageZ)
  raf = requestAnimationFrame(tick)

  return {
    weather,
    setProgress(t) {
      progress = Math.min(1, Math.max(0, t))
      // Quest step change — auto path to the next pier (clears free-explore target)
      const dock = dockPoseForProgress(progress)
      setMoveTarget(dock.side * HARBOR_DOCK_X, dock.z, false)
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
    setCharacter(next: {
      gender?: HarborGender
      appearance?: HarborAppearance
    }) {
      if (next.gender) currentGender = next.gender
      if (next.appearance) currentAppearance = { ...next.appearance }
      // Soft rebuild markers — next land/boat swap regenerates meshes with new silhouette.
    },
    setLook(look) {
      currentLook = { ...look }
      if (scout) applyLookToProtagonist(scout, currentLook)
      applyLookToProtagonist(scoutWalk, currentLook)
      applyVesselLook(boat, weather, currentLook)
    },
    setPaused(on) {
      paused = on
    },
    setRemotePlayers(players) {
      syncRemotePlayers(players)
    },
    applyRemotePose(pose) {
      applyPoseToRemote(pose)
    },
    getLocalPose() {
      // Orbit yaw drives minimap orientation (radar rotates with the camera, not only the hull).
      const viewYaw = yaw
      if (travelMode === 'foot') {
        return {
          x: footX,
          z: footZ,
          yaw: scoutWalk.rotation.y,
          viewYaw,
          mode: 'foot' as const,
          look: { ...currentLook },
          gender: currentGender,
          appearance: { ...currentAppearance },
        }
      }
      return {
        x: boatX,
        z: voyageZ,
        yaw: boat.rotation.y,
        viewYaw,
        mode: 'boat' as const,
        look: { ...currentLook },
        gender: currentGender,
        appearance: { ...currentAppearance },
      }
    },
    setLocalUsername(username) {
      const next = username.trim() || localUsername
      if (next === localUsername && localNametag.visible) return
      localUsername = next
      updateNametagSprite(localNametag, localUsername)
      localNametag.visible = true
    },
    showSpeechBubble,
    resize,
    dispose() {
      disposed = true
      for (const root of remoteById.values()) {
        remotesRoot.remove(root)
        disposeRemoteSailor(root)
      }
      remoteById.clear()
      scene.remove(remotesRoot)
      if (localSpeechBubble) {
        clearSpeechBubble(localSpeechBubble, scene)
        localSpeechBubble = null
      }
      for (const entry of remoteSpeech.values()) {
        entry.sprite.parent?.remove(entry.sprite)
        disposeChatBubbleSprite(entry.sprite)
      }
      remoteSpeech.clear()
      disposeNametagSprite(localNametag)
      scene.remove(localNametag)
      scoutWalk.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const mat = o.material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })
      scene.remove(scoutWalk)
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      canvas.removeEventListener('lostpointercapture', endDrag)
      canvas.removeEventListener('wheel', onWheel)
      for (const g of chunkGroups.values()) {
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose()
        })
      }
      chunkGroups.clear()
      destMarker.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
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
