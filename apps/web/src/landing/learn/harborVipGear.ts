/**
 * Harbor Quest · VIP item sets — detailed overlays + animation hooks.
 * Original craft (not Jagex). Locked behind HARBOR_VIP_MIN_PRICE coins.
 */
import * as THREE from 'three'
import { hqBox, hqMat, hqMatSmooth, hqMatTex, hqWoodTexture, HARBOR_CRAFT_PALETTE as P } from './harborCraft'
import type { HarborGearId, HarborLook } from './harborGear'

/** Outfitter lock — every VIP catalog row must cost more than this. */
export const HARBOR_VIP_MIN_PRICE = 5001

export type HarborVipSetId = 'phoenix-sovereign' | 'jade-immortal' | 'starlit-admiral'

export type HarborVipSet = {
  id: HarborVipSetId
  name: { en: string; zh: string }
  blurb: { en: string; zh: string }
  /** Coordinated pieces (all VIP, ≥ HARBOR_VIP_MIN_PRICE). */
  pieces: readonly HarborGearId[]
}

export const HARBOR_VIP_SETS: readonly HarborVipSet[] = [
  {
    id: 'phoenix-sovereign',
    name: { en: 'Phoenix Sovereign', zh: '鳳凰帝座' },
    blurb: { en: 'Crimson fire · spinning crest & cape flare', zh: '赤焰冠羽 · 斗篷翻飛' },
    pieces: [
      'hat-festival',
      'top-night',
      'bottom-phoenix',
      'shoes-storm',
      'hand-phoenix-fan',
      'boat-dragon',
      'lantern-phoenix',
    ],
  },
  {
    id: 'jade-immortal',
    name: { en: 'Jade Immortal', zh: '玉仙套裝' },
    blurb: { en: 'River jade · orbiting orbs & soft glow', zh: '河玉環繞 · 柔光浮動' },
    pieces: [
      'hat-jade-diadem',
      'top-jade-immortal',
      'bottom-jade-flow',
      'shoes-jade-cloud',
      'hand-jade-orb',
      'boat-pearl',
      'lantern-dragon',
    ],
  },
  {
    id: 'starlit-admiral',
    name: { en: 'Starlit Admiral', zh: '星光提督' },
    blurb: { en: 'Night navy · compass spin & star spark', zh: '夜藍提督 · 羅盤旋轉' },
    pieces: [
      'hat-starlit-helm',
      'top-starlit-coat',
      'bottom-starlit-greaves',
      'shoes-starlit-boots',
      'hand-starlit-compass',
      'boat-imperial',
      'lantern-starlight',
    ],
  },
]

const PIECE_TO_SET = new Map<string, HarborVipSetId>()
for (const set of HARBOR_VIP_SETS) {
  for (const id of set.pieces) PIECE_TO_SET.set(id, set.id)
}

export function harborVipSetFor(id: string): HarborVipSet | undefined {
  const sid = PIECE_TO_SET.get(id)
  return sid ? HARBOR_VIP_SETS.find((s) => s.id === sid) : undefined
}

function mat(color: number, emissive?: number, intensity = 0.35) {
  return hqMat(color, {
    ...(emissive != null
      ? { emissive: new THREE.Color(emissive), emissiveIntensity: intensity }
      : {}),
  })
}

function matSmooth(color: number, emissive?: number, intensity = 0.35) {
  return hqMatSmooth(color, {
    ...(emissive != null
      ? { emissive: new THREE.Color(emissive), emissiveIntensity: intensity }
      : {}),
  })
}

function tagAnim(o: THREE.Object3D, kind: string, phase = 0) {
  o.userData.vipAnim = kind
  o.userData.vipPhase = phase
  o.userData.harborVip = true
  return o
}

/** Phoenix crown crest — spinning flame discs on the head socket. */
function buildPhoenixHatOverlay(color: number, accent: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'gear-vip-hat'
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.06, 7), mat(color, accent, 0.45))
  g.add(base)
  const crest = tagAnim(new THREE.Group(), 'spin-y', 0.4)
  for (let i = 0; i < 5; i++) {
    const feather = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 5), mat(accent, accent, 0.7))
    const a = (i / 5) * Math.PI * 2
    feather.position.set(Math.cos(a) * 0.08, 0.12, Math.sin(a) * 0.08)
    feather.rotation.z = Math.cos(a) * 0.5
    crest.add(feather)
  }
  g.add(crest)
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), matSmooth(accent, 0xffe080, 0.9))
  gem.position.y = 0.08
  tagAnim(gem, 'pulse', 1.2)
  g.add(gem)
  return g
}

function buildJadeHatOverlay(color: number, accent: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'gear-vip-hat'
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 5, 10), mat(color, accent, 0.55))
  band.rotation.x = Math.PI / 2
  g.add(band)
  const orbit = tagAnim(new THREE.Group(), 'spin-y', 0.9)
  for (let i = 0; i < 3; i++) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), matSmooth(accent, accent, 0.85))
    const a = (i / 3) * Math.PI * 2
    orb.position.set(Math.cos(a) * 0.16, 0.06, Math.sin(a) * 0.16)
    orbit.add(orb)
  }
  g.add(orbit)
  return g
}

function buildStarlitHatOverlay(color: number, accent: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'gear-vip-hat'
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), matSmooth(color, accent, 0.4))
  helm.scale.set(1, 0.7, 1.05)
  g.add(helm)
  const plume = tagAnim(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 5), mat(accent, 0xffffff, 0.8)), 'bob', 0.5)
  plume.position.set(0, 0.18, -0.02)
  g.add(plume)
  for (let i = 0; i < 4; i++) {
    const star = tagAnim(
      new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 0), matSmooth(0xffffff, 0xffffff, 1)),
      'twinkle',
      i * 0.7,
    )
    const a = (i / 4) * Math.PI * 2
    star.position.set(Math.cos(a) * 0.14, 0.05 + (i % 2) * 0.04, Math.sin(a) * 0.14)
    g.add(star)
  }
  return g
}

/** Flowing cape / shoulder flare on the back socket. */
function buildVipCape(color: number, accent: number, set: HarborVipSetId): THREE.Group {
  const g = new THREE.Group()
  g.name = 'gear-vip-cape'
  const cape = tagAnim(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.04), mat(color, accent, 0.35)), 'sway', 0.2)
  cape.position.set(0, -0.1, -0.02)
  g.add(cape)
  if (set === 'phoenix-sovereign') {
    const trim = tagAnim(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.05), mat(accent, accent, 0.7)), 'sway', 0.8)
    trim.position.set(0, 0.12, -0.02)
    g.add(trim)
  } else if (set === 'jade-immortal') {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.03), mat(accent, accent, 0.5))
    panel.position.set(0, -0.05, -0.04)
    g.add(panel)
  } else {
    const bars = tagAnim(new THREE.Group(), 'sway', 1.1)
    for (const x of [-0.1, 0.1] as const) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.03), mat(accent, 0xa0d0ff, 0.55))
      bar.position.set(x, -0.08, -0.04)
      bars.add(bar)
    }
    g.add(bars)
  }
  return g
}

function buildPhoenixFan(color: number, accent: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'gear-hand'
  g.userData.harborGear = true
  const wood = hqWoodTexture()
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.015, 0.14, 5),
    hqMatTex(P.woodDark, wood),
  )
  stick.position.set(0.04, 0, 0)
  g.add(stick)
  g.add(hqBox(0.03, 0.02, 0.03, P.trimGold, 0.04, 0.06, 0))
  const fan = tagAnim(new THREE.Group(), 'fan-flutter', 0.3)
  fan.position.set(0.1, 0.08, 0)
  for (let i = 0; i < 7; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.01), mat(i % 2 ? color : accent, accent, 0.55))
    blade.rotation.z = -0.7 + (i / 6) * 1.4
    blade.position.set(Math.sin(-0.7 + (i / 6) * 1.4) * 0.06, Math.cos(-0.7 + (i / 6) * 1.4) * 0.04, 0)
    fan.add(blade)
  }
  g.add(fan)
  return g
}

function buildJadeOrb(color: number, accent: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'gear-hand'
  g.userData.harborGear = true
  const core = tagAnim(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), matSmooth(color, accent, 0.9)), 'pulse', 0.4)
  core.position.set(0.08, 0.06, 0)
  g.add(core)
  const ring = tagAnim(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 4, 10), mat(accent, accent, 0.7)), 'spin-z', 0.6)
  ring.position.set(0.08, 0.06, 0)
  g.add(ring)
  return g
}

function buildStarlitCompass(color: number, accent: number): THREE.Group {
  const g = new THREE.Group()
  g.name = 'gear-hand'
  g.userData.harborGear = true
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 8), mat(color, accent, 0.4))
  body.position.set(0.08, 0.04, 0)
  body.rotation.x = Math.PI / 2
  g.add(body)
  // Iron rim + glass face bead (value breakup on the dial)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 4, 10), mat(P.iron, accent, 0.35))
  rim.position.set(0.08, 0.04, 0)
  rim.rotation.x = Math.PI / 2
  g.add(rim)
  g.add(hqBox(0.04, 0.02, 0.02, P.trimGold, 0.08, 0.04, 0.03))
  const needle = tagAnim(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.01), mat(accent, 0xff6060, 0.8)), 'spin-z', 1.4)
  needle.position.set(0.08, 0.04, 0.02)
  g.add(needle)
  return g
}

/** Build VIP hand prop when the equipped hand is a VIP set piece. */
export function buildVipHandheldProp(itemId: string, color: number, accent: number): THREE.Object3D | null {
  if (itemId === 'hand-phoenix-fan') return buildPhoenixFan(color, accent)
  if (itemId === 'hand-jade-orb') return buildJadeOrb(color, accent)
  if (itemId === 'hand-starlit-compass') return buildStarlitCompass(color, accent)
  return null
}

function findSocket(root: THREE.Object3D, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null
  root.traverse((o) => {
    if (o.name === name) found = o
  })
  return found
}

/** Attach / refresh VIP hat crest + cape overlays for the equipped look. */
export function applyVipOverlaysToProtagonist(root: THREE.Object3D, look: HarborLook): void {
  const doomed: THREE.Object3D[] = []
  root.traverse((o) => {
    if (o.userData.harborVip && (o.name === 'gear-vip-hat' || o.name === 'gear-vip-cape')) {
      doomed.push(o)
    }
  })
  for (const o of doomed) o.parent?.remove(o)

  const hatSet = harborVipSetFor(look.hat)
  const topSet = harborVipSetFor(look.top)

  const head = findSocket(root, 'head')
  if (head && hatSet) {
    const colors = {
      phoenix: { c: 0x8a2a30, a: 0xf0d060 },
      jade: { c: 0x1a4038, a: 0x3dcfb6 },
      starlit: { c: 0x1a2438, a: 0xa0d0ff },
    }
    const pal =
      hatSet.id === 'phoenix-sovereign'
        ? colors.phoenix
        : hatSet.id === 'jade-immortal'
          ? colors.jade
          : colors.starlit
    const overlay =
      hatSet.id === 'phoenix-sovereign'
        ? buildPhoenixHatOverlay(pal.c, pal.a)
        : hatSet.id === 'jade-immortal'
          ? buildJadeHatOverlay(pal.c, pal.a)
          : buildStarlitHatOverlay(pal.c, pal.a)
    head.add(overlay)
  }

  const back = findSocket(root, 'back')
  if (back && topSet) {
    const color =
      topSet.id === 'phoenix-sovereign' ? 0x8a2a30 : topSet.id === 'jade-immortal' ? 0x2a6a58 : 0x1a2840
    const accent =
      topSet.id === 'phoenix-sovereign' ? 0xf0d060 : topSet.id === 'jade-immortal' ? 0x3dcfb6 : 0xa0d0ff
    back.add(buildVipCape(color, accent, topSet.id))
  }
}

/** Drive VIP overlay / prop motion. Call each frame with a phase in seconds. */
export function tickVipGearAnims(root: THREE.Object3D, phase: number): void {
  root.traverse((o) => {
    const kind = o.userData.vipAnim as string | undefined
    if (!kind) return
    const p = phase + ((o.userData.vipPhase as number) ?? 0)
    if (kind === 'spin-y') o.rotation.y = p * 1.6
    else if (kind === 'spin-z') o.rotation.z = p * 2.2
    else if (kind === 'bob') o.position.y = ((o.userData.vipBaseY as number) ?? (o.userData.vipBaseY = o.position.y)) + Math.sin(p * 3) * 0.015
    else if (kind === 'pulse') {
      const s = 1 + Math.sin(p * 4) * 0.08
      o.scale.setScalar(s)
    } else if (kind === 'twinkle') {
      const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial
      if (m && 'emissiveIntensity' in m) m.emissiveIntensity = 0.5 + Math.sin(p * 5) * 0.45
      o.rotation.y = p * 2
    } else if (kind === 'sway') {
      o.rotation.x = Math.sin(p * 1.8) * 0.12
      o.rotation.z = Math.cos(p * 1.3) * 0.06
    } else if (kind === 'fan-flutter') {
      o.rotation.y = Math.sin(p * 4) * 0.25
      o.rotation.z = Math.cos(p * 3) * 0.1
    } else if (kind === 'sail-ripple') {
      o.rotation.y = Math.sin(p * 1.4) * 0.08
    } else if (kind === 'prow-nod') {
      o.rotation.z = Math.sin(p * 2) * 0.05
    }
  })
}

/** Extra animated ornaments on VIP hulls (dragon / pearl / imperial). */
export function attachVipBoatOrnaments(hull: THREE.Group, boatId: string): void {
  if (boatId === 'boat-dragon') {
    const flame = tagAnim(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 5), mat(0xff6040, 0xffa020, 0.9)), 'pulse', 0.5)
    flame.position.set(1.35, 0.75, 0)
    flame.rotation.z = -Math.PI / 2
    hull.add(flame)
    const wing = tagAnim(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.35), mat(0xf0d060, 0xffe080, 0.5)), 'sail-ripple', 0.2)
    wing.position.set(0.4, 0.85, 0)
    hull.add(wing)
  } else if (boatId === 'boat-pearl') {
    const dome = tagAnim(new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), matSmooth(0xe8e0d0, 0x3dcfb6, 0.55)), 'pulse', 0.3)
    dome.position.set(-0.2, 1.05, 0)
    dome.scale.set(1, 0.55, 1)
    hull.add(dome)
    const orbit = tagAnim(new THREE.Group(), 'spin-y', 0.7)
    for (let i = 0; i < 4; i++) {
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), matSmooth(0xffffff, 0x3dcfb6, 0.8))
      const a = (i / 4) * Math.PI * 2
      pearl.position.set(Math.cos(a) * 0.45, 1.0, Math.sin(a) * 0.35)
      orbit.add(pearl)
    }
    hull.add(orbit)
  } else if (boatId === 'boat-imperial') {
    const prow = tagAnim(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.2), mat(0xf5e6a8, 0xfff0c0, 0.7)), 'prow-nod', 0.4)
    prow.position.set(1.4, 0.7, 0)
    hull.add(prow)
    const banner = tagAnim(new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.45), mat(0xc4a35a, 0xffe080, 0.45)), 'sail-ripple', 1)
    banner.position.set(0.2, 1.35, 0.15)
    hull.add(banner)
  }
}

/** Mark VIP lantern cores for pulse animation. */
export function tagVipLanternAnim(lanternRoot: THREE.Object3D, lanternId: string): void {
  if (!lanternId.startsWith('lantern-phoenix') && lanternId !== 'lantern-dragon' && lanternId !== 'lantern-starlight') {
    return
  }
  lanternRoot.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) tagAnim(o, lanternId === 'lantern-starlight' ? 'twinkle' : 'pulse', Math.random())
  })
  lanternRoot.userData.vipAnimRoot = true
}
