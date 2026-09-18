/**
 * Harbor Quest · original player mannequin (“River Scout”).
 *
 * RS2/OSRS-*era* proportion grammar (chunky head/hands, faceted limbs,
 * tapered torso) — modeled from scratch via harborFigure kit. Not Jagex IP.
 *
 * See docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md (§3 proportions, §7 legal).
 */
import * as THREE from 'three'
import {
  HARBOR_DEFAULT_APPEARANCE,
  HARBOR_EYE_COLORS,
  HARBOR_HAIR_COLORS,
  HARBOR_SKIN_TONES,
  sanitizeHarborAppearance,
  sanitizeHarborGender,
  type HarborAppearance,
  type HarborGender,
  type HarborHairStyle,
} from './harborAppearance'
import {
  harborFigureArm,
  harborFigureEars,
  harborFigureFace,
  harborFigureHead,
  harborFigureLegSeated,
  harborFigureLegStanding,
  harborFigureNeck,
  harborFigureTorso,
} from './harborFigure'

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
  gender?: HarborGender
  appearance?: HarborAppearance
  /** Hide the straw traveler hat (character-create preview). */
  bareHead?: boolean
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

function tagTree(root: THREE.Object3D, harborPart: string) {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) m.userData.harborPart = harborPart
  })
}

function socket(name: HarborProtagonistSocket, x: number, y: number, z: number) {
  const s = new THREE.Object3D()
  s.name = name
  s.position.set(x, y, z)
  return s
}

function addHair(
  g: THREE.Group,
  style: HarborHairStyle,
  headY: number,
  hairMat: THREE.MeshLambertMaterial,
  gender: HarborGender,
) {
  const hairRoot = new THREE.Group()
  hairRoot.name = 'scout-hair'
  hairRoot.userData.harborHair = true

  // Faceted hair cap (icosa shell) — sits on the skull, not a smooth blob
  const cap = part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), hairMat), 'hair')
  cap.position.set(0, headY + 0.05, -0.02)
  cap.scale.set(1.05, 0.55, 1.0)
  hairRoot.add(cap)

  if (style === 'short') {
    const fringe = part(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.07), hairMat), 'hair')
    fringe.position.set(0, headY + 0.035, 0.1)
    hairRoot.add(fringe)
  } else if (style === 'bun') {
    const bun = part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.065, 0), hairMat), 'hair')
    bun.position.set(0, headY + 0.12, -0.04)
    hairRoot.add(bun)
  } else if (style === 'topknot') {
    const bun = part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.065, 0), hairMat), 'hair')
    bun.position.set(0, headY + 0.16, 0)
    hairRoot.add(bun)
    const pin = part(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), hairMat), 'hair')
    pin.position.set(0, headY + 0.2, 0)
    hairRoot.add(pin)
  } else if (style === 'long') {
    const fall = part(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.1), hairMat), 'hair')
    fall.position.set(0, headY - 0.06, -0.12)
    hairRoot.add(fall)
    if (gender === 'female') {
      const sideL = part(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), hairMat), 'hair')
      sideL.position.set(-0.14, headY - 0.02, 0.02)
      hairRoot.add(sideL)
      const sideR = part(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), hairMat), 'hair')
      sideR.position.set(0.14, headY - 0.02, 0.02)
      hairRoot.add(sideR)
    }
  } else if (style === 'fringe') {
    const fringe = part(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.1), hairMat), 'hair')
    fringe.position.set(0, headY + 0.05, 0.11)
    hairRoot.add(fringe)
    const back = part(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.1), hairMat), 'hair')
    back.position.set(0, headY - 0.02, -0.12)
    hairRoot.add(back)
  } else if (style === 'twin') {
    for (const sx of [-0.12, 0.12] as const) {
      const loop = part(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.025, 5, 8), hairMat), 'hair')
      loop.position.set(sx, headY + 0.1, -0.02)
      loop.rotation.y = Math.PI / 2
      hairRoot.add(loop)
    }
    const bang = part(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), hairMat), 'hair')
    bang.position.set(0, headY + 0.04, 0.1)
    hairRoot.add(bang)
  } else if (style === 'wave') {
    const mound = part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), hairMat), 'hair')
    mound.scale.set(1.2, 0.65, 1.05)
    mound.position.set(0, headY + 0.08, -0.02)
    hairRoot.add(mound)
    const wave = part(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.12), hairMat), 'hair')
    wave.position.set(0, headY + 0.02, 0.1)
    wave.rotation.x = -0.25
    hairRoot.add(wave)
  }

  g.add(hairRoot)
}

function addEyes(g: THREE.Group, appearance: HarborAppearance, headY: number, skin: THREE.Material) {
  const iris = HARBOR_EYE_COLORS[appearance.eyeColor] ?? 0x1a1814
  const style = appearance.eyeStyle
  const eyeW = style === 'almond' ? 0.045 : style === 'bright' ? 0.055 : 0.048
  const eyeH = style === 'sleepy' ? 0.022 : style === 'almond' ? 0.028 : 0.032
  const eyeY = style === 'sleepy' ? -0.01 : 0.015
  const face = harborFigureFace(skin, headY, {
    iris,
    eyeW,
    eyeH,
    eyeY,
    showBrows: appearance.faceStyle === 'sharp',
    showMouth: true,
    blush: appearance.faceStyle === 'cheerful' ? 0xe8a090 : null,
    brow: 0x2a2018,
  })
  face.name = 'scout-eyes'
  face.userData.harborEyes = true
  // Tag face planes so skin recolor doesn't wipe iris (iris keeps own mat)
  face.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    // Nose uses shared skin mat — mark skin; eyes keep their own mats unmarked as skin recolor targets via harborPart
    if (m.material === skin) m.userData.harborPart = 'skin'
  })
  g.add(face)
}

/**
 * Build the original River Scout mannequin.
 * Standing ~1.05u tall; seated is canoe-ready (legs forward).
 */
export function buildHarborProtagonist(opts: HarborProtagonistOptions = {}): THREE.Group {
  const pose: HarborProtagonistPose = opts.pose ?? 'standing'
  const gender = sanitizeHarborGender(opts.gender ?? 'male')
  const appearance = sanitizeHarborAppearance(opts.appearance ?? HARBOR_DEFAULT_APPEARANCE)
  const bareHead = Boolean(opts.bareHead)

  const g = new THREE.Group()
  g.name = HARBOR_PROTAGONIST_ID
  g.userData.player = true
  g.userData.protagonistId = HARBOR_PROTAGONIST_ID
  g.userData.originalHarborAsset = true
  g.userData.gender = gender
  g.userData.appearance = appearance
  g.userData.pelvisY = pose === 'standing' ? 0.48 : 0.28
  g.userData.headY = (pose === 'standing' ? 0.48 : 0.28) + 0.58
  g.userData.harborModular = true

  const skinHex = HARBOR_SKIN_TONES[appearance.skinTone] ?? HARBOR_PROTAGONIST_PALETTE.skin
  const hairHex = HARBOR_HAIR_COLORS[appearance.hairColor] ?? HARBOR_PROTAGONIST_PALETTE.hair

  const skin = mat(skinHex)
  const hairMat = mat(hairHex)
  const robe = mat(HARBOR_PROTAGONIST_PALETTE.robe)
  const robeDeep = mat(HARBOR_PROTAGONIST_PALETTE.robeShadow)
  const pants = mat(HARBOR_PROTAGONIST_PALETTE.pants)
  const jade = mat(HARBOR_PROTAGONIST_PALETTE.jade)
  const straw = mat(HARBOR_PROTAGONIST_PALETTE.straw)
  const leather = mat(HARBOR_PROTAGONIST_PALETTE.leather)
  const chop = mat(HARBOR_PROTAGONIST_PALETTE.chop)

  const shoulder = gender === 'female' ? 0.17 : 0.19
  const waist = gender === 'female' ? 0.155 : 0.16
  const armSpread = gender === 'female' ? 0.22 : 0.24
  const hip = gender === 'female' ? 0.4 : 0.38

  // —— Legs ——
  if (pose === 'standing') {
    for (const side of [-1, 1] as const) {
      const leg = harborFigureLegStanding(pants, leather, side)
      tagTree(leg, 'bottom')
      leg.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh && m.material === leather) m.userData.harborPart = 'shoes'
      })
      g.add(leg)
    }
  } else {
    for (const side of [-1, 1] as const) {
      const leg = harborFigureLegSeated(pants, leather, side)
      tagTree(leg, 'bottom')
      leg.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh && m.material === leather) m.userData.harborPart = 'shoes'
      })
      g.add(leg)
    }
  }

  // —— Tapered torso (6-gon) ——
  const pelvisY = pose === 'standing' ? 0.48 : 0.28
  const torso = part(
    harborFigureTorso(robe, pelvisY + 0.22, { shoulder, waist, h: 0.42, depth: 0.24 }),
    'top',
  )
  g.add(torso)
  const collar = part(
    harborFigureTorso(robeDeep, pelvisY + 0.42, {
      shoulder: shoulder + 0.01,
      waist: shoulder,
      h: 0.08,
      depth: 0.26,
    }),
    'topAccent',
  )
  g.add(collar)
  const sash = new THREE.Mesh(new THREE.BoxGeometry(hip, 0.07, 0.26), jade)
  sash.position.y = pelvisY + 0.1
  g.add(sash)
  const pendant = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.03), chop)
  pendant.position.set(0, pelvisY + 0.26, 0.13)
  g.add(pendant)
  const cord = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), jade)
  cord.position.set(0, pelvisY + 0.32, 0.12)
  g.add(cord)

  // —— Segmented arms + mittens ——
  const armY = pelvisY + 0.34
  for (const side of [-1, 1] as const) {
    const arm = harborFigureArm(robe, skin, side, armY, armSpread)
    arm.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.userData.harborPart = m.material === skin ? 'skin' : 'top'
    })
    g.add(arm)
    g.add(socket(side > 0 ? 'hand_r' : 'hand_l', side * armSpread, armY - 0.3, 0.08))
  }

  // —— Faceted head + flush face ——
  const headY = pelvisY + 0.58
  const head = part(harborFigureHead(skin, headY), 'skin')
  g.add(head)
  const neck = part(harborFigureNeck(skin, headY), 'skin')
  g.add(neck)
  const ears = harborFigureEars(skin, headY)
  tagTree(ears, 'skin')
  g.add(ears)

  addHair(g, appearance.hairStyle, headY, hairMat, gender)
  addEyes(g, appearance, headY, skin)

  if (!bareHead) {
    const brim = part(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 8), straw), 'hat')
    brim.position.y = headY + 0.1
    g.add(brim)
    const crown = part(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 7), straw), 'hat')
    crown.position.y = headY + 0.18
    g.add(crown)
    const bead = part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), jade), 'hatAccent')
    bead.position.y = headY + 0.26
    g.add(bead)
  }
  g.add(socket('head', 0, headY + 0.28, 0))

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
