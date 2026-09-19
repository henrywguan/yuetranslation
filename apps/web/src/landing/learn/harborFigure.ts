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
import type { HarborEyeStyle, HarborFaceStyle } from './harborAppearance'
import { makeHarborAnimeFaceTexture } from './harborAnimeFace'
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

function materialHex(mat: THREE.Material, fallback: number): number {
  const color = (mat as THREE.MeshLambertMaterial).color
  return color && typeof color.getHex === 'function' ? color.getHex() : fallback
}

/** Lambert + painted albedo — same iOS-safe path as world maps. */
export function harborFigureMapMat(map: THREE.Texture, doubleSide = false) {
  return applyHarborCel(
    new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map,
      flatShading: false,
      ...(doubleSide ? { side: THREE.DoubleSide } : null),
    }),
    { preset: 'character' },
  )
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
  skin?: number
  eyeStyle?: HarborEyeStyle
  faceStyle?: HarborFaceStyle
  /** @deprecated Prefer eyeStyle — kept for NPC callers that pass sizes. */
  eyeW?: number
  eyeH?: number
  eyeY?: number
  showBrows?: boolean
  showMouth?: boolean
  blush?: number | null
}

/**
 * Painted anime face card — large irises, lash line, catchlights, blush.
 * Sleepy uses half-lidded crescents (never black sunglass bars).
 * Must read as different silhouettes per eyeStyle at barber / dress-up range.
 * Eyebrows always sit on the card (and as thin 3D strokes when showBrows).
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
  const style: HarborEyeStyle = opts.eyeStyle ?? 'round'
  const faceStyle: HarborFaceStyle = opts.faceStyle ?? 'soft'
  const extents = harborFigureHeadExtents()
  const faceZ = extents.z + 0.004
  g.userData.harborEyeStyle = style
  g.userData.harborFaceStyle = faceStyle

  const skinHex = opts.skin ?? materialHex(skin, 0xf0d0b8)
  const faceTex = makeHarborAnimeFaceTexture({
    skin: skinHex,
    iris,
    brow: opts.brow ?? 0x2a2018,
    lip: opts.lip ?? 0xc86878,
    eyeStyle: style,
    faceStyle,
    blush: opts.blush,
  })
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(extents.x * 1.58, extents.y * 1.62),
    harborFigureMapMat(faceTex),
  )
  card.position.set(0, headY - 0.006, faceZ)
  card.userData.harborAnimeFace = true
  card.userData.harborEyes = true
  g.add(card)

  // Tiny soft nose tip — reads in profile when the card is edge-on.
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), skin)
  nose.scale.set(0.85, 0.62, 1.05)
  nose.position.set(0, headY - 0.018, faceZ + 0.012)
  g.add(nose)

  const eyeYBase =
    headY +
    (opts.eyeY ?? (style === 'sleepy' ? 0.002 : style === 'bright' ? 0.022 : 0.014))
  const eyeSpread = style === 'bright' ? 0.058 : style === 'almond' ? 0.055 : 0.052

  if (opts.showBrows !== false) {
    for (const sx of [-1, 1] as const) {
      const brow = new THREE.Mesh(
        new THREE.BoxGeometry(0.052, 0.006, 0.004),
        figureMat(opts.brow ?? 0x2a2018),
      )
      brow.position.set(
        sx * eyeSpread,
        eyeYBase + (style === 'sleepy' ? 0.04 : 0.05),
        faceZ + 0.003,
      )
      brow.rotation.z = sx * (faceStyle === 'sharp' ? -0.28 : -0.16)
      brow.userData.harborBrow = true
      g.add(brow)
    }
  }

  return g
}

/**
 * Thin forehead bangs that sit *above* the eyes — never a helmet over the face.
 */
export function harborFigureForeheadBangs(
  hairMat: THREE.Material,
  headY: number,
  opts: { clumps?: number; spread?: number } = {},
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-figure-bangs'
  g.userData.harborHair = true
  const { y: sy, z: sz } = harborFigureHeadExtents()
  const foreheadY = headY + sy * 0.62
  const bangZ = sz + 0.04
  const clumps = opts.clumps ?? 3
  const spread = opts.spread ?? 0.042
  const mid = (clumps - 1) / 2
  for (let i = 0; i < clumps; i++) {
    const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.05, 4, 8), hairMat)
    lock.rotation.x = 0.72
    lock.position.set((i - mid) * spread, foreheadY, bangZ)
    g.add(lock)
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
