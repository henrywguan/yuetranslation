/**
 * Harbor Quest · shared RS2/OSRS-*era* humanoid figure kit.
 *
 * Angular low-poly (faceted spheres, 6-gon limbs, mitten hands) — not voxel
 * cubes, not Jagex meshes. Eyes are flush face inserts (no jutting spheres).
 * See docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md §4.4.
 */
import * as THREE from 'three'
import type { HarborEyeStyle } from './harborAppearance'

export const HARBOR_FIGURE_HEAD_R = 0.155

/** World-space skull extents after the default head scale. */
export function harborFigureHeadExtents(r = HARBOR_FIGURE_HEAD_R) {
  return {
    x: r * 0.95,
    y: r * 1.08,
    z: r * 0.92,
  }
}

function figureMat(color: number, flat = true, doubleSide = false) {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: flat,
    ...(doubleSide ? { side: THREE.DoubleSide } : null),
  })
}

/** Faceted head — elongated icosa (readable skull, not a smooth ball / cube). */
export function harborFigureHead(
  skin: THREE.Material,
  y: number,
  opts: { r?: number; name?: string } = {},
): THREE.Mesh {
  const r = opts.r ?? HARBOR_FIGURE_HEAD_R
  // detail 1 ≈ RS-era facet density; scale Y for slightly taller cranium
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), skin)
  mesh.scale.set(0.95, 1.08, 0.92)
  mesh.position.y = y
  if (opts.name) mesh.name = opts.name
  return mesh
}

/** Short neck stump under the head. */
export function harborFigureNeck(skin: THREE.Material, headY: number, r = HARBOR_FIGURE_HEAD_R): THREE.Mesh {
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.07, 6), skin)
  neck.position.y = headY - r * 0.95
  return neck
}

/** Ear flaps flush on the skull sides. */
export function harborFigureEars(skin: THREE.Material, headY: number, r = HARBOR_FIGURE_HEAD_R): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-figure-ears'
  const ex = harborFigureHeadExtents(r).x
  for (const sx of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.045), skin)
    ear.position.set(sx * (ex + 0.012), headY + 0.01, 0)
    ear.rotation.z = sx * 0.15
    g.add(ear)
  }
  return g
}

type FaceOpts = {
  iris?: number
  sclera?: number
  brow?: number
  lip?: number
  eyeStyle?: HarborEyeStyle
  /** @deprecated Prefer eyeStyle — kept for NPC callers that pass sizes. */
  eyeW?: number
  eyeH?: number
  eyeY?: number
  showBrows?: boolean
  showMouth?: boolean
  blush?: number | null
}

/**
 * Flush face inserts — RS-era color regions on the skull surface.
 * Eye styles must read as different silhouettes at barber / play-camera range.
 */
export function harborFigureFace(
  skin: THREE.Material,
  headY: number,
  opts: FaceOpts = {},
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-figure-face'
  g.userData.harborFace = true

  const iris = opts.iris ?? 0x1a1814
  const scleraC = opts.sclera ?? 0xf2f0e6
  const style: HarborEyeStyle = opts.eyeStyle ?? 'round'
  const extents = harborFigureHeadExtents()
  // Sit just proud of the scaled skull front — never buried inside
  const faceZ = extents.z + 0.006
  const white = figureMat(scleraC, true, true)
  const pupil = figureMat(iris, true, true)
  const lidMat = figureMat(opts.brow ?? 0x2a2018, true, true)

  const eyeYBase =
    headY +
    (opts.eyeY ??
      (style === 'sleepy' ? -0.005 : style === 'bright' ? 0.02 : 0.012))
  const eyeSpread = style === 'bright' ? 0.055 : style === 'almond' ? 0.05 : 0.048

  for (const sx of [-1, 1] as const) {
    const x = sx * eyeSpread
    if (style === 'round') {
      // Classic RS round inserts
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.028, 8), white)
      sclera.position.set(x, eyeYBase, faceZ)
      g.add(sclera)
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.014, 7), pupil)
      dot.position.set(x, eyeYBase, faceZ + 0.0015)
      g.add(dot)
    } else if (style === 'almond') {
      // Tilted pointed ovals — silhouette ≠ round at a glance
      const sclera = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.026), white)
      sclera.position.set(x, eyeYBase, faceZ)
      sclera.rotation.z = sx * -0.38
      sclera.scale.set(1.15, 0.72, 1)
      g.add(sclera)
      const dot = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.014), pupil)
      dot.position.set(x + sx * 0.004, eyeYBase, faceZ + 0.0015)
      dot.rotation.z = sx * -0.38
      g.add(dot)
    } else if (style === 'bright') {
      // Large whites + iris + catchlight
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.036, 8), white)
      sclera.position.set(x, eyeYBase, faceZ)
      g.add(sclera)
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.018, 7), pupil)
      dot.position.set(x, eyeYBase - 0.002, faceZ + 0.0015)
      g.add(dot)
      const spark = new THREE.Mesh(new THREE.CircleGeometry(0.007, 5), figureMat(0xffffff, true, true))
      spark.position.set(x - sx * 0.008, eyeYBase + 0.008, faceZ + 0.0025)
      g.add(spark)
    } else {
      // Sleepy — half-lidded: iris peeks under a heavy lid
      const sclera = new THREE.Mesh(new THREE.PlaneGeometry(0.056, 0.022), white)
      sclera.position.set(x, eyeYBase - 0.004, faceZ)
      g.add(sclera)
      const dot = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.01), pupil)
      dot.position.set(x, eyeYBase - 0.006, faceZ + 0.0015)
      g.add(dot)
      const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.02), lidMat)
      lid.position.set(x, eyeYBase + 0.01, faceZ + 0.002)
      g.add(lid)
    }
  }

  // Soft nose wedge — short depth, sits on the face (not eye-like boxes)
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.04, 0.04), skin)
  nose.position.set(0, headY - 0.025, faceZ + 0.01)
  nose.rotation.x = -0.4
  g.add(nose)

  if (opts.showBrows !== false) {
    for (const sx of [-1, 1] as const) {
      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.01, 0.01),
        figureMat(opts.brow ?? 0x2a2018),
      )
      brow.position.set(
        sx * eyeSpread,
        eyeYBase + (style === 'sleepy' ? 0.028 : 0.034),
        faceZ + 0.002,
      )
      brow.rotation.z = sx * (opts.showBrows === true ? -0.28 : -0.12)
      g.add(brow)
    }
  }

  if (opts.showMouth !== false) {
    const mouthW = opts.blush != null ? 0.07 : 0.05
    const mouth = new THREE.Mesh(
      new THREE.PlaneGeometry(mouthW, opts.blush != null ? 0.016 : 0.01),
      figureMat(opts.lip ?? 0x8a4050, true, true),
    )
    mouth.position.set(0, headY - 0.058, faceZ + 0.001)
    g.add(mouth)
  }

  if (opts.blush != null) {
    for (const sx of [-1, 1] as const) {
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.018, 6), figureMat(opts.blush, true, true))
      blush.position.set(sx * 0.078, headY - 0.038, faceZ + 0.001)
      g.add(blush)
    }
  }

  return g
}

/** 6-gon tapered torso — angular human chest, not a voxel slab. */
export function harborFigureTorso(
  cloth: THREE.Material,
  y: number,
  opts: { shoulder?: number; waist?: number; depth?: number; h?: number } = {},
): THREE.Mesh {
  const shoulder = opts.shoulder ?? 0.19
  const waist = opts.waist ?? 0.16
  const h = opts.h ?? 0.42
  // Cylinder along Y; squash Z for chest depth
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(shoulder, waist, h, 6), cloth)
  mesh.scale.z = (opts.depth ?? 0.24) / (shoulder + waist)
  mesh.position.y = y
  return mesh
}

/** Upper + lower arm segments + mitten (thumb nub). */
export function harborFigureArm(
  cloth: THREE.Material,
  skin: THREE.Material,
  side: -1 | 1,
  shoulderY: number,
  spread: number,
): THREE.Group {
  const g = new THREE.Group()
  g.name = side > 0 ? 'hq-arm-r' : 'hq-arm-l'
  const x = side * spread
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.18, 6), cloth)
  upper.position.set(x, shoulderY - 0.02, 0)
  g.add(upper)
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.16, 6), cloth)
  lower.position.set(x, shoulderY - 0.18, 0.01)
  g.add(lower)
  // Mitten palm + thumb — readable hand, not a cube fist
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.1), skin)
  palm.position.set(x, shoulderY - 0.3, 0.03)
  g.add(palm)
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.045, 0.04), skin)
  thumb.position.set(x + side * 0.05, shoulderY - 0.28, 0.06)
  thumb.rotation.z = side * -0.4
  g.add(thumb)
  return g
}

/** Standing leg: thigh + shin (6-gon) — short thick RS proportions. */
export function harborFigureLegStanding(
  pants: THREE.Material,
  shoes: THREE.Material,
  side: -1 | 1,
  xSpread = 0.1,
): THREE.Group {
  const g = new THREE.Group()
  g.name = side > 0 ? 'hq-leg-r' : 'hq-leg-l'
  const x = side * xSpread
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.26, 6), pants)
  thigh.position.set(x, 0.3, 0)
  g.add(thigh)
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.24, 6), pants)
  shin.position.set(x, 0.1, 0.01)
  g.add(shin)
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.17), shoes)
  boot.position.set(x, 0.035, 0.04)
  g.add(boot)
  return g
}

/** Seated legs (canoe) — forward thighs + boots. */
export function harborFigureLegSeated(
  pants: THREE.Material,
  shoes: THREE.Material,
  side: -1 | 1,
  xSpread = 0.1,
): THREE.Group {
  const g = new THREE.Group()
  const x = side * xSpread
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.32, 6), pants)
  thigh.rotation.x = Math.PI / 2
  thigh.position.set(x, 0.14, 0.14)
  g.add(thigh)
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.13), shoes)
  boot.position.set(x, 0.08, 0.34)
  g.add(boot)
  return g
}
