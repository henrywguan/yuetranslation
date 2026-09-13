/**
 * Harbor Quest · continuous river voyage (original low-poly world).
 * OSRS-inspired constraints: Lambert, flat shading, fog, chunky silhouettes.
 * Original JyutTranslate Harbor kit — not Jagex IP.
 */
import * as THREE from 'three'

export type HarborHue = 'jade' | 'harbor' | 'ink' | 'gold'

export type HarborWorldOptions = {
  hue?: HarborHue
  reducedMotion?: boolean
  /** Quest progress 0…1 — canoe eases down the stream. */
  progress?: number
}

export type HarborWorldHandle = {
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

const FOG: Record<HarborHue, number> = {
  jade: 0x0a2a28,
  harbor: 0x0a1c28,
  ink: 0x0c1218,
  gold: 0x1a1810,
}
const WATER: Record<HarborHue, number> = {
  jade: 0x1a6b5c,
  harbor: 0x1a5a78,
  ink: 0x243848,
  gold: 0x3a5a58,
}
const SKY: Record<HarborHue, number> = {
  jade: 0x143832,
  harbor: 0x123040,
  ink: 0x101820,
  gold: 0x2a2818,
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
  return new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra })
}

function tree(rng: () => number, leaf: number) {
  const g = new THREE.Group()
  const h = 1.1 + rng() * 0.9
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h, 6), mat(0x5a3a22))
  trunk.position.y = h / 2
  g.add(trunk)
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.55 + rng() * 0.45, 6, 5), mat(leaf))
  canopy.position.y = h + 0.35
  canopy.scale.y = 0.75 + rng() * 0.25
  g.add(canopy)
  if (rng() > 0.55) {
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.35 + rng() * 0.25, 5, 4), mat(leaf))
    c2.position.set((rng() - 0.5) * 0.5, h + 0.15, (rng() - 0.5) * 0.5)
    g.add(c2)
  }
  return g
}

/**
 * Jiangnan riverside dwelling — whitewash walls, dark tile hip roof, timber door.
 * Low-poly Cantonese / water-town village silhouette (original kit).
 */
function house(rng: () => number) {
  const g = new THREE.Group()
  const w = 1.5 + rng() * 0.9
  const d = 1.15 + rng() * 0.45
  const h = 0.95 + rng() * 0.35
  const wallTone = rng() > 0.45 ? 0xf0ebe0 : 0xe8e0d0
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(wallTone))
  body.position.y = h / 2
  g.add(body)

  // Dark timber corner posts
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), mat(0x3a2a20))
      post.position.set(sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02))
      g.add(post)
    }
  }

  // Pitched tile roof (two slabs) + ridge
  const roofMat = mat(rng() > 0.5 ? 0x2a2e32 : 0x3a3430)
  const pitch = 0.42 + rng() * 0.12
  const overhang = 0.18
  const left = new THREE.Mesh(new THREE.BoxGeometry(w + overhang * 2, 0.08, d * 0.72), roofMat)
  left.position.set(0, h + pitch * 0.35, -d * 0.12)
  left.rotation.x = 0.48
  g.add(left)
  const right = new THREE.Mesh(new THREE.BoxGeometry(w + overhang * 2, 0.08, d * 0.72), roofMat)
  right.position.set(0, h + pitch * 0.35, d * 0.12)
  right.rotation.x = -0.48
  g.add(right)
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + overhang * 2.2, 0.1, 0.12), mat(0x1a1c1e))
  ridge.position.y = h + pitch * 0.72
  g.add(ridge)
  // Soft upturned eave tips (Lingnan / temple hint, still chunky)
  for (const z of [-1, 1] as const) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 4), roofMat)
    tip.position.set(w / 2 + overhang * 0.6, h + pitch * 0.45, z * (d * 0.35))
    tip.rotation.z = -0.9
    g.add(tip)
    const tipL = tip.clone()
    tipL.position.x = -(w / 2 + overhang * 0.6)
    tipL.rotation.z = 0.9
    g.add(tipL)
  }

  // Door + lattice window
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.05), mat(0x4a3020))
  door.position.set(-w * 0.15, 0.3, d / 2 + 0.03)
  g.add(door)
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.04), mat(0x1a3040))
  win.position.set(w * 0.22, h * 0.55, d / 2 + 0.03)
  g.add(win)
  const lattice = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.02), mat(0xc8b090))
  lattice.position.copy(win.position)
  lattice.position.z += 0.02
  g.add(lattice)

  // Stone plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.12, d + 0.15), mat(0x8a8680))
  plinth.position.y = 0.04
  g.add(plinth)
  return g
}

/** Compact courtyard wing / side house — grey brick, terracotta tiles. */
function courtyardWing(rng: () => number) {
  const g = new THREE.Group()
  const w = 1.1 + rng() * 0.5
  const d = 0.95 + rng() * 0.35
  const h = 0.75 + rng() * 0.25
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0x9a9690))
  body.position.y = h / 2
  g.add(body)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.1, d + 0.2), mat(0x8a4030))
  roof.position.y = h + 0.12
  roof.rotation.x = -0.15
  g.add(roof)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.04), mat(0x3a2818))
  door.position.set(0, 0.24, d / 2 + 0.02)
  g.add(door)
  return g
}

/**
 * Raised riverside shop / stilt house — timber frame over the bank.
 */
function stiltShop(rng: () => number) {
  const g = new THREE.Group()
  const w = 1.2 + rng() * 0.5
  const d = 1.0 + rng() * 0.35
  const deckY = 0.45 + rng() * 0.15
  const h = 0.7 + rng() * 0.25
  for (const x of [-w * 0.4, w * 0.4] as const) {
    for (const z of [-d * 0.35, d * 0.35] as const) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, deckY + 0.1, 5), mat(0x5a4030))
      pile.position.set(x, (deckY + 0.1) / 2, z)
      g.add(pile)
    }
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.08, d + 0.15), mat(0x7a5a3a))
  deck.position.y = deckY
  g.add(deck)
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0xd8c8a8))
  body.position.y = deckY + h / 2 + 0.04
  g.add(body)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.08, d + 0.25), mat(0x2c3034))
  roof.position.y = deckY + h + 0.2
  roof.rotation.x = -0.2
  g.add(roof)
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.02), mat(0xc04040))
  banner.position.set(w * 0.35, deckY + h * 0.7, d / 2 + 0.05)
  g.add(banner)
  return g
}

/** Round earth-building / watch hut — soft vernacular silhouette for hills. */
function hut(rng: () => number) {
  // Mix: half courtyard wing, half small tiled cottage so villages feel varied
  if (rng() > 0.55) return courtyardWing(rng)
  const g = new THREE.Group()
  const w = 1.0 + rng() * 0.4
  const d = 0.9 + rng() * 0.3
  const h = 0.7 + rng() * 0.3
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0xf2eee6))
  body.position.y = h / 2
  g.add(body)
  const roofL = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.07, d * 0.65), mat(0x2a2e32))
  roofL.position.set(0, h + 0.18, -d * 0.1)
  roofL.rotation.x = 0.5
  g.add(roofL)
  const roofR = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.07, d * 0.65), mat(0x2a2e32))
  roofR.position.set(0, h + 0.18, d * 0.1)
  roofR.rotation.x = -0.5
  g.add(roofR)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.04), mat(0x4a3020))
  door.position.set(0, 0.22, d / 2 + 0.02)
  g.add(door)
  return g
}

/** Village home kinds placed along the voyage (smoke-tested). */
export const HARBOR_VILLAGE_HOMES = ['jiangnan', 'courtyard', 'stilt', 'cottage'] as const
export type HarborVillageHome = (typeof HARBOR_VILLAGE_HOMES)[number]

function rock(rng: () => number) {
  const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + rng() * 0.35, 0), mat(0x6a7078))
  mesh.scale.set(1 + rng() * 0.4, 0.55 + rng() * 0.4, 1 + rng() * 0.3)
  mesh.rotation.set(rng() * 0.6, rng() * Math.PI, rng() * 0.4)
  return mesh
}

function reed(rng: () => number) {
  const g = new THREE.Group()
  const n = 3 + Math.floor(rng() * 3)
  for (let i = 0; i < n; i++) {
    const h = 0.6 + rng() * 0.9
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, h, 4), mat(0x3d7a4a))
    stem.position.set((rng() - 0.5) * 0.35, h / 2, (rng() - 0.5) * 0.35)
    g.add(stem)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 3), mat(0x8ab85a))
    tip.position.set(stem.position.x, h + 0.04, stem.position.z)
    g.add(tip)
  }
  return g
}

function flower(rng: () => number) {
  const g = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 4), mat(0x2f6a3a))
  stem.position.y = 0.18
  g.add(stem)
  const bloom = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 5, 4),
    mat(rng() > 0.5 ? 0xe8a0b8 : 0xf0d060),
  )
  bloom.position.y = 0.4
  g.add(bloom)
  return g
}

function lantern() {
  const g = new THREE.Group()
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.5, 5), mat(0x4a3828))
  post.position.y = 0.75
  g.add(post)
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28), mat(0xf0c060))
  lamp.position.y = 1.55
  g.add(lamp)
  return g
}

function pierSegment() {
  const g = new THREE.Group()
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 3.6), mat(0x8a6a48))
  deck.position.y = 0.55
  g.add(deck)
  // Short gangplank toward the river
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 1.1), mat(0x7a5a38))
  plank.position.set(-0.9, 0.5, 0)
  plank.rotation.z = 0.12
  g.add(plank)
  for (const x of [-0.95, 0.95]) {
    for (const z of [-1.3, 1.3]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.1, 5), mat(0x5a4030))
      pile.position.set(x, 0.15, z)
      g.add(pile)
    }
  }
  // Bollard
  const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 6), mat(0x4a3828))
  bollard.position.set(0.7, 0.72, 1.2)
  g.add(bollard)
  g.userData.pier = true
  return g
}

/**
 * Low-poly Chinese-styled figure — clothing varies by role
 * (villager jacket, scholar robe + hat, fisherman conical hat, etc.).
 */
function chineseNpc(role: HarborNpcRole, rng: () => number) {
  const g = new THREE.Group()
  const child = role === 'child'
  const scale = child ? 0.72 : 1
  const skin = mat(0xe8c4a8)
  const hair = mat(0x1a1410)

  const palette: Record<HarborNpcRole, { robe: number; trim: number; pants: number }> = {
    villager: { robe: 0x2a3a6a, trim: 0xc4a060, pants: 0x3a3028 },
    scholar: { robe: 0x6a7a8a, trim: 0xe8e0d0, pants: 0x4a4850 },
    fisherman: { robe: 0x5a6a48, trim: 0xc8b070, pants: 0x4a3a28 },
    merchant: { robe: 0x8a3048, trim: 0xd4a848, pants: 0x3a2820 },
    child: { robe: 0xc45a48, trim: 0xf0d060, pants: 0x3a4a68 },
    ferryman: { robe: 0x4a5a58, trim: 0x8a6a40, pants: 0x3a3028 },
  }
  const colors = palette[role]

  // Legs
  for (const sx of [-0.08, 0.08] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.42, 5), mat(colors.pants))
    leg.position.set(sx, 0.21, 0)
    g.add(leg)
  }
  // Torso / robe
  const torsoH = role === 'scholar' || role === 'merchant' ? 0.55 : 0.42
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, torsoH, 0.2), mat(colors.robe))
  torso.position.y = 0.42 + torsoH / 2 - 0.05
  g.add(torso)
  // Sash / trim
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.22), mat(colors.trim))
  sash.position.y = 0.55
  g.add(sash)
  // Scholar / merchant long hem
  if (role === 'scholar' || role === 'merchant') {
    const hem = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.18), mat(colors.robe))
    hem.position.y = 0.38
    g.add(hem)
  }
  // Arms
  for (const sx of [-0.2, 0.2] as const) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.1), mat(colors.robe))
    arm.position.set(sx, 0.72, 0)
    g.add(arm)
  }
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), skin)
  head.position.y = 1.05
  g.add(head)
  // Hair bun
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), hair)
  bun.position.set(0, 1.16, -0.02)
  g.add(bun)

  if (role === 'scholar') {
    // Square scholar hat
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.24), mat(0x1a1814))
    hat.position.y = 1.2
    g.add(hat)
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), mat(0x1a1814))
    crown.position.y = 1.3
    g.add(crown)
  } else if (role === 'fisherman' || role === 'ferryman') {
    // Conical bamboo / straw hat
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.14, 7), mat(0xc4a860))
    hat.position.y = 1.2
    g.add(hat)
  } else if (role === 'merchant') {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.08, 6), mat(0x2a1810))
    cap.position.y = 1.18
    g.add(cap)
  } else if (role === 'villager') {
    // Soft cloth wrap
    const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.22), mat(0x2a2820))
    wrap.position.y = 1.16
    g.add(wrap)
  }

  // Fisherman pole accent
  if (role === 'fisherman' && rng() > 0.35) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.4, 4), mat(0x6a4a28))
    pole.position.set(0.28, 0.85, 0)
    pole.rotation.z = -0.55
    g.add(pole)
  }
  // Scholar scroll
  if (role === 'scholar' && rng() > 0.4) {
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 5), mat(0xe8e0d0))
    scroll.rotation.z = Math.PI / 2
    scroll.position.set(0.22, 0.62, 0.12)
    g.add(scroll)
  }

  g.scale.setScalar(scale * (0.92 + rng() * 0.12))
  g.userData.npc = role
  return g
}

function randomNpcRole(rng: () => number): HarborNpcRole {
  return HARBOR_NPC_ROLES[Math.floor(rng() * HARBOR_NPC_ROLES.length)]!
}

/** Traveler / player avatar seated in the canoe — jade sash marks “you”. */
function playerTraveler() {
  const g = new THREE.Group()
  const skin = mat(0xe8c4a8)
  const robe = mat(0x2a4858)
  const jade = mat(0x3dcfb6)
  const hair = mat(0x1a1410)
  // Seated legs (forward)
  for (const sx of [-0.09, 0.09] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.32), mat(0x3a3028))
    leg.position.set(sx, 0.12, 0.12)
    g.add(leg)
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.2), robe)
  torso.position.y = 0.38
  g.add(torso)
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.22), jade)
  sash.position.y = 0.32
  g.add(sash)
  for (const sx of [-0.18, 0.18] as const) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.09), robe)
    arm.position.set(sx, 0.4, 0)
    g.add(arm)
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), skin)
  head.position.y = 0.68
  g.add(head)
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), hair)
  bun.position.set(0, 0.78, -0.02)
  g.add(bun)
  // Small conical traveler hat
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.1, 6), mat(0xc4a860))
  hat.position.y = 0.82
  g.add(hat)
  g.userData.player = true
  return g
}

function bird() {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 4), mat(0xd8e0e8))
  mesh.rotation.z = Math.PI / 2
  return mesh
}

/** Low-poly deer silhouette along the bank. */
function deer(rng: () => number) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.22), mat(0x8a6040))
  body.position.y = 0.55
  g.add(body)
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.12), mat(0x8a6040))
  neck.position.set(0.28, 0.72, 0)
  neck.rotation.z = -0.35
  g.add(neck)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.14), mat(0x7a5038))
  head.position.set(0.42, 0.9, 0)
  g.add(head)
  for (const x of [-0.18, 0.12] as const) {
    for (const z of [-0.08, 0.08] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 4), mat(0x5a3a28))
      leg.position.set(x, 0.2, z)
      g.add(leg)
    }
  }
  if (rng() > 0.45) {
    const ant = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 4), mat(0xc4a070))
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
  const h = 1.4 + rng() * 1.1
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, h, 5), mat(0x4a3220))
  trunk.position.y = h / 2
  g.add(trunk)
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.55 - i * 0.12, 0.7 + rng() * 0.2, 6),
      mat(0x1f5a38),
    )
    cone.position.y = h * 0.45 + i * 0.45
    g.add(cone)
  }
  return g
}

/** Low-poly sakura — dark trunk + clustered pink blossom clouds. */
function cherryBlossom(rng: () => number) {
  const g = new THREE.Group()
  const h = 1.2 + rng() * 0.7
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, h, 5), mat(0x3a2a28))
  trunk.position.y = h / 2
  g.add(trunk)
  // Forked upper branch
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.55, 4), mat(0x3a2a28))
  fork.position.set(0.18, h + 0.1, 0)
  fork.rotation.z = -0.55
  g.add(fork)
  const pinks = [0xf2a8c4, 0xe890b0, 0xf8c4d8, 0xffd0e0]
  const cloudN = 4 + Math.floor(rng() * 3)
  for (let i = 0; i < cloudN; i++) {
    const blossom = new THREE.Mesh(
      new THREE.SphereGeometry(0.28 + rng() * 0.22, 5, 4),
      mat(pinks[Math.floor(rng() * pinks.length)]!),
    )
    blossom.position.set(
      (rng() - 0.5) * 1.1,
      h + 0.25 + rng() * 0.7,
      (rng() - 0.5) * 1.1,
    )
    blossom.scale.y = 0.7 + rng() * 0.25
    g.add(blossom)
  }
  // A few drifting petal chips (animated in the tick loop)
  for (let i = 0; i < 3; i++) {
    const petal = new THREE.Mesh(
      new THREE.CircleGeometry(0.06 + rng() * 0.03, 5),
      mat(0xf4b8cc, { side: THREE.DoubleSide }),
    )
    petal.position.set((rng() - 0.5) * 1.4, h + 0.4 + rng() * 0.8, (rng() - 0.5) * 1.4)
    petal.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
    petal.userData.petal = true
    petal.userData.phase = rng() * Math.PI * 2
    petal.userData.baseY = petal.position.y
    g.add(petal)
  }
  return g
}

/** Low-poly ginkgo — fan / umbrella canopy in gold–chartreuse. */
function ginkgo(rng: () => number) {
  const g = new THREE.Group()
  const h = 1.3 + rng() * 0.8
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, h, 5), mat(0x5a4030))
  trunk.position.y = h / 2
  g.add(trunk)
  const golds = [0xd4c04a, 0xc8b038, 0xe0d060, 0xa8c050]
  // Stacked cone “fans” — ginkgo’s broad triangular silhouette
  for (let i = 0; i < 3; i++) {
    const fan = new THREE.Mesh(
      new THREE.ConeGeometry(0.85 - i * 0.18, 0.45 + rng() * 0.15, 6),
      mat(golds[Math.floor(rng() * golds.length)]!),
    )
    fan.position.y = h * 0.55 + i * 0.38
    fan.rotation.y = rng() * Math.PI
    g.add(fan)
  }
  // Extra side fan for the classic split look
  if (rng() > 0.4) {
    const side = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.35, 5),
      mat(golds[Math.floor(rng() * golds.length)]!),
    )
    side.position.set((rng() > 0.5 ? 1 : -1) * 0.45, h + 0.15, 0)
    side.rotation.z = (rng() > 0.5 ? 1 : -1) * 0.5
    g.add(side)
  }
  return g
}

/** Low-poly poplar — tall columnar canopy along the banks. */
function poplar(rng: () => number) {
  const g = new THREE.Group()
  const h = 2.2 + rng() * 1.2
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, h, 5), mat(0x4a3828))
  trunk.position.y = h / 2
  g.add(trunk)
  const greens = [0x3d8a48, 0x4a9a50, 0x2f7a40]
  // Column of stretched spheres — slender upright silhouette
  const layers = 5 + Math.floor(rng() * 2)
  for (let i = 0; i < layers; i++) {
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.32 + rng() * 0.08, 5, 4),
      mat(greens[Math.floor(rng() * greens.length)]!),
    )
    const t = i / (layers - 1)
    // Taper toward the tip
    const w = 0.55 + Math.sin(t * Math.PI) * 0.45
    canopy.scale.set(w * 0.7, 1.15, w * 0.7)
    canopy.position.y = h * 0.35 + t * h * 0.7
    g.add(canopy)
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
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 2.2, 4, 8), mat(0x6a4a30))
  hull.rotation.z = Math.PI / 2
  hull.position.y = 0.22
  g.add(hull)
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.35), mat(0x4a3220))
  seat.position.set(0, 0.38, 0)
  g.add(seat)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 5), mat(0x3a2818))
  mast.position.set(0.15, 0.9, 0)
  g.add(mast)
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.85), mat(0x3dcfb6))
  sail.position.set(0.15, 0.95, 0.02)
  g.add(sail)
  // You — seated traveler with jade sash
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
function xiangyunCloud(rng: () => number) {
  const g = new THREE.Group()
  const tones = [0xf7f2e8, 0xfff8f0, 0xf0e6d8, 0xffecd8, 0xf8f0ff, 0xffe8c8]
  const tone = tones[Math.floor(rng() * tones.length)]!
  const cloudMat = mat(tone, { transparent: true, opacity: 0.82 + rng() * 0.12 })
  // Soft gold accent for the auspicious rim
  const rimMat = mat(0xe8c878, { transparent: true, opacity: 0.55 })

  const lobe = (sx: number, sy: number, sz: number, x: number, y: number, z: number, rim = false) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 5), rim ? rimMat : cloudMat)
    mesh.scale.set(sx, sy, sz)
    mesh.position.set(x, y, z)
    g.add(mesh)
  }

  // Ruyi head — three stacked curls (classic 如意云头)
  lobe(1.35, 0.55, 0.95, 0, 0.15, 0)
  lobe(0.95, 0.48, 0.75, -0.85, 0.35, 0.1)
  lobe(0.95, 0.48, 0.75, 0.85, 0.35, -0.05)
  // Upper crown curl
  lobe(0.7, 0.4, 0.55, 0, 0.7, 0.05, true)
  // Trailing body lobes (scrolling 流云)
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
  // Small spiral accent under the head
  lobe(0.45, 0.28, 0.4, 0.35, -0.15, 0.2)

  g.userData.xiangyun = true
  g.userData.phase = rng() * Math.PI * 2
  g.userData.drift = 0.15 + rng() * 0.35
  return g
}

/** Sky field of 祥云 — parallax layer above the river voyage. */
function xiangyunSky(seed: number) {
  const root = new THREE.Group()
  const rng = mulberry32(seed)
  const count = 14
  for (let i = 0; i < count; i++) {
    const cloud = xiangyunCloud(rng)
    const side = i % 2 === 0 ? 1 : -1
    const x = side * (6 + rng() * 22 + (i % 4) * 1.5)
    const y = 9 + rng() * 7
    const z = (rng() - 0.5) * 100
    cloud.position.set(x, y, z)
    cloud.rotation.y = (rng() - 0.5) * 0.8
    cloud.scale.setScalar(1.4 + rng() * 2.2)
    // Flatten slightly so they read as painted sky scrolls
    cloud.scale.y *= 0.75 + rng() * 0.2
    root.add(cloud)
  }
  // A few closer ceremonial banners of cloud
  for (let i = 0; i < 5; i++) {
    const cloud = xiangyunCloud(rng)
    cloud.position.set((rng() - 0.5) * 18, 7.5 + rng() * 3, -8 + i * 16)
    cloud.scale.setScalar(1.1 + rng() * 1.2)
    cloud.scale.y *= 0.7
    root.add(cloud)
  }
  root.userData.xiangyunSky = true
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

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5))
  renderer.setClearColor(SKY[hue], 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  // Slightly softer fog so distant Wulingyuan pillars stay readable
  scene.fog = new THREE.FogExp2(FOG[hue], 0.022)
  scene.background = new THREE.Color(SKY[hue])

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220)
  camera.position.set(0, 4.2, -6.5)

  const amb = new THREE.AmbientLight(0xb8d4e0, 0.62)
  scene.add(amb)
  const sun = new THREE.DirectionalLight(0xfff2d8, 0.85)
  sun.position.set(-4, 10, 2)
  scene.add(sun)

  const world = new THREE.Group()
  scene.add(world)

  const waterMat = mat(WATER[hue], { transparent: true, opacity: 0.88 })
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

  // 祥云 — auspicious Chinese sky scrolls
  const clouds = xiangyunSky(77)
  scene.add(clouds)

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

  // Finger / mouse orbit (inverted: drag right → cam left, drag down → cam up)
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
    // Inverted axes: opposite of drag direction
    yawTarget += dx * ORBIT_SENS
    pitchTarget = clampOrbitPitch(pitchTarget - dy * ORBIT_SENS)
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
    scene.background = new THREE.Color(SKY[hue])
    scene.fog = new THREE.FogExp2(FOG[hue], 0.022)
    renderer.setClearColor(SKY[hue], 1)
    waterMat.color.setHex(WATER[hue])
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
      amb.color.lerp(new THREE.Color(0xb8d4e0), 0.08)
      if (now >= flashUntil) flash = null
    }

    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }

  ensureChunks(voyageZ)
  raf = requestAnimationFrame(tick)

  return {
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
      renderer.dispose()
    },
  }
}
