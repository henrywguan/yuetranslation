/**
 * Harbor Quest · original player mannequin (“River Scout”).
 *
 * RS2/OSRS-*era* proportion grammar (oversized potato head, stocky slab,
 * short thick limbs, mitten hands) — modeled from scratch via harborFigure
 * kit. Not Jagex IP; public “bot” STLs are study-only (never imported).
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
  harborFigureHeadExtents,
  harborFigureLegSeated,
  harborFigureLegStanding,
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

/**
 * Hairdresser-style shells — sit *on* the skull (RS creation / salon grammar).
 * Bang & fall pieces stay outside head extents so they never pierce the face.
 * Silhouette categories nod at Falador Hairdresser variety (bald / curtains /
 * ridge / pony…) — original Harbor meshes, not Jagex IP.
 */
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

  const { x: sx, y: sy, z: sz } = harborFigureHeadExtents()
  const crownY = headY + sy * 0.55
  const bangZ = sz + 0.045
  const backZ = -(sz + 0.04)

  const addCrownShell = (scaleY = 0.78) => {
    // Must clear the oversized potato crown — a too-flat shell leaves a
    // friar’s bald patch (bug with Traveler bun after headR bump).
    const cap = part(
      new THREE.Mesh(new THREE.IcosahedronGeometry(HARBOR_FIGURE_HEAD_R * 1.22, 0), hairMat),
      'hair',
    )
    cap.position.set(0, headY + sy * 0.38, -0.015)
    cap.scale.set(1.16, scaleY, 1.14)
    hairRoot.add(cap)
  }

  if (style === 'bald') {
    // River tonsure — thin ring only (monk / shaved grammar)
    const ring = part(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 5, 10), hairMat), 'hair')
    ring.position.set(0, crownY - 0.02, 0)
    ring.rotation.x = Math.PI / 2
    hairRoot.add(ring)
  } else if (style === 'short') {
    addCrownShell(0.72)
    const fringe = part(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.04), hairMat), 'hair')
    fringe.position.set(0, headY + 0.04, bangZ)
    hairRoot.add(fringe)
  } else if (style === 'bun') {
    // Traveler bun — full scalp cover + crown knot (never a friar ring)
    const scalp = part(
      new THREE.Mesh(new THREE.IcosahedronGeometry(HARBOR_FIGURE_HEAD_R * 1.24, 0), hairMat),
      'hair',
    )
    scalp.scale.set(1.18, 0.88, 1.14)
    scalp.position.set(0, headY + sy * 0.32, -0.02)
    hairRoot.add(scalp)
    for (const side of [-1, 1] as const) {
      const sideHair = part(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.085), hairMat), 'hair')
      sideHair.position.set(side * (sx + 0.025), headY - 0.01, sz * 0.12)
      hairRoot.add(sideHair)
    }
    const fringe = part(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.045, 0.04), hairMat), 'hair')
    fringe.position.set(0, headY + 0.045, bangZ)
    hairRoot.add(fringe)
    const bunBase = part(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.035, 6), hairMat), 'hair')
    bunBase.position.set(0, crownY + 0.04, -0.04)
    hairRoot.add(bunBase)
    const bun = part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), hairMat), 'hair')
    bun.position.set(0, crownY + 0.1, -0.045)
    hairRoot.add(bun)
  } else if (style === 'topknot') {
    addCrownShell(0.75)
    const knot = part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), hairMat), 'hair')
    knot.position.set(0, crownY + 0.08, 0)
    hairRoot.add(knot)
    const pin = part(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.018), hairMat), 'hair')
    pin.position.set(0, crownY + 0.12, 0)
    hairRoot.add(pin)
  } else if (style === 'long') {
    addCrownShell(0.78)
    const fall = part(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.08), hairMat), 'hair')
    fall.position.set(0, headY - 0.04, backZ)
    hairRoot.add(fall)
    if (gender === 'female') {
      for (const side of [-1, 1] as const) {
        const curtain = part(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.055), hairMat), 'hair')
        curtain.position.set(side * (sx + 0.035), headY - 0.02, 0.02)
        hairRoot.add(curtain)
      }
    }
    const bang = part(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.04), hairMat), 'hair')
    bang.position.set(0, headY + 0.05, bangZ)
    hairRoot.add(bang)
  } else if (style === 'fringe') {
    addCrownShell(0.78)
    const fringe = part(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.045), hairMat), 'hair')
    fringe.position.set(0, headY + 0.045, bangZ)
    hairRoot.add(fringe)
    for (const side of [-1, 1] as const) {
      const temple = part(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.06), hairMat), 'hair')
      temple.position.set(side * (sx + 0.03), headY + 0.02, sz * 0.35)
      hairRoot.add(temple)
    }
    const back = part(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.08), hairMat), 'hair')
    back.position.set(0, headY - 0.01, backZ)
    hairRoot.add(back)
  } else if (style === 'curtains') {
    // Pier curtains — long side falls framing the face (classic salon silhouette)
    addCrownShell(0.72)
    for (const side of [-1, 1] as const) {
      const fall = part(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.3, 0.07), hairMat), 'hair')
      fall.position.set(side * (sx + 0.04), headY - 0.04, sz * 0.25)
      hairRoot.add(fall)
    }
    const midBang = part(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.035), hairMat), 'hair')
    midBang.position.set(0, headY + 0.055, bangZ)
    hairRoot.add(midBang)
  } else if (style === 'ridge') {
    // Tide ridge — center crest (mohawk / frohawk grammar)
    const crest = part(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.22), hairMat), 'hair')
    crest.position.set(0, crownY + 0.02, 0.02)
    hairRoot.add(crest)
    const tip = part(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.06), hairMat), 'hair')
    tip.position.set(0, crownY + 0.1, bangZ - 0.02)
    hairRoot.add(tip)
    for (const side of [-1, 1] as const) {
      const shaved = part(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.12), hairMat), 'hair')
      shaved.position.set(side * (sx * 0.55), headY + sy * 0.15, 0)
      hairRoot.add(shaved)
    }
  } else if (style === 'pony') {
    // Wake ponytail — short crown + queue down the back
    addCrownShell(0.72)
    const bang = part(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.035), hairMat), 'hair')
    bang.position.set(0, headY + 0.045, bangZ)
    hairRoot.add(bang)
    const tie = part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), hairMat), 'hair')
    tie.position.set(0, headY + sy * 0.15, backZ + 0.02)
    hairRoot.add(tie)
    const tail = part(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.07), hairMat), 'hair')
    tail.position.set(0, headY - 0.06, backZ - 0.01)
    hairRoot.add(tail)
  } else if (style === 'twin') {
    addCrownShell(0.72)
    for (const side of [-1, 1] as const) {
      const loop = part(new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.022, 5, 8), hairMat), 'hair')
      loop.position.set(side * 0.1, crownY + 0.01, -0.01)
      loop.rotation.y = Math.PI / 2
      hairRoot.add(loop)
    }
    const bang = part(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.04), hairMat), 'hair')
    bang.position.set(0, headY + 0.04, bangZ)
    hairRoot.add(bang)
  } else if (style === 'wave') {
    // Harbor wave — piled crown + swept quiff
    const mound = part(
      new THREE.Mesh(new THREE.IcosahedronGeometry(HARBOR_FIGURE_HEAD_R * 1.2, 0), hairMat),
      'hair',
    )
    mound.scale.set(1.2, 0.82, 1.12)
    mound.position.set(0, headY + sy * 0.4, -0.015)
    hairRoot.add(mound)
    const wave = part(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.05), hairMat), 'hair')
    wave.position.set(0, headY + 0.03, bangZ)
    wave.rotation.x = -0.2
    hairRoot.add(wave)
    const sideSweep = part(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.06), hairMat), 'hair')
    sideSweep.position.set(0.12, headY + 0.02, sz * 0.4)
    sideSweep.rotation.z = -0.25
    hairRoot.add(sideSweep)
  }

  g.add(hairRoot)
}


function addEyes(g: THREE.Group, appearance: HarborAppearance, headY: number, skin: THREE.Material) {
  const iris = HARBOR_EYE_COLORS[appearance.eyeColor] ?? 0x1a1814
  const browHex = HARBOR_HAIR_COLORS[appearance.hairColor] ?? HARBOR_PROTAGONIST_PALETTE.hair
  const face = harborFigureFace(skin, headY, {
    iris,
    eyeStyle: appearance.eyeStyle,
    // Always show brows — Soft/Cheerful used to hide them and faces looked blank.
    showBrows: true,
    showMouth: appearance.faceStyle !== 'calm',
    blush: appearance.faceStyle === 'cheerful' ? 0xe8a090 : null,
    brow: browHex,
    lip: appearance.faceStyle === 'cheerful' ? 0xa04858 : 0x8a4050,
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
 * Build the original River Scout mannequin.
 * Standing ~1.18u tall with a visible neck; seated is canoe-ready.
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
  // Readable RS mannequin — taller legs + explicit neck gap (not neckless chibi).
  const pelvisY = pose === 'standing' ? 0.55 : 0.28
  const torsoH = HARBOR_FIGURE_PROPORTIONS.torsoH
  const neckH = HARBOR_FIGURE_PROPORTIONS.neckH
  const torsoTop = pelvisY + torsoH
  const headY = torsoTop + neckH + HARBOR_FIGURE_HEAD_R * 0.82
  g.userData.pelvisY = pelvisY
  g.userData.headY = headY
  g.userData.torsoTop = torsoTop
  g.userData.harborModular = true
  g.userData.figureProportions = HARBOR_FIGURE_PROPORTIONS

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

  const shoulder = gender === 'female' ? 0.165 : HARBOR_FIGURE_PROPORTIONS.shoulder
  const waist = gender === 'female' ? 0.15 : HARBOR_FIGURE_PROPORTIONS.waist
  const armSpread = gender === 'female' ? 0.23 : 0.25
  const hip = gender === 'female' ? 0.38 : 0.36
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

  // —— Stocky slab torso ——
  const torso = part(
    harborFigureTorso(robe, pelvisY + torsoH * 0.5, { shoulder, waist, h: torsoH, depth }),
    'top',
  )
  g.add(torso)
  const collar = part(
    harborFigureTorso(robeDeep, pelvisY + torsoH * 0.92, {
      shoulder: shoulder + 0.012,
      waist: shoulder,
      h: 0.065,
      depth: depth + 0.015,
    }),
    'topAccent',
  )
  g.add(collar)
  const sash = new THREE.Mesh(new THREE.BoxGeometry(hip, 0.06, depth + 0.015), jade)
  sash.position.y = pelvisY + 0.05
  g.add(sash)
  const pendant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), chop)
  pendant.scale.set(1, 1.2, 0.6)
  pendant.position.set(0, pelvisY + torsoH * 0.45, depth * 0.52)
  g.add(pendant)
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 5), jade)
  cord.position.set(0, pelvisY + torsoH * 0.62, depth * 0.48)
  g.add(cord)

  // —— Segmented arms + mitten blobs ——
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
    const handZ = typeof arm.userData.handZ === 'number' ? arm.userData.handZ : 0.1
    g.add(socket(side > 0 ? 'hand_r' : 'hand_l', side * armSpread, handY, handZ))
  }

  // —— Faceted head + visible neck + flush face ——
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
    const brim = part(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.04, 8), straw), 'hat')
    brim.position.y = headY + HARBOR_FIGURE_HEAD_R * 0.55
    g.add(brim)
    const crown = part(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 7), straw), 'hat')
    crown.position.y = headY + HARBOR_FIGURE_HEAD_R * 0.95
    g.add(crown)
    const bead = part(new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), jade), 'hatAccent')
    bead.position.y = headY + HARBOR_FIGURE_HEAD_R * 1.35
    g.add(bead)
  }
  g.add(socket('head', 0, headY + HARBOR_FIGURE_HEAD_R * 1.45, 0))

  const bag = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), leather)
  bag.scale.set(1.1, 1.25, 0.85)
  bag.position.set(-0.26, pelvisY + 0.02, 0.06)
  bag.rotation.z = 0.15
  g.add(bag)
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.08), mat(0x5a3a22))
  flap.position.set(-0.26, pelvisY + 0.09, 0.06)
  g.add(flap)
  g.add(socket('hip_l', -0.26, pelvisY + 0.02, 0.1))
  g.add(socket('back', 0, pelvisY + torsoH * 0.55, -depth * 0.55))

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
