/**
 * Harbor Quest · shared RS2/OSRS-*era* humanoid figure kit.
 *
 * Angular low-poly (faceted spheres, 6-gon limbs, mitten hands) — not voxel
 * cubes, not Jagex meshes. Eyes are flush face planes (no jutting spheres).
 * See docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md §4.4.
 */
import * as THREE from 'three'

export const HARBOR_FIGURE_HEAD_R = 0.155

function figureMat(color: number, flat = true) {
  return new THREE.MeshLambertMaterial({ color, flatShading: flat })
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
  for (const sx of [-1, 1] as const) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.045), skin)
    ear.position.set(sx * (r * 0.88), headY + 0.01, 0)
    ear.rotation.z = sx * 0.15
    g.add(ear)
  }
  return g
}

/**
 * Flush face — thin eye planes on the skull surface + small nose wedge.
 * Depth stays tiny so nothing “orbits” off the head.
 */
export function harborFigureFace(
  skin: THREE.Material,
  headY: number,
  opts: {
    iris?: number
    sclera?: number
    brow?: number
    lip?: number
    eyeW?: number
    eyeH?: number
    eyeY?: number
    showBrows?: boolean
    showMouth?: boolean
    blush?: number | null
  } = {},
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'hq-figure-face'
  g.userData.harborFace = true

  const iris = opts.iris ?? 0x1a1814
  const scleraC = opts.sclera ?? 0xf2f0e6
  const eyeW = opts.eyeW ?? 0.048
  const eyeH = opts.eyeH ?? 0.032
  const eyeY = headY + (opts.eyeY ?? 0.015)
  // Front of scaled head ≈ r * 0.92 * 0.92 — park decals just proud of skin
  const faceZ = HARBOR_FIGURE_HEAD_R * 0.78
  const white = figureMat(scleraC)
  const pupil = figureMat(iris)

  for (const sx of [-1, 1] as const) {
    const x = sx * 0.048
    // Paper-thin planes — flush RS face paint, not boxes sticking out
    const sclera = new THREE.Mesh(new THREE.PlaneGeometry(eyeW + 0.012, eyeH + 0.008), white)
    sclera.position.set(x, eyeY, faceZ)
    g.add(sclera)
    const dot = new THREE.Mesh(new THREE.PlaneGeometry(eyeW * 0.42, eyeH * 0.55), pupil)
    dot.position.set(x, eyeY, faceZ + 0.001)
    g.add(dot)
  }

  // Soft nose wedge — short depth, sits on the face
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.045, 0.05), skin)
  nose.position.set(0, headY - 0.02, faceZ + 0.012)
  nose.rotation.x = -0.35
  g.add(nose)

  if (opts.showBrows !== false) {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.012, 0.012),
      figureMat(opts.brow ?? 0x2a2018),
    )
    brow.position.set(0, eyeY + eyeH * 0.85, faceZ + 0.002)
    g.add(brow)
  }

  if (opts.showMouth !== false) {
    const mouth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.055, 0.012),
      figureMat(opts.lip ?? 0x8a4050),
    )
    mouth.position.set(0, headY - 0.055, faceZ + 0.001)
    g.add(mouth)
  }

  if (opts.blush != null) {
    for (const sx of [-1, 1] as const) {
      const blush = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.018), figureMat(opts.blush))
      blush.position.set(sx * 0.075, headY - 0.035, faceZ + 0.001)
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
