/**
 * Harbor Quest · anime dress-up figure kit (River Scout body).
 *
 * North star (Henry 2026-09-18): characters must feel **addictively dressable** —
 * anime-like proportions, expressive faces, smooth high-resolution meshes.
 * World / architecture may stay era-chunky; **characters do not** follow the
 * RS low-poly mannequin grammar anymore.
 *
 * Original Harbor meshes — never Jagex cache / STL imports.
 * See docs/harbor-quest/character-looks-v1-v4.md · RS-LIKE-CRAFT-BIBLE.md §3.1.
 */
import * as THREE from 'three'
import type { HarborEyeStyle } from './harborAppearance'
import { applyHarborCel } from './harborCelShader'

/**
 * Anime fashion proportions (unitless height ≈ 1.42 to crown).
 * Larger expressive head, visible neck, long legs, soft waist — dress-up first.
 */
export const HARBOR_FIGURE_PROPORTIONS = {
  /** Skull radius before cheek scale. */
  headR: 0.148,
  /** Total standing height to crown (approx). */
  standingH: 1.42,
  /** Torso height. */
  torsoH: 0.36,
  /** Visible neck column between collar and chin. */
  neckH: 0.085,
  /** Shoulder half-width. */
  shoulder: 0.155,
  /** Waist half-width (soft anime pinch). */
  waist: 0.118,
  /** Chest depth. */
  depth: 0.16,
  /** Upper-arm length. */
  upperArm: 0.22,
  /** Lower-arm length. */
  lowerArm: 0.2,
  /** Limb shaft radius (slimmer than RS chunk). */
  limbR: 0.036,
  /** Soft hand size. */
  hand: 0.048,
} as const

export const HARBOR_FIGURE_HEAD_R: number = HARBOR_FIGURE_PROPORTIONS.headR

/** World-space skull extents after the default head scale (soft anime oval). */
export function harborFigureHeadExtents(r: number = HARBOR_FIGURE_HEAD_R) {
  return {
    x: r * 1.05,
    y: r * 1.08,
    z: r * 0.95,
  }
}

/**
 * Soft lit materials — no flatShading (dress-up camera needs polish).
 * Lambert + cel (same path as world props). MeshStandardMaterial + cel still
 * fails to compile on iOS Safari, which made every sailor invisible.
 */
export function harborFigureMat(color: number, doubleSide = false) {
  return applyHarborCel(
    new THREE.MeshLambertMaterial({
      color,
      flatShading: false,
      ...(doubleSide ? { side: THREE.DoubleSide } : null),
    }),
    { preset: 'character' },
  )
}

function figureMat(color: number, _flat = false, doubleSide = false) {
  return harborFigureMat(color, doubleSide)
}

/**
 * Smooth anime skull — high-segment sphere (not a faceted potato / Minecraft cube).
 */
export function harborFigureHead(
  skin: THREE.Material,
  y: number,
  opts: { r?: number; name?: string } = {},
): THREE.Mesh {
  const r = opts.r ?? HARBOR_FIGURE_HEAD_R
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 20), skin)
  mesh.scale.set(1.05, 1.08, 0.95)
  mesh.position.y = y
  if (opts.name) mesh.name = opts.name
  return mesh
}

/** Visible neck column under the chin (must clear the torso collar). */
export function harborFigureNeck(skin: THREE.Material, headY: number, r: number = HARBOR_FIGURE_HEAD_R): THREE.Mesh {
  const neckH = HARBOR_FIGURE_PROPORTIONS.neckH
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, neckH, 12), skin)
  neck.position.y = headY - r * 0.88 - neckH * 0.48
  neck.name = 'hq-figure-neck'
  return neck
}

/** Soft ear lobes flush on the skull sides. */
export function harborFigureEars(skin: THREE.Material, headY: number, r: number = HARBOR_FIGURE_HEAD_R): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-figure-ears'
  const ex = harborFigureHeadExtents(r).x
  for (const sx of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), skin)
    ear.scale.set(0.55, 1.05, 0.7)
    ear.position.set(sx * (ex + 0.008), headY + 0.002, 0.01)
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
 * Anime face plates — large expressive eyes, soft blush, tiny nose/mouth.
 * Must read as different silhouettes per eyeStyle at barber / dress-up range.
 */
export function harborFigureFace(
  skin: THREE.Material,
  headY: number,
  opts: FaceOpts = {},
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-figure-face'
  g.userData.harborFace = true

  const iris = opts.iris ?? 0x2a3a5a
  const scleraC = opts.sclera ?? 0xfff8f2
  const style: HarborEyeStyle = opts.eyeStyle ?? 'round'
  const extents = harborFigureHeadExtents()
  const faceZ = extents.z + 0.006
  const white = figureMat(scleraC, false, true)
  const pupil = figureMat(iris, false, true)
  const lidMat = figureMat(opts.brow ?? 0x2a2018, false, true)
  const sparkMat = figureMat(0xffffff, false, true)

  const eyeYBase =
    headY +
    (opts.eyeY ??
      (style === 'sleepy' ? 0.002 : style === 'bright' ? 0.022 : 0.014))
  const eyeSpread = style === 'bright' ? 0.058 : style === 'almond' ? 0.055 : 0.052

  for (const sx of [-1, 1] as const) {
    const x = sx * eyeSpread
    if (style === 'round') {
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.042, 20), white)
      sclera.scale.set(0.92, 1.15, 1)
      sclera.position.set(x, eyeYBase, faceZ)
      g.add(sclera)
      const irisMesh = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), pupil)
      irisMesh.position.set(x, eyeYBase - 0.004, faceZ + 0.0015)
      g.add(irisMesh)
      const spark = new THREE.Mesh(new THREE.CircleGeometry(0.009, 10), sparkMat)
      spark.position.set(x - sx * 0.01, eyeYBase + 0.01, faceZ + 0.0025)
      g.add(spark)
    } else if (style === 'almond') {
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.038, 18), white)
      sclera.scale.set(1.45, 0.78, 1)
      sclera.position.set(x, eyeYBase, faceZ)
      sclera.rotation.z = sx * -0.28
      g.add(sclera)
      const irisMesh = new THREE.Mesh(new THREE.CircleGeometry(0.02, 14), pupil)
      irisMesh.scale.set(1.25, 0.8, 1)
      irisMesh.position.set(x + sx * 0.004, eyeYBase - 0.002, faceZ + 0.0015)
      irisMesh.rotation.z = sx * -0.28
      g.add(irisMesh)
      const spark = new THREE.Mesh(new THREE.CircleGeometry(0.007, 8), sparkMat)
      spark.position.set(x - sx * 0.008, eyeYBase + 0.008, faceZ + 0.0025)
      g.add(spark)
    } else if (style === 'bright') {
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.05, 22), white)
      sclera.scale.set(0.95, 1.2, 1)
      sclera.position.set(x, eyeYBase, faceZ)
      g.add(sclera)
      const irisMesh = new THREE.Mesh(new THREE.CircleGeometry(0.028, 16), pupil)
      irisMesh.position.set(x, eyeYBase - 0.004, faceZ + 0.0015)
      g.add(irisMesh)
      const spark = new THREE.Mesh(new THREE.CircleGeometry(0.011, 10), sparkMat)
      spark.position.set(x - sx * 0.012, eyeYBase + 0.012, faceZ + 0.0025)
      g.add(spark)
      const spark2 = new THREE.Mesh(new THREE.CircleGeometry(0.005, 8), sparkMat)
      spark2.position.set(x + sx * 0.006, eyeYBase - 0.006, faceZ + 0.0025)
      g.add(spark2)
    } else {
      // Sleepy — soft half-lidded
      const sclera = new THREE.Mesh(new THREE.CircleGeometry(0.036, 18), white)
      sclera.scale.set(1.2, 0.55, 1)
      sclera.position.set(x, eyeYBase - 0.002, faceZ)
      g.add(sclera)
      const irisMesh = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), pupil)
      irisMesh.scale.set(1.15, 0.55, 1)
      irisMesh.position.set(x, eyeYBase - 0.006, faceZ + 0.0015)
      g.add(irisMesh)
      const lid = new THREE.Mesh(new THREE.CircleGeometry(0.038, 16), lidMat)
      lid.scale.set(1.25, 0.32, 1)
      lid.position.set(x, eyeYBase + 0.012, faceZ + 0.002)
      g.add(lid)
    }
  }

  // Tiny soft nose tip
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), skin)
  nose.scale.set(0.9, 0.7, 1.1)
  nose.position.set(0, headY - 0.02, faceZ + 0.014)
  g.add(nose)

  if (opts.showBrows !== false) {
    for (const sx of [-1, 1] as const) {
      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.01, 0.008),
        figureMat(opts.brow ?? 0x2a2018),
      )
      brow.position.set(
        sx * eyeSpread,
        eyeYBase + (style === 'sleepy' ? 0.038 : 0.048),
        faceZ + 0.003,
      )
      brow.rotation.z = sx * -0.18
      brow.userData.harborBrow = true
      g.add(brow)
    }
  }

  if (opts.showMouth !== false) {
    const mouthW = opts.blush != null ? 0.055 : 0.042
    const mouth = new THREE.Mesh(
      new THREE.CircleGeometry(mouthW * 0.5, 12),
      figureMat(opts.lip ?? 0xc86878, false, true),
    )
    mouth.scale.set(1.6, 0.45, 1)
    mouth.position.set(0, headY - 0.062, faceZ + 0.001)
    g.add(mouth)
  }

  // Soft cheek blush (default for anime appeal when not overridden off)
  const blushC = opts.blush === null ? null : (opts.blush ?? 0xffb0b8)
  if (blushC != null) {
    for (const sx of [-1, 1] as const) {
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), figureMat(blushC, false, true))
      blush.position.set(sx * 0.078, headY - 0.032, faceZ + 0.0005)
      g.add(blush)
    }
  }

  return g
}

/**
 * Soft fashion torso — gentle waist pinch, higher segment count.
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
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(shoulder, waist, h, 16), cloth)
  mesh.scale.z = depth / ((shoulder + waist) * 0.5)
  mesh.position.y = y
  return mesh
}

/** Slim arm with soft hand (dress-up silhouette). */
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

  const upper = new THREE.Mesh(new THREE.CylinderGeometry(limbR, limbR * 0.95, P.upperArm, 12), cloth)
  upper.position.set(x, shoulderY - P.upperArm * 0.35, 0.01)
  upper.rotation.z = side * 0.08
  upper.rotation.x = 0.06
  g.add(upper)

  const elbowY = shoulderY - P.upperArm * 0.85
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(limbR * 0.9, limbR * 0.85, P.lowerArm, 12), cloth)
  lower.position.set(x + side * 0.015, elbowY - P.lowerArm * 0.35, 0.03)
  lower.rotation.x = 0.28
  lower.rotation.z = side * 0.06
  g.add(lower)

  const palm = new THREE.Mesh(new THREE.SphereGeometry(P.hand * 0.55, 12, 10), skin)
  palm.scale.set(1.05, 0.9, 1.15)
  palm.position.set(x + side * 0.02, elbowY - P.lowerArm * 0.85, 0.07)
  g.add(palm)
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(P.hand * 0.2, 8, 6), skin)
  thumb.position.set(x + side * 0.05, elbowY - P.lowerArm * 0.72, 0.09)
  g.add(thumb)

  g.userData.handY = elbowY - P.lowerArm * 0.85
  g.userData.handZ = 0.08
  return g
}

/** Standing fashion legs — long thigh/shin for dress-up silhouette. */
export function harborFigureLegStanding(
  pants: THREE.Material,
  shoes: THREE.Material,
  side: -1 | 1,
  xSpread = 0.085,
): THREE.Group {
  const g = new THREE.Group()
  g.name = side > 0 ? 'hq-leg-r' : 'hq-leg-l'
  const x = side * xSpread
  const limbR = HARBOR_FIGURE_PROPORTIONS.limbR * 1.05

  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(limbR * 1.12, limbR * 1.05, 0.38, 12), pants)
  thigh.position.set(x, 0.52, 0)
  thigh.rotation.z = side * 0.04
  g.add(thigh)

  const shin = new THREE.Mesh(new THREE.CylinderGeometry(limbR * 0.95, limbR * 0.88, 0.36, 12), pants)
  shin.position.set(x + side * 0.01, 0.18, 0.01)
  shin.rotation.z = side * -0.02
  g.add(shin)

  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.048, 0.12, 12), shoes)
  boot.rotation.x = Math.PI / 2
  boot.position.set(x + side * 0.008, 0.04, 0.05)
  g.add(boot)
  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), shoes)
  toe.scale.set(1.05, 0.65, 1.25)
  toe.position.set(x + side * 0.008, 0.035, 0.11)
  g.add(toe)
  return g
}

/** Seated legs (canoe) — forward thighs + boots. */
export function harborFigureLegSeated(
  pants: THREE.Material,
  shoes: THREE.Material,
  side: -1 | 1,
  xSpread = 0.085,
): THREE.Group {
  const g = new THREE.Group()
  const x = side * xSpread
  const limbR = HARBOR_FIGURE_PROPORTIONS.limbR * 1.05
  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(limbR, limbR * 1.02, 0.4, 12), pants)
  thigh.rotation.x = Math.PI / 2
  thigh.position.set(x, 0.18, 0.18)
  g.add(thigh)
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.046, 0.11, 12), shoes)
  boot.rotation.x = Math.PI / 2
  boot.position.set(x, 0.1, 0.42)
  g.add(boot)
  return g
}
