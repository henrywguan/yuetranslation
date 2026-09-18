/**
 * Harbor Quest · shared RS2/OSRS-*era* humanoid figure kit.
 *
 * Proportion grammar (study notes from classic era player silhouettes —
 * including public “bot” print references used as *ratio* study only):
 *   oversized faceted potato head · stocky slab torso · short thick limbs ·
 *   mitten hands · short neck · slight bow-legged plant.
 *
 * Original Harbor meshes — not voxel Steve cubes, not Jagex cache / STL imports.
 * See docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md §3 + §7.
 */
import * as THREE from 'three'
import type { HarborEyeStyle } from './harborAppearance'

/**
 * Locked mannequin ratios (unitless height ≈ 1.0 to crown).
 * Smell-tested against craft bible §3.1 — head reads ~30% of height.
 */
export const HARBOR_FIGURE_PROPORTIONS = {
  /** Skull radius before cheek scale. */
  headR: 0.19,
  /** Total standing height to crown (approx). */
  standingH: 1.02,
  /** Torso height (slab). */
  torsoH: 0.34,
  /** Shoulder half-width. */
  shoulder: 0.21,
  /** Waist half-width (type-A: little pinch). */
  waist: 0.19,
  /** Chest depth. */
  depth: 0.28,
  /** Upper-arm length. */
  upperArm: 0.15,
  /** Lower-arm length. */
  lowerArm: 0.14,
  /** Limb shaft radius. */
  limbR: 0.062,
  /** Mitten palm size. */
  hand: 0.095,
} as const

export const HARBOR_FIGURE_HEAD_R: number = HARBOR_FIGURE_PROPORTIONS.headR

/** World-space skull extents after the default head scale (cheeky potato). */
export function harborFigureHeadExtents(r: number = HARBOR_FIGURE_HEAD_R) {
  // Wider cheeks + flatter crown — classic era “bot” silhouette, not a cube.
  return {
    x: r * 1.12,
    y: r * 1.02,
    z: r * 0.98,
  }
}

function figureMat(color: number, flat = true, doubleSide = false) {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: flat,
    ...(doubleSide ? { side: THREE.DoubleSide } : null),
  })
}

/**
 * Faceted potato head — detail-0 icosa (20 tris) reads angular at pier distance.
 * Not a Minecraft cube, not a smooth ball.
 */
export function harborFigureHead(
  skin: THREE.Material,
  y: number,
  opts: { r?: number; name?: string } = {},
): THREE.Mesh {
  const r = opts.r ?? HARBOR_FIGURE_HEAD_R
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), skin)
  mesh.scale.set(1.12, 1.02, 0.98)
  mesh.position.y = y
  if (opts.name) mesh.name = opts.name
  return mesh
}

/** Short neck stump under the head. */
export function harborFigureNeck(skin: THREE.Material, headY: number, r: number = HARBOR_FIGURE_HEAD_R): THREE.Mesh {
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.055, 6), skin)
  neck.position.y = headY - r * 0.88
  return neck
}

/** Ear flaps flush on the skull sides — soft wedges, not cubes. */
export function harborFigureEars(skin: THREE.Material, headY: number, r: number = HARBOR_FIGURE_HEAD_R): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-figure-ears'
  const ex = harborFigureHeadExtents(r).x
  for (const sx of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, 0.06, 5), skin)
    ear.rotation.z = sx * (Math.PI / 2)
    ear.position.set(sx * (ex + 0.01), headY + 0.005, 0.01)
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
  const faceZ = extents.z + 0.008
  const white = figureMat(scleraC, true, true)
  const pupil = figureMat(iris, true, true)
  const lidMat = figureMat(opts.brow ?? 0x2a2018, true, true)

  const eyeYBase =
    headY +
    (opts.eyeY ??
      (style === 'sleepy' ? -0.008 : style === 'bright' ? 0.018 : 0.01))
  const eyeSpread = style === 'bright' ? 0.062 : style === 'almond' ? 0.058 : 0.055

  for (const sx of [-1, 1] as const) {
    const x = sx * eyeSpread
    if (style === 'round') {
      // Classic RS round inserts
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.03, 8), white)
      sclera.position.set(x, eyeYBase, faceZ)
      g.add(sclera)
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.014, 7), pupil)
      dot.position.set(x, eyeYBase, faceZ + 0.0015)
      g.add(dot)
    } else if (style === 'almond') {
      // Tilted pointed ovals — silhouette ≠ round at a glance
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.028, 8), white)
      sclera.scale.set(1.35, 0.7, 1)
      sclera.position.set(x, eyeYBase, faceZ)
      sclera.rotation.z = sx * -0.35
      g.add(sclera)
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 7), pupil)
      dot.scale.set(1.2, 0.75, 1)
      dot.position.set(x + sx * 0.004, eyeYBase, faceZ + 0.0015)
      dot.rotation.z = sx * -0.35
      g.add(dot)
    } else if (style === 'bright') {
      // Large whites + iris + catchlight
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.038, 8), white)
      sclera.position.set(x, eyeYBase, faceZ)
      g.add(sclera)
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.018, 7), pupil)
      dot.position.set(x, eyeYBase - 0.002, faceZ + 0.0015)
      g.add(dot)
      const spark = new THREE.Mesh(new THREE.CircleGeometry(0.007, 5), figureMat(0xffffff, true, true))
      spark.position.set(x - sx * 0.008, eyeYBase + 0.008, faceZ + 0.0025)
      g.add(spark)
    } else {
      // Sleepy — soft half-lidded crescents (never black sunglass bars)
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.026, 8), white)
      sclera.scale.set(1.25, 0.5, 1)
      sclera.position.set(x, eyeYBase - 0.002, faceZ)
      g.add(sclera)
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.011, 7), pupil)
      dot.scale.set(1.15, 0.55, 1)
      dot.position.set(x, eyeYBase - 0.005, faceZ + 0.0015)
      g.add(dot)
      // Thin upper lid — hair/brow tint, not a wide dark plane
      const lid = new THREE.Mesh(new THREE.CircleGeometry(0.028, 8), lidMat)
      lid.scale.set(1.3, 0.38, 1)
      lid.position.set(x, eyeYBase + 0.01, faceZ + 0.002)
      g.add(lid)
    }
  }

  // Soft nose wedge — short depth, sits on the face (not eye-like boxes)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.045, 4), skin)
  nose.rotation.x = Math.PI / 2
  nose.position.set(0, headY - 0.028, faceZ + 0.012)
  g.add(nose)

  // Eyebrows always — arched strips in brow/hair color
  if (opts.showBrows !== false) {
    for (const sx of [-1, 1] as const) {
      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.078, 0.016, 0.012),
        figureMat(opts.brow ?? 0x2a2018),
      )
      brow.position.set(
        sx * eyeSpread,
        eyeYBase + (style === 'sleepy' ? 0.032 : 0.04),
        faceZ + 0.003,
      )
      brow.rotation.z = sx * -0.24
      brow.userData.harborBrow = true
      g.add(brow)
    }
  }

  if (opts.showMouth !== false) {
    const mouthW = opts.blush != null ? 0.078 : 0.055
    const mouth = new THREE.Mesh(
      new THREE.PlaneGeometry(mouthW, opts.blush != null ? 0.018 : 0.012),
      figureMat(opts.lip ?? 0x8a4050, true, true),
    )
    mouth.position.set(0, headY - 0.068, faceZ + 0.001)
    g.add(mouth)
  }

  if (opts.blush != null) {
    for (const sx of [-1, 1] as const) {
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.02, 6), figureMat(opts.blush, true, true))
      blush.position.set(sx * 0.09, headY - 0.042, faceZ + 0.001)
      g.add(blush)
    }
  }

  return g
}

/**
 * Stocky slab torso — type-A rectangle with a whisper of shoulder flare.
 * Reads as classic era body volume, not a Steve cube stack.
 */
export function harborFigureTorso(
  cloth: THREE.Material,
  y: number,
  opts: { shoulder?: number; waist?: number; depth?: number; h?: number } = {},
): THREE.Mesh {
  const shoulder = opts.shoulder ?? HARBOR_FIGURE_PROPORTIONS.shoulder
  const waist = opts.waist ?? HARBOR_FIGURE_PROPORTIONS.waist
  const h = opts.h ?? HARBOR_FIGURE_PROPORTIONS.torsoH
  const depth = opts.depth ?? HARBOR_FIGURE_PROPORTIONS.depth
  // 6-gon keeps flatShading facets; almost no waist pinch (type A).
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(shoulder, waist, h, 6), cloth)
  mesh.scale.z = depth / (shoulder + waist)
  mesh.position.y = y
  return mesh
}

/** Upper + lower arm with baked elbow bend + mitten blob (not a cube fist). */
export function harborFigureArm(
  cloth: THREE.Material,
  skin: THREE.Material,
  side: -1 | 1,
  shoulderY: number,
  spread: number,
): THREE.Group {
  const g = new THREE.Group()
  g.name = side > 0 ? 'hq-arm-r' : 'hq-arm-l'
  const P = HARBOR_FIGURE_PROPORTIONS
  const x = side * spread
  const limbR = P.limbR

  // Upper hangs slightly out from the slab (toy-soldier, not T-pose cubes)
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(limbR, limbR * 1.05, P.upperArm, 6), cloth)
  upper.position.set(x, shoulderY - P.upperArm * 0.35, 0.01)
  upper.rotation.z = side * 0.12
  upper.rotation.x = 0.08
  g.add(upper)

  const elbowY = shoulderY - P.upperArm * 0.85
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(limbR * 0.92, limbR, P.lowerArm, 6), cloth)
  lower.position.set(x + side * 0.02, elbowY - P.lowerArm * 0.35, 0.04)
  lower.rotation.x = 0.42
  lower.rotation.z = side * 0.08
  g.add(lower)

  // Mitten — faceted blob palm + thumb nub (RS chunky hand, not Steve cube)
  const palm = new THREE.Mesh(new THREE.IcosahedronGeometry(P.hand * 0.55, 0), skin)
  palm.scale.set(1.15, 0.95, 1.25)
  palm.position.set(x + side * 0.025, elbowY - P.lowerArm * 0.85, 0.09)
  g.add(palm)
  const thumb = new THREE.Mesh(new THREE.IcosahedronGeometry(P.hand * 0.22, 0), skin)
  thumb.position.set(x + side * 0.07, elbowY - P.lowerArm * 0.7, 0.12)
  g.add(thumb)

  g.userData.handY = elbowY - P.lowerArm * 0.85
  g.userData.handZ = 0.1
  return g
}

/** Standing leg: short thick thigh/shin, slight bow, chunky boot wedge. */
export function harborFigureLegStanding(
  pants: THREE.Material,
  shoes: THREE.Material,
  side: -1 | 1,
  xSpread = 0.11,
): THREE.Group {
  const g = new THREE.Group()
  g.name = side > 0 ? 'hq-leg-r' : 'hq-leg-l'
  const x = side * xSpread
  const limbR = HARBOR_FIGURE_PROPORTIONS.limbR * 1.15

  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(limbR * 1.1, limbR * 1.15, 0.22, 6), pants)
  thigh.position.set(x, 0.28, 0)
  thigh.rotation.z = side * 0.14
  g.add(thigh)

  const shin = new THREE.Mesh(new THREE.CylinderGeometry(limbR * 0.9, limbR, 0.2, 6), pants)
  shin.position.set(x + side * 0.025, 0.1, 0.02)
  shin.rotation.z = side * -0.06
  g.add(shin)

  // Boot as a rounded wedge (not a Minecraft foot cube)
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.14, 6), shoes)
  boot.rotation.x = Math.PI / 2
  boot.position.set(x + side * 0.02, 0.04, 0.06)
  g.add(boot)
  const toe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), shoes)
  toe.scale.set(1.1, 0.7, 1.3)
  toe.position.set(x + side * 0.02, 0.035, 0.13)
  g.add(toe)
  return g
}

/** Seated legs (canoe) — forward thighs + boots. */
export function harborFigureLegSeated(
  pants: THREE.Material,
  shoes: THREE.Material,
  side: -1 | 1,
  xSpread = 0.11,
): THREE.Group {
  const g = new THREE.Group()
  const x = side * xSpread
  const limbR = HARBOR_FIGURE_PROPORTIONS.limbR * 1.1
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(limbR, limbR * 1.05, 0.3, 6), pants)
  thigh.rotation.x = Math.PI / 2
  thigh.position.set(x, 0.14, 0.14)
  g.add(thigh)
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.12, 6), shoes)
  boot.rotation.x = Math.PI / 2
  boot.position.set(x, 0.08, 0.34)
  g.add(boot)
  return g
}
