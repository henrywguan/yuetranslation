/**
 * Harbor Quest · original player mannequin (“River Scout”).
 *
 * Anime dress-up proportions — smooth high-res meshes, expressive face,
 * fashion silhouette. Characters prioritize “want to dress up” over RS chunk.
 * World props may stay era-chunky; this kit does not.
 *
 * Original Harbor meshes — never Jagex IP / STL imports.
 * See docs/harbor-quest/character-looks-v1-v4.md.
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
  harborFigureForeheadBangs,
  harborFigureHead,
  harborFigureHeadExtents,
  harborFigureLegSeated,
  harborFigureLegStanding,
  harborFigureMat,
  harborFigureNeck,
  harborFigureTorso,
  HARBOR_FIGURE_HEAD_R,
  HARBOR_FIGURE_PROPORTIONS,
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
  /**
   * Never attach Meshy Scout GLB (Barber / character-create / profile previews).
   * Dress-up cameras must keep the procedural kit so hair/skin edits stay visible.
   */
  skipScoutGlb?: boolean
}

/** Locked Harbor swatches — soft anime dress-up palette. */
export const HARBOR_PROTAGONIST_PALETTE = {
  skin: 0xf0d0b8,
  hair: 0x1a1410,
  robe: 0x1e3a48, // ink-harbor blue (brand)
  robeShadow: 0x162830,
  pants: 0x3a3028,
  jade: 0x3dcfb6,
  straw: 0xc4a860,
  leather: 0x6a4a30,
  chop: 0x2a8a6a, // small jade seal pendant
} as const

function mat(color: number) {
  return harborFigureMat(color)
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

/**
 * Anime hair volumes — crown sits on the back of the skull; bangs sit
 * above the eyes (bangZ / harborFigureHeadExtents). Full scalp cover on
 * traveler bun — never a friar bald patch. Silhouette categories stay
 * distinct at dress-up distance — original Harbor meshes.
 */
function addHair(
  g: THREE.Group,
  style: HarborHairStyle,
  headY: number,
  hairMat: THREE.Material,
  gender: HarborGender,
) {
  const hairRoot = new THREE.Group()
  hairRoot.name = 'scout-hair'
  hairRoot.userData.harborHair = true

  const { x: sx, y: sy, z: sz } = harborFigureHeadExtents()
  const crownY = headY + sy * 0.62
  const bangZ = sz + 0.03
  const backZ = -(sz + 0.04)

  const addCrownShell = (scaleY = 0.7) => {
    const cap = part(
      new THREE.Mesh(new THREE.SphereGeometry(HARBOR_FIGURE_HEAD_R * 1.12, 20, 16), hairMat),
      'hair',
    )
    // Pushed up and back so the painted face stays open.
    cap.position.set(0, headY + sy * 0.48, -0.05)
    cap.scale.set(1.05, scaleY, 0.95)
    hairRoot.add(cap)
  }

  const addBangs = (clumps = 3) => {
    const bangs = harborFigureForeheadBangs(hairMat, headY, { clumps })
    tagTree(bangs, 'hair')
    hairRoot.add(bangs)
  }

  if (style === 'bald') {
    const ring = part(new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.02, 8, 16), hairMat), 'hair')
    ring.position.set(0, crownY - 0.02, 0)
    ring.rotation.x = Math.PI / 2
    hairRoot.add(ring)
  } else if (style === 'short') {
    addCrownShell(0.66)
    addBangs(3)
  } else if (style === 'bun') {
    const scalp = part(
      new THREE.Mesh(new THREE.SphereGeometry(HARBOR_FIGURE_HEAD_R * 1.14, 20, 16), hairMat),
      'hair',
    )
    scalp.scale.set(1.08, 0.72, 1.0)
    scalp.position.set(0, headY + sy * 0.42, -0.048)
    hairRoot.add(scalp)
    for (const side of [-1, 1] as const) {
      const sideHair = part(new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.11, 4, 8), hairMat), 'hair')
      sideHair.position.set(side * (sx + 0.018), headY + 0.01, sz * 0.05)
      hairRoot.add(sideHair)
    }
    addBangs(3)
    const bun = part(new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), hairMat), 'hair')
    bun.position.set(0, crownY + 0.1, -0.05)
    hairRoot.add(bun)
  } else if (style === 'topknot') {
    addCrownShell(0.68)
    const knot = part(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), hairMat), 'hair')
    knot.position.set(0, crownY + 0.08, -0.02)
    hairRoot.add(knot)
    const pin = part(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8), hairMat), 'hair')
    pin.rotation.z = Math.PI / 2
    pin.position.set(0, crownY + 0.12, -0.02)
    hairRoot.add(pin)
  } else if (style === 'long') {
    addCrownShell(0.7)
    const fall = part(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), hairMat), 'hair')
    fall.scale.set(0.95, 1.8, 0.55)
    fall.position.set(0, headY - 0.06, backZ)
    hairRoot.add(fall)
    if (gender === 'female') {
      for (const side of [-1, 1] as const) {
        const curtain = part(new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.16, 4, 8), hairMat), 'hair')
        curtain.position.set(side * (sx + 0.028), headY - 0.02, 0.01)
        hairRoot.add(curtain)
      }
    }
    addBangs(4)
  } else if (style === 'fringe') {
    addCrownShell(0.68)
    addBangs(5)
    for (const side of [-1, 1] as const) {
      const temple = part(new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.08, 4, 8), hairMat), 'hair')
      temple.position.set(side * (sx + 0.02), headY + 0.02, sz * 0.15)
      hairRoot.add(temple)
    }
    const back = part(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), hairMat), 'hair')
    back.scale.set(1, 1.05, 0.5)
    back.position.set(0, headY + 0.02, backZ)
    hairRoot.add(back)
  } else if (style === 'curtains') {
    addCrownShell(0.66)
    for (const side of [-1, 1] as const) {
      const fall = part(new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.18, 4, 8), hairMat), 'hair')
      fall.position.set(side * (sx + 0.032), headY - 0.03, sz * 0.08)
      hairRoot.add(fall)
    }
    addBangs(2)
  } else if (style === 'ridge') {
    const crest = part(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), hairMat), 'hair')
    crest.scale.set(0.4, 1.05, 1.25)
    crest.position.set(0, crownY + 0.02, -0.02)
    hairRoot.add(crest)
    const tip = part(new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), hairMat), 'hair')
    tip.position.set(0, crownY + 0.1, bangZ - 0.04)
    hairRoot.add(tip)
  } else if (style === 'pony') {
    addCrownShell(0.66)
    addBangs(3)
    const tie = part(new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), hairMat), 'hair')
    tie.position.set(0, headY + sy * 0.2, backZ + 0.02)
    hairRoot.add(tie)
    const tail = part(new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.2, 4, 8), hairMat), 'hair')
    tail.position.set(0, headY - 0.06, backZ - 0.01)
    hairRoot.add(tail)
  } else if (style === 'twin') {
    addCrownShell(0.66)
    for (const side of [-1, 1] as const) {
      const loop = part(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), hairMat), 'hair')
      loop.position.set(side * 0.1, crownY + 0.02, -0.03)
      hairRoot.add(loop)
    }
    addBangs(3)
  } else if (style === 'wave') {
    const mound = part(
      new THREE.Mesh(new THREE.SphereGeometry(HARBOR_FIGURE_HEAD_R * 1.12, 18, 14), hairMat),
      'hair',
    )
    mound.scale.set(1.06, 0.7, 0.95)
    mound.position.set(0, headY + sy * 0.5, -0.05)
    hairRoot.add(mound)
    addBangs(4)
    const sideSweep = part(new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.1, 4, 8), hairMat), 'hair')
    sideSweep.rotation.z = -0.35
    sideSweep.position.set(0.1, headY + 0.03, sz * 0.2)
    hairRoot.add(sideSweep)
  }

  g.add(hairRoot)
}


function addEyes(g: THREE.Group, appearance: HarborAppearance, headY: number, skin: THREE.Material) {
  const iris = HARBOR_EYE_COLORS[appearance.eyeColor] ?? 0x2a3a5a
  const browHex = HARBOR_HAIR_COLORS[appearance.hairColor] ?? HARBOR_PROTAGONIST_PALETTE.hair
  const face = harborFigureFace(skin, headY, {
    iris,
    eyeStyle: appearance.eyeStyle,
    faceStyle: appearance.faceStyle,
    showBrows: true,
    showMouth: appearance.faceStyle !== 'calm',
    // Soft anime blush always — Cheerful is stronger
    blush: appearance.faceStyle === 'cheerful' ? 0xff9aa8 : 0xffc0c8,
    brow: browHex,
    lip: appearance.faceStyle === 'cheerful' ? 0xd06070 : 0xc86878,
  })
  face.name = 'scout-eyes'
  face.userData.harborEyes = true
  face.userData.harborEyeStyle = appearance.eyeStyle
  face.userData.harborBrows = true
  face.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    if (m.material === skin) m.userData.harborPart = 'skin'
  })
  g.add(face)
}

/**
 * Build the original River Scout — anime dress-up body.
 * Standing ~1.42u tall with a visible neck; seated is canoe-ready.
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
  // Anime fashion — tall legs + visible neck for dress-up silhouette.
  const pelvisY = pose === 'standing' ? 0.72 : 0.3
  const torsoH = HARBOR_FIGURE_PROPORTIONS.torsoH
  const neckH = HARBOR_FIGURE_PROPORTIONS.neckH
  const torsoTop = pelvisY + torsoH
  const headY = torsoTop + neckH + HARBOR_FIGURE_HEAD_R * 0.82
  g.userData.pelvisY = pelvisY
  g.userData.headY = headY
  g.userData.torsoTop = torsoTop
  g.userData.harborModular = true
  g.userData.figureProportions = HARBOR_FIGURE_PROPORTIONS
  g.userData.characterStyle = 'anime-dressup'

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

  const shoulder = gender === 'female' ? 0.14 : HARBOR_FIGURE_PROPORTIONS.shoulder
  const waist = gender === 'female' ? 0.1 : HARBOR_FIGURE_PROPORTIONS.waist
  const armSpread = gender === 'female' ? 0.2 : 0.22
  const hip = gender === 'female' ? 0.34 : 0.32
  const depth = HARBOR_FIGURE_PROPORTIONS.depth

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

  // —— Soft fashion torso ——
  const torso = part(
    harborFigureTorso(robe, pelvisY + torsoH * 0.5, { shoulder, waist, h: torsoH, depth }),
    'top',
  )
  g.add(torso)
  const collar = part(
    harborFigureTorso(robeDeep, pelvisY + torsoH * 0.92, {
      shoulder: shoulder + 0.01,
      waist: shoulder,
      h: 0.055,
      depth: depth + 0.012,
    }),
    'topAccent',
  )
  g.add(collar)
  const sash = new THREE.Mesh(new THREE.BoxGeometry(hip, 0.05, depth + 0.012), jade)
  sash.position.y = pelvisY + 0.04
  g.add(sash)
  const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), chop)
  pendant.scale.set(1, 1.15, 0.55)
  pendant.position.set(0, pelvisY + torsoH * 0.45, depth * 0.55)
  g.add(pendant)
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), jade)
  cord.position.set(0, pelvisY + torsoH * 0.62, depth * 0.5)
  g.add(cord)

  // —— Arms ——
  const armY = pelvisY + torsoH * 0.82
  for (const side of [-1, 1] as const) {
    const arm = harborFigureArm(robe, skin, side, armY, armSpread)
    arm.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.userData.harborPart = m.material === skin ? 'skin' : 'top'
    })
    g.add(arm)
    const handY = typeof arm.userData.handY === 'number' ? arm.userData.handY : armY - 0.3
    const handZ = typeof arm.userData.handZ === 'number' ? arm.userData.handZ : 0.08
    g.add(socket(side > 0 ? 'hand_r' : 'hand_l', side * armSpread, handY, handZ))
  }

  // —— Smooth head + visible neck + anime face ——
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
    const brim = part(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.035, 16), straw), 'hat')
    brim.position.y = headY + HARBOR_FIGURE_HEAD_R * 0.55
    g.add(brim)
    const crown = part(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.13, 14), straw), 'hat')
    crown.position.y = headY + HARBOR_FIGURE_HEAD_R * 0.95
    g.add(crown)
    const bead = part(new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), jade), 'hatAccent')
    bead.position.y = headY + HARBOR_FIGURE_HEAD_R * 1.3
    g.add(bead)
  }
  g.add(socket('head', 0, headY + HARBOR_FIGURE_HEAD_R * 1.4, 0))

  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), leather)
  bag.scale.set(1.05, 1.2, 0.8)
  bag.position.set(-0.22, pelvisY + 0.02, 0.05)
  bag.rotation.z = 0.12
  g.add(bag)
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.07), mat(0x5a3a22))
  flap.position.set(-0.22, pelvisY + 0.08, 0.05)
  g.add(flap)
  g.add(socket('hip_l', -0.22, pelvisY + 0.02, 0.08))
  g.add(socket('back', 0, pelvisY + torsoH * 0.55, -depth * 0.55))

  // Standing voyage uses the dress-up figure kit (not the Meshy GLB).
  // Barber / create / profile pass skipScoutGlb so previews stay procedural.
  // Never attach — GLB + cel hid the body on iPhone.
  g.userData.usesScoutGlb = false
  g.userData.skipScoutGlb = Boolean(opts.skipScoutGlb)

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
