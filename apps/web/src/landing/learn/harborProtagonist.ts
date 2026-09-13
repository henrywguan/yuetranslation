/**
 * Harbor Quest · original player mannequin (“River Scout”).
 *
 * RS2/OSRS-*era* proportion grammar only (chunky head/hands, faceted limbs,
 * boxy torso) — modeled from scratch. Not extracted from any Jagex cache,
 * not a recolor/retopo of Bob / default player, not Jagex IP.
 *
 * See docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md (§3 proportions, §7 legal).
 */
import * as THREE from 'three'

/** Stable id for smokes / future kitbash slots. */
export const HARBOR_PROTAGONIST_ID = 'river-scout' as const

/** Attachment sockets for tools / hats / bags (empty Object3Ds). */
export const HARBOR_PROTAGONIST_SOCKETS = [
  'hand_r',
  'hand_l',
  'head',
  'back',
  'hip_l',
] as const
export type HarborProtagonistSocket = (typeof HARBOR_PROTAGONIST_SOCKETS)[number]

export type HarborProtagonistPose = 'standing' | 'seated'

export type HarborProtagonistOptions = {
  pose?: HarborProtagonistPose
}

/** Locked Harbor swatches — posterized, distinct value steps. */
export const HARBOR_PROTAGONIST_PALETTE = {
  skin: 0xe8c4a8,
  hair: 0x1a1410,
  robe: 0x1e3a48, // ink-harbor blue (brand, not OSRS UI chrome)
  robeShadow: 0x162830,
  pants: 0x3a3028,
  jade: 0x3dcfb6,
  straw: 0xc4a860,
  leather: 0x6a4a30,
  chop: 0x2a8a6a, // small jade seal pendant
} as const

function mat(color: number) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true })
}

/** Tag a mesh so lookColors / applyLook can recolor it. */
function part(mesh: THREE.Mesh, harborPart: string) {
  mesh.userData.harborPart = harborPart
  return mesh
}

function socket(name: HarborProtagonistSocket, x: number, y: number, z: number) {
  const s = new THREE.Object3D()
  s.name = name
  s.position.set(x, y, z)
  return s
}

/**
 * Build the original River Scout mannequin.
 * Standing ~1.05u tall; seated is canoe-ready (legs forward).
 */
export function buildHarborProtagonist(opts: HarborProtagonistOptions = {}): THREE.Group {
  const pose: HarborProtagonistPose = opts.pose ?? 'standing'
  const g = new THREE.Group()
  g.name = HARBOR_PROTAGONIST_ID
  g.userData.player = true
  g.userData.protagonistId = HARBOR_PROTAGONIST_ID
  g.userData.originalHarborAsset = true

  const skin = mat(HARBOR_PROTAGONIST_PALETTE.skin)
  const hair = mat(HARBOR_PROTAGONIST_PALETTE.hair)
  const robe = mat(HARBOR_PROTAGONIST_PALETTE.robe)
  const robeDeep = mat(HARBOR_PROTAGONIST_PALETTE.robeShadow)
  const pants = mat(HARBOR_PROTAGONIST_PALETTE.pants)
  const jade = mat(HARBOR_PROTAGONIST_PALETTE.jade)
  const straw = mat(HARBOR_PROTAGONIST_PALETTE.straw)
  const leather = mat(HARBOR_PROTAGONIST_PALETTE.leather)
  const chop = mat(HARBOR_PROTAGONIST_PALETTE.chop)

  // —— Legs (faceted 6-gon cylinders; short + thick) ——
  if (pose === 'standing') {
    for (const sx of [-0.1, 0.1] as const) {
      const thigh = part(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.28, 6), pants), 'bottom')
      thigh.position.set(sx, 0.28, 0)
      g.add(thigh)
      const shin = part(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.26, 6), pants), 'bottom')
      shin.position.set(sx, 0.08, 0.01)
      g.add(shin)
      // Chunky boot
      const boot = part(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), leather), 'shoes')
      boot.position.set(sx, 0.04, 0.04)
      g.add(boot)
    }
  } else {
    // Seated: thighs forward along +Z (canoe sit)
    for (const sx of [-0.1, 0.1] as const) {
      const thigh = part(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.34), pants), 'bottom')
      thigh.position.set(sx, 0.14, 0.14)
      g.add(thigh)
      const boot = part(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.14), leather), 'shoes')
      boot.position.set(sx, 0.08, 0.34)
      g.add(boot)
    }
  }

  // —— Stocky torso slab ——
  const pelvisY = pose === 'standing' ? 0.48 : 0.28
  const torso = part(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.24), robe), 'top')
  torso.position.y = pelvisY + 0.22
  g.add(torso)
  // Collar / shoulder shelf (extruded, not a decal)
  const collar = part(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.26), robeDeep), 'topAccent')
  collar.position.y = pelvisY + 0.42
  g.add(collar)
  // Jade sash — Harbor Quest “you” signal
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.26), jade)
  sash.position.y = pelvisY + 0.12
  g.add(sash)
  // Small jade chop pendant (Harbor twist — not a Jagex amulet)
  const pendant = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.03), chop)
  pendant.position.set(0, pelvisY + 0.28, 0.14)
  g.add(pendant)
  const cord = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), jade)
  cord.position.set(0, pelvisY + 0.34, 0.13)
  g.add(cord)

  // —— Arms + mitten hands ——
  const armY = pelvisY + 0.28
  for (const side of [-1, 1] as const) {
    const arm = part(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.34, 6), robe), 'top')
    arm.position.set(side * 0.24, armY, 0)
    g.add(arm)
    // Mitten (oversized readable hand)
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), skin)
    hand.position.set(side * 0.24, armY - 0.2, 0.02)
    g.add(hand)
    g.add(socket(side > 0 ? 'hand_r' : 'hand_l', side * 0.24, armY - 0.2, 0.08))
  }

  // —— Oversized head (era grammar) ——
  const headY = pelvisY + 0.58
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), skin)
  head.position.y = headY
  g.add(head)
  // Short neck stub
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 6), skin)
  neck.position.y = headY - 0.14
  g.add(neck)
  // Hair plate + bun
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), hair)
  hairCap.position.set(0, headY + 0.06, -0.02)
  hairCap.scale.set(1, 0.55, 1)
  g.add(hairCap)
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), hair)
  bun.position.set(0, headY + 0.12, -0.04)
  g.add(bun)

  // Straw traveler hat + jade bead tip (Harbor twist)
  const brim = part(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 8), straw), 'hat')
  brim.position.y = headY + 0.1
  g.add(brim)
  const crown = part(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 7), straw), 'hat')
  crown.position.y = headY + 0.18
  g.add(crown)
  const bead = part(new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), jade), 'hatAccent')
  bead.position.y = headY + 0.26
  g.add(bead)
  g.add(socket('head', 0, headY + 0.28, 0))

  // Cloth satchel on left hip (readable prop, original)
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.08), leather)
  bag.position.set(-0.26, pelvisY + 0.02, 0.06)
  bag.rotation.z = 0.15
  g.add(bag)
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.09), mat(0x5a3a22))
  flap.position.set(-0.26, pelvisY + 0.1, 0.06)
  g.add(flap)
  g.add(socket('hip_l', -0.26, pelvisY + 0.02, 0.1))
  g.add(socket('back', 0, pelvisY + 0.3, -0.14))

  return g
}

/** Count mesh children (smoke / budget smell-test). */
export function countProtagonistMeshes(root: THREE.Object3D): number {
  let n = 0
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n += 1
  })
  return n
}

export function listProtagonistSockets(root: THREE.Object3D): string[] {
  const names: string[] = []
  root.traverse((o) => {
    if (HARBOR_PROTAGONIST_SOCKETS.includes(o.name as HarborProtagonistSocket)) {
      names.push(o.name)
    }
  })
  return names.sort()
}
