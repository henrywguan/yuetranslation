/**
 * Harbor Quest · continuous river voyage.
 * V2 live look = authored GLBs (`harborV2Assets`). Procedural hqBox craft is
 * the v1 archive fallback when a mesh is still downloading.
 * See docs/harbor-quest/V2-MESH-WORLD.md
 */
import * as THREE from 'three'
import {
  HARBOR_CRAFT_PALETTE as P,
  hqAnimeHipRoof,
  hqBox,
  hqBoxTex,
  hqCanopy,
  hqCrate,
  hqDoor,
  hqMat,
  hqMatTex,
  hqPost,
  hqRock,
  hqSoftDirtTexture,
  hqSoftGrassTexture,
  hqSoftMapRepeat,
  hqSoftSandTexture,
  hqSoftThatchTexture,
  hqStampChairs,
  hqStampClutter,
  hqStoneTexture,
  hqWoodTexture,
  hqWindow,
} from './harborCraft'
import {
  HARBOR_NATURE_GRASS,
  hqGrassTuft,
  hqHabitatTallGrass,
  hqTallGrassClump,
} from './harborGrass'
import { attachHarborContactShadow } from './harborContactShadow'
import {
  HARBOR_V2_MESH_ONLY,
  applyHarborV2Map,
  isHarborSharedGpuMesh,
  mountHarborV2Asset,
  tintHarborV2Asset,
} from './harborV2Assets'
import {
  attachHarborCastGlb,
  HARBOR_CANOE_SCOUT_SEAT_Y,
} from './harborProtagonistGlb'
import { stampHarborNpcRoam, tickHarborNpcRoam } from './harborNpcRoam'
import {
  HARBOR_FIGURE_PROPORTIONS,
  harborFigureArm,
  harborFigureEars,
  harborFigureFace,
  harborFigureForeheadBangs,
  harborFigureHead,
  harborFigureLegStanding,
  harborFigureMat,
  harborFigureNeck,
  harborFigureTorso,
} from './harborFigure'
import { applyHarborCel, makeHarborIlmMap } from './harborCelShader'
import { auditHarborObject } from './harborMeshAudit'
import {
  buildGuanHarborScene,
  clampGuanBoatTarget,
  clampGuanFootTarget,
  guanGroundY,
  isGuanLand,
  GUAN_BOAT_START,
  GUAN_CAPE_LOOM,
  GUAN_RETURN_PORTAL,
  GUAN_TROPICAL_LOOK,
  GUAN_WATER_PLANE,
} from './harborGuanRealm'
import {
  GUAN_FISHING_HUT,
  RIVER_FISH_SPOTS,
  nearestGuanFishSpot,
  nearestRiverFishSpot,
} from './harborFishing'
import { fishingSpotBuoy } from './harborGuanFishingRealm'
import {
  HARBOR_FISH_CAST_MS,
  HARBOR_FISH_WAIT_MS,
  createHarborFishingPropKit,
  disposeHarborFishingPropKit,
  startHarborFishCast,
  startHarborFishCatch,
  tickHarborFishingAnim,
  type HarborFishAnimState,
} from './harborFishingAnim'
import { tickGuanArmoredPatrol } from './harborGuanPatrol'
import { buildHarborProtagonist } from './harborProtagonist'
import {
  ensureHarborProtagonistLimbs,
  tickHarborCastAnim,
  tickHarborProtagonistAnim,
  type HarborProtagonistAnimState,
} from './harborProtagonistAnim'
import {
  HARBOR_DEFAULT_APPEARANCE,
  HARBOR_HAIR_COLORS,
  HARBOR_SKIN_TONES,
  type HarborAppearance,
  type HarborGender,
} from './harborAppearance'
import {
  applyLookToProtagonist,
  harborGearById,
  HARBOR_DEFAULT_LOOK,
  type HarborLook,
} from './harborGear'
import { playHarborSit } from './harborInteractSfx'
import {
  attachVipBoatOrnaments,
  tagVipLanternAnim,
  tickVipGearAnims,
} from './harborVipGear'
import { enrichBoatHull } from './harborGearDetail'
import { mountHarborCanoeHull, mountHarborPaperLantern } from './harborBoatKit'
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

/** Voyage dressing — river harbor, Lingnan bamboo academy, or Guan tropical paradise. */
export type HarborRealmId = 'river' | 'bamboo' | 'guan'

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
  /** Showoff nametag frame id (from harborShowoff). */
  nametagFrame?: string
  /** Campaign biome dressing (flora / fauna / bank tint). */
  realm?: HarborRealmId
  /** Fires when the canoe enters / leaves a visitable landmark. */
  onVisitable?: (id: HarborVisitableId | null) => void
  /** Tap a talkable NPC / speech bubble while in range. */
  onDialogueNpc?: (tap: HarborDialogueTap) => void
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
  setLocalUsername: (username: string, nametagFrame?: string) => void
  setNametagFrame: (frameId: string) => void
  /** OSRS-style overhead say (outlined text, no bubble) above local or remote sailor. */
  showSpeechBubble: (who: 'local' | string, text: string, durationMs?: number) => void
  /**
   * Instantly board the canoe (if on foot) and teleport to the quest pier dock.
   * Pass `stepIndex` when continuing to the next gate so the snap matches that pier
   * before React progress catches up. Used by Talk / Next gate.
   */
  snapToQuestDock: (stepIndex?: number) => void
  /**
   * Instant canoe teleport inside Guan Harbor (fish-spot / lodge from world map).
   * No-op outside Guan — caller must set realmOverride to guan first.
   */
  snapToGuan: (x: number, z: number) => void
  /**
   * OSRS minimap / UI navigate — sail or walk toward a world (x,z).
   * Same rules as tapping the ground (disembark on land, reboard near canoe).
   */
  moveToWorld: (x: number, z: number) => void
  /**
   * On foot: stand up and walk back to the moored canoe (Boat FAB).
   * No-op while already crewing.
   */
  returnToBoat: () => void
  /** Cast pose: rod swing, flying bobber, splash. */
  playFishingCast: () => void
  /** After the bite resolves — reel-in celebration or miss. */
  playFishingCatch: (ok: boolean) => void
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
/**
 * Quest auto-sail uses one pier slot per gate (step 0 → pier 0, …).
 * Caps the voyage so lessons stop at the next host instead of drifting to z≈240.
 */
export const HARBOR_MAX_QUEST_SLOTS = 24

/** In-world visitables — Save Shack + Outfitter + Bank + Arena + Barber (+ Guan Cape Loom / Fishing). */
export type HarborVisitableId =
  | 'save-shack'
  | 'outfitter'
  | 'bank'
  | 'arena'
  | 'barber'
  | 'cape-loom'
  | 'fishing-hut'
  | 'fishing-spot'

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

/** Arrival radius to open a visitable panel (proximity). */
export const HARBOR_VISIT_RADIUS = 3.6
/** Max distance to tap-open an NPC dialogue / landmark host UI. */
export const HARBOR_NPC_TALK_RADIUS = 5.2

/** Tap a chair within this range (on foot) to sit. */
export const HARBOR_SIT_RADIUS = 1.85

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

/** Tap target for in-world NPC interaction. */
export type HarborDialogueTap =
  | { kind: 'landmark'; id: HarborVisitableId }
  | { kind: 'quest'; dockSlot: number; role: HarborNpcRole }

/** Floating name labels for pier dialogue hosts. */
export const HARBOR_NPC_ROLE_LABEL: Record<HarborNpcRole, string> = {
  villager: 'Ping · Villager',
  scholar: 'An · Scholar',
  fisherman: 'Hao · Fisherman',
  merchant: 'Rui · Merchant',
  child: 'Child',
  ferryman: 'Bo · Ferryman',
}

/** Canon gender mix for pier role NPCs (Higgsfield cast). */
export const HARBOR_NPC_ROLE_GENDER: Record<HarborNpcRole, 'female' | 'male'> = {
  villager: 'female',
  scholar: 'female',
  fisherman: 'male',
  merchant: 'female',
  child: 'female',
  ferryman: 'male',
}

/** Discrete pier for a quest gate index — alternates bank each stop. */
export function dockPoseForStep(stepIndex: number): { z: number; side: 1 | -1; slot: number } {
  const slot = Math.max(0, Math.min(HARBOR_MAX_QUEST_SLOTS, Math.floor(stepIndex)))
  return {
    slot,
    z: slot * HARBOR_DOCK_SPACING + 6,
    side: slot % 2 === 0 ? 1 : -1,
  }
}

/**
 * Discrete pier stop for a quest progress value (0…1).
 * Encode stepIndex as `stepIndex / HARBOR_MAX_QUEST_SLOTS` so each gate = one pier.
 */
export function dockPoseForProgress(progress: number): { z: number; side: 1 | -1; slot: number } {
  const t = Math.min(1, Math.max(0, progress))
  const slot = Math.max(0, Math.round(t * HARBOR_MAX_QUEST_SLOTS))
  return dockPoseForStep(slot)
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
    // Lower fill vs key → longer cel lit/shadow bands (dynamic daylight)
    ambI: 1.32,
    sun: 0xfff2dc,
    sunI: 2.95,
    hemiSky: 0xf0fbff,
    hemiGround: 0x6a9050,
    hemiI: 0.92,
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
    amb: 0xd0d8e0,
    ambI: 0.98,
    sun: 0xe8eef4,
    sunI: 0.95,
    hemiSky: 0xc8d4e0,
    hemiGround: 0x4a5a48,
    hemiI: 0.62,
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
    amb: 0xa8b4c0,
    ambI: 0.82,
    sun: 0xc8d0d8,
    sunI: 0.55,
    hemiSky: 0x98a8b8,
    hemiGround: 0x3a4a40,
    hemiI: 0.48,
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
    amb: 0x506888,
    ambI: 0.48,
    sun: 0xc8d8ff,
    sunI: 0.42,
    hemiSky: 0x183058,
    hemiGround: 0x121820,
    hemiI: 0.36,
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
  // Hills appear twice per cycle for WWM vertical / vista rhythm
  const cycle: BiomeId[] = ['pier', 'village', 'hills', 'forest', 'reeds', 'hills', 'forest', 'village']
  return cycle[((i % cycle.length) + cycle.length) % cycle.length]
}

/** Side-channel kinds that break the straight river corridor. */
export type HarborStreamForkKind = 'creek' | 'tributary' | 'oxbow'

export type HarborStreamFork = {
  side: 1 | -1
  kind: HarborStreamForkKind
}

/**
 * Deterministic river fork for a chunk — creeks / tributaries / oxbows peel
 * inland so the voyage banks read as a branching watershed, not a tube.
 * Chunk 0 stays clear for the starting pier.
 */
export function streamForkForChunk(i: number): HarborStreamFork | null {
  if (i < 1) return null
  const r = mulberry32((i + 3) * 7919 + 1301)()
  // ~58% of chunks get a fork so the banks feel irregular
  if (r < 0.42) return null
  const side: 1 | -1 = i % 2 === 0 ? 1 : -1
  const kind: HarborStreamForkKind = r > 0.82 ? 'oxbow' : r > 0.62 ? 'tributary' : 'creek'
  return { side, kind }
}

/** Mobile OSRS-style orbit: yaw wraps freely; pitch is clamped. */
export const ORBIT_PITCH_MIN = 0.16
export const ORBIT_PITCH_MAX = 1.12
/** Default camera distance (OSRS mid-zoom). */
export const ORBIT_DISTANCE = 8.6
/**
 * Pinch / wheel zoom limits.
 * Min is tight enough for OSRS-style huddles (several sailors fill the frame);
 * max keeps the river / Guan lagoon readable.
 */
export const ORBIT_DISTANCE_MIN = 2.15
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
/** On-foot walk speed (standard MMO click-to-move). */
export const HARBOR_WALK_SPEED = 3.4
/** Ease walk speed down inside this distance of the destination (no hard stop hop). */
export const HARBOR_WALK_ARRIVE_SLOW = 1.35
/** Reach the moored canoe to board again. */
export const HARBOR_REBOARD_RADIUS = 1.75

/** MMO on-foot walk step — grounded, eases into arrival. */
export function harborWalkStep(
  dist: number,
  dt: number,
  opts: { reduced?: boolean } = {},
): number {
  if (dist <= 0 || dt <= 0) return 0
  const base = opts.reduced ? HARBOR_WALK_SPEED * 0.5 : HARBOR_WALK_SPEED
  const slow = Math.min(1, dist / HARBOR_WALK_ARRIVE_SLOW)
  const speed = base * (0.4 + 0.6 * slow)
  return Math.min(dist, speed * dt)
}

export function isHarborLand(x: number): boolean {
  return Math.abs(x) >= HARBOR_LAND_EDGE
}

/** Clamp a free-move point onto the playable river corridor. */
/**
 * Playable world extent — big enough to explore, fish, relax, and chat.
 * Inland X reaches far foothills; Z spans a long river voyage.
 */
export const HARBOR_EXPLORE_X = 32
/** Furthest +Z the Scout / canoe may travel on the main river. */
export const HARBOR_VOYAGE_Z_MAX = 360
/** Furthest −Z (slightly upstream of start). */
export const HARBOR_VOYAGE_Z_MIN = -8
/** Extra sit / chat gather radius around plaza stools. */
export const HARBOR_SOCIAL_SIT_CLUSTER = 2.4

export function clampHarborMoveTarget(x: number, z: number): { x: number; z: number } {
  const maxX = HARBOR_EXPLORE_X
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    z: Math.min(HARBOR_VOYAGE_Z_MAX, Math.max(HARBOR_VOYAGE_Z_MIN, z)),
  }
}

/** Keep the canoe in the river / pier lane (no driving through inland roads). */
export function clampHarborBoatTarget(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.min(HARBOR_LAND_EDGE, Math.max(-HARBOR_LAND_EDGE, x)),
    z: Math.min(HARBOR_VOYAGE_Z_MAX, Math.max(HARBOR_VOYAGE_Z_MIN, z)),
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

/** Soft painterly ground map (LinearFilter) with low UV repeat — matches Guan. */
function softTiledMat(
  color: number,
  tex: THREE.DataTexture,
  repeat = 2.6,
  v2Kind?: 'grass' | 'dirt',
) {
  const m = hqMatTex(color, hqSoftMapRepeat(tex, repeat))
  if (v2Kind) applyHarborV2Map(m, v2Kind, repeat)
  return m
}

/** Recolor a willow clone so stand-in trees / shrubs do not all read as one mesh. */
function mountTintedWillow(
  parent: THREE.Group,
  rng: () => number,
  opts: { height: number; name: string; tint: number; amount?: number },
) {
  mountHarborV2Asset(parent, 'willow', {
    targetHeight: opts.height,
    name: opts.name,
    rotationY: rng() * Math.PI * 2,
    onReady: (mesh) => tintHarborV2Asset(mesh, opts.tint, opts.amount ?? 0.46),
  })
}

/** Paint a V2 bank/path albedo onto Lambert children (rocks, reeds, plazas). */
function paintHarborV2Map(root: THREE.Object3D, kind: 'grass' | 'dirt', repeat = 2.2) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mat = Array.isArray(m.material) ? m.material[0] : m.material
    if (mat instanceof THREE.MeshLambertMaterial) applyHarborV2Map(mat, kind, repeat)
  })
}

/** River willow — V2 mesh when available; v1 faceted canopy fallback. */
function tree(rng: () => number, leaf: number) {
  const g = new THREE.Group()
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'willow', {
      targetHeight: 2.6 + rng() * 1.1,
      name: 'v2-willow',
      rotationY: rng() * Math.PI * 2,
    })
    return g
  }
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
 * Jiangnan riverside dwelling — V2 mesh house when available; v1 craft fallback.
 */
function house(rng: () => number) {
  const g = new THREE.Group()
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'house-village', {
      targetHeight: 1.8 + rng() * 0.5,
      name: 'v2-house',
      rotationY: (rng() - 0.5) * 0.2,
    })
    return g
  }
  const w = 1.5 + rng() * 0.9
  const d = 1.15 + rng() * 0.45
  const h = 0.95 + rng() * 0.35
  const wall = rng() > 0.45 ? P.plaster : P.plasterWarm
  const wood = hqWoodTexture()
  const stone = hqStoneTexture()
  g.add(hqBox(w, h, d, wall, 0, h / 2, 0))
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      g.add(hqBox(0.08, h, 0.08, P.woodDeep, sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02)))
    }
  }
  g.add(hqBoxTex(w * 0.95, 0.06, 0.05, P.woodMid, wood, 0, h * 0.7, d / 2 + 0.02))
  const roofColor = rng() > 0.5 ? P.roofTile : 0x3a3430
  g.add(hqAnimeHipRoof(w, d, h, roofColor, { pitch: 0.42 + rng() * 0.12, overhang: 0.2 }))
  g.add(hqDoor(0.34, 0.58, -w * 0.15, 0.3, d / 2 + 0.04))
  g.add(hqWindow(0.36, 0.3, P.trimGold, P.glass, w * 0.22, h * 0.55, d / 2 + 0.05))
  g.add(hqBoxTex(w + 0.18, 0.14, d + 0.18, P.stone, stone, 0, 0.05, 0))
  if (rng() > 0.45) {
    const crate = hqCrate(rng)
    crate.position.set(w * 0.45, 0.08, d * 0.55)
    crate.scale.setScalar(0.65)
    g.add(crate)
  }
  return g
}


/** Compact courtyard wing — V2 house mesh when available. */
function courtyardWing(rng: () => number) {
  const g = new THREE.Group()
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'house-village', {
      targetHeight: 1.35 + rng() * 0.4,
      name: 'v2-courtyard',
      rotationY: (rng() - 0.5) * 0.5,
    })
    return g
  }
  const w = 1.1 + rng() * 0.5
  const d = 0.95 + rng() * 0.35
  const h = 0.75 + rng() * 0.25
  g.add(hqBox(w, h, d, P.brick, 0, h / 2, 0))
  g.add(hqAnimeHipRoof(w, d, h, P.roofClay, { pitch: 0.36, overhang: 0.18 }))
  g.add(hqBox(0.26, 0.44, 0.06, P.woodDeep, 0, 0.24, d / 2 + 0.03))
  g.add(hqWindow(0.28, 0.24, P.trimGold, 0x1a3040, w * 0.28, h * 0.55, d / 2 + 0.04))
  return g
}


/** Raised riverside shop — V2 market stall mesh when available. */
function stiltShop(rng: () => number) {
  const g = new THREE.Group()
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'stall-market', {
      targetHeight: 1.5 + rng() * 0.35,
      name: 'v2-stall',
      rotationY: (rng() - 0.5) * 0.4,
    })
    return g
  }
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
  g.add(hqBox(w, h, d, P.plasterWarm, 0, deckY + h / 2 + 0.05, 0))
  g.add(
    hqAnimeHipRoof(w, d, deckY + h + 0.05, P.straw, {
      pitch: 0.4,
      overhang: 0.2,
      ridgeColor: P.woodDeep,
    }),
  )
  g.add(hqBox(0.1, 0.48, 0.04, P.banner, w * 0.35, deckY + h * 0.7, d / 2 + 0.06))
  g.add(hqWindow(0.3, 0.26, P.trimGold, P.glass, -w * 0.2, deckY + h * 0.55, d / 2 + 0.04))
  g.add(hqDoor(0.28, 0.48, w * 0.15, deckY + 0.28, d / 2 + 0.04))
  return g
}


/** Round earth-building / watch hut — soft vernacular silhouette for hills. */
/** Small tiled cottage — soft anime hip roof + extruded door. */
function hut(rng: () => number) {
  // Mix: half courtyard wing, half small tiled cottage so villages feel varied
  if (rng() > 0.55) return courtyardWing(rng)
  const g = new THREE.Group()
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'house-village', {
      targetHeight: 1.4 + rng() * 0.45,
      name: 'v2-hut',
      rotationY: (rng() - 0.5) * 0.35,
    })
    return g
  }
  const w = 1.0 + rng() * 0.4
  const d = 0.9 + rng() * 0.3
  const h = 0.7 + rng() * 0.3
  g.add(hqBox(w, h, d, P.plasterWarm, 0, h / 2, 0))
  g.add(
    hqAnimeHipRoof(w, d, h, P.straw, {
      pitch: 0.38 + rng() * 0.08,
      overhang: 0.18,
      ridgeColor: P.strawDark,
    }),
  )
  g.add(hqDoor(0.24, 0.42, 0, 0.22, d / 2 + 0.03))
  g.add(hqWindow(0.26, 0.22, P.trimGold, P.glass, w * 0.22, h * 0.55, d / 2 + 0.04))
  g.add(hqBoxTex(w + 0.12, 0.1, d + 0.12, P.stone, hqStoneTexture(), 0, 0.04, 0))
  return g
}


/** Village home kinds placed along the voyage (smoke-tested). */
export const HARBOR_VILLAGE_HOMES = ['jiangnan', 'courtyard', 'stilt', 'cottage'] as const
export type HarborVillageHome = (typeof HARBOR_VILLAGE_HOMES)[number]

/**
 * Map language lock — Where Winds Meet *atmosphere* (layered terraces, winding
 * paths, scenic pavilions, valley mist). Original Harbor geometry only.
 */
export const HARBOR_MAP_LANGUAGE = {
  layeredTerraces: true,
  windingPaths: true,
  scenicPavilions: true,
  valleyMist: true,
  switchbackClimbs: true,
} as const

function rock(rng: () => number) {
  const m = hqRock(rng, rng() > 0.5 ? P.rock : P.rockWarm)
  if (HARBOR_V2_MESH_ONLY) paintHarborV2Map(m, 'dirt', 1.6)
  return m
}


function reed(rng: () => number) {
  const g = new THREE.Group()
  const n = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const h = 0.6 + rng() * 0.9
    g.add(hqPost(0.03, 0.04, h, P.reed, (rng() - 0.5) * 0.35, h / 2, (rng() - 0.5) * 0.35, 4))
    g.add(hqBox(0.08, 0.1, 0.08, P.reedTip, (rng() - 0.5) * 0.35, h + 0.04, (rng() - 0.5) * 0.35))
  }
  // Dense waterline clumps — paint grass, do not instance willow 12× per chunk.
  if (HARBOR_V2_MESH_ONLY) paintHarborV2Map(g, 'grass', 2.4)
  return g
}


function flower(rng: () => number) {
  const g = new THREE.Group()
  // Cheap craft — a 4MB willow GLB per blossom OOM'd iPhone WebGL (black screen).
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
  if (weather === 'night') return 2.05
  if (weather === 'rainy') return 1.35
  if (weather === 'cloudy') return 0.78
  // Day still gets a soft pool so banks feel lit, not washed flat
  return 0.22
}

function glowMat(color: number, emissive: number, intensity = 0.9) {
  return applyHarborCel(
    new THREE.MeshLambertMaterial({
      color,
      emissive,
      emissiveIntensity: intensity,
      flatShading: false,
    }),
    { preset: 'lantern', ilmMap: makeHarborIlmMap('lantern') },
  )
}

function attachLanternLight(
  parent: THREE.Object3D,
  weather: HarborWeather,
  y = 1.55,
  color = 0xffb060,
  scale = 1,
) {
  const base = harborLanternIntensity(weather) * scale
  const light = new THREE.PointLight(color, base, weather === 'night' ? 9.5 : weather === 'rainy' ? 8.2 : 7.5, 2)
  light.position.set(0, y, 0)
  light.userData.harborLanternLight = true
  light.userData.baseIntensity = base
  light.userData.baseDistance = light.distance
  parent.add(light)
  return light
}

/** Paper lantern on a post — emits ambiance light (stronger at night / rain). */
function lantern(weather: HarborWeather = 'sunny') {
  const g = new THREE.Group()
  g.userData.harborLantern = true
  if (HARBOR_V2_MESH_ONLY) {
    g.add(hqPost(0.05, 0.07, 1.35, P.woodDark, 0, 0.68, 0, 8))
    mountHarborV2Asset(g, 'lantern-paper', {
      targetHeight: 0.34,
      name: 'v2-shore-lantern',
      position: [0, 1.42, 0],
    })
    attachLanternLight(g, weather, 1.55)
    auditHarborObject(g, 'lantern')
    return g
  }
  g.add(hqPost(0.05, 0.07, 1.5, P.woodDark, 0, 0.75, 0, 8))
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.34, 14),
    glowMat(P.lantern, 0xffa040, weather === 'sunny' ? 0.28 : 0.95),
  )
  lamp.position.set(0, 1.55, 0)
  g.add(lamp)
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.05, 12), hqMat(P.woodDeep))
  cap.position.set(0, 1.74, 0)
  g.add(cap)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), hqMat(P.trimGold))
  tip.position.set(0, 1.82, 0)
  g.add(tip)
  attachLanternLight(g, weather, 1.55)
  auditHarborObject(g, 'lantern')
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
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborPaperLantern(g, {
      color: paper,
      targetHeight: 0.32,
      name: 'v2-boat-lantern',
      position: [0, 0.15, 0],
    })
    attachLanternLight(g, weather, 0.45, glowCol, 1.15)
    return g
  }
  const id = item.id
  const wood = hqWoodTexture()
  if (id.startsWith('lantern-silk') || id === 'lantern-phoenix' || id === 'lantern-starlight') {
    g.add(hqPost(0.025, 0.035, 0.5, P.woodDark, 0, 0.26, 0, 8))
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.28, 14),
      glowMat(paper, glowCol, weather === 'sunny' ? 0.4 : 1.2),
    )
    lamp.position.set(0, 0.55, 0)
    g.add(lamp)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.04, 12), hqMatTex(P.woodDeep, wood))
    cap.position.set(0, 0.7, 0)
    g.add(cap)
    const iron = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 14), hqMat(P.iron))
    iron.rotation.x = Math.PI / 2
    iron.position.set(0, 0.66, 0)
    g.add(iron)
    const gold = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 12), hqMat(P.trimGold))
    gold.rotation.x = Math.PI / 2
    gold.position.set(0, 0.42, 0)
    g.add(gold)
    attachLanternLight(g, weather, 0.55, glowCol, id === 'lantern-starlight' ? 1.55 : 1.3)
  } else if (id.startsWith('lantern-glass') || id === 'lantern-porcelain') {
    g.add(hqPost(0.028, 0.038, 0.45, P.woodDark, 0, 0.24, 0, 8))
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 12),
      glowMat(paper, glowCol, weather === 'sunny' ? 0.45 : 1.25),
    )
    lamp.position.set(0, 0.52, 0)
    g.add(lamp)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), hqMat(P.trimGold))
    tip.position.set(0, 0.64, 0)
    g.add(tip)
    attachLanternLight(g, weather, 0.52, glowCol, 1.35)
  } else if (id === 'lantern-oil-iron' || id === 'lantern-dragon') {
    g.add(hqPost(0.03, 0.04, 0.4, P.woodDark, 0, 0.22, 0, 8))
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.2, 12), hqMat(paper))
    cage.position.set(0, 0.5, 0)
    g.add(cage)
    for (const y of [0.4, 0.6] as const) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.015, 6, 14), hqMat(P.iron))
      ring.rotation.x = Math.PI / 2
      ring.position.set(0, y, 0)
      g.add(ring)
    }
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 10),
      glowMat(glowCol, glowCol, weather === 'sunny' ? 0.5 : 1.35),
    )
    core.position.set(0, 0.5, 0)
    g.add(core)
    attachLanternLight(g, weather, 0.5, glowCol, id === 'lantern-dragon' ? 1.5 : 1.2)
  } else {
    g.add(hqPost(0.03, 0.04, 0.42, P.woodDark, 0, 0.22, 0, 8))
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.1, 0.2, 14),
      glowMat(paper, glowCol, weather === 'sunny' ? 0.35 : 1.1),
    )
    lamp.position.set(0, 0.5, 0)
    g.add(lamp)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.04, 12), hqMatTex(P.woodDeep, wood))
    cap.position.set(0, 0.62, 0)
    g.add(cap)
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), hqMat(P.trimGold))
    bead.position.set(0, 0.4, 0.08)
    g.add(bead)
    attachLanternLight(g, weather, 0.5, glowCol, 1.25)
  }
  tagVipLanternAnim(g, id)
  auditHarborObject(g, 'lantern')
  return g
}

/**
 * Open-air scenic pavilion — terrace overlook / rest stop.
 * Where Winds Meet *vista* feel; original Harbor kit.
 */
function scenicPavilion(rng: () => number) {
  const g = new THREE.Group()
  g.name = 'scenic-pavilion'
  g.userData.scenicPavilion = true
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'house-village', {
      targetHeight: 1.7 + rng() * 0.28,
      name: 'v2-scenic-pavilion',
      position: [0, 0, -0.35],
      rotationY: (rng() - 0.5) * 0.18,
    })
    mountHarborV2Asset(g, 'lantern-paper', {
      targetHeight: 0.3,
      name: 'v2-pavilion-lantern',
      position: [0.58, 1.02, 0.4],
    })
    // Sit collider stays — gameplay raycast, not the v1 hip roof.
    const bench = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.9, 12),
      hqMatTex(P.stone, hqStoneTexture()),
    )
    bench.rotation.z = Math.PI / 2
    bench.position.set(0, 0.32, 0.42)
    bench.userData.harborChair = true
    bench.userData.seatY = 0.32
    paintHarborV2Map(bench, 'dirt', 1.8)
    g.add(bench)
    return g
  }
  const stone = hqStoneTexture()
  // Raised stone plinth
  g.add(hqBoxTex(1.6, 0.12, 1.6, P.stone, stone, 0, 0.08, 0))
  g.add(hqBoxTex(1.35, 0.08, 1.35, P.stoneLite, stone, 0, 0.16, 0))
  // Four timber posts
  for (const sx of [-0.55, 0.55] as const) {
    for (const sz of [-0.55, 0.55] as const) {
      g.add(hqPost(0.06, 0.08, 1.15, P.woodDark, sx, 0.7, sz, 8))
    }
  }
  // Soft anime hip roof
  g.add(
    hqAnimeHipRoof(1.4, 1.4, 1.25, rng() > 0.5 ? P.roofTile : P.straw, {
      pitch: 0.38,
      overhang: 0.2,
      ridgeColor: P.trimGold,
    }),
  )
  // Stone bench facing the river (+Z)
  const bench = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.9, 12),
    hqMatTex(P.stone, stone),
  )
  bench.rotation.z = Math.PI / 2
  bench.position.set(0, 0.32, 0.35)
  bench.userData.harborChair = true
  bench.userData.seatY = 0.32
  g.add(bench)
  // Jade / gold rail accents
  for (const sx of [-0.55, 0.55] as const) {
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 1.0, 8),
      hqMat(P.trimGold),
    )
    rail.rotation.x = Math.PI / 2
    rail.position.set(sx, 0.95, 0)
    g.add(rail)
  }
  return g
}

/** Stone plaza disc — relax / chat circle on a terrace. */
function terracePlaza(rng: () => number) {
  const g = new THREE.Group()
  g.name = 'terrace-plaza'
  g.userData.terracePlaza = true
  const stone = hqStoneTexture()
  const discR = 1.1 + rng() * 0.25
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(discR, discR + 0.05, 0.08, 16),
    hqMatTex(P.stone, stone),
  )
  disc.position.y = 0.06
  g.add(disc)
  if (HARBOR_V2_MESH_ONLY) paintHarborV2Map(disc, 'dirt', 2.2)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(discR - 0.05, 0.04, 6, 18),
    hqMat(P.stoneDark),
  )
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.1
  g.add(ring)
  // Central lantern pedestal
  g.add(hqPost(0.08, 0.1, 0.45, P.stoneDark, 0, 0.3, 0, 8))
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'lantern-paper', {
      targetHeight: 0.3,
      name: 'v2-plaza-lantern',
      position: [0, 0.52, 0],
    })
  } else {
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      glowMat(P.lantern, 0xff9040, 0.55),
    )
    flame.position.y = 0.58
    g.add(flame)
  }
  // Sit cluster around the lantern — friends can gather to relax / chat
  const seatR = Math.min(discR * 0.72, HARBOR_SOCIAL_SIT_CLUSTER * 0.45)
  hqStampChairs(
    g,
    [
      { x: seatR, z: 0.05, yaw: -Math.PI / 2 },
      { x: -seatR, z: -0.05, yaw: Math.PI / 2, stool: true },
      { x: 0.08, z: seatR, yaw: Math.PI, stool: true },
      { x: -0.05, z: -seatR, yaw: 0 },
    ],
    rng,
  )
  return g
}

/** Soft valley mist ribbon between land layers (WWM layered depth). */
function valleyMistRibbon(width: number, length: number, fogHex: number) {
  const matMist = new THREE.MeshLambertMaterial({
    color: fogHex,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    flatShading: false,
    side: THREE.DoubleSide,
  })
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(width, length), matMist)
  veil.rotation.x = -Math.PI / 2
  veil.userData.valleyMist = true
  veil.userData.mountainMist = true
  return veil
}

/**
 * Winding dirt lane — S-curve segments (not a ruler-straight corridor).
 * Where Winds Meet path language; still walkable packed earth.
 */
function windingDirtLane(
  length: number,
  width: number,
  zigAmp: number,
  segs = 3,
): THREE.Group {
  const g = new THREE.Group()
  g.userData.dirtRoad = true
  g.userData.windingPath = true
  const segLen = length / segs
  for (let i = 0; i < segs; i++) {
    const t = (i + 0.5) / segs
    const zig = Math.sin(t * Math.PI * 2) * zigAmp
    const strip = dirtRoadStrip(segLen - 0.12, width)
    strip.position.set(zig, 0, segLen * (i + 0.5) - length / 2)
    strip.rotation.y = zig * 0.12
    g.add(strip)
  }
  return g
}

/** Packed-earth lane with wheel ruts — riverside + inland walkways. */
function dirtRoadStrip(length: number, width = 1.1) {
  const g = new THREE.Group()
  g.userData.dirtRoad = true
  const dirt = hqSoftDirtTexture()
  const bed = hqBoxTex(width, 0.05, length, 0x6a4828, dirt, 0, 0.06, 0)
  if (bed.material instanceof THREE.MeshLambertMaterial) {
    applyHarborV2Map(bed.material, 'dirt', Math.max(1.4, length * 0.35))
  }
  g.add(bed)
  g.add(hqBoxTex(0.12, 0.02, length * 0.96, 0x4a3018, dirt, -width * 0.22, 0.09, 0))
  g.add(hqBoxTex(0.12, 0.02, length * 0.96, 0x4a3018, dirt, width * 0.22, 0.09, 0))
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
  if (HARBOR_V2_MESH_ONLY) paintHarborV2Map(g, 'dirt', Math.max(1.3, length * 0.32))
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
  // Soft hip roof cap on the post
  g.add(hqAnimeHipRoof(0.22, 0.22, 2.35, P.woodDeep, { pitch: 0.22, overhang: 0.06, ridgeColor: P.trimGold }))
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
  const terraceX = BANK + 18.5
  for (const side of [-1, 1] as const) {
    // Riverside packed-earth lane
    const road = dirtRoadStrip(CHUNK - 0.35, 1.05 + rng() * 0.2)
    road.position.set(side * (BANK + 0.25), 0, mid)
    group.add(road)
    // Winding inland walkway toward the karst (S-curve, not a ruler line)
    const inland = windingDirtLane(CHUNK - 0.45, 0.95 + rng() * 0.15, 0.55 + rng() * 0.35)
    inland.userData.inlandRoad = true
    inland.position.set(side * inlandX, 0.01, mid)
    group.add(inland)
    // High terrace path — layered map depth + gentle weave
    const terrace = windingDirtLane(CHUNK - 0.55, 0.8 + rng() * 0.12, 0.7 + rng() * 0.4)
    terrace.userData.terraceRoad = true
    terrace.userData.inlandRoad = true
    terrace.position.set(side * terraceX, 0.08, mid)
    group.add(terrace)
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
      const foothillPath = dirtRoadStrip(8.2, 0.75)
      foothillPath.userData.foothillPath = true
      foothillPath.rotation.y = Math.PI / 2
      foothillPath.position.set(side * (inlandX + 5.5), 0.05, z0 + 6 + rng() * (CHUNK - 10))
      group.add(foothillPath)
      // Cross-link inland → terrace for stroll / chat loops
      if (rng() > 0.35) {
        const climb = dirtRoadStrip(terraceX - inlandX, 0.7)
        climb.userData.crossPath = true
        climb.userData.terraceClimb = true
        climb.rotation.y = Math.PI / 2
        climb.position.set(side * ((inlandX + terraceX) / 2), 0.05, z0 + 5 + rng() * (CHUNK - 9))
        group.add(climb)
      }
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



/** Drop fishing buoys whose Z falls in this chunk (main-river fish loop). */
function placeRiverFishSpots(group: THREE.Group, chunkIndex: number) {
  const z0 = chunkIndex * CHUNK
  const z1 = z0 + CHUNK
  for (const spot of RIVER_FISH_SPOTS) {
    if (spot.z < z0 - 1 || spot.z >= z1 + 1) continue
    const buoy = fishingSpotBuoy(spot.id)
    buoy.position.set(spot.x, 0.05, spot.z)
    buoy.userData.riverFishSpot = true
    group.add(buoy)
  }
}

/** Place scenic pavilions + terrace plazas for overlook / relax / chat. */
function placeScenicMapFeatures(
  group: THREE.Group,
  chunkIndex: number,
  rng: () => number,
  biome: BiomeId,
) {
  if (!HARBOR_MAP_LANGUAGE.scenicPavilions) return
  const z0 = chunkIndex * CHUNK
  // Hills + forest + village get vista pavilions on the high terrace
  if (biome === 'hills' || biome === 'forest' || biome === 'village') {
    for (const side of [-1, 1] as const) {
      if (rng() > 0.55 && biome !== 'hills') continue
      const pav = scenicPavilion(rng)
      pav.position.set(
        side * (BANK + 19.5 + rng() * 3.5),
        0.12,
        z0 + 6 + rng() * (CHUNK - 12),
      )
      pav.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2
      group.add(pav)
      if (rng() > 0.4) {
        const plaza = terracePlaza(rng)
        plaza.position.set(
          side * (BANK + 18.0 + rng() * 2.5),
          0.1,
          z0 + 10 + rng() * (CHUNK - 14),
        )
        group.add(plaza)
      }
    }
  }
  // Reeds get a lone waterside pavilion for fishing rest
  if (biome === 'reeds' && rng() > 0.45) {
    const side = rng() > 0.5 ? 1 : -1
    const pav = scenicPavilion(rng)
    pav.position.set(side * (BANK + 3.5), 0.05, z0 + CHUNK * 0.5)
    pav.rotation.y = side > 0 ? -0.4 : 0.4
    pav.scale.setScalar(0.85)
    group.add(pav)
  }
}

function pierSegment() {
  const g = new THREE.Group()
  g.userData.pier = true
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'pier-module', {
      targetHeight: 1.05,
      name: 'v2-pier',
    })
    return g
  }
  const wood = hqWoodTexture()
  // Thick deck planks (readable boards, not a paper plane)
  g.add(hqBoxTex(2.4, 0.16, 3.6, P.woodLight, wood, 0, 0.55, 0))
  for (const z of [-1.1, 0, 1.1] as const) {
    g.add(hqBox(2.35, 0.04, 0.08, P.woodDark, 0, 0.64, z))
  }
  // Alternate mid planks for value breakup
  for (const z of [-0.55, 0.55] as const) {
    g.add(hqBoxTex(2.2, 0.03, 0.35, P.woodMid, wood, 0, 0.64, z))
  }
  const plank = hqBoxTex(0.95, 0.1, 1.15, P.woodMid, wood, -0.95, 0.5, 0)
  plank.rotation.z = 0.12
  g.add(plank)
  for (const x of [-0.95, 0.95]) {
    for (const z of [-1.3, 1.3]) {
      g.add(hqPost(0.11, 0.14, 1.15, P.woodDark, x, 0.15, z))
    }
  }
  g.add(hqPost(0.08, 0.1, 0.38, P.woodDeep, 0.7, 0.74, 1.2))
  const crate = hqCrate(() => 0.3)
  crate.position.set(-0.55, 0.63, 0.9)
  crate.scale.setScalar(0.7)
  g.add(crate)
  return g
}



/** Floating speech bubble — OSRS-style cue that this NPC has dialogue. */
export const HARBOR_DIALOGUE_BUBBLE = true as const

/** Floating nametag above an NPC head (same plate language as sailor tags). */
function attachNpcNametag(npc: THREE.Object3D, label: string) {
  if (npc.getObjectByName('npc-nametag')) return
  const tag = buildNametagSprite(label)
  tag.name = 'npc-nametag'
  tag.userData.npcNametag = true
  // Sit just above the oversized head; speech bubble floats higher
  tag.position.set(0, 1.9, 0)
  tag.scale.set(1.55, 0.38, 1)
  npc.add(tag)
}

function speechBubbleIcon() {
  const g = new THREE.Group()
  g.name = 'speech-bubble'
  g.userData.speechBubble = true
  g.userData.billboard = true
  g.userData.hasDialogue = true
  g.userData.harborGear = true
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

/** Mark an NPC as talkable, name them, and hover a speech bubble above their head. */
function attachDialogueBubble(npc: THREE.Object3D, label?: string) {
  npc.userData.hasDialogue = true
  if (label) attachNpcNametag(npc, label)
  // Avoid double-attaching if chunk rebuilds call this twice
  if (npc.getObjectByName('speech-bubble')) return
  const bubble = speechBubbleIcon()
  // Above the nametag so both stay readable
  bubble.position.set(0.12, 2.32, 0.06)
  bubble.userData.bubbleBaseY = bubble.position.y
  npc.add(bubble)
}

/**
 * Quest / pier dialogue NPCs — anime dress-up body (same kit as River Scout).
 * Distinct silhouettes + gender mix so the pier cast feels unique and attractive
 * (Maple / Genshin / WWM / BDO appeal — original Harbor OCs only).
 */
const NPC_ROLE_GENDER = HARBOR_NPC_ROLE_GENDER

function chineseNpc(role: HarborNpcRole, rng: () => number) {
  const g = new THREE.Group()
  const child = role === 'child'
  const gender = NPC_ROLE_GENDER[role]
  const scale = child ? 0.72 : gender === 'female' ? 0.96 + rng() * 0.04 : 1 + rng() * 0.05
  // Per-spawn skin / hair so villagers aren't identical clones of one another.
  const skinHex = HARBOR_SKIN_TONES[Math.floor(rng() * HARBOR_SKIN_TONES.length)] ?? P.skin
  const hairHex = HARBOR_HAIR_COLORS[Math.floor(rng() * HARBOR_HAIR_COLORS.length)] ?? P.hair
  const skin = harborFigureMat(skinHex)
  const hair = harborFigureMat(hairHex)
  const shoes = harborFigureMat(P.woodDark)

  const palette: Record<HarborNpcRole, { robe: number; trim: number; pants: number }> = {
    villager: { robe: P.clothNavy, trim: P.trimGold, pants: P.pants },
    scholar: { robe: P.clothGrey, trim: P.trimIvory, pants: 0x4a4850 },
    fisherman: { robe: P.clothSage, trim: P.straw, pants: 0x4a3a28 },
    merchant: { robe: P.clothCrimson, trim: P.trimGold, pants: 0x3a2820 },
    child: { robe: P.clothChild, trim: P.trimChild, pants: 0x3a4a68 },
    ferryman: { robe: P.clothTeal, trim: 0x8a6a40, pants: P.pants },
  }
  const colors = palette[role]
  const cloth = harborFigureMat(colors.robe)
  const pantsMat = harborFigureMat(colors.pants)
  const female = gender === 'female'

  for (const side of [-1, 1] as const) {
    g.add(harborFigureLegStanding(pantsMat, shoes, side, female ? 0.078 : 0.088))
  }

  const torsoH = HARBOR_FIGURE_PROPORTIONS.torsoH + (role === 'scholar' || role === 'merchant' ? 0.04 : 0)
  const pelvisY = 0.72
  const shoulder = female ? 0.14 : 0.16
  const waist = female ? 0.105 : 0.12
  g.add(
    harborFigureTorso(cloth, pelvisY + torsoH / 2, {
      shoulder,
      waist,
      h: torsoH,
      depth: female ? 0.145 : 0.16,
    }),
  )
  const sash = new THREE.Mesh(
    new THREE.CylinderGeometry(female ? 0.14 : 0.15, female ? 0.135 : 0.145, 0.045, 14),
    harborFigureMat(colors.trim),
  )
  sash.scale.z = 0.85
  sash.position.set(0, pelvisY + 0.04, 0.02)
  g.add(sash)
  if (role === 'scholar' || role === 'merchant') {
    g.add(
      harborFigureTorso(cloth, pelvisY + 0.1, {
        shoulder: shoulder * 0.95,
        waist: waist * 1.05,
        h: 0.2,
        depth: female ? 0.13 : 0.15,
      }),
    )
  }

  const shoulderY = pelvisY + torsoH * 0.82
  for (const side of [-1, 1] as const) {
    g.add(harborFigureArm(cloth, skin, side, shoulderY, female ? 0.22 : 0.24))
  }

  const headY = pelvisY + torsoH + HARBOR_FIGURE_PROPORTIONS.neckH + HARBOR_FIGURE_PROPORTIONS.headR * 0.55
  g.add(harborFigureHead(skin, headY))
  g.add(harborFigureNeck(skin, headY))
  g.add(harborFigureEars(skin, headY))
  g.add(
    harborFigureFace(skin, headY, {
      showBrows: true,
      showMouth: true,
      eyeStyle: female ? (role === 'merchant' ? 'bright' : 'round') : role === 'ferryman' ? 'bright' : 'almond',
      faceStyle: role === 'merchant' ? 'cheerful' : role === 'scholar' ? 'calm' : 'soft',
      blush: female ? 0xffb0b8 : role === 'child' ? 0xffc0c8 : null,
    }),
  )

  // Distinct hair / hat silhouettes per role (anime volumes — not box hats)
  if (role === 'scholar') {
    const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), hair)
    scalp.scale.set(1.05, 0.75, 1.0)
    scalp.position.set(0, headY + 0.04, -0.01)
    g.add(scalp)
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), hair)
    bun.position.set(0, headY + 0.14, -0.04)
    g.add(bun)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), harborFigureMat(P.ink))
    cap.scale.set(1, 0.45, 1.05)
    cap.position.set(0, headY + 0.1, 0)
    g.add(cap)
  } else if (role === 'fisherman' || role === 'ferryman') {
    g.add(harborFigureForeheadBangs(hair, headY, { clumps: 3 }))
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.11, 16), harborFigureMat(P.straw))
    hat.position.y = headY + 0.14
    g.add(hat)
  } else if (role === 'merchant') {
    const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), hair)
    scalp.scale.set(1.08, 0.8, 1.02)
    scalp.position.set(0, headY + 0.03, -0.01)
    g.add(scalp)
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), hair)
    bun.position.set(0.05, headY + 0.12, -0.02)
    g.add(bun)
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), harborFigureMat(P.jade))
    pin.position.set(0.08, headY + 0.14, 0)
    g.add(pin)
    const earring = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), harborFigureMat(P.jade))
    earring.position.set(0.1, headY - 0.02, 0.04)
    g.add(earring)
  } else if (role === 'villager') {
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), hair)
    bob.scale.set(1.02, 0.7, 0.92)
    bob.position.set(0, headY + 0.06, -0.05)
    g.add(bob)
    g.add(harborFigureForeheadBangs(hair, headY, { clumps: 4 }))
  } else {
    // Child — soft twin buns
    const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), hair)
    scalp.scale.set(1.05, 0.75, 1.0)
    scalp.position.set(0, headY + 0.02, -0.01)
    g.add(scalp)
    for (const side of [-1, 1] as const) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), hair)
      bun.position.set(side * 0.08, headY + 0.1, -0.02)
      g.add(bun)
    }
    const bang = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), hair)
    bang.scale.set(1.3, 0.4, 0.65)
    bang.position.set(0, headY + 0.04, 0.07)
    g.add(bang)
  }

  if (role === 'fisherman' && rng() > 0.35) {
    const pole = hqPost(0.018, 0.022, 1.35, P.woodMid, 0.26, 0.9, 0, 8)
    pole.rotation.z = -0.55
    pole.userData.harborGear = true
    g.add(pole)
  }
  if (role === 'scholar' && rng() > 0.4) {
    const scroll = hqPost(0.035, 0.035, 0.26, P.trimIvory, 0.2, 0.7, 0.1, 8)
    scroll.rotation.z = Math.PI / 2
    scroll.userData.harborGear = true
    g.add(scroll)
  }

  g.scale.setScalar(scale)
  g.userData.npc = role
  g.userData.npcGender = gender
  g.userData.characterStyle = 'anime-dressup-glb'
  g.userData.scoutCast = true
  attachHarborContactShadow(g, { radius: 0.34, opacity: 0.28 })
  void attachHarborCastGlb(g, gender, { tint: colors.robe, tintAmount: 0.34 })
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

/** Floating name labels for landmark hosts. */
export const HARBOR_LANDMARK_HOST_LABEL: Record<HarborLandmarkHostId, string> = {
  'save-shack': 'Yun · Save Keeper',
  outfitter: 'Mei Lin · Outfitter',
  bank: 'Jin · Banker',
  arena: 'Arena Master',
  barber: 'Wei · Barber',
}

/** Canon gender mix — unique attractive female/male hosts (Higgsfield cast). */
export const HARBOR_LANDMARK_HOST_GENDER: Record<HarborLandmarkHostId, 'female' | 'male'> = {
  'save-shack': 'female',
  outfitter: 'female',
  bank: 'male',
  arena: 'male',
  barber: 'male',
}

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
  ring.userData.harborGear = true
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
  halo.userData.harborGear = true
  halo.userData.glowBaseIntensity = weather === 'night' ? 1.2 : 0.7
  npc.add(halo)

  const light = new THREE.PointLight(
    tint,
    weather === 'night' ? 1.75 : weather === 'sunny' ? 0.62 : 1.05,
    weather === 'night' ? 7.2 : 5.8,
    2,
  )
  light.position.set(0, 1.15, 0.15)
  light.userData.harborLanternLight = true
  light.userData.baseIntensity = light.intensity
  light.userData.baseDistance = light.distance
  light.userData.specialHostLight = true
  npc.add(light)
}

/** Golden glowing floppy disk — Save Shack prop. */
function glowingFloppyDisk() {
  const g = new THREE.Group()
  g.name = 'floppy-disk'
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.02, 0.22),
    glowMat(0xd4a020, 0xffc050, 0.55),
  )
  shell.scale.set(1, 1, 1)
  g.add(shell)
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.015, 0.2),
    glowMat(0xffe080, 0xffc020, 1.15),
  )
  face.position.y = 0.012
  g.add(face)
  const slot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.02, 10), hqMat(0x1a2830))
  slot.rotation.x = Math.PI / 2
  slot.position.set(0, 0.02, 0.02)
  g.add(slot)
  const chip = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), glowMat(0xfff0a0, 0xffe080, 0.8))
  chip.scale.set(1, 0.4, 1)
  chip.position.set(-0.05, 0.022, -0.06)
  g.add(chip)
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
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), hqMat(0x6a4428))
  sack.scale.set(1.1, 0.95, 1.0)
  sack.position.y = 0.1
  g.add(sack)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.06, 10), hqMat(0x8a5a30))
  neck.position.y = 0.2
  g.add(neck)
  // Drawstring
  g.add(hqPost(0.015, 0.018, 0.08, 0xd4a040, 0, 0.24, 0, 8))
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
 * Landmark host figure — anime dress-up body + unique kit per building.
 * Named cast (Mei Lin / Wei / Yun / Jin / Arena Master) — original OCs;
 * appeal north star: Maple / Genshin / Where Winds Meet / BDO / ESO beauty.
 */
const LANDMARK_HOST_GENDER = HARBOR_LANDMARK_HOST_GENDER

function landmarkHostNpc(id: HarborLandmarkHostId, weather: HarborWeather) {
  const g = new THREE.Group()
  g.name = `landmark-host-${id}`
  g.userData.npc = id
  g.userData.landmarkHost = id
  g.userData.specialNpc = true
  g.userData.characterStyle = 'anime-dressup-glb'
  g.userData.npcGender = LANDMARK_HOST_GENDER[id]
  g.userData.scoutCast = true

  const female = LANDMARK_HOST_GENDER[id] === 'female'
  const skin = harborFigureMat(P.skin)
  const hair = harborFigureMat(P.hair)
  const shoes = harborFigureMat(P.woodDark)

  const robeHex =
    id === 'save-shack'
      ? 0x1e5a58
      : id === 'bank'
        ? 0x1e2430
        : id === 'outfitter'
          ? 0xc04068
          : id === 'barber'
            ? 0xf2efe8
            : 0x8a1828
  const pantsHex =
    id === 'outfitter' ? 0x3a2030 : id === 'barber' ? 0x1a2830 : id === 'arena' ? 0x1a1018 : 0x1a3a38
  const cloth = harborFigureMat(robeHex)
  const pantsMat = harborFigureMat(pantsHex)

  const bodyScale = id === 'arena' ? 1.12 : female ? 0.98 : 1.02
  for (const side of [-1, 1] as const) {
    g.add(harborFigureLegStanding(pantsMat, shoes, side, female ? 0.078 : 0.09))
  }

  const torsoH = HARBOR_FIGURE_PROPORTIONS.torsoH + (id === 'arena' ? 0.06 : 0.02)
  const pelvisY = 0.72
  const shoulder = female ? 0.138 : id === 'arena' ? 0.175 : 0.158
  const waist = female ? 0.1 : id === 'arena' ? 0.13 : 0.118
  g.add(
    harborFigureTorso(cloth, pelvisY + torsoH / 2, {
      shoulder,
      waist,
      h: torsoH,
      depth: female ? 0.14 : 0.17,
    }),
  )

  // Soft role sash / trim (anime volumes — not box belts)
  const trim =
    id === 'save-shack'
      ? P.trimGold
      : id === 'bank'
        ? P.trimGold
        : id === 'outfitter'
          ? 0xf0e0c8
          : id === 'barber'
            ? 0xc02838
            : 0xd4a040
  const sash = new THREE.Mesh(
    new THREE.CylinderGeometry(female ? 0.135 : 0.155, female ? 0.13 : 0.15, 0.045, 14),
    harborFigureMat(trim),
  )
  sash.scale.z = 0.85
  sash.position.set(0, pelvisY + 0.04, 0.02)
  g.add(sash)

  if (id === 'outfitter') {
    for (const y of [pelvisY + 0.12, pelvisY + 0.22, pelvisY + 0.32] as const) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.145, 0.14, 0.03, 14),
        harborFigureMat(0xf0e0c8),
      )
      band.scale.z = 0.88
      band.position.set(0, y, 0.01)
      g.add(band)
    }
  }
  if (id === 'barber') {
    for (const [y, c] of [
      [pelvisY + 0.1, 0xc02838],
      [pelvisY + 0.18, 0xf8f4ec],
      [pelvisY + 0.26, 0x2a58a8],
      [pelvisY + 0.34, 0xf8f4ec],
    ] as const) {
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.145, 0.035, 14),
        harborFigureMat(c),
      )
      stripe.scale.z = 0.88
      stripe.position.set(0, y, 0.02)
      g.add(stripe)
    }
  }
  if (id === 'arena') {
    const pauldron = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.035, 8, 16),
      harborFigureMat(0x1a1018),
    )
    pauldron.rotation.x = Math.PI / 2.2
    pauldron.position.set(0, pelvisY + torsoH * 0.75, 0.06)
    g.add(pauldron)
    const cape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.55, 12),
      harborFigureMat(0x5a1020),
    )
    cape.scale.set(1.6, 1, 0.25)
    cape.position.set(0, pelvisY + 0.28, -0.14)
    g.add(cape)
  }
  if (id === 'bank') {
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.022, 8, 14),
      harborFigureMat(P.jade),
    )
    collar.rotation.x = Math.PI / 2.3
    collar.position.set(0, pelvisY + torsoH * 0.85, 0.04)
    g.add(collar)
  }
  if (id === 'save-shack') {
    const badge = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 8),
      harborFigureMat(0xffe080),
    )
    badge.scale.set(1.2, 0.9, 0.45)
    badge.position.set(0, pelvisY + torsoH * 0.7, 0.12)
    g.add(badge)
  }

  const shoulderY = pelvisY + torsoH * 0.82
  for (const side of [-1, 1] as const) {
    g.add(harborFigureArm(cloth, skin, side, shoulderY, female ? 0.22 : 0.26))
  }

  const headY = pelvisY + torsoH + HARBOR_FIGURE_PROPORTIONS.neckH + HARBOR_FIGURE_PROPORTIONS.headR * 0.55
  g.add(harborFigureHead(skin, headY))
  g.add(harborFigureNeck(skin, headY))
  g.add(harborFigureEars(skin, headY))
  g.add(
    harborFigureFace(skin, headY, {
      showBrows: true,
      showMouth: true,
      eyeStyle: id === 'outfitter' || id === 'save-shack' ? 'bright' : id === 'arena' ? 'almond' : 'round',
      faceStyle: id === 'outfitter' ? 'cheerful' : id === 'arena' ? 'sharp' : 'soft',
      blush: female ? 0xffb0b8 : null,
      brow: id === 'outfitter' ? 0x1a1a22 : undefined,
    }),
  )

  if (id === 'save-shack') {
    const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), hair)
    scalp.scale.set(1.08, 0.82, 1.02)
    scalp.position.set(0, headY + 0.03, -0.01)
    g.add(scalp)
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), hair)
    bun.position.set(0, headY + 0.13, -0.035)
    g.add(bun)
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), harborFigureMat(P.jade))
    pin.position.set(0.04, headY + 0.15, -0.02)
    g.add(pin)
    const disk = glowingFloppyDisk()
    disk.position.set(0.26, pelvisY + 0.35, 0.12)
    disk.rotation.x = -0.4
    disk.rotation.z = 0.35
    disk.userData.harborGear = true
    g.add(disk)
  } else if (id === 'bank') {
    const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), hair)
    scalp.scale.set(1.05, 0.78, 1.0)
    scalp.position.set(0, headY + 0.03, -0.01)
    g.add(scalp)
    const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), hair)
    topknot.position.set(0, headY + 0.14, -0.02)
    g.add(topknot)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10), harborFigureMat(0x12141a))
    cap.scale.set(1, 0.4, 1.05)
    cap.position.set(0, headY + 0.09, 0)
    g.add(cap)
    const queue = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), hair)
    queue.scale.set(0.7, 1.6, 0.7)
    queue.position.set(0, headY + 0.02, -0.14)
    g.add(queue)
    const bag = goldTaelBag()
    bag.position.set(0.28, pelvisY + 0.15, 0.1)
    bag.rotation.y = -0.4
    bag.userData.harborGear = true
    g.add(bag)
  } else if (id === 'outfitter') {
    // Soft scalp under rollers — glamorous landlady silhouette
    const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), hair)
    scalp.scale.set(1.1, 0.75, 1.05)
    scalp.position.set(0, headY + 0.04, -0.01)
    g.add(scalp)
    for (const [x, z] of [
      [-0.09, -0.02],
      [0.09, -0.02],
      [0, 0.05],
      [-0.055, 0.07],
      [0.055, 0.07],
    ] as const) {
      const roller = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 10, 8),
        harborFigureMat(0xf0d0e0),
      )
      roller.scale.set(1.1, 0.85, 1.15)
      roller.position.set(x, headY + 0.13, z)
      g.add(roller)
    }
    const cig = cigaretteWithSmoke()
    cig.position.set(0.28, pelvisY + 0.42, 0.1)
    cig.rotation.z = 0.9
    cig.rotation.x = -0.3
    cig.userData.harborGear = true
    g.add(cig)
  } else if (id === 'barber') {
    const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), hair)
    scalp.scale.set(1.08, 0.8, 1.02)
    scalp.position.set(0, headY + 0.03, -0.01)
    g.add(scalp)
    const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), hair)
    topknot.position.set(0, headY + 0.13, -0.02)
    g.add(topknot)
    g.add(harborFigureForeheadBangs(hair, headY, { clumps: 4 }))
    const comb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.015, 0.14, 8),
      harborFigureMat(0xd4a040),
    )
    comb.position.set(-0.18, pelvisY + 0.38, 0.12)
    comb.rotation.z = 0.25
    g.add(comb)
    const shears = barberScissors()
    shears.position.set(0.28, pelvisY + 0.28, 0.1)
    shears.rotation.z = -0.7
    shears.rotation.x = 0.25
    shears.userData.harborGear = true
    g.add(shears)
  } else {
    // Arena Master — soft helm + horns (face stays visible for beauty)
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), harborFigureMat(0x2a1a20))
    helm.scale.set(1.05, 0.55, 1.1)
    helm.position.set(0, headY + 0.12, 0)
    g.add(helm)
    for (const sx of [-1, 1] as const) {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.24, 10),
        harborFigureMat(0xd4a040),
      )
      horn.position.set(sx * 0.12, headY + 0.26, -0.02)
      horn.rotation.z = sx * 0.55
      g.add(horn)
    }
    g.add(harborFigureForeheadBangs(hair, headY, { clumps: 3 }))
    const halberd = luBuHalberd()
    halberd.position.set(0.36, 0.12, 0.04)
    halberd.userData.harborGear = true
    g.add(halberd)
  }

  g.scale.setScalar(bodyScale)
  attachHarborContactShadow(g, { radius: 0.36, opacity: 0.3 })
  attachSpecialHostGlow(g, LANDMARK_GLOW[id], weather)
  attachDialogueBubble(g, HARBOR_LANDMARK_HOST_LABEL[id])
  void attachHarborCastGlb(g, LANDMARK_HOST_GENDER[id], {
    tint: robeHex,
    tintAmount: 0.4,
  })
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
  // Pace the porch — stay near this building, don't wander the bank.
  stampHarborNpcRoam(host, {
    roam: id === 'arena' ? 1.8 : 1.4,
    faceYaw: -0.35,
  })
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

/**
 * Crested ibis (朱鷶) — pale body, rose wash, crimson face/crest.
 * `soar`: outstretched wings + bird flag for air animation; otherwise folded
 * wings for bank wading (avoids “flying on the grass”).
 */
function crestedIbis(_rng: () => number, soar = false) {
  const g = new THREE.Group()
  g.userData.fauna = 'ibis'
  if (soar) g.userData.bird = true
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
  if (soar) {
    // Outstretched wings for flight
    g.add(hqBox(0.08, 0.04, 0.28, 0xe8b0a8, -0.02, 0.14, 0.16))
    g.add(hqBox(0.08, 0.04, 0.28, 0xe8b0a8, -0.02, 0.14, -0.16))
  } else {
    // Folded against the body while wading
    g.add(hqBox(0.16, 0.06, 0.08, 0xe8b0a8, -0.04, 0.16, 0.05))
    g.add(hqBox(0.16, 0.06, 0.08, 0xe8b0a8, -0.04, 0.16, -0.05))
  }
  // Legs (hidden-ish in soar pose via animation height)
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
  if (HARBOR_V2_MESH_ONLY) {
    mountTintedWillow(g, rng, {
      height: 2.8 + rng() * 1.4,
      name: 'v2-pine-standin',
      tint: P.leafDeep,
      amount: 0.44,
    })
    return g
  }
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
  if (HARBOR_V2_MESH_ONLY) {
    mountTintedWillow(g, rng, {
      height: 2.2 + rng() * 0.9,
      name: 'v2-cherry-standin',
      tint: P.blossom,
      amount: 0.5,
    })
    return g
  }
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
  if (HARBOR_V2_MESH_ONLY) {
    mountTintedWillow(g, rng, {
      height: 2.4 + rng() * 1.0,
      name: 'v2-ginkgo-standin',
      tint: P.leafGold,
      amount: 0.5,
    })
    return g
  }
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
  if (HARBOR_V2_MESH_ONLY) {
    mountTintedWillow(g, rng, {
      height: 3.0 + rng() * 1.2,
      name: 'v2-poplar-standin',
      tint: P.leafLite,
      amount: 0.4,
    })
    return g
  }
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

/** Habitat-style grass kinds along river banks / meadows (re-export). */
export { HARBOR_NATURE_GRASS }
export type { HarborNatureGrass } from './harborGrass'

/** Distant Wulingyuan-style karst backdrop is present in the voyage. */
export const HARBOR_WULINGYUAN = true as const

/** 祥云 auspicious clouds fill the Harbor Quest sky. */
export const HARBOR_XIANGYUN = true as const

function bridge() {
  const g = new THREE.Group()
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'bridge-arch', {
      targetHeight: 1.7,
      name: 'v2-bridge',
      rotationY: Math.PI / 2,
    })
    return g
  }
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
  if (HARBOR_V2_MESH_ONLY) {
    mountHarborCanoeHull(g, boatId, { color: hull, name: 'v2-canoe-hull' })
    if (item.id === 'boat-dragon' || item.id === 'boat-pearl' || item.id === 'boat-imperial') {
      attachVipBoatOrnaments(g, item.id)
      mountHarborPaperLantern(g, {
        color: trim,
        targetHeight: 0.22,
        name: 'v2-vip-prow-lantern',
        position: [0.85, 0.42, 0],
      })
    }
    return g
  }
  const id = item.id
  const wood = hqWoodTexture()
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

  // Soft anime hull — tapered cylinder (not a box barge)
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.32, width * 0.42, length * 0.92, 18),
    hqMatTex(hull, wood),
  )
  shell.rotation.z = Math.PI / 2
  shell.scale.set(1, height / (width * 0.38), 1)
  shell.position.y = 0.2
  g.add(shell)
  // Pointed prow / stern soft cones
  for (const sx of [-1, 1] as const) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(width * 0.28, length * 0.22, 12), hqMatTex(P.woodDark, wood))
    tip.rotation.z = sx * Math.PI / 2
    tip.position.set(sx * length * 0.48, 0.22, 0)
    tip.scale.set(1, height / (width * 0.35), 1.05)
    g.add(tip)
  }
  // Soft gunwales
  for (const z of [width * 0.42, -width * 0.42] as const) {
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, length * 0.88, 10),
      hqMatTex(P.woodLight, wood),
    )
    rail.rotation.z = Math.PI / 2
    rail.position.set(0, 0.38, z)
    g.add(rail)
  }
  // Soft thwart seat
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, width * 0.55, 12), hqMatTex(P.woodDark, wood))
  seat.rotation.x = Math.PI / 2
  seat.position.set(0, 0.36, 0)
  g.add(seat)
  // Keel strip
  const keel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, length * 0.85, 8),
    hqMat(P.woodDeep),
  )
  keel.rotation.z = Math.PI / 2
  keel.position.y = 0.06
  g.add(keel)

  const mastH =
    id.includes('imperial') || id.includes('pearl') ? 1.35 : id.includes('junk') || id.includes('merchant') ? 1.2 : 1.05
  g.add(hqPost(0.035, 0.045, mastH, P.woodDeep, 0.12, 0.9, 0, 8))
  g.add(hqBox(0.08, 0.06, 0.08, P.woodLight, 0.12, 0.9 + mastH * 0.48, 0))
  const yard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.55, 8),
    hqMatTex(P.woodMid, wood),
  )
  yard.rotation.x = Math.PI / 2
  yard.position.set(0.12, 0.9 + mastH * 0.2, 0)
  g.add(yard)

  const sailW = id.includes('barge') || id.includes('imperial') ? 0.95 : 0.7
  const sailH = id.includes('junk') || id.includes('merchant') ? 1.05 : 0.85
  // Soft curved anime sail — billowed sphere shell
  const sail = new THREE.Mesh(
    new THREE.SphereGeometry(sailW * 0.55, 14, 10, 0, Math.PI),
    hqMat(trim),
  )
  sail.scale.set(1, sailH / (sailW * 0.9), 0.35)
  sail.rotation.y = Math.PI / 2
  sail.position.set(0.12, 0.95 + (mastH - 1.05) * 0.35, 0.02)
  g.add(sail)
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.018, sailW * 0.95, 8),
    hqMat(P.woodDark),
  )
  boom.rotation.z = Math.PI / 2
  boom.position.set(0.12, 0.95 + (mastH - 1.05) * 0.35 - sailH * 0.45, 0.03)
  g.add(boom)

  if (id === 'boat-dragon' || id === 'boat-imperial') {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), hqMatTex(trim, wood))
    head.scale.set(1.4, 0.85, 0.9)
    head.position.set(length * 0.55, 0.5, 0)
    g.add(head)
    g.add(hqBox(0.18, 0.12, 0.12, P.trimGold, length * 0.62, 0.68, 0))
  }
  if (id === 'boat-pearl' || id === 'boat-imperial') {
    g.add(hqAnimeHipRoof(0.9, width * 0.85, 0.7, trim, { pitch: 0.28, overhang: 0.08 }))
    g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, -0.45, 0.7, width * 0.28, 8))
    g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, -0.45, 0.7, -width * 0.28, 8))
    g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, 0.2, 0.7, width * 0.28, 8))
    g.add(hqPost(0.04, 0.05, 0.55, P.woodDeep, 0.2, 0.7, -width * 0.28, 8))
  }
  if (id === 'boat-bamboo') {
    for (const x of [-0.6, -0.2, 0.2, 0.6] as const) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(width * 0.38, 0.025, 6, 14),
        hqMatTex(trim, wood),
      )
      band.rotation.y = Math.PI / 2
      band.position.set(x, 0.28, 0)
      g.add(band)
    }
  }
  if (id === 'boat-reed') {
    const thatch = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.4, width * 0.42, length * 0.75, 12),
      hqMatTex(trim, hqSoftThatchTexture()),
    )
    thatch.rotation.z = Math.PI / 2
    thatch.scale.y = 0.15
    thatch.position.y = 0.34
    g.add(thatch)
  }
  if (id === 'boat-junk' || id === 'boat-merchant') {
    const cabin = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.28, width * 0.32, 0.5, 12),
      hqMatTex(hull, wood),
    )
    cabin.rotation.z = Math.PI / 2
    cabin.scale.y = 0.7
    cabin.position.set(-length * 0.28, 0.52, 0)
    g.add(cabin)
    g.add(hqAnimeHipRoof(0.55, width * 0.7, 0.7, P.woodDeep, { pitch: 0.22, overhang: 0.06 }))
    g.add(hqWindow(0.16, 0.14, P.trimGold, P.glass, -length * 0.28, 0.58, width * 0.36))
  }
  if (id === 'boat-jade') {
    for (const z of [width * 0.48, -width * 0.48] as const) {
      const jadeRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.025, length * 0.85, 8),
        hqMat(trim),
      )
      jadeRail.rotation.z = Math.PI / 2
      jadeRail.position.set(0, 0.44, z)
      g.add(jadeRail)
    }
  }
  if (id === 'boat-sampan' || id === 'boat-scholar') {
    const bench = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, width * 0.5, 10),
      hqMatTex(P.woodMid, wood),
    )
    bench.rotation.x = Math.PI / 2
    bench.position.set(-length * 0.2, 0.46, 0)
    g.add(bench)
  }
  if (id === 'boat-dragon' || id === 'boat-pearl' || id === 'boat-imperial') {
    attachVipBoatOrnaments(g, id)
  } else {
    enrichBoatHull(g, item, { length, width })
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
  you.position.set(0, HARBOR_CANOE_SCOUT_SEAT_Y, -0.05)
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
    const x = side * (36 + rng() * 22 + (i % 5) * 1.6)
    const z = (rng() - 0.5) * 110
    pillar.position.set(x, 0.15, z)
    pillar.scale.setScalar(0.9 + rng() * 0.6)
    root.add(pillar)
    // Rocky / grassy foothill mound under each pillar (fills the empty base)
    const grassy = rng() > 0.5
    const mound = new THREE.Mesh(
      new THREE.ConeGeometry(1.6 + rng() * 1.4, 1.1 + rng() * 0.9, 5),
      grassy
        ? softTiledMat(0x5a8a50, hqSoftGrassTexture(), 1.8)
        : hqMatTex(0x6a6860, hqStoneTexture()),
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
    const x = side * (26 + rng() * 8)
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
    ridge.position.set(side * 32, 0.2, 0)
    ridge.userData.foothillRidge = true
    root.add(ridge)
    const ridgeMist = mountainMistVeil(14, 3.2, fogHex)
    ridgeMist.position.set(side * 30, 1.6, 0)
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
  // Lean particle budget — still reads as rain, less CPU on position rewrite
  const count = 400
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
  pts.frustumCulled = true
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
    npc.userData.dockSlot = slot
    // Pier hosts are quest speakers — nametag + Talk cue above their head
    attachDialogueBubble(npc, HARBOR_NPC_ROLE_LABEL[role])
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
  // Culms stay procedural (willow silhouette is a tree, not bamboo). Paint grass.
  if (HARBOR_V2_MESH_ONLY) paintHarborV2Map(g, 'grass', 2.6)
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
  if (HARBOR_V2_MESH_ONLY) paintHarborV2Map(g, 'grass', 1.8)
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

/**
 * Peel a creek / tributary / oxbow inland from the main channel.
 * Chunk-local water so forks stream in/out with the voyage chunks.
 */
function placeSideStream(
  group: THREE.Group,
  chunkIndex: number,
  fork: HarborStreamFork,
  mats: { grass: THREE.Material; sand: THREE.Material },
  weather: HarborWeather,
  rng: () => number,
) {
  const z0 = chunkIndex * CHUNK
  const zMid = z0 + CHUNK * (0.32 + rng() * 0.36)
  const side = fork.side
  const waterTint =
    weather === 'night' ? 0x1a3048 : weather === 'rainy' ? 0x3a6078 : weather === 'cloudy' ? 0x4a8898 : 0x3aa8c8
  const waterMat = mat(waterTint, { transparent: true, opacity: 0.9 })

  if (fork.kind === 'oxbow') {
    // Soft crescent lagoon — rounded water body (WWM wetland read)
    const lagoon = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.6, 0.08, 18),
      waterMat,
    )
    lagoon.scale.set(1.1, 1, 1.55)
    lagoon.position.set(side * (RIVER + 5.2), 0.03, zMid)
    lagoon.rotation.y = side * 0.18
    lagoon.name = 'hq-stream-oxbow'
    lagoon.userData.streamFork = fork.kind
    group.add(lagoon)
    // Soft sand rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.1, 0.1, 16), mats.sand)
    rim.scale.set(1.15, 1, 1.6)
    rim.position.set(side * (RIVER + 5.2), 0.01, zMid)
    rim.rotation.y = side * 0.18
    group.add(rim)
    // Soft mouth channel back to the main river
    const mouth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.85, 3.2, 12),
      waterMat,
    )
    mouth.rotation.z = Math.PI / 2
    mouth.position.set(side * (RIVER + 2.4), 0.025, zMid - side * 2.2)
    mouth.name = 'hq-stream-mouth'
    group.add(mouth)
    if (rng() > 0.35) {
      const reedN = 4 + Math.floor(rng() * 3)
      place(group, rng, reedN, () => reed(rng), RIVER + 3.5, RIVER + 7, z0)
    }
    return
  }

  const length = fork.kind === 'tributary' ? 11 + rng() * 3 : 7 + rng() * 2.5
  const width = fork.kind === 'tributary' ? 2.1 + rng() * 0.4 : 1.15 + rng() * 0.25
  const bend = (rng() - 0.5) * 0.35

  // Main fork ribbon (runs roughly +X inland)
  const channel = new THREE.Mesh(new THREE.BoxGeometry(length, 0.07, width), waterMat)
  channel.position.set(side * (RIVER + 1.2 + length / 2), 0.025, zMid)
  channel.rotation.y = side * bend
  channel.name = fork.kind === 'tributary' ? 'hq-stream-tributary' : 'hq-stream-creek'
  channel.userData.streamFork = fork.kind
  group.add(channel)

  // Optional second bend so tributaries feel like they split again
  if (fork.kind === 'tributary' && rng() > 0.4) {
    const armLen = 4.5 + rng() * 2
    const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.065, width * 0.75), waterMat)
    const armZ = zMid + side * (2.2 + rng() * 1.5)
    arm.position.set(side * (RIVER + 1.2 + length * 0.65 + armLen * 0.35), 0.024, armZ)
    arm.rotation.y = side * (0.55 + rng() * 0.35)
    arm.name = 'hq-stream-branch'
    arm.userData.streamFork = 'creek'
    group.add(arm)
    const armSand = new THREE.Mesh(new THREE.BoxGeometry(armLen + 0.6, 0.1, width * 0.75 + 0.7), mats.sand)
    armSand.position.copy(arm.position)
    armSand.position.y = 0.01
    armSand.rotation.y = arm.rotation.y
    group.add(armSand)
  }

  // Sand banks flanking the channel
  const sandL = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, 0.1, 0.55), mats.sand)
  sandL.position.set(side * (RIVER + 1.2 + length / 2), 0.015, zMid + width * 0.55)
  sandL.rotation.y = side * bend
  group.add(sandL)
  const sandR = sandL.clone()
  sandR.position.z = zMid - width * 0.55
  group.add(sandR)

  // Small footbridge over the creek near the mouth
  if (fork.kind === 'creek' || rng() > 0.45) {
    const wood = hqWoodTexture()
    const plank = hqBoxTex(width + 0.8, 0.08, 0.55, P.woodMid, wood, side * (RIVER + 2.6), 0.22, zMid)
    plank.name = 'hq-stream-bridge'
    group.add(plank)
    group.add(hqPost(0.04, 0.05, 0.4, P.woodDark, side * (RIVER + 2.6), 0.12, zMid + width * 0.4, 5))
    group.add(hqPost(0.04, 0.05, 0.4, P.woodDark, side * (RIVER + 2.6), 0.12, zMid - width * 0.4, 5))
  }

  // Reed fringe + a rock at the mouth
  place(group, rng, fork.kind === 'tributary' ? 5 : 3, () => reed(rng), RIVER + 1.5, RIVER + 4.5, z0)
  if (rng() > 0.4) place(group, rng, 1, () => rock(rng), RIVER + 1.8, RIVER + 3.5, z0)
}

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
  const fork = realm === 'guan' ? null : streamForkForChunk(chunkIndex)
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
    const forkOnSide = fork && fork.side === side
    // Near bank (river edge) — split when a stream mouth cuts through
    if (forkOnSide) {
      const gap = 2.8
      const half = (CHUNK - gap) / 2
      const bankA = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, half), mats.grass)
      bankA.position.set(side * (BANK + 2.2), -0.05, z0 + half / 2)
      group.add(bankA)
      const bankB = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, half), mats.grass)
      bankB.position.set(side * (BANK + 2.2), -0.05, z0 + CHUNK - half / 2)
      group.add(bankB)
    } else {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, CHUNK + 0.2), mats.grass)
      bank.position.set(side * (BANK + 2.2), -0.05, z0 + CHUNK / 2)
      group.add(bank)
    }
    // Staggered inland shelves — scalloped pads (WWM layered land, not one slab)
    const pads = 3
    for (let i = 0; i < pads; i++) {
      const padLen = CHUNK / pads
      const scallop = i % 2 === 0 ? 0.7 : -0.55
      const inland = new THREE.Mesh(
        new THREE.BoxGeometry(15 + (i % 2) * 0.9, 0.32, padLen + 0.2),
        mats.grass,
      )
      inland.position.set(side * (BANK + 12.5 + scallop), -0.06, z0 + padLen * (i + 0.5))
      inland.userData.inlandShelf = true
      group.add(inland)
      const terrace = new THREE.Mesh(
        new THREE.BoxGeometry(9 + (i % 2) * 0.7, 0.45, padLen + 0.15),
        mats.grass,
      )
      terrace.position.set(side * (BANK + 19.5 + scallop * 0.6), 0.05 + i * 0.02, z0 + padLen * (i + 0.5))
      terrace.userData.terraceShelf = true
      group.add(terrace)
      const foothill = new THREE.Mesh(
        new THREE.BoxGeometry(12 + (i % 2) * 0.8, 0.9 + i * 0.08, padLen + 0.15),
        mats.grass,
      )
      foothill.position.set(side * (BANK + 28.5 + scallop * 0.4), 0.22 + i * 0.04, z0 + padLen * (i + 0.5))
      foothill.userData.foothillShelf = true
      group.add(foothill)
    }
    // Valley mist between bank → terrace → foothill (layered depth read)
    const fogHex = HARBOR_WEATHER_LOOK[weather].fog
    const mistLow = valleyMistRibbon(4.5, CHUNK * 0.92, fogHex)
    mistLow.position.set(side * (BANK + 15.5), 0.35, z0 + CHUNK / 2)
    group.add(mistLow)
    const mistHigh = valleyMistRibbon(5.5, CHUNK * 0.9, fogHex)
    mistHigh.position.set(side * (BANK + 24.5), 0.7, z0 + CHUNK / 2)
    group.add(mistHigh)
    const shore = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, CHUNK + 0.2), mats.sand)
    shore.position.set(side * (RIVER + 1.1), 0.02, z0 + CHUNK / 2)
    group.add(shore)
  }

  // Branching streams / oxbows — break the straight corridor silhouette
  if (fork) {
    placeSideStream(group, chunkIndex, fork, mats, weather, rng)
  }

  // Dirt / stone roads, cross-paths, and Chinese road signs
  placeDirtRoads(group, chunkIndex, rng, weather)

  // Scenic pavilions + terrace plazas (Where Winds Meet vista language)
  placeScenicMapFeatures(group, chunkIndex, rng, biome)

  // River fishing buoys in this chunk's Z span
  placeRiverFishSpots(group, chunkIndex)

  // Quiz pier landings (every chunk may host one or more dock slots)
  placeDockStops(group, chunkIndex, rng)

  if (biome === 'forest' || biome === 'hills') {
    place(group, rng, 5, () => tree(rng, leaf), BANK - 0.2, BANK + 9, z0)
    place(group, rng, 3, () => tree(rng, leaf), BANK + 10, BANK + 18, z0)
    place(group, rng, 4, () => pine(rng), BANK, BANK + 10, z0)
    place(group, rng, 2, () => pine(rng), BANK + 12, BANK + 20, z0)
    place(group, rng, 3, () => poplar(rng), BANK - 0.3, BANK + 3.5, z0)
    place(group, rng, 2, () => ginkgo(rng), BANK + 0.5, BANK + 4.5, z0)
    place(group, rng, 5, () => rock(rng), BANK - 0.5, BANK + 3, z0)
    place(group, rng, 5, () => flower(rng), BANK - 0.3, BANK + 2.5, z0)
    // Habitat-style grass underfoot along banks + inland meadow beds
    place(group, rng, 10, () => hqGrassTuft(rng), BANK - 0.4, BANK + 6, z0)
    place(group, rng, 6, () => hqGrassTuft(rng), BANK + 8, BANK + 18, z0)
    place(group, rng, 3, () => hqHabitatTallGrass(rng), BANK + 1.5, BANK + 8, z0)
    place(group, rng, 2, () => hqTallGrassClump(rng), BANK + 0.5, BANK + 4, z0)
    place(group, rng, 2, () => hawthornBush(rng), BANK + 0.5, BANK + 4.5, z0)
    place(group, rng, 2, () => chineseFringeFlower(rng), BANK + 1, BANK + 5.5, z0)
    if (rng() > 0.55) place(group, rng, 1, () => chinaTeaCupRose(rng), BANK + 0.2, BANK + 2.8, z0)
    if (rng() > 0.4) place(group, rng, 1, () => deer(rng), BANK + 0.5, BANK + 3.5, z0)
    // China-native ambient fauna
    if (rng() > 0.45) place(group, rng, 1, () => panda(rng), BANK + 1.5, BANK + 5.5, z0)
    if (biome === 'hills' && rng() > 0.62) place(group, rng, 1, () => southChinaTiger(rng), BANK + 2.5, BANK + 7, z0)
    else if (rng() > 0.78) place(group, rng, 1, () => southChinaTiger(rng), BANK + 3, BANK + 8, z0)
    place(group, rng, 2, () => lantern(weather), BANK + 0.2, BANK + 1.8, z0)
  }
  if (biome === 'village') {
    place(group, rng, 3, () => house(rng), BANK + 0.5, BANK + 8, z0)
    place(group, rng, 2, () => hut(rng), BANK + 1, BANK + 4.5, z0)
    place(group, rng, 1, () => courtyardWing(rng), BANK + 6, BANK + 12, z0)
    place(group, rng, 1, () => house(rng), BANK + 9, BANK + 16, z0)
    place(group, rng, 1, () => stiltShop(rng), BANK - 0.2, BANK + 1.8, z0)
    place(group, rng, 2, () => tree(rng, leaf), BANK + 2, BANK + 5, z0)
    place(group, rng, 3, () => cherryBlossom(rng), BANK - 0.2, BANK + 3.5, z0)
    place(group, rng, 1, () => ginkgo(rng), BANK + 1.5, BANK + 4, z0)
    place(group, rng, 3, () => lantern(weather), BANK - 0.2, BANK + 1.4, z0)
    place(group, rng, 4, () => flower(rng), BANK - 0.4, BANK + 2, z0)
    // Yard grass + a few Habitat tall-grass soil beds
    place(group, rng, 8, () => hqGrassTuft(rng), BANK - 0.4, BANK + 5, z0)
    place(group, rng, 2, () => hqHabitatTallGrass(rng), BANK + 1, BANK + 6, z0)
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
    // Yard / path clutter — crates, barrels, fence bits
    hqStampClutter(group, rng, BANK + 2.5, z0 + CHUNK * 0.45, 3.5, 4)
    hqStampClutter(group, rng, -(BANK + 2.5), z0 + CHUNK * 0.55, 3.5, 3)
    // Sit-able yard chairs facing the lane / river
    hqStampChairs(group, [
      { x: BANK + 1.8, z: z0 + CHUNK * 0.4, yaw: -Math.PI / 2 },
      { x: BANK + 2.4, z: z0 + CHUNK * 0.62, yaw: -Math.PI * 0.4, stool: true },
      { x: -(BANK + 1.8), z: z0 + CHUNK * 0.48, yaw: Math.PI / 2 },
      { x: -(BANK + 2.2), z: z0 + CHUNK * 0.7, yaw: Math.PI * 0.55, stool: rng() > 0.5 },
      // Terrace overlook seats — relax / chat with river view
      { x: BANK + 18.5, z: z0 + CHUNK * 0.42, yaw: -Math.PI / 2 },
      { x: -(BANK + 18.5), z: z0 + CHUNK * 0.58, yaw: Math.PI / 2, stool: true },
      { x: BANK + 22.0, z: z0 + CHUNK * 0.55, yaw: -Math.PI * 0.45, stool: true },
      { x: -(BANK + 22.0), z: z0 + CHUNK * 0.35, yaw: Math.PI * 0.55 },
    ], rng)
  }
  if (biome === 'reeds') {
    place(group, rng, 12, () => reed(rng), RIVER + 0.4, BANK + 1.5, z0)
    place(group, rng, 8, () => hqGrassTuft(rng), RIVER + 0.8, BANK + 3, z0)
    place(group, rng, 4, () => hqTallGrassClump(rng), BANK - 0.2, BANK + 2.5, z0)
    place(group, rng, 2, () => hqHabitatTallGrass(rng), BANK + 0.5, BANK + 4, z0)
    place(group, rng, 3, () => rock(rng), BANK, BANK + 2, z0)
    place(group, rng, 3, () => poplar(rng), BANK + 0.5, BANK + 3.5, z0)
    place(group, rng, 1, () => tree(rng, 0x4a7a40), BANK + 1, BANK + 4, z0)
    place(group, rng, 3, () => flower(rng), BANK - 0.2, BANK + 1.8, z0)
    place(group, rng, 2, () => lantern(weather), BANK - 0.3, BANK + 1.0, z0)
  
    // Waterline fauna — giant salamanders + crested ibis
    if (rng() > 0.35) place(group, rng, 1, () => giantSalamander(rng), RIVER + 0.6, BANK + 0.8, z0)
    if (rng() > 0.4) {
      const nIbis = 1 + Math.floor(rng() * 2)
      for (let i = 0; i < nIbis; i++) {
        const soar = rng() > 0.55
        const ibis = crestedIbis(rng, soar)
        const side = rng() > 0.5 ? 1 : -1
        ibis.position.set(
          side * (RIVER + 0.8 + rng() * 1.6),
          soar ? 2.2 + rng() * 1.2 : 0.05,
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

    if (rng() > 0.4) place(group, rng, 1, () => crestedIbis(rng, false), RIVER + 1.0, BANK + 1.8, z0)
    hqStampClutter(group, rng, BANK + 2, z0 + CHUNK * 0.5, 3.2, 5)
    hqStampClutter(group, rng, -(BANK + 2), z0 + CHUNK * 0.6, 3.2, 4)
    hqStampChairs(group, [
      { x: BANK + 1.2, z: z0 + CHUNK * 0.38, yaw: -Math.PI / 2 },
      { x: BANK + 1.5, z: z0 + CHUNK * 0.72, yaw: -Math.PI * 0.45, stool: true },
      { x: -(BANK + 1.2), z: z0 + CHUNK * 0.42, yaw: Math.PI / 2 },
      { x: -(BANK + 1.6), z: z0 + CHUNK * 0.68, yaw: Math.PI * 0.5 },
    ], rng)
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
  // Crested ibis — wading on the bank, or soaring overhead (never “flying” on grass)
  if (rng() > 0.55) {
    const soar = rng() > 0.45
    const ibis = crestedIbis(rng, soar)
    const side = rng() > 0.5 ? 1 : -1
    ibis.position.set(
      side * (RIVER + 0.9 + rng() * 1.4),
      soar ? 2.3 + rng() * 1.1 : 0.05,
      z0 + 3 + rng() * (CHUNK - 6),
    )
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

  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'save-shack', {
      targetHeight: 2.75,
      name: 'v2-save-shack',
    })
    // Keep the golden portal tip so Save still reads as interactive.
    const portal = new THREE.Group()
    portal.name = 'save-portal'
    portal.userData.goldenPortal = true
    portal.position.set(0, 0.55, 2.85)
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
  // Soft anime gold hip roof (Save vault)
  g.add(hqAnimeHipRoof(1.7, 1.7, 1.55, 0xd4a040, { pitch: 0.42, overhang: 0.22, ridgeColor: 0xffc050 }))
  g.add(hqPost(0.06, 0.08, 0.35, P.trimGold, 0, 2.2, 0.2, 8))
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

  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'outfitter', {
      targetHeight: 2.55,
      name: 'v2-outfitter',
    })
    // Keep a soft approach plank + warm lanterns for night readability.
    g.add(hqBox(1.2, 0.1, 1.6, P.woodMid, 0, 0.12, 1.35))
    for (const x of [-0.65, 0.65] as const) {
      const light = new THREE.PointLight(0xffa050, harborLanternIntensity(weather) * 0.85, 6.5, 2)
      light.position.set(x, 1.7, 0.9)
      light.userData.harborLanternLight = true
      light.userData.baseIntensity = light.intensity
      g.add(light)
    }
    attachLandmarkHost(g, 'outfitter', weather)
    return g
  }

  // Wide raised deck
  for (const x of [-0.9, 0, 0.9] as const) {
    for (const z of [-0.55, 0.55] as const) {
      g.add(hqPost(0.07, 0.09, 0.7, P.woodDark, x, 0.35, z, 5))
    }
  }
  g.add(hqBox(2.4, 0.12, 1.8, P.woodLight, 0, 0.7, 0))
  // Cream shop body
  g.add(hqBox(2.1, 1.05, 1.45, 0xf2e6d0, 0, 1.28, -0.05))
  // Soft anime crimson hip roof + gold ridge
  g.add(hqAnimeHipRoof(2.1, 1.45, 1.8, 0x9a2038, { pitch: 0.4, overhang: 0.24, ridgeColor: P.trimGold }))
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
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.42, 12), hqMat(c))
    robe.position.set(-0.55 + i * 0.28, 1.28, 0.55)
    robe.scale.z = 0.55
    g.add(robe)
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
      new THREE.CylinderGeometry(0.1, 0.11, 0.24, 12),
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

  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'save-shack', {
      targetHeight: 2.7,
      name: 'v2-bank',
      onReady: (mesh) => tintHarborV2Asset(mesh, 0x2a8a78, 0.48),
    })
    g.add(hqBox(1.1, 0.1, 1.4, P.stone, 0, 0.12, 1.7))
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
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.065, 6, 14),
      glowMat(0x3dcfb6, 0x70ffe0, weather === 'night' ? 1.5 : 1.05),
    )
    ring.position.set(0, 0.85, 0.05)
    portal.add(ring)
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
    attachLandmarkHost(g, 'bank', weather)
    return g
  }

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
  // Soft anime jade hip roof (Bank vault)
  g.add(hqAnimeHipRoof(1.9, 1.7, 1.75, 0x2a8a78, { pitch: 0.4, overhang: 0.22, ridgeColor: P.jade }))
  g.add(hqPost(0.07, 0.09, 0.3, P.jade, 0, 2.45, 0.15, 8))
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

  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'house-village', {
      targetHeight: 2.65,
      name: 'v2-arena',
      onReady: (mesh) => tintHarborV2Asset(mesh, 0x8b2e2e, 0.52),
    })
    g.add(hqBox(1.15, 0.1, 1.5, P.woodMid, 0, 0.12, 1.55))
    const portal = new THREE.Group()
    portal.name = 'arena-portal'
    portal.userData.arenaPortal = true
    portal.userData.amberPortal = true
    portal.position.set(0, 0.48, 2.15)
    for (const x of [-0.5, 0.5] as const) {
      portal.add(hqPost(0.08, 0.1, 1.5, 0x3a1515, x, 0.75, 0, 6))
    }
    portal.add(hqBox(1.2, 0.12, 0.12, P.trimGold, 0, 1.55, 0))
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.07, 6, 14),
      glowMat(0xf0d080, 0xffa020, weather === 'night' ? 1.5 : 1.1),
    )
    ring.position.set(0, 0.82, 0.05)
    portal.add(ring)
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
    attachLandmarkHost(g, 'arena', weather)
    return g
  }

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
  // Soft anime crimson arena hip roof
  g.add(hqAnimeHipRoof(2.0, 1.65, 1.7, 0x8b2e2e, { pitch: 0.44, overhang: 0.24, ridgeColor: P.trimGold }))
  g.add(hqPost(0.07, 0.09, 0.32, P.trimGold, 0, 2.4, 0.05, 8))
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

  if (HARBOR_V2_MESH_ONLY) {
    mountHarborV2Asset(g, 'house-village', {
      targetHeight: 2.45,
      name: 'v2-barber',
      onReady: (mesh) => tintHarborV2Asset(mesh, 0xa83858, 0.45),
    })
    const pole = spinningBarberPole(weather)
    pole.position.set(1.15, 0.45, 1.15)
    g.add(pole)
    g.add(hqBox(1.15, 0.1, 1.45, P.woodMid, 0, 0.12, 1.5))
    const portal = new THREE.Group()
    portal.name = 'barber-portal'
    portal.userData.barberPortal = true
    portal.userData.rosePortal = true
    portal.position.set(0, 0.48, 2.05)
    for (const x of [-0.5, 0.5] as const) {
      portal.add(hqPost(0.08, 0.1, 1.5, 0x3a1518, x, 0.75, 0, 6))
    }
    portal.add(hqBox(1.2, 0.12, 0.12, 0xff7090, 0, 1.55, 0))
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.07, 6, 14),
      glowMat(0xff90a8, 0xff4060, weather === 'night' ? 1.5 : 1.1),
    )
    ring.position.set(0, 0.82, 0.05)
    portal.add(ring)
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
    attachLandmarkHost(g, 'barber', weather)
    return g
  }

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
  // Soft anime rose hip roof (Barber)
  g.add(hqAnimeHipRoof(1.85, 1.55, 1.6, 0xa83858, { pitch: 0.4, overhang: 0.22, ridgeColor: 0xd4a040 }))
  g.add(hqPost(0.06, 0.08, 0.28, 0xd4a040, 0, 2.3, 0.05, 8))
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

function nearestVisitable(
  x: number,
  z: number,
  realm: HarborRealmId = 'river',
): HarborVisitableId | null {
  // Guan paradise — Customs, Cape Loom, Fishing Lodge, fishing spots.
  if (realm === 'guan') {
    const dCustoms = Math.hypot(GUAN_RETURN_PORTAL.x - x, GUAN_RETURN_PORTAL.z - z)
    if (dCustoms < GUAN_RETURN_PORTAL.radius) return GUAN_RETURN_PORTAL.id
    const dLoom = Math.hypot(GUAN_CAPE_LOOM.x - x, GUAN_CAPE_LOOM.z - z)
    if (dLoom < GUAN_CAPE_LOOM.radius) return GUAN_CAPE_LOOM.id
    const dHut = Math.hypot(GUAN_FISHING_HUT.x - x, GUAN_FISHING_HUT.z - z)
    if (dHut < GUAN_FISHING_HUT.radius) return GUAN_FISHING_HUT.id
    const spot = nearestGuanFishSpot(x, z, 1.8)
    if (spot) return 'fishing-spot'
    return null
  }
  const riverSpot = nearestRiverFishSpot(x, z, 2.0)
  if (riverSpot) return 'fishing-spot'
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

/** Walk hit parents for a talkable NPC / speech bubble / landmark host. */
function dialogueTapFromObject(obj: THREE.Object3D): HarborDialogueTap | null {
  let cur: THREE.Object3D | null = obj
  while (cur) {
    const landmark = cur.userData.landmarkHost as HarborVisitableId | undefined
    if (landmark) return { kind: 'landmark', id: landmark }
    const dockSlot = cur.userData.dockSlot as number | undefined
    if (cur.userData.hasDialogue && typeof dockSlot === 'number') {
      const role = (cur.userData.npc as HarborNpcRole | undefined) ?? 'ferryman'
      return { kind: 'quest', dockSlot, role }
    }
    cur = cur.parent
  }
  return null
}

export function createHarborWorld(
  canvas: HTMLCanvasElement,
  options: HarborWorldOptions = {},
): HarborWorldHandle {
  let hue: HarborHue = options.hue ?? 'harbor'
  let reduced = Boolean(options.reducedMotion)
  let progress = Math.min(1, Math.max(0, options.progress ?? 0))
  const realm: HarborRealmId = options.realm ?? 'river'
  const isGuan = realm === 'guan'
  /** Terrace / bank height under walking scouts (0 on flat river banks). */
  const groundYAt = (x: number, z: number) => (isGuan ? guanGroundY(x, z) : 0)
  let flash: 'ok' | 'no' | null = null
  let flashUntil = 0
  let disposed = false
  let paused = false
  // Guan Harbor always forces sunny tropical daylight.
  const weather: HarborWeather = isGuan ? 'sunny' : (options.weather ?? pickHarborWeather())
  const baseLook = HARBOR_WEATHER_LOOK[weather]
  const look = isGuan
    ? {
        ...baseLook,
        sky: GUAN_TROPICAL_LOOK.sky,
        fog: GUAN_TROPICAL_LOOK.fog,
        fogDensity: GUAN_TROPICAL_LOOK.fogDensity,
        amb: GUAN_TROPICAL_LOOK.amb,
        ambI: GUAN_TROPICAL_LOOK.ambI,
        sun: GUAN_TROPICAL_LOOK.sun,
        sunI: GUAN_TROPICAL_LOOK.sunI,
        hemiSky: GUAN_TROPICAL_LOOK.hemiSky,
        hemiGround: GUAN_TROPICAL_LOOK.hemiGround,
        hemiI: GUAN_TROPICAL_LOOK.hemiI,
        rain: false,
        stars: false,
      }
    : baseLook

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  // Allow restore instead of a dead black canvas after a GPU reset.
  canvas.addEventListener(
    'webglcontextlost',
    (ev) => {
      ev.preventDefault()
    },
    false,
  )
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
  // Angled key light — longer cel bands than straight-down noon
  sun.position.set(
    weather === 'night' ? 2.5 : weather === 'sunny' ? -7.5 : -5,
    weather === 'night' ? 5.5 : weather === 'sunny' ? 10.5 : 12,
    weather === 'night' ? -1.5 : weather === 'sunny' ? 5.5 : 2.5,
  )
  scene.add(sun)
  const fill = new THREE.HemisphereLight(look.hemiSky, look.hemiGround, look.hemiI)
  scene.add(fill)

  const world = new THREE.Group()
  scene.add(world)

  // Bamboo academy: slightly greener pond + jade bank (still Chinese-themed).
  // Guan: forced tropical lagoon tint.
  const waterTint = isGuan
    ? GUAN_TROPICAL_LOOK.water
    : realm === 'bamboo'
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
    opacity: isGuan
      ? GUAN_TROPICAL_LOOK.waterOpacity
      : weather === 'rainy'
        ? 0.92
        : weather === 'night'
          ? 0.9
          : 0.88,
  })
  // Guan: denser ocean grid for a gentle vertex-wave (local Z → world Y after rot).
  // 32 segments keeps the ripple without the prior 48² vertex tax.
  const waterSeg = isGuan ? 32 : 1
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(
      isGuan ? GUAN_WATER_PLANE.size : RIVER * 2.4,
      isGuan ? GUAN_WATER_PLANE.size : 560,
      isGuan ? waterSeg : 1,
      isGuan ? waterSeg : 20,
    ),
    waterMat,
  )
  water.rotation.x = -Math.PI / 2
  water.position.set(isGuan ? GUAN_WATER_PLANE.x : 0, 0.02, isGuan ? GUAN_WATER_PLANE.z : 80)
  scene.add(water)
  /** Base local-Z (height) for Guan ocean vertex waves — null on river strip. */
  let oceanBaseZ: Float32Array | null = null
  let oceanNormalTick = 0
  if (isGuan) {
    const pos = water.geometry.getAttribute('position') as THREE.BufferAttribute
    oceanBaseZ = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) oceanBaseZ[i] = pos.getZ(i)
  }

  // Soft painterly bank / beach mats (same LinearFilter albedos as Guan Harbor).
  const grassMat = softTiledMat(
    realm === 'bamboo' ? 0x2e7a48 : 0x2e6a40,
    hqSoftGrassTexture(),
    2.8,
    'grass',
  )
  const sandMat = softTiledMat(
    realm === 'bamboo' ? 0xd0c090 : 0xe0d0a0,
    hqSoftSandTexture(),
    2.4,
    'dirt',
  )
  const chunkGroups = new Map<number, THREE.Group>()
  /** Chunks ahead of the canoe — 3 = leaner GPU, earlier pop-in than 4. */
  const ACTIVE = 4
  /** Cached PointLights for flicker (avoids full scene.traverse each frame). */
  const lanternLights: THREE.PointLight[] = []
  /** Cached fauna / bubbles / petals for idle motion (avoids per-chunk traverse). */
  const animNodes: THREE.Object3D[] = []
  /** Pier / landmark / Guan Scout clones — idle on the player armature. */
  const scoutCastNpcs: THREE.Object3D[] = []
  let fxIndexDirty = true
  let rebuildFxIndex: () => void = () => {
    fxIndexDirty = true
  }

  let guanScene: THREE.Group | null = null
  if (isGuan) {
    guanScene = buildGuanHarborScene()
    world.add(guanScene)
    fxIndexDirty = true
  }

  const ensureChunks = (centerZ: number) => {
    if (isGuan) return
    const center = Math.floor(centerZ / CHUNK)
    const need = new Set<number>()
    for (let i = center - 2; i <= center + ACTIVE; i++) need.add(i)
    let dirty = false
    for (const [idx, g] of chunkGroups) {
      if (!need.has(idx)) {
        world.remove(g)
        g.traverse((o) => {
          // Shared grass / V2 / Scout GLB buffers — disposing one chunk
          // poisons every remaining clone and blacks iPhone WebGL.
          if (o instanceof THREE.Mesh && !isHarborSharedGpuMesh(o)) o.geometry.dispose()
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

  // Fixed visitables — Save Shack + Outfitter + Bank + Arena (always on the chart).
  // Guan paradise skips river landmarks; return portal is baked into the guan scene.
  const visitablesRoot = new THREE.Group()
  visitablesRoot.name = 'harbor-visitables'
  if (!isGuan) {
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
      // Yard chairs facing the river path — tap to sit while exploring
      const side = Math.sign(v.x) || 1
      const faceRiver = side > 0 ? -Math.PI / 2 : Math.PI / 2
      hqStampChairs(visitablesRoot, [
        { x: v.x - side * 1.55, z: v.z + 1.05, yaw: faceRiver },
        { x: v.x - side * 1.7, z: v.z - 0.85, yaw: faceRiver + side * 0.25, stool: true },
      ])
    }
  }
  scene.add(visitablesRoot)

  rebuildFxIndex = () => {
    lanternLights.length = 0
    animNodes.length = 0
    scoutCastNpcs.length = 0
    const isAnimNode = (o: THREE.Object3D) =>
      !!(
        o.userData.speechBubble ||
        o.userData.fauna ||
        o.userData.bird ||
        o.userData.fish ||
        o.userData.petal ||
        o.userData.specialHostGlow ||
        o.userData.cigaretteSmoke ||
        o.userData.barberPole ||
        o.userData.fishIconFloat ||
        o.userData.fishIconSpin ||
        o.userData.fishSpotBob ||
        o.userData.mistPulse
      )
    const indexRoot = (root: THREE.Object3D) => {
      root.traverse((o) => {
        if (o instanceof THREE.PointLight && o.userData.harborLanternLight) {
          lanternLights.push(o)
        } else if (isAnimNode(o)) {
          animNodes.push(o)
        }
        if (o.userData.scoutCast) scoutCastNpcs.push(o)
      })
    }
    for (const g of chunkGroups.values()) indexRoot(g)
    if (guanScene) indexRoot(guanScene)
    indexRoot(visitablesRoot)
    indexRoot(boat)
    indexRoot(scoutWalk)
    fxIndexDirty = false
  }

  let scout = boat.getObjectByName('river-scout') as THREE.Object3D | null
  if (scout) applyLookToProtagonist(scout, currentLook)
  else applyLookToProtagonist(boat, currentLook)
  // Soft contact disc under the canoe (no realtime shadow map)
  attachHarborContactShadow(boat, { radius: 0.55, opacity: 0.26, scaleX: 1.7, scaleZ: 0.72, y: 0.02 })
  // Standing Scout for banks / roads — canoe stays moored while they walk
  const scoutWalk = buildHarborProtagonist({ pose: 'standing', gender: currentGender, appearance: currentAppearance })
  scoutWalk.name = 'river-scout-walk'
  scoutWalk.visible = false
  scene.add(scoutWalk)
  applyLookToProtagonist(scoutWalk, currentLook)
  ensureHarborProtagonistLimbs(scoutWalk)
  attachHarborContactShadow(scoutWalk, { radius: 0.38, opacity: 0.32 })
  let scoutAnim: HarborProtagonistAnimState = { mode: 'idle', t: 0 }
  /** Seated land mesh — shown when the sailor sits on a chair / stool. */
  let scoutSit: THREE.Object3D | null = null
  let sitting = false
  /** Walk-to-then-sit target (OSRS chair click). */
  let sitTarget: THREE.Object3D | null = null
  const chairWorldPos = new THREE.Vector3()
  const chairWorldQuat = new THREE.Quaternion()
  const chairEuler = new THREE.Euler()

  // Open-world multiplayer ghosts + local nametag
  const remotesRoot = new THREE.Group()
  remotesRoot.name = 'harbor-remotes'
  scene.add(remotesRoot)
  const remoteById = new Map<string, THREE.Group>()
  let localUsername = 'sailor'
  const localNametag = buildNametagSprite(localUsername, options.nametagFrame ?? 'tag-plain')
  scene.add(localNametag)
  let localSpeechBubble: THREE.Sprite | null = null
  let localSpeechUntil = 0
  const remoteSpeech = new Map<string, { sprite: THREE.Sprite; until: number }>()

  /** Guan / river fishing cast splash ring + rod kit. */
  let fishingCastUntil = 0
  let fishAnim: HarborFishAnimState = { phase: 'idle', t: 0, faceYaw: 0 }
  let fishWaterTarget = { x: 0, y: 0.08, z: 0 }
  const fishKit = createHarborFishingPropKit()
  scene.add(fishKit.root)
  const fishSplashMat = new THREE.MeshBasicMaterial({
    color: 0x7ef0dc,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  })
  const fishSplash = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.045, 6, 18), fishSplashMat)
  fishSplash.rotation.x = Math.PI / 2
  fishSplash.visible = false
  fishSplash.name = 'guan-fish-cast-splash'
  scene.add(fishSplash)

  const beginFishingCast = () => {
    if (disposed) return
    const px = travelMode === 'foot' ? footX : boatX
    const pz = travelMode === 'foot' ? footZ : voyageZ
    // Cast toward river / ocean center from the sailor
    const towardWater = px === 0 ? -1 : -Math.sign(px)
    const reach = isGuan ? 2.4 : 2.8
    fishWaterTarget = {
      x: px + towardWater * reach,
      y: travelMode === 'foot' ? 0.06 : 0.1,
      z: pz + (isGuan ? 0.4 : 0.15),
    }
    const faceYaw = Math.atan2(fishWaterTarget.x - px, fishWaterTarget.z - pz)
    fishAnim = startHarborFishCast(faceYaw)
    fishingCastUntil = performance.now() + HARBOR_FISH_CAST_MS + HARBOR_FISH_WAIT_MS + 400
    // Keep the walking scout visible so rod / bobber aren't casting into thin air
    if (travelMode === 'foot') {
      exitSit()
      sitTarget = null
      moveTarget.x = footX
      moveTarget.z = footZ
      scoutWalk.visible = true
      if (scoutSit) scoutSit.visible = false
    }
    // Aim orbit toward the splash so the cast reads past the docked panel
    const toSplash = Math.atan2(fishWaterTarget.x - px, fishWaterTarget.z - pz)
    yawTarget = toSplash + Math.PI
    pitchTarget = clampOrbitPitch(0.42)
    distanceTarget = clampOrbitDistance(Math.min(distanceTarget, 7.2))
  }

  const clearSpeechBubble = (sprite: THREE.Sprite | null, parent?: THREE.Object3D | null) => {
    if (!sprite) return
    parent?.remove(sprite)
    if (sprite.parent) sprite.parent.remove(sprite)
    disposeChatBubbleSprite(sprite)
  }

  const showSpeechBubble = (who: 'local' | string, text: string, durationMs = 4500) => {
    if (disposed) return
    const cleaned = text.trim()
    if (!cleaned) return
    const until = performance.now() + Math.max(1200, durationMs)
    if (who === 'local') {
      clearSpeechBubble(localSpeechBubble, scene)
      localSpeechBubble = buildChatBubbleSprite(cleaned)
      // Prefer live scout/boat pose — nametag may still be at origin before first tick.
      const lx = travelMode === 'foot' ? footX : boat.position.x
      const ly =
        travelMode === 'foot'
          ? groundYAt(footX, footZ) + (sitting ? 1.7 : 2.05)
          : 1.85
      const lz = travelMode === 'foot' ? footZ : boat.position.z
      localSpeechBubble.position.set(lx, ly + 0.72, lz)
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


  // Distant Wulingyuan-style karst pillars (parallax backdrop) — skip in Guan lagoon
  const mountains = isGuan ? null : wulingyuanRange(42, look.fog)
  if (mountains) scene.add(mountains)

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
  let voyageZ = isGuan ? GUAN_BOAT_START.z : startDock.z
  let boatX = isGuan ? GUAN_BOAT_START.x : startDock.side * HARBOR_DOCK_X * 0.35
  let waterPhase = 0
  let raf = 0
  let last = performance.now()

  // OSRS tap-to-move: destination on the ground plane (quest docks seed the first target).
  // Guan Harbor is always free-sail — no auto dock retargeting.
  let moveTarget = isGuan
    ? { x: GUAN_BOAT_START.x, z: GUAN_BOAT_START.z }
    : { x: startDock.side * HARBOR_DOCK_X, z: startDock.z }
  let playerDirected = isGuan
  /** Crew the canoe (`boat`) or walk the Scout on land (`foot`). */
  let travelMode: 'boat' | 'foot' = 'boat'
  let footX = boatX
  let footZ = voyageZ
  let wantBoard = false
  const scoutSeat = { x: 0, y: HARBOR_CANOE_SCOUT_SEAT_Y, z: -0.05 }

  const destMarker = clickMarker()
  scene.add(destMarker)
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const ndc = new THREE.Vector2()
  const hitPoint = new THREE.Vector3()
  const raycaster = new THREE.Raycaster()

  const ensureScoutSit = () => {
    if (scoutSit) return scoutSit
    const sit = buildHarborProtagonist({
      pose: 'seated',
      gender: currentGender,
      appearance: currentAppearance,
    })
    sit.name = 'river-scout-sit'
    sit.visible = false
    scene.add(sit)
    applyLookToProtagonist(sit, currentLook)
    attachHarborContactShadow(sit, { radius: 0.42, opacity: 0.3, scaleX: 1.15, scaleZ: 0.85 })
    scoutSit = sit
    return sit
  }

  const exitSit = () => {
    if (!sitting) return
    sitting = false
    if (scoutSit) scoutSit.visible = false
    if (travelMode === 'foot') {
      scoutWalk.visible = true
      scoutWalk.position.set(footX, groundYAt(footX, footZ), footZ)
    }
  }

  const enterSit = (chair: THREE.Object3D) => {
    if (travelMode !== 'foot') return
    chair.getWorldPosition(chairWorldPos)
    chair.getWorldQuaternion(chairWorldQuat)
    chairEuler.setFromQuaternion(chairWorldQuat, 'YXZ')
    const seatY = typeof chair.userData.seatY === 'number' ? chair.userData.seatY : 0.42
    footX = chairWorldPos.x
    footZ = chairWorldPos.z
    sitting = true
    sitTarget = null
    playerDirected = false
    destMarker.visible = false
    wantBoard = false
    scoutWalk.visible = false
    const sit = ensureScoutSit()
    sit.visible = true
    // seatY is local to the chair group — stack on chair world Y so terraces don't clip
    sit.position.set(chairWorldPos.x, chairWorldPos.y + seatY - 0.1, chairWorldPos.z)
    sit.rotation.set(0, chairEuler.y, 0)
    try {
      playHarborSit()
    } catch {
      /* SFX must never block sit */
    }
  }

  const chairFromObject = (obj: THREE.Object3D | null): THREE.Object3D | null => {
    let o: THREE.Object3D | null = obj
    while (o) {
      if (o.userData.harborChair) return o
      o = o.parent
    }
    return null
  }

  const setMoveTarget = (x: number, z: number, fromPlayer: boolean) => {
    const clamped =
      travelMode === 'boat'
        ? isGuan
          ? clampGuanBoatTarget(x, z)
          : clampHarborBoatTarget(x, z)
        : isGuan
          ? clampGuanFootTarget(x, z)
          : clampHarborMoveTarget(x, z)
    moveTarget = clamped
    playerDirected = fromPlayer
    destMarker.position.set(clamped.x, groundYAt(clamped.x, clamped.z) + 0.06, clamped.z)
    destMarker.visible = fromPlayer
  }

  const disembark = (towardX: number, towardZ?: number) => {
    if (travelMode === 'foot' || !scout) return
    exitSit()
    scout.visible = false
    if (isGuan && towardZ != null) {
      // Step onto the nearest island shore toward the tap
      const shore = clampGuanFootTarget(towardX, towardZ)
      footX = shore.x
      footZ = shore.z
      scoutWalk.rotation.set(0, Math.atan2(shore.x - boatX, shore.z - voyageZ), 0)
    } else {
      const side = towardX === 0 ? (boatX >= 0 ? 1 : -1) : Math.sign(towardX) || 1
      footX = boatX + side * 0.9
      footZ = voyageZ
      if (Math.abs(footX) < HARBOR_LAND_EDGE) footX = side * HARBOR_LAND_EDGE
      scoutWalk.rotation.set(0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0)
    }
    scoutWalk.visible = true
    scoutWalk.position.set(footX, groundYAt(footX, footZ), footZ)
    travelMode = 'foot'
    wantBoard = false
    sitTarget = null
  }

  const boardBoat = () => {
    if (travelMode !== 'foot' || !scout) return
    exitSit()
    sitTarget = null
    scoutWalk.visible = false
    if (scoutSit) scoutSit.visible = false
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
    // Tap a chair / stool → walk over and sit (OSRS-style)
    {
      const picks = raycaster.intersectObjects(scene.children, true)
      for (const hit of picks) {
        const chair = chairFromObject(hit.object)
        if (!chair) continue
        chair.getWorldPosition(chairWorldPos)
        const cx = chairWorldPos.x
        const cz = chairWorldPos.z
        const onLand = isGuan ? isGuanLand(cx, cz) : isHarborLand(cx)
        if (!onLand) break
        if (travelMode === 'boat') {
          disembark(cx, cz)
        } else {
          exitSit()
        }
        wantBoard = false
        sitTarget = chair
        // Instant sit when already close enough (social cluster is more forgiving for chat)
        const sitArrive = Math.max(HARBOR_SIT_RADIUS * 0.55, HARBOR_SOCIAL_SIT_CLUSTER * 0.45)
        if (travelMode === 'foot' && Math.hypot(footX - cx, footZ - cz) <= sitArrive) {
          enterSit(chair)
          return
        }
        setMoveTarget(cx, cz, true)
        return
      }
    }
    // Talkable NPCs / speech bubbles — open UI when close enough.
    // Guan: skip while still on the canoe so pier / bridge taps disembark instead of
    // opening Customs through the glowing portal veil.
    if (!(isGuan && travelMode === 'boat')) {
      const pickRoots: THREE.Object3D[] = [visitablesRoot]
      for (const g of chunkGroups.values()) pickRoots.push(g)
      if (guanScene) pickRoots.push(guanScene)
      const npcHits = raycaster.intersectObjects(pickRoots, true)
      for (const hit of npcHits) {
        const tap = dialogueTapFromObject(hit.object)
        if (!tap) continue
        // Resolve the NPC root for distance (landmark host or pier figure)
        let root: THREE.Object3D | null = hit.object
        while (root && !root.userData.hasDialogue && !root.userData.landmarkHost) {
          root = root.parent
        }
        if (!root) continue
        const worldPos = new THREE.Vector3()
        root.getWorldPosition(worldPos)
        const px = travelMode === 'foot' ? footX : boatX
        const pz = travelMode === 'foot' ? footZ : voyageZ
        const dist = Math.hypot(worldPos.x - px, worldPos.z - pz)
        if (dist <= HARBOR_NPC_TALK_RADIUS) {
          options.onDialogueNpc?.(tap)
          return
        }
        // Too far — walk / paddle toward them instead of opening
        if (travelMode === 'boat' && !isGuan && isHarborLand(worldPos.x)) {
          disembark(worldPos.x)
        }
        setMoveTarget(worldPos.x, worldPos.z, true)
        return
      }
    }
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return
    commandMoveTo(hitPoint.x, hitPoint.z)
  }

  /** Shared by ground tap + minimap tap (OSRS-style click-to-walk). */
  const commandMoveTo = (tx: number, tz: number) => {
    if (disposed) return
    if (travelMode === 'boat') {
      if (isGuan && isGuanLand(tx, tz)) {
        disembark(tx, tz)
        setMoveTarget(tx, tz, true)
      } else if (!isGuan && isHarborLand(tx)) {
        disembark(tx)
        setMoveTarget(tx, tz, true)
      } else {
        setMoveTarget(tx, tz, true)
      }
      return
    }
    // On foot: stand up if seated, then walk / reboard
    exitSit()
    sitTarget = null
    const distBoat = Math.hypot(tx - boatX, tz - voyageZ)
    const onLand = isGuan ? isGuanLand(tx, tz) : isHarborLand(tx)
    if (!onLand || distBoat <= HARBOR_REBOARD_RADIUS * 0.7) {
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

  let lastResizeW = 0
  let lastResizeH = 0
  const resize = () => {
    const w = Math.max(1, Math.floor(canvas.clientWidth || canvas.width || 1))
    const h = Math.max(1, Math.floor(canvas.clientHeight || canvas.height || 1))
    // Soft-keyboard open/close spams resize on mobile — skip no-ops to avoid WebGL thrash/freeze.
    if (w === lastResizeW && h === lastResizeH) return
    lastResizeW = w
    lastResizeH = h
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
      // Guan keeps tropical lagoon; bamboo keeps jade pond; Sounds uses pier hue water.
      waterMat.color.setHex(
        isGuan ? GUAN_TROPICAL_LOOK.water : realm === 'bamboo' ? 0x3a8878 : WATER[hue],
      )
    }
  }

  const tick = (now: number) => {
    if (disposed) return
    raf = requestAnimationFrame(tick)
    if (paused || (typeof document !== 'undefined' && document.hidden)) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    // OSRS tap-to-move: paddle on water or walk on land (quest docks when crewing).
    // Guan Harbor disables auto-quest dock retargeting — always free sail.
    if (!isGuan && !playerDirected && travelMode === 'boat') {
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
      // Fold Scout armature into a canoe sit — without this the GLB stays T-pose.
      if (scout && fishAnim.phase === 'idle') {
        scout.visible = true
        scoutAnim = tickHarborProtagonistAnim(scout, { ...scoutAnim, mode: 'sit' }, dt, { reduced })
      }
      // Landmark panels only when the sailor steered here and arrived —
      // never while auto-quest sailing past Save / Outfitter / Bank / etc.
      // Guan: return portal still uses the same arrival gate.
      if (playerDirected && arrived) {
        // Guan Customs opens via officer tap — not by sailing near the pier
        emitVisitable(isGuan ? null : nearestVisitable(boatX, voyageZ, realm))
      } else if (!playerDirected) {
        emitVisitable(null)
      }
    } else {
      // On foot — OSRS click-to-walk toward the yellow X (or idle while seated)
      const gy = groundYAt(footX, footZ)
      if (sitting) {
        if (scoutSit) {
          scoutSit.position.x = footX
          scoutSit.position.z = footZ
          if (fishAnim.phase === 'idle') {
            scoutAnim = tickHarborProtagonistAnim(scoutSit, { ...scoutAnim, mode: 'sit' }, dt, {
              reduced,
            })
          }
        }
        if (destMarker.visible) destMarker.visible = false
      } else {
        const dx = moveTarget.x - footX
        const dz = moveTarget.z - footZ
        const dist = Math.hypot(dx, dz)
        const arrived = dist < HARBOR_TAP_ARRIVE
        if (!arrived) {
          const step = harborWalkStep(dist, dt, { reduced })
          footX += (dx / dist) * step
          footZ += (dz / dist) * step
          const face = Math.atan2(dx, dz)
          if (fishAnim.phase === 'idle') {
            scoutWalk.rotation.y += (face - scoutWalk.rotation.y) * Math.min(1, dt * 10)
            scoutAnim = tickHarborProtagonistAnim(scoutWalk, { ...scoutAnim, mode: 'walk' }, dt, { reduced })
          }
          // Plant feet on ground — no vertical root bounce (standard MMO locomotion).
          scoutWalk.position.set(footX, groundYAt(footX, footZ), footZ)
          // Don't open landmarks mid-walk either
          if (!playerDirected) emitVisitable(null)
        } else {
          if (fishAnim.phase === 'idle') {
            scoutAnim = tickHarborProtagonistAnim(scoutWalk, { ...scoutAnim, mode: sitting ? 'sit' : 'idle' }, dt, {
              reduced,
            })
          }
          scoutWalk.position.set(footX, gy, footZ)
          if (playerDirected) destMarker.visible = false
          if (sitTarget) {
            enterSit(sitTarget)
          } else if (wantBoard) {
            boardBoat()
          } else {
            emitVisitable(nearestVisitable(footX, footZ, realm))
          }
        }

        if (destMarker.visible && !reduced) {
          const pulse = 1 + Math.sin(now * 0.012) * 0.12
          destMarker.scale.setScalar(pulse)
        }
      }

      // Moored canoe bobbing at the bank
      waterPhase += dt * (reduced ? 0.4 : 1.0)
      const bob = reduced ? 0 : Math.sin(waterPhase * 2.2) * 0.03
      boat.position.set(boatX, 0.08 + bob, voyageZ)
    }
    if (!isGuan && travelMode === 'boat' && !playerDirected) {
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

    water.position.z = isGuan ? GUAN_WATER_PLANE.z : voyageZ + 60
    if (isGuan) water.position.x = GUAN_WATER_PLANE.x
    // Soft whole-plane bob; Guan also ripples vertex heights for a living ocean
    water.position.y = 0.02 + Math.sin(waterPhase) * 0.015
    if (oceanBaseZ && !reduced) {
      const pos = water.geometry.getAttribute('position') as THREE.BufferAttribute
      const t = waterPhase
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        const wave =
          Math.sin(x * 0.22 + t * 1.35) * 0.07 +
          Math.cos(y * 0.18 + t * 1.05) * 0.05 +
          Math.sin((x + y) * 0.11 + t * 0.7) * 0.035
        pos.setZ(i, oceanBaseZ[i]! + wave)
      }
      pos.needsUpdate = true
      // Normals every other frame — flat Lambert still reads; halves ocean CPU
      oceanNormalTick++
      if (oceanNormalTick % 2 === 0) water.geometry.computeVertexNormals()
    }

    // Parallax: mountains drift slower than the canoe
    if (mountains) {
      mountains.position.z = voyageZ * 0.35
      mountains.position.x = boatX * 0.15
    }

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

    const footGy = travelMode === 'foot' ? groundYAt(footX, footZ) : 0
    // Look target = player feet / boat — no Z bias (was pushing the scout off-center).
    let lookX = travelMode === 'foot' ? footX : boat.position.x
    let lookY = travelMode === 'foot' ? footGy + (sitting ? 0.95 : 1.15) : 0.75
    let lookZ = travelMode === 'foot' ? footZ : boat.position.z
    // During a cast, bias the look-at toward the splash so rod + bobber stay in frame
    if (fishAnim.phase !== 'idle') {
      const blend = fishAnim.phase === 'cast' ? 0.72 : 0.55
      lookX = lookX * (1 - blend) + fishWaterTarget.x * blend
      lookY = lookY * (1 - blend) + (fishWaterTarget.y + 0.55) * blend
      lookZ = lookZ * (1 - blend) + fishWaterTarget.z * blend
    }
    const off = orbitCameraOffset(yaw, pitch, distance)
    // Boat gets a soft water bob; on-foot camera stays stable (no hop / sway).
    const bobY =
      travelMode === 'boat' && !reduced ? Math.sin(waterPhase * 0.5) * 0.045 : 0
    camera.position.set(lookX + off.x, lookY + off.y + bobY, lookZ + off.z)
    camera.lookAt(lookX, lookY, lookZ)

    // Local username plate follows boat / walking / seated scout
    localNametag.position.set(
      travelMode === 'foot' ? footX : boat.position.x,
      travelMode === 'foot' ? footGy + (sitting ? 1.85 : 2.25) : 1.85,
      travelMode === 'foot' ? footZ : boat.position.z,
    )
    if (localSpeechBubble) {
      localSpeechBubble.position.set(
        localNametag.position.x,
        localNametag.position.y + 0.72,
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
      tickRemoteSailorPose(root, reduced ? 1 : 0.32, dt)
      // Match terrace height so remote scouts don't clip into Guan land layers
      if (isGuan && root.userData.remoteMode === 'foot') {
        root.position.y = guanGroundY(root.position.x, root.position.z)
      } else {
        root.position.y = 0
      }
    }

    // Guan armored patrol brothers — roam + limb walk cycle
    if (isGuan && guanScene) {
      tickGuanArmoredPatrol(guanScene, dt, reduced)
    }

    // Cloned Scout NPCs share the player armature (idle breath / walk when roaming).
    for (const npc of scoutCastNpcs) {
      if (npc.userData.npcRoam) tickHarborNpcRoam(npc, dt, reduced)
      else tickHarborCastAnim(npc, dt, { reduced, mode: 'idle' })
    }


    ensureChunks(voyageZ)
    if (fxIndexDirty) rebuildFxIndex()

    if (!reduced) {
      tickVipGearAnims(boat, waterPhase)
      tickVipGearAnims(scoutWalk, waterPhase)
      if (scoutSit) tickVipGearAnims(scoutSit, waterPhase)
    }

    for (const o of animNodes) {
      // Skip far fauna / petals — keeps latency calm without killing near motion
      const dx = o.position.x - camera.position.x
      const dz = o.position.z - camera.position.z
      const farAnim =
        !o.userData.speechBubble &&
        !o.userData.specialHostGlow &&
        !o.userData.fishIconFloat &&
        !o.userData.fishIconSpin &&
        !o.userData.fishSpotBob &&
        dx * dx + dz * dz > 48 * 48
      if (farAnim) continue
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
      if (o.userData.fishIconFloat && !reduced) {
        const base = (o.userData.fishIconBaseY as number | undefined) ?? o.position.y
        o.userData.fishIconBaseY = base
        o.position.y = base + Math.sin(waterPhase * 2.2) * 0.12
        o.rotation.y = waterPhase * 1.4
        continue
      }
      if (o.userData.fishIconSpin && !reduced) {
        o.rotation.y += 0.04
        o.rotation.x = Math.sin(waterPhase * 3) * 0.15
        continue
      }
      if (o.userData.fishSpotBob && !reduced) {
        const base = (o.userData.fishSpotBaseY as number | undefined) ?? o.position.y
        o.userData.fishSpotBaseY = base
        o.position.y = base + Math.sin(waterPhase * 2.8 + o.position.x) * 0.05
        continue
      }
      if (o.userData.mistPulse && !reduced) {
        const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial
        if (m && 'opacity' in m) m.opacity = 0.08 + Math.sin(waterPhase * 0.8) * 0.05
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
        // Soar birds stay aloft; waders hop on the bank (folded wings, no bird flag).
        if (o.userData.bird) {
          o.position.y = 2.2 + Math.sin(phase * 2) * 0.35
          o.position.x += Math.sin(phase) * 0.012
        } else if (!reduced) {
          o.position.y = 0.05 + Math.max(0, Math.sin(phase * 1.2)) * 0.12
          o.rotation.z = Math.sin(phase) * 0.05
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

    // Fishing cast / wait / catch — rod, line, bobber + splash ring
    if (fishAnim.phase !== 'idle') {
      const px = travelMode === 'foot' ? footX : boatX
      const pz = travelMode === 'foot' ? footZ : voyageZ
      const py = travelMode === 'foot' ? groundYAt(px, pz) : 0.08
      const fishScout = travelMode === 'foot' ? scoutWalk : scout
      fishAnim = tickHarborFishingAnim(fishScout, fishKit, fishAnim, dt, {
        reduced,
        x: px,
        y: py,
        z: pz,
        waterX: fishWaterTarget.x,
        waterY: fishWaterTarget.y,
        waterZ: fishWaterTarget.z,
      })
      if (fishAnim.phase === 'cast' || (fishAnim.phase === 'wait' && fishAnim.t < 0.35)) {
        const castU =
          fishAnim.phase === 'cast'
            ? Math.min(1, fishAnim.t / (HARBOR_FISH_CAST_MS / 1000))
            : 1
        if (castU > 0.4) {
          const t = castU
          fishSplash.visible = true
          fishSplash.position.set(fishWaterTarget.x, fishWaterTarget.y, fishWaterTarget.z)
          fishSplash.scale.setScalar(0.55 + t * 1.55)
          fishSplash.rotation.z = waterPhase * 2
          fishSplashMat.opacity = Math.max(0, 0.78 * (1 - (t - 0.4) / 0.6))
        }
      } else if (fishAnim.phase === 'catch' && fishAnim.t < 0.25) {
        fishSplash.visible = true
        fishSplash.position.set(fishWaterTarget.x, fishWaterTarget.y, fishWaterTarget.z)
        fishSplash.scale.setScalar(0.9 + fishAnim.t * 2)
        fishSplashMat.opacity = Math.max(0, 0.55 * (1 - fishAnim.t / 0.25))
      } else if (fishSplash.visible && fishAnim.phase !== 'wait') {
        fishSplash.visible = false
        fishSplashMat.opacity = 0.7
      }
    } else if (fishSplash.visible) {
      fishSplash.visible = false
      fishSplashMat.opacity = 0.7
    }
    fishingCastUntil = fishAnim.phase === 'idle' ? 0 : fishingCastUntil


    if (flash && now < flashUntil) {
      amb.color.lerp(new THREE.Color(flash === 'ok' ? 0x3dcfb6 : 0xe07070), 0.15)
    } else {
      amb.color.lerp(new THREE.Color(look.amb), 0.08)
      if (now >= flashUntil) flash = null
    }

    // Lantern / portal flicker — warm breathing pools (strongest at night)
    if (!reduced) {
      for (const light of lanternLights) {
        const base = (light.userData.baseIntensity as number) ?? light.intensity
        const dist = (light.userData.baseDistance as number) ?? light.distance
        const pulse =
          0.76 +
          Math.sin(waterPhase * 4.2 + light.id) * 0.16 +
          Math.sin(waterPhase * 7.6 + light.id * 1.7) * 0.08
        light.intensity = base * pulse
        // Soft range pulse so pools bloom without shadow maps
        light.distance = dist * (0.94 + Math.sin(waterPhase * 2.1 + light.id * 0.6) * 0.06)
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
      // Quest step change — auto path to the next pier (clears free-explore target).
      // Guan Harbor stays free-sail (no dock retarget).
      if (isGuan) return
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
      if (scoutSit) applyLookToProtagonist(scoutSit, currentLook)
      applyVesselLook(boat, weather, currentLook)
      fxIndexDirty = true
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
          yaw: sitting && scoutSit ? scoutSit.rotation.y : scoutWalk.rotation.y,
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
    setLocalUsername(username, nametagFrame) {
      const next = username.trim() || localUsername
      const frame =
        typeof nametagFrame === 'string' && nametagFrame
          ? nametagFrame
          : typeof localNametag.userData.nametagFrame === 'string'
            ? localNametag.userData.nametagFrame
            : 'tag-plain'
      if (next === localUsername && localNametag.visible && localNametag.userData.nametagFrame === frame) {
        return
      }
      localUsername = next
      updateNametagSprite(localNametag, localUsername, frame)
      localNametag.visible = true
    },
    setNametagFrame(frameId) {
      updateNametagSprite(localNametag, localUsername, frameId || 'tag-plain')
    },
    showSpeechBubble,
    snapToQuestDock(stepIndex?: number) {
      // Lesson Talk / Next gate — only on the river voyage (Guan stays free-sail).
      if (isGuan || disposed) return
      if (typeof stepIndex === 'number' && Number.isFinite(stepIndex)) {
        progress = Math.min(Math.max(0, stepIndex) / HARBOR_MAX_QUEST_SLOTS, 1)
      }
      if (travelMode === 'foot') boardBoat()
      const dock = dockPoseForProgress(progress)
      const x = dock.side * HARBOR_DOCK_X
      const z = dock.z
      boatX = x
      voyageZ = z
      footX = x
      footZ = z
      boat.position.set(x, 0.08, z)
      boat.rotation.y = dock.side * 0.35
      boat.rotation.z = 0
      moveTarget = { x, z }
      playerDirected = false
      destMarker.visible = false
      emitVisitable(null)
      ensureChunks(voyageZ)
    },
    snapToGuan(x: number, z: number) {
      if (!isGuan || disposed) return
      exitSit()
      sitTarget = null
      if (travelMode === 'foot') boardBoat()
      const c = clampGuanBoatTarget(x, z)
      boatX = c.x
      voyageZ = c.z
      footX = c.x
      footZ = c.z
      boat.position.set(c.x, 0.08, c.z)
      boat.rotation.z = 0
      moveTarget = { x: c.x, z: c.z }
      playerDirected = false
      destMarker.visible = false
      emitVisitable(nearestVisitable(c.x, c.z, 'guan'))
    },
    moveToWorld(x, z) {
      commandMoveTo(x, z)
    },
    returnToBoat() {
      if (disposed || travelMode !== 'foot') return
      exitSit()
      sitTarget = null
      wantBoard = true
      const side = Math.sign(footX || boatX) || 1
      // Walk to the canoe; boardBoat fires on arrival (same as tapping the hull)
      setMoveTarget(boatX + (isGuan ? 0 : side * 0.2), voyageZ, true)
    },
    playFishingCast() {
      beginFishingCast()
    },
    playFishingCatch(ok: boolean) {
      if (disposed) return
      if (fishAnim.phase === 'idle') beginFishingCast()
      fishAnim = startHarborFishCatch(fishAnim, ok)
      fishingCastUntil = performance.now() + (ok ? 900 : 550)
    },
    resize,
    dispose() {
      disposed = true
      fishAnim = { phase: 'idle', t: 0, faceYaw: 0 }
      fishSplash.visible = false
      scene.remove(fishSplash)
      fishSplash.geometry.dispose()
      fishSplashMat.dispose()
      disposeHarborFishingPropKit(fishKit)
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
        if (o instanceof THREE.Mesh && !isHarborSharedGpuMesh(o)) {
          o.geometry.dispose()
          const mat = o.material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })
      scene.remove(scoutWalk)
      if (scoutSit) {
        scoutSit.traverse((o) => {
          if (o instanceof THREE.Mesh && !isHarborSharedGpuMesh(o)) {
            o.geometry.dispose()
            const mat = o.material
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
            else mat.dispose()
          }
        })
        scene.remove(scoutSit)
        scoutSit = null
      }
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      canvas.removeEventListener('lostpointercapture', endDrag)
      canvas.removeEventListener('wheel', onWheel)
      for (const g of chunkGroups.values()) {
        g.traverse((o) => {
          if (o instanceof THREE.Mesh && !isHarborSharedGpuMesh(o)) o.geometry.dispose()
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
