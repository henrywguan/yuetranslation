/**
 * Harbor Quest · progressive gear detail overlays (common → mid → high).
 * More expensive pieces get more mesh parts so upgrades feel visible.
 * Original craft — chunky RS grammar, flat Lambert (not Jagex).
 *
 * Takes resolved catalog pieces as args (no import of harborGear) to avoid cycles.
 */
import * as THREE from 'three'

/** Minimal catalog shape — avoids importing harborGear (cycle with overlays). */
export type HarborDetailPiece = {
  id: string
  tier: 'common' | 'mid' | 'high' | 'vip'
  color: number
  accent?: number
}

function mat(color: number) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true })
}

function findSocket(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null
  root.traverse((o) => {
    if (o.name === name) found = o
  })
  return found
}

function clearTier(root: THREE.Object3D) {
  const doomed: THREE.Object3D[] = []
  root.traverse((o) => {
    if (o.userData.harborTierDetail) doomed.push(o)
  })
  for (const o of doomed) o.parent?.remove(o)
}

function wrap(name: string): THREE.Group {
  const g = new THREE.Group()
  g.name = name
  g.userData.harborTierDetail = true
  return g
}

/** Detail budget by tier — VIP uses dedicated overlays instead. */
export function harborTierDetailLevel(tier: HarborDetailPiece['tier']): 0 | 1 | 2 | 3 {
  if (tier === 'common') return 1
  if (tier === 'mid') return 2
  if (tier === 'high') return 3
  return 0
}

function hatDetail(item: HarborDetailPiece): THREE.Group | null {
  const level = harborTierDetailLevel(item.tier)
  if (level < 1) return null
  const g = wrap('gear-tier-hat')
  const c = item.color
  const a = item.accent ?? item.color

  // Common: chin cord / side knot
  if (level >= 1) {
    const cord = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.02), mat(a))
    cord.position.set(0.12, -0.06, 0.04)
    cord.rotation.z = 0.35
    g.add(cord)
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), mat(a))
    knot.position.set(0.14, -0.12, 0.05)
    g.add(knot)
  }
  // Mid: folded brim ring + side stud
  if (level >= 2) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 4, 10), mat(c))
    rim.rotation.x = Math.PI / 2
    rim.position.y = -0.02
    g.add(rim)
    const stud = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.03), mat(a))
    stud.position.set(-0.12, 0.02, 0.08)
    g.add(stud)
  }
  // High: front plaque + twin tassels
  if (level >= 3) {
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.03), mat(a))
    plaque.position.set(0, 0.04, 0.12)
    g.add(plaque)
    for (const sx of [-0.1, 0.1] as const) {
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 5), mat(a))
      tassel.position.set(sx, -0.14, 0.06)
      g.add(tassel)
    }
  }
  return g
}

function topDetail(item: HarborDetailPiece): THREE.Group | null {
  const level = harborTierDetailLevel(item.tier)
  if (level < 1) return null
  const g = wrap('gear-tier-top')
  const c = item.color
  const a = item.accent ?? item.color

  // Common: simple chest clasp
  if (level >= 1) {
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), mat(a))
    clasp.position.set(0, 0.08, 0.14)
    g.add(clasp)
  }
  // Mid: sleeve cuffs + shoulder pads
  if (level >= 2) {
    for (const sx of [-0.22, 0.22] as const) {
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.05, 6), mat(a))
      cuff.position.set(sx, -0.12, 0)
      g.add(cuff)
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.1), mat(c))
      pad.position.set(sx * 0.85, 0.16, 0)
      g.add(pad)
    }
  }
  // High: lapel layers + hanging sash ends
  if (level >= 3) {
    const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.03), mat(a))
    lapelL.position.set(-0.1, 0.05, 0.13)
    lapelL.rotation.z = 0.2
    g.add(lapelL)
    const lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.03), mat(a))
    lapelR.position.set(0.1, 0.05, 0.13)
    lapelR.rotation.z = -0.2
    g.add(lapelR)
    for (const sx of [-0.08, 0.08] as const) {
      const sash = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.02), mat(a))
      sash.position.set(sx, -0.22, 0.12)
      g.add(sash)
    }
  }
  return g
}

function bottomDetail(item: HarborDetailPiece): THREE.Group | null {
  const level = harborTierDetailLevel(item.tier)
  if (level < 1) return null
  const g = wrap('gear-tier-bottom')
  const c = item.color
  const a = item.accent ?? item.color

  // Common: waist tie knot
  if (level >= 1) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), mat(a))
    tie.position.set(0.12, 0.2, 0.1)
    g.add(tie)
  }
  // Mid: pocket flaps
  if (level >= 2) {
    for (const sx of [-0.12, 0.12] as const) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), mat(c))
      flap.position.set(sx, 0.05, 0.1)
      g.add(flap)
    }
  }
  // High: side stripes + ankle cuffs
  if (level >= 3) {
    for (const sx of [-0.14, 0.14] as const) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.02), mat(a))
      stripe.position.set(sx, -0.05, 0.08)
      g.add(stripe)
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.04, 6), mat(a))
      cuff.position.set(sx * 0.75, -0.22, 0.02)
      g.add(cuff)
    }
  }
  return g
}

function shoesDetail(item: HarborDetailPiece): THREE.Group | null {
  const level = harborTierDetailLevel(item.tier)
  if (level < 1) return null
  const g = wrap('gear-tier-shoes')
  const a = item.accent ?? item.color

  // Common: toe stitch bar
  if (level >= 1) {
    for (const sx of [-0.1, 0.1] as const) {
      const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.03), mat(a))
      stitch.position.set(sx, 0.02, 0.1)
      g.add(stitch)
    }
  }
  // Mid: buckle
  if (level >= 2) {
    for (const sx of [-0.1, 0.1] as const) {
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.04), mat(a))
      buckle.position.set(sx, 0.05, 0.06)
      g.add(buckle)
    }
  }
  // High: shaft wrap + heel plate
  if (level >= 3) {
    for (const sx of [-0.1, 0.1] as const) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 6), mat(item.color))
      shaft.position.set(sx, 0.1, 0.02)
      g.add(shaft)
      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.06), mat(a))
      heel.position.set(sx, 0.01, -0.04)
      g.add(heel)
    }
  }
  return g
}

export type HarborTierDetailPieces = {
  hat?: HarborDetailPiece
  top?: HarborDetailPiece
  bottom?: HarborDetailPiece
  shoes?: HarborDetailPiece
}

/**
 * Attach non-VIP tier detail overlays so mid/high purchases read as upgrades.
 * VIP pieces skip this (they use harborVipGear overlays).
 */
export function applyTierDetailOverlays(root: THREE.Object3D, pieces: HarborTierDetailPieces): void {
  clearTier(root)

  const { hat, top, bottom, shoes } = pieces

  const head = findSocket(root, 'head')
  if (head && hat && hat.tier !== 'vip') {
    const d = hatDetail(hat)
    if (d) head.add(d)
  }

  // Top attaches on back socket, nudged forward onto the chest
  const back = findSocket(root, 'back')
  if (back && top && top.tier !== 'vip') {
    const d = topDetail(top)
    if (d) {
      d.position.set(0, 0.05, 0.28)
      back.add(d)
    }
  }

  // Bottom: hip_l is offset left — center the overlay back onto the body
  const hip = findSocket(root, 'hip_l')
  if (hip && bottom && bottom.tier !== 'vip') {
    const d = bottomDetail(bottom)
    if (d) {
      d.position.set(0.26, 0.05, -0.05)
      hip.add(d)
    }
  }

  // Shoes sit under the root (no dedicated socket); positions match standing boots
  if (shoes && shoes.tier !== 'vip') {
    const d = shoesDetail(shoes)
    if (d) root.add(d)
  }
}

/** Extra geometry parts for non-VIP handhelds — denser as tier rises. */
export function enrichHandheldProp(g: THREE.Group, item: HarborDetailPiece): void {
  const level = harborTierDetailLevel(item.tier)
  if (level < 1 || item.tier === 'vip') return
  const a = mat(item.accent ?? item.color)

  if (item.id === 'hand-fan') {
    // Common+: fold crease
    const crease = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.008, 0.008), a)
    crease.position.set(0.08, 0.03, 0.02)
    g.add(crease)
    if (level >= 2) {
      const ribs = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.015), a)
      ribs.position.set(0.08, 0.04, 0)
      g.add(ribs)
    }
  }
  if (item.id === 'hand-lantern') {
    // Mid+: hanging ring + tassel
    if (level >= 2) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 4, 8), a)
      ring.position.set(0.06, 0.14, 0)
      ring.rotation.x = Math.PI / 2
      g.add(ring)
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 5), a)
      tassel.position.set(0.06, 0.02, 0)
      g.add(tassel)
    }
    if (level >= 3) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), a)
      pane.position.set(0.06, 0.08, 0.06)
      g.add(pane)
    }
  }
  if (item.id === 'hand-oar') {
    // Common+: butt knob
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), a)
    knob.position.set(-0.02, -0.04, 0)
    g.add(knob)
    if (level >= 2) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.06, 5), a)
      grip.position.set(0.02, 0.0, 0)
      grip.rotation.z = 0.4
      g.add(grip)
    }
  }
  if (item.id === 'hand-scroll') {
    // Common+: wax seal
    const seal = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), a)
    seal.position.set(0.08, 0.05, 0.03)
    g.add(seal)
    if (level >= 2) {
      const endcap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 6), a)
      endcap.rotation.z = Math.PI / 2
      endcap.position.set(0.17, 0.02, 0)
      g.add(endcap)
    }
  }
}

/**
 * Tier trim for non-VIP boat hulls — mid/high get rail posts, bow plaque, cabin trim.
 * Mutates `g` in place. VIP boats skip (they use attachVipBoatOrnaments).
 */
export function enrichBoatHull(
  g: THREE.Group,
  item: HarborDetailPiece,
  dims: { length: number; width: number },
): void {
  const level = harborTierDetailLevel(item.tier)
  if (level < 1 || item.tier === 'vip') return
  const a = item.accent ?? item.color
  const { length, width } = dims

  // Common: small bow bead
  if (level >= 1) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), mat(a))
    bead.position.set(length * 0.48, 0.42, 0)
    bead.userData.harborTierDetail = true
    g.add(bead)
  }
  // Mid: side rail posts + stern plaque
  if (level >= 2) {
    for (const z of [width * 0.42, -width * 0.42] as const) {
      for (const x of [-length * 0.25, length * 0.2] as const) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 5), mat(a))
        post.position.set(x, 0.5, z)
        post.userData.harborTierDetail = true
        g.add(post)
      }
    }
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.04), mat(a))
    plaque.position.set(-length * 0.5, 0.48, 0)
    plaque.userData.harborTierDetail = true
    g.add(plaque)
  }
  // High: cabin ridge + twin bow fins + deck runners
  if (level >= 3) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, width * 0.55), mat(a))
    ridge.position.set(-0.2, 0.72, 0)
    ridge.userData.harborTierDetail = true
    g.add(ridge)
    for (const z of [width * 0.22, -width * 0.22] as const) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.05), mat(a))
      fin.position.set(length * 0.5, 0.5, z)
      fin.userData.harborTierDetail = true
      g.add(fin)
    }
    for (const z of [width * 0.3, -width * 0.3] as const) {
      const runner = new THREE.Mesh(new THREE.BoxGeometry(length * 0.7, 0.03, 0.04), mat(a))
      runner.position.set(0, 0.36, z)
      runner.userData.harborTierDetail = true
      g.add(runner)
    }
  }
}
