/**
 * Harbor Quest · v1 silhouette wardrobe — unique clothing meshes per family.
 * Soft anime materials to match River Scout dress-up body. Not Jagex kit.
 */
import * as THREE from 'three'
import { applyHarborCel } from './harborCelShader'
import { harborFigureMat, harborFigureTorso } from './harborFigure'
import type { HarborGearSlot } from './harborGear'

function mat(color: number, sheen = false) {
  const base = sheen
    ? new THREE.MeshLambertMaterial({
        color,
        flatShading: false,
        emissive: color,
        emissiveIntensity: 0.12,
      })
    : harborFigureMat(color)
  return applyHarborCel(base, { preset: 'cloth' })
}

function vipFamily(family: string): boolean {
  return /phoenix|sovereign|immortal|night|admiral|starlit|jade-river|plum/.test(family)
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
  /** Standing pelvis Y on River Scout (~0.9 anime fashion, ~7 heads). */
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
  const built =
    slot === 'hat'
      ? buildHat(family, opts)
      : slot === 'top'
        ? buildTop(family, opts)
        : slot === 'bottom'
          ? buildBottom(family, opts)
          : slot === 'shoes'
            ? buildShoes(family, opts)
            : null
  if (built) built.userData.harborClothSlot = slot
  return built
}

function buildHat(family: string, opts: ClothingBuildOpts): THREE.Group {
  const g = wrap(family)
  const sheen = vipFamily(family)
  const c = mat(opts.color, sheen)
  const a = mat(opts.accent, sheen)
  const headY = opts.headY ?? 1.45

  if (family.includes('bamboo') || family.includes('coolie')) {
    const brim = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.03, 16), c), 'hat')
    brim.position.y = headY + 0.08
    g.add(brim)
    const cone = tag(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 14), c), 'hat')
    cone.position.y = headY + 0.18
    g.add(cone)
    const knot = tag(new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), a), 'hatAccent')
    knot.position.set(0, headY + 0.06, 0.12)
    g.add(knot)
    return g
  }

  if (family.includes('scholar') || family.includes('soft-cap')) {
    const cap = tag(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), c), 'hat')
    cap.scale.set(1, 0.55, 1.05)
    cap.position.y = headY + 0.09
    g.add(cap)
    const bill = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.025, 12), a), 'hatAccent')
    bill.rotation.x = Math.PI / 2
    bill.position.set(0, headY + 0.05, 0.1)
    g.add(bill)
    return g
  }

  if (family.includes('scarf') || family.includes('fisherman')) {
    const wrapMesh = tag(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 14), c), 'hat')
    wrapMesh.rotation.x = Math.PI / 2
    wrapMesh.position.y = headY + 0.02
    g.add(wrapMesh)
    const tail = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.2, 10), a), 'hatAccent')
    tail.position.set(0.1, headY - 0.05, 0.02)
    tail.rotation.z = 0.45
    g.add(tail)
    return g
  }

  if (family.includes('festival') || family.includes('phoenix') || family.includes('crown')) {
    const band = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 14), c), 'hat')
    band.position.y = headY + 0.1
    g.add(band)
    for (const [sx, sy] of [
      [0, 0.2],
      [-0.08, 0.15],
      [0.08, 0.15],
    ] as const) {
      const spike = tag(new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 8), a), 'hatAccent')
      spike.position.set(sx, headY + sy, 0)
      g.add(spike)
    }
    return g
  }

  if (family.includes('diadem') || family.includes('jade-immortal')) {
    const circlet = tag(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 16), c), 'hat')
    circlet.rotation.x = Math.PI / 2
    circlet.position.y = headY + 0.11
    g.add(circlet)
    const jewel = tag(new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), a), 'hatAccent')
    jewel.position.set(0, headY + 0.14, 0.08)
    g.add(jewel)
    return g
  }

  if (family.includes('starlit') || family.includes('admiral') || family.includes('helm')) {
    const helm = tag(new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), c), 'hat')
    helm.scale.set(1, 0.72, 1.08)
    helm.position.y = headY + 0.09
    g.add(helm)
    const crest = tag(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 8), a), 'hatAccent')
    crest.position.set(0, headY + 0.2, 0)
    g.add(crest)
    const brim = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.025, 16), c), 'hat')
    brim.position.set(0, headY + 0.04, 0.02)
    g.add(brim)
    return g
  }

  // Default straw traveler (family scout-hat / straw)
  const brim = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 16), c), 'hat')
  brim.position.y = headY + 0.08
  g.add(brim)
  const crown = tag(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.12, 14), c), 'hat')
  crown.position.y = headY + 0.16
  g.add(crown)
  const bead = tag(new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), a), 'hatAccent')
  bead.position.y = headY + 0.24
  g.add(bead)
  return g
}

function softTopShell(
  c: THREE.Material,
  a: THREE.Material,
  pelvisY: number,
  shoulderR: number,
  waistR: number,
  h: number,
  depth: number,
  armSpread: number,
  armY: number,
  sleeveR = 0.055,
): THREE.Group {
  const g = new THREE.Group()
  const torso = tag(
    harborFigureTorso(c, pelvisY + h * 0.5, {
      shoulder: shoulderR,
      waist: waistR,
      h,
      depth,
    }),
    'top',
  )
  g.add(torso)
  const collar = tag(
    harborFigureTorso(a, pelvisY + h * 0.9, {
      shoulder: shoulderR + 0.01,
      waist: shoulderR,
      h: 0.05,
      depth: depth + 0.01,
    }),
    'topAccent',
  )
  g.add(collar)
  for (const side of [-1, 1] as const) {
    const sleeve = tag(
      new THREE.Mesh(new THREE.CylinderGeometry(sleeveR * 0.95, sleeveR, 0.34, 12), c),
      'top',
    )
    sleeve.position.set(side * armSpread, armY, 0.01)
    sleeve.rotation.z = side * 0.08
    g.add(sleeve)
  }
  return g
}

function buildTop(family: string, opts: ClothingBuildOpts): THREE.Group {
  const g = wrap(family)
  const sheen = vipFamily(family)
  const c = mat(opts.color, sheen)
  const a = mat(opts.accent, sheen)
  const pelvisY = opts.pelvisY ?? 0.9
  const shoulderR = opts.gender === 'female' ? 0.12 : 0.135
  const waistR = opts.gender === 'female' ? 0.085 : 0.1
  const armSpread = opts.gender === 'female' ? 0.18 : 0.2
  const armY = pelvisY + 0.32

  if (family.includes('tunic') || family.includes('jade-river') || family.includes('river-tunic')) {
    const shell = softTopShell(c, a, pelvisY, shoulderR, waistR, 0.42, 0.13, armSpread, armY, 0.05)
    while (shell.children.length) g.add(shell.children[0]!)
    const panel = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.26, 10), a), 'topAccent')
    panel.position.set(0, pelvisY + 0.2, 0.08)
    panel.rotation.x = Math.PI / 2
    g.add(panel)
    return g
  }

  if (family.includes('merchant') || family.includes('plum')) {
    const shell = softTopShell(c, a, pelvisY, shoulderR + 0.01, waistR, 0.46, 0.14, armSpread + 0.01, armY, 0.055)
    while (shell.children.length) g.add(shell.children[0]!)
    const lapel = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.32, 10), a), 'topAccent')
    lapel.position.set(-0.06, pelvisY + 0.22, 0.08)
    lapel.rotation.z = 0.15
    g.add(lapel)
    return g
  }

  if (family.includes('ferry') || family.includes('linen') || family.includes('wrap')) {
    const wrapTop = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.4, 16), c), 'top')
    wrapTop.scale.z = 0.85
    wrapTop.position.y = pelvisY + 0.22
    g.add(wrapTop)
    const sash = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.05, 16), a), 'topAccent')
    sash.scale.z = 0.9
    sash.position.y = pelvisY + 0.1
    g.add(sash)
    for (const side of [-1, 1] as const) {
      const sleeve = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.28, 12), c), 'top')
      sleeve.position.set(side * armSpread, armY, 0)
      g.add(sleeve)
    }
    return g
  }

  if (family.includes('phoenix') || family.includes('sovereign') || family.includes('night')) {
    const shell = softTopShell(c, a, pelvisY, shoulderR + 0.02, waistR, 0.5, 0.15, armSpread + 0.02, armY - 0.02, 0.06)
    while (shell.children.length) g.add(shell.children[0]!)
    const train = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.32, 12), a), 'topAccent')
    train.position.set(0, pelvisY + 0.08, -0.12)
    train.rotation.x = 0.35
    g.add(train)
    return g
  }

  if (family.includes('immortal') || family.includes('mantle')) {
    const shell = softTopShell(c, a, pelvisY, shoulderR + 0.025, waistR, 0.44, 0.15, armSpread + 0.03, armY, 0.055)
    while (shell.children.length) g.add(shell.children[0]!)
    const stole = tag(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 16), a), 'topAccent')
    stole.rotation.x = Math.PI / 2.4
    stole.position.set(0, pelvisY + 0.38, 0.04)
    g.add(stole)
    return g
  }

  if (family.includes('admiral') || family.includes('starlit-coat') || family.includes('coat')) {
    const shell = softTopShell(c, a, pelvisY, shoulderR + 0.015, waistR, 0.44, 0.14, armSpread, armY, 0.052)
    while (shell.children.length) g.add(shell.children[0]!)
    for (const side of [-1, 1] as const) {
      const ep = tag(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), a), 'topAccent')
      ep.scale.set(1.4, 0.45, 1)
      ep.position.set(side * shoulderR * 0.95, pelvisY + 0.4, 0.04)
      g.add(ep)
    }
    const row = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 8), a), 'topAccent')
    row.position.set(0, pelvisY + 0.22, 0.09)
    g.add(row)
    return g
  }

  // Default ink robe — soft fashion torso + hem ribbon
  const shell = softTopShell(c, a, pelvisY, shoulderR, waistR, 0.4, 0.13, armSpread, armY, 0.05)
  while (shell.children.length) g.add(shell.children[0]!)
  const hem = tag(new THREE.Mesh(new THREE.TorusGeometry(waistR + 0.02, 0.012, 8, 16), a), 'topAccent')
  hem.rotation.x = Math.PI / 2
  hem.position.set(0, pelvisY + 0.06, 0.02)
  g.add(hem)
  return g
}

function buildBottom(family: string, opts: ClothingBuildOpts): THREE.Group {
  const g = wrap(family)
  const sheen = vipFamily(family)
  const c = mat(opts.color, sheen)
  const a = mat(opts.accent, sheen)
  const hip = 0.078

  if (family.includes('wrap') || family.includes('reed') || family.includes('culotte') || family.includes('festival-pants') || family.includes('crimson')) {
    for (const sx of [-hip, hip] as const) {
      const wide = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.55, 12), c), 'bottom')
      wide.position.set(sx, 0.28, 0)
      g.add(wide)
    }
    const sash = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.05, 14), a), 'bottom')
    sash.scale.z = 0.85
    sash.position.y = 0.52
    g.add(sash)
    return g
  }

  if (family.includes('phoenix') || family.includes('flame') || family.includes('flow') || family.includes('greaves') || family.includes('starlit')) {
    for (const sx of [-hip, hip] as const) {
      const plate = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.52, 12), c), 'bottom')
      plate.position.set(sx, 0.28, 0)
      g.add(plate)
      const trim = tag(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 12), a), 'bottom')
      trim.rotation.x = Math.PI / 2
      trim.position.set(sx, 0.48, 0.01)
      g.add(trim)
    }
    return g
  }

  // Default trousers — long anime legs
  for (const sx of [-hip, hip] as const) {
    const thigh = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.42, 12), c), 'bottom')
    thigh.position.set(sx, 0.42, 0)
    g.add(thigh)
    const shin = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.38, 12), c), 'bottom')
    shin.position.set(sx, 0.12, 0.008)
    g.add(shin)
  }
  return g
}

function buildShoes(family: string, opts: ClothingBuildOpts): THREE.Group {
  const g = wrap(family)
  const sheen = vipFamily(family)
  const c = mat(opts.color, sheen)
  const a = mat(opts.accent, sheen)
  const hip = 0.078

  if (family.includes('sandal') || family.includes('straw')) {
    for (const sx of [-hip, hip] as const) {
      const sole = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.035, 12), c), 'shoes')
      sole.rotation.x = Math.PI / 2
      sole.position.set(sx, 0.025, 0.04)
      g.add(sole)
      const strap = tag(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 10), a), 'shoes')
      strap.position.set(sx, 0.055, 0.02)
      g.add(strap)
    }
    return g
  }

  if (family.includes('lacquer') || family.includes('court')) {
    for (const sx of [-hip, hip] as const) {
      const shoe = tag(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), c), 'shoes')
      shoe.scale.set(1.1, 0.7, 1.45)
      shoe.position.set(sx, 0.04, 0.05)
      g.add(shoe)
      const tip = tag(new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), a), 'shoes')
      tip.scale.set(1, 0.6, 1.2)
      tip.position.set(sx, 0.045, 0.12)
      g.add(tip)
    }
    return g
  }

  if (family.includes('jade') || family.includes('cloud') || family.includes('slipper')) {
    for (const sx of [-hip, hip] as const) {
      const slip = tag(new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), c), 'shoes')
      slip.scale.set(1.15, 0.55, 1.35)
      slip.position.set(sx, 0.035, 0.04)
      g.add(slip)
      const stitch = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), a), 'shoes')
      stitch.rotation.x = Math.PI / 2
      stitch.position.set(sx, 0.06, 0.04)
      g.add(stitch)
    }
    return g
  }

  if (family.includes('phoenix') || family.includes('ash') || family.includes('storm') || family.includes('starlit') || family.includes('deck')) {
    for (const sx of [-hip, hip] as const) {
      const boot = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.14, 12), c), 'shoes')
      boot.position.set(sx, 0.08, 0.03)
      g.add(boot)
      const cuff = tag(new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.012, 6, 12), a), 'shoes')
      cuff.rotation.x = Math.PI / 2
      cuff.position.set(sx, 0.15, 0.02)
      g.add(cuff)
      const toe = tag(new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), c), 'shoes')
      toe.scale.set(1.05, 0.6, 1.3)
      toe.position.set(sx, 0.04, 0.1)
      g.add(toe)
    }
    return g
  }

  // Default leather boots
  for (const sx of [-hip, hip] as const) {
    const boot = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.1, 12), c), 'shoes')
    boot.rotation.x = Math.PI / 2
    boot.position.set(sx, 0.035, 0.04)
    g.add(boot)
    const toe = tag(new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), c), 'shoes')
    toe.scale.set(1.05, 0.6, 1.25)
    toe.position.set(sx, 0.03, 0.09)
    g.add(toe)
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
