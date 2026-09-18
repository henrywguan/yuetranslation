/**
 * Harbor Quest · v1 silhouette wardrobe — unique clothing meshes per family.
 * Original RS-like chunk; not Jagex kit. Applied by applyLookToProtagonist.
 */
import * as THREE from 'three'
import { harborFigureTorso } from './harborFigure'
import type { HarborGearSlot } from './harborGear'

function mat(color: number) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true })
}

function wrap(family: string): THREE.Group {
  const g = new THREE.Group()
  g.name = `cloth-${family}`
  g.userData.harborClothing = true
  g.userData.harborClothFamily = family
  return g
}

function tag(mesh: THREE.Mesh, harborPart: string) {
  mesh.userData.harborPart = harborPart
  return mesh
}

export type ClothingBuildOpts = {
  color: number
  accent: number
  /** Standing pelvis Y on River Scout (~0.48). */
  pelvisY?: number
  headY?: number
  gender?: 'male' | 'female'
}

/** Clear previously attached wardrobe silhouettes. */
export function clearHarborClothingMeshes(root: THREE.Object3D) {
  const doomed: THREE.Object3D[] = []
  root.traverse((o) => {
    if (o.userData.harborClothing) doomed.push(o)
  })
  for (const o of doomed) o.parent?.remove(o)
}

/**
 * Hide default scout clothing parts so family meshes own the silhouette.
 * Skin / hair / sockets stay visible.
 */
export function setScoutBaseClothingVisible(root: THREE.Object3D, visible: boolean) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    if (mesh.userData.harborClothing) return
    const part = mesh.userData.harborPart as string | undefined
    if (part === 'hat' || part === 'hatAccent' || part === 'top' || part === 'topAccent' || part === 'bottom' || part === 'shoes') {
      mesh.visible = visible
    }
  })
}

export function buildClothingMesh(
  slot: HarborGearSlot,
  family: string,
  opts: ClothingBuildOpts,
): THREE.Group | null {
  if (slot === 'hat') return buildHat(family, opts)
  if (slot === 'top') return buildTop(family, opts)
  if (slot === 'bottom') return buildBottom(family, opts)
  if (slot === 'shoes') return buildShoes(family, opts)
  return null
}

function buildHat(family: string, opts: ClothingBuildOpts): THREE.Group {
  const g = wrap(family)
  const c = mat(opts.color)
  const a = mat(opts.accent)
  const headY = opts.headY ?? 1.06

  if (family.includes('bamboo') || family.includes('coolie')) {
    const brim = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.03, 10), c), 'hat')
    brim.position.y = headY + 0.08
    g.add(brim)
    const cone = tag(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 8), c), 'hat')
    cone.position.y = headY + 0.18
    g.add(cone)
    const knot = tag(new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), a), 'hatAccent')
    knot.position.set(0, headY + 0.06, 0.12)
    g.add(knot)
    return g
  }

  if (family.includes('scholar') || family.includes('soft-cap')) {
    const cap = tag(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), c), 'hat')
    cap.scale.set(1, 0.55, 1.05)
    cap.position.y = headY + 0.1
    g.add(cap)
    const bill = tag(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.1), a), 'hatAccent')
    bill.position.set(0, headY + 0.06, 0.14)
    g.add(bill)
    return g
  }

  if (family.includes('scarf') || family.includes('fisherman')) {
    const wrapMesh = tag(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 5, 10), c), 'hat')
    wrapMesh.rotation.x = Math.PI / 2
    wrapMesh.position.y = headY + 0.02
    g.add(wrapMesh)
    const tail = tag(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.04), a), 'hatAccent')
    tail.position.set(0.12, headY - 0.06, 0.02)
    tail.rotation.z = 0.4
    g.add(tail)
    return g
  }

  if (family.includes('festival') || family.includes('phoenix') || family.includes('crown')) {
    const band = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 8), c), 'hat')
    band.position.y = headY + 0.1
    g.add(band)
    for (const [sx, sy] of [
      [0, 0.22],
      [-0.1, 0.16],
      [0.1, 0.16],
    ] as const) {
      const spike = tag(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), a), 'hatAccent')
      spike.position.set(sx, headY + sy, 0)
      g.add(spike)
    }
    return g
  }

  if (family.includes('diadem') || family.includes('jade-immortal')) {
    const circlet = tag(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 5, 12), c), 'hat')
    circlet.rotation.x = Math.PI / 2
    circlet.position.y = headY + 0.12
    g.add(circlet)
    const jewel = tag(new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), a), 'hatAccent')
    jewel.position.set(0, headY + 0.16, 0.1)
    g.add(jewel)
    return g
  }

  if (family.includes('starlit') || family.includes('admiral') || family.includes('helm')) {
    const helm = tag(new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), c), 'hat')
    helm.scale.set(1, 0.75, 1.1)
    helm.position.y = headY + 0.1
    g.add(helm)
    const crest = tag(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.08), a), 'hatAccent')
    crest.position.set(0, headY + 0.22, 0)
    g.add(crest)
    const brim = tag(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.12), c), 'hat')
    brim.position.set(0, headY + 0.05, 0.06)
    g.add(brim)
    return g
  }

  // Default straw traveler (family scout-hat / straw)
  const brim = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 8), c), 'hat')
  brim.position.y = headY + 0.1
  g.add(brim)
  const crown = tag(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 7), c), 'hat')
  crown.position.y = headY + 0.18
  g.add(crown)
  const bead = tag(new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), a), 'hatAccent')
  bead.position.y = headY + 0.26
  g.add(bead)
  return g
}

function buildTop(family: string, opts: ClothingBuildOpts): THREE.Group {
  const g = wrap(family)
  const c = mat(opts.color)
  const a = mat(opts.accent)
  const pelvisY = opts.pelvisY ?? 0.48
  const shoulder = opts.gender === 'female' ? 0.34 : 0.38
  const armSpread = opts.gender === 'female' ? 0.22 : 0.24
  const armY = pelvisY + 0.28

  if (family.includes('tunic') || family.includes('jade-river') || family.includes('river-tunic')) {
    const torso = tag(new THREE.Mesh(new THREE.BoxGeometry(shoulder + 0.04, 0.46, 0.26), c), 'top')
    torso.position.y = pelvisY + 0.22
    g.add(torso)
    const panel = tag(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.02), a), 'topAccent')
    panel.position.set(0, pelvisY + 0.2, 0.14)
    g.add(panel)
    for (const side of [-1, 1] as const) {
      const sleeve = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.36, 6), c), 'top')
      sleeve.position.set(side * armSpread, armY, 0)
      g.add(sleeve)
    }
    return g
  }

  if (family.includes('merchant') || family.includes('plum')) {
    const coat = tag(new THREE.Mesh(new THREE.BoxGeometry(shoulder + 0.08, 0.5, 0.28), c), 'top')
    coat.position.y = pelvisY + 0.2
    g.add(coat)
    const lapel = tag(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.04), a), 'topAccent')
    lapel.position.set(-0.1, pelvisY + 0.22, 0.14)
    g.add(lapel)
    for (const side of [-1, 1] as const) {
      const sleeve = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.38, 6), c), 'top')
      sleeve.position.set(side * (armSpread + 0.02), armY, 0)
      g.add(sleeve)
    }
    return g
  }

  if (family.includes('ferry') || family.includes('linen') || family.includes('wrap')) {
    const wrapTop = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.4, 8), c), 'top')
    wrapTop.position.y = pelvisY + 0.22
    g.add(wrapTop)
    const sash = tag(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.28), a), 'topAccent')
    sash.position.y = pelvisY + 0.1
    g.add(sash)
    for (const side of [-1, 1] as const) {
      const sleeve = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.3, 6), c), 'top')
      sleeve.position.set(side * armSpread, armY, 0)
      g.add(sleeve)
    }
    return g
  }

  if (family.includes('phoenix') || family.includes('sovereign') || family.includes('night')) {
    const robe = tag(new THREE.Mesh(new THREE.BoxGeometry(shoulder + 0.1, 0.55, 0.3), c), 'top')
    robe.position.y = pelvisY + 0.18
    g.add(robe)
    const collar = tag(new THREE.Mesh(new THREE.BoxGeometry(shoulder + 0.12, 0.1, 0.32), a), 'topAccent')
    collar.position.y = pelvisY + 0.44
    g.add(collar)
    const train = tag(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.08), a), 'topAccent')
    train.position.set(0, pelvisY + 0.05, -0.18)
    g.add(train)
    for (const side of [-1, 1] as const) {
      const sleeve = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 6), c), 'top')
      sleeve.position.set(side * (armSpread + 0.03), armY - 0.02, 0)
      g.add(sleeve)
    }
    return g
  }

  if (family.includes('immortal') || family.includes('mantle')) {
    const mantle = tag(new THREE.Mesh(new THREE.BoxGeometry(shoulder + 0.14, 0.48, 0.3), c), 'top')
    mantle.position.y = pelvisY + 0.22
    g.add(mantle)
    const stole = tag(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.12), a), 'topAccent')
    stole.position.set(0, pelvisY + 0.4, 0.08)
    g.add(stole)
    for (const side of [-1, 1] as const) {
      const sleeve = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 6), c), 'top')
      sleeve.position.set(side * (armSpread + 0.04), armY, -0.02)
      g.add(sleeve)
    }
    return g
  }

  if (family.includes('admiral') || family.includes('starlit-coat') || family.includes('coat')) {
    const coat = tag(new THREE.Mesh(new THREE.BoxGeometry(shoulder + 0.06, 0.48, 0.28), c), 'top')
    coat.position.y = pelvisY + 0.22
    g.add(coat)
    const epauletteL = tag(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.08), a), 'topAccent')
    epauletteL.position.set(-shoulder * 0.55, pelvisY + 0.42, 0.05)
    g.add(epauletteL)
    const epauletteR = tag(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.08), a), 'topAccent')
    epauletteR.position.set(shoulder * 0.55, pelvisY + 0.42, 0.05)
    g.add(epauletteR)
    const row = tag(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.02), a), 'topAccent')
    row.position.set(0, pelvisY + 0.22, 0.15)
    g.add(row)
    for (const side of [-1, 1] as const) {
      const sleeve = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.36, 6), c), 'top')
      sleeve.position.set(side * armSpread, armY, 0)
      g.add(sleeve)
    }
    return g
  }

  // Default ink robe — tapered 6-gon torso (matches scout figure kit)
  const torso = tag(
    harborFigureTorso(c, pelvisY + 0.22, {
      shoulder: shoulder * 0.5,
      waist: shoulder * 0.42,
      h: 0.42,
      depth: 0.24,
    }),
    'top',
  )
  g.add(torso)
  const collar = tag(
    harborFigureTorso(a, pelvisY + 0.42, {
      shoulder: shoulder * 0.52,
      waist: shoulder * 0.5,
      h: 0.08,
      depth: 0.26,
    }),
    'topAccent',
  )
  g.add(collar)
  for (const side of [-1, 1] as const) {
    const arm = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.34, 6), c), 'top')
    arm.position.set(side * armSpread, armY, 0)
    g.add(arm)
  }
  return g
}

function buildBottom(family: string, opts: ClothingBuildOpts): THREE.Group {
  const g = wrap(family)
  const c = mat(opts.color)
  const a = mat(opts.accent)

  if (family.includes('wrap') || family.includes('reed') || family.includes('culotte') || family.includes('festival-pants') || family.includes('crimson')) {
    for (const sx of [-0.1, 0.1] as const) {
      const wide = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 6), c), 'bottom')
      wide.position.set(sx, 0.22, 0)
      g.add(wide)
    }
    const sash = tag(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.22), a), 'bottom')
    sash.position.y = 0.46
    g.add(sash)
    return g
  }

  if (family.includes('phoenix') || family.includes('flame') || family.includes('flow') || family.includes('greaves') || family.includes('starlit')) {
    for (const sx of [-0.1, 0.1] as const) {
      const plate = tag(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.14), c), 'bottom')
      plate.position.set(sx, 0.24, 0)
      g.add(plate)
      const trim = tag(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.15), a), 'bottom')
      trim.position.set(sx, 0.42, 0.02)
      g.add(trim)
    }
    return g
  }

  // Default trousers
  for (const sx of [-0.1, 0.1] as const) {
    const thigh = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.28, 6), c), 'bottom')
    thigh.position.set(sx, 0.28, 0)
    g.add(thigh)
    const shin = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.26, 6), c), 'bottom')
    shin.position.set(sx, 0.08, 0.01)
    g.add(shin)
  }
  return g
}

function buildShoes(family: string, opts: ClothingBuildOpts): THREE.Group {
  const g = wrap(family)
  const c = mat(opts.color)
  const a = mat(opts.accent)

  if (family.includes('sandal') || family.includes('straw')) {
    for (const sx of [-0.1, 0.1] as const) {
      const sole = tag(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.2), c), 'shoes')
      sole.position.set(sx, 0.03, 0.04)
      g.add(sole)
      const strap = tag(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.04), a), 'shoes')
      strap.position.set(sx, 0.07, 0.02)
      g.add(strap)
    }
    return g
  }

  if (family.includes('lacquer') || family.includes('court')) {
    for (const sx of [-0.1, 0.1] as const) {
      const shoe = tag(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.2), c), 'shoes')
      shoe.position.set(sx, 0.05, 0.05)
      g.add(shoe)
      const tip = tag(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), a), 'shoes')
      tip.position.set(sx, 0.06, 0.14)
      g.add(tip)
    }
    return g
  }

  if (family.includes('jade') || family.includes('cloud') || family.includes('slipper')) {
    for (const sx of [-0.1, 0.1] as const) {
      const slip = tag(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.18), c), 'shoes')
      slip.position.set(sx, 0.04, 0.04)
      g.add(slip)
      const stitch = tag(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.14), a), 'shoes')
      stitch.position.set(sx, 0.08, 0.04)
      g.add(stitch)
    }
    return g
  }

  if (family.includes('phoenix') || family.includes('ash') || family.includes('storm') || family.includes('starlit') || family.includes('deck')) {
    for (const sx of [-0.1, 0.1] as const) {
      const boot = tag(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.2), c), 'shoes')
      boot.position.set(sx, 0.08, 0.04)
      g.add(boot)
      const cuff = tag(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.14), a), 'shoes')
      cuff.position.set(sx, 0.15, 0.02)
      g.add(cuff)
    }
    return g
  }

  // Default leather boots
  for (const sx of [-0.1, 0.1] as const) {
    const boot = tag(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), c), 'shoes')
    boot.position.set(sx, 0.04, 0.04)
    g.add(boot)
  }
  return g
}

/** Families that still use the built-in scout base mesh (no swap). */
export function clothingUsesScoutBase(family: string): boolean {
  return (
    family === 'scout-hat' ||
    family === 'scout-top' ||
    family === 'scout-bottom' ||
    family === 'scout-shoes' ||
    family.startsWith('scout-')
  )
}
