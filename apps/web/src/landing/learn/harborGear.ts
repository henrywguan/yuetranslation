/**
 * Harbor Quest outfit catalog — hats, tops, bottoms, shoes, handhelds.
 * Original low-poly kit (not Jagex gear). Used by the riverside outfitter shop
 * and the Save Shack look snapshot.
 */
import * as THREE from 'three'

export type HarborGearSlot = 'hat' | 'top' | 'bottom' | 'shoes' | 'hand'

export type HarborGearItem = {
  id: string
  slot: HarborGearSlot
  name: { en: string; zh: string }
  /** Primary Lambert color for the piece. */
  color: number
  /** Optional accent (bead, trim, blade tip). */
  accent?: number
  /** Price in ferry coins at the outfitter. */
  price: number
}

/** Five pieces per slot — smoke-tested kit size. */
export const HARBOR_GEAR_CATALOG: readonly HarborGearItem[] = [
  // —— Hats ——
  { id: 'hat-straw', slot: 'hat', name: { en: 'Straw traveler hat', zh: '稻草旅笠' }, color: 0xc4a860, accent: 0x3dcfb6, price: 0 },
  { id: 'hat-bamboo', slot: 'hat', name: { en: 'Bamboo coolie hat', zh: '竹笠' }, color: 0xd8c078, accent: 0x5a7a40, price: 8 },
  { id: 'hat-scholar', slot: 'hat', name: { en: 'Scholar soft cap', zh: '書生軟帽' }, color: 0x2a3440, accent: 0xc4a35a, price: 12 },
  { id: 'hat-fisherman', slot: 'hat', name: { en: 'Fisherman headscarf', zh: '漁夫頭巾' }, color: 0x3a6a88, accent: 0xe8d8b0, price: 10 },
  { id: 'hat-festival', slot: 'hat', name: { en: 'Festival jade band', zh: '節慶玉箍' }, color: 0x1a2820, accent: 0x3dcfb6, price: 18 },

  // —— Tops ——
  { id: 'top-harbor', slot: 'top', name: { en: 'Harbor ink robe', zh: '港灣墨袍' }, color: 0x1e3a48, accent: 0x162830, price: 0 },
  { id: 'top-jade', slot: 'top', name: { en: 'Jade river tunic', zh: '玉河短褂' }, color: 0x2a6a58, accent: 0x3dcfb6, price: 14 },
  { id: 'top-merchant', slot: 'top', name: { en: 'Merchant plum coat', zh: '商賈紫褂' }, color: 0x5a2a48, accent: 0xc4a35a, price: 16 },
  { id: 'top-ferry', slot: 'top', name: { en: 'Ferry linen wrap', zh: '渡船麻衣' }, color: 0xd8c8a0, accent: 0x8a7050, price: 11 },
  { id: 'top-night', slot: 'top', name: { en: 'Night watch vest', zh: '夜巡背心' }, color: 0x243048, accent: 0x3dcfb6, price: 20 },

  // —— Bottoms ——
  { id: 'bottom-travel', slot: 'bottom', name: { en: 'Travel trousers', zh: '旅褲' }, color: 0x3a3028, price: 0 },
  { id: 'bottom-slate', slot: 'bottom', name: { en: 'Slate work pants', zh: '石板工褲' }, color: 0x3a4450, price: 9 },
  { id: 'bottom-reed', slot: 'bottom', name: { en: 'Reed-dyed wrap', zh: '蘆染裹腿' }, color: 0x4a5a38, price: 11 },
  { id: 'bottom-crimson', slot: 'bottom', name: { en: 'Crimson festival pants', zh: '節慶紅褲' }, color: 0x8a2a30, price: 15 },
  { id: 'bottom-ink', slot: 'bottom', name: { en: 'Deep ink culottes', zh: '深墨闊褲' }, color: 0x1a2430, price: 17 },

  // —— Shoes ——
  { id: 'shoes-leather', slot: 'shoes', name: { en: 'Leather river boots', zh: '河皮靴' }, color: 0x6a4a30, price: 0 },
  { id: 'shoes-straw', slot: 'shoes', name: { en: 'Straw sandals', zh: '草鞋' }, color: 0xc8b070, accent: 0x5a4a30, price: 6 },
  { id: 'shoes-lacquer', slot: 'shoes', name: { en: 'Lacquer court shoes', zh: '漆木朝鞋' }, color: 0x1a1814, accent: 0xc4a35a, price: 14 },
  { id: 'shoes-jade', slot: 'shoes', name: { en: 'Jade-stitched boots', zh: '玉線靴' }, color: 0x2a4038, accent: 0x3dcfb6, price: 16 },
  { id: 'shoes-storm', slot: 'shoes', name: { en: 'Storm deck boots', zh: '風雨甲板靴' }, color: 0x2a3038, accent: 0x4a90a8, price: 18 },

  // —— Handheld ——
  { id: 'hand-none', slot: 'hand', name: { en: 'Empty hands', zh: '空手' }, color: 0xe8c4a8, price: 0 },
  { id: 'hand-fan', slot: 'hand', name: { en: 'Paper folding fan', zh: '紙扇' }, color: 0xf0e0c0, accent: 0x3dcfb6, price: 8 },
  { id: 'hand-lantern', slot: 'hand', name: { en: 'Jade paper lantern', zh: '玉紙燈籠' }, color: 0xe07040, accent: 0x3dcfb6, price: 12 },
  { id: 'hand-oar', slot: 'hand', name: { en: 'Mini ferry oar', zh: '渡船小槳' }, color: 0x8a6038, accent: 0xc4a860, price: 10 },
  { id: 'hand-scroll', slot: 'hand', name: { en: 'Lesson scroll', zh: '課卷' }, color: 0xe8d8b0, accent: 0x5a2a20, price: 9 },
] as const

export type HarborGearId = (typeof HARBOR_GEAR_CATALOG)[number]['id']

export type HarborLook = {
  hat: HarborGearId
  top: HarborGearId
  bottom: HarborGearId
  shoes: HarborGearId
  hand: HarborGearId
}

/** Starter outfit — free defaults. */
export const HARBOR_DEFAULT_LOOK: HarborLook = {
  hat: 'hat-straw',
  top: 'top-harbor',
  bottom: 'bottom-travel',
  shoes: 'shoes-leather',
  hand: 'hand-none',
}

/** Free starter kit (all price-0 pieces). */
export const HARBOR_STARTER_OWNED: readonly HarborGearId[] = HARBOR_GEAR_CATALOG.filter(
  (i) => i.price === 0,
).map((i) => i.id)

export const HARBOR_GEAR_SLOTS: readonly HarborGearSlot[] = [
  'hat',
  'top',
  'bottom',
  'shoes',
  'hand',
] as const

const BY_ID = new Map(HARBOR_GEAR_CATALOG.map((i) => [i.id, i]))

export function harborGearById(id: string): HarborGearItem | undefined {
  return BY_ID.get(id)
}

export function harborGearForSlot(slot: HarborGearSlot): HarborGearItem[] {
  return HARBOR_GEAR_CATALOG.filter((i) => i.slot === slot)
}

export function sanitizeHarborLook(raw: unknown): HarborLook {
  const base = { ...HARBOR_DEFAULT_LOOK }
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  for (const slot of HARBOR_GEAR_SLOTS) {
    const id = o[slot]
    if (typeof id !== 'string') continue
    const item = BY_ID.get(id)
    if (item && item.slot === slot) base[slot] = item.id
  }
  return base
}

export function sanitizeOwnedGear(raw: unknown): HarborGearId[] {
  const starter = new Set<string>(HARBOR_STARTER_OWNED)
  if (!Array.isArray(raw)) return [...HARBOR_STARTER_OWNED]
  for (const id of raw) {
    if (typeof id === 'string' && BY_ID.has(id)) starter.add(id)
  }
  return [...starter] as HarborGearId[]
}

/** Non-starter gear stored at the Harbor Bank (starters always stay on the Scout). */
export function sanitizeBankedGear(raw: unknown): HarborGearId[] {
  const starters = new Set<string>(HARBOR_STARTER_OWNED)
  const set = new Set<string>()
  if (!Array.isArray(raw)) return []
  for (const id of raw) {
    if (typeof id === 'string' && BY_ID.has(id) && !starters.has(id)) set.add(id)
  }
  return [...set] as HarborGearId[]
}

/** Carried inventory with banked pieces removed (starters always kept). */
export function sanitizeCarriedGear(ownedRaw: unknown, bankedRaw: unknown = []): HarborGearId[] {
  const banked = new Set(sanitizeBankedGear(bankedRaw))
  return sanitizeOwnedGear(ownedRaw).filter((id) => !banked.has(id))
}

function mat(color: number) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true })
}

/** Build a handheld prop mesh for the hand_r socket. */
export function buildHandheldProp(itemId: string): THREE.Object3D | null {
  const item = BY_ID.get(itemId)
  if (!item || item.slot !== 'hand' || item.id === 'hand-none') return null
  const g = new THREE.Group()
  g.name = 'gear-hand'
  g.userData.harborGear = true
  const main = mat(item.color)
  const accent = mat(item.accent ?? item.color)
  if (item.id === 'hand-fan') {
    const fan = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.12), main)
    fan.position.set(0.08, 0.02, 0)
    g.add(fan)
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), accent)
    stick.position.set(0, -0.02, 0)
    g.add(stick)
  } else if (item.id === 'hand-lantern') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1), main)
    body.position.set(0.06, 0.08, 0)
    g.add(body)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), accent)
    cap.position.set(0.06, 0.16, 0)
    g.add(cap)
  } else if (item.id === 'hand-oar') {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, 0.03), main)
    shaft.position.set(0.05, 0.1, 0)
    shaft.rotation.z = 0.4
    g.add(shaft)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.02), accent)
    blade.position.set(0.14, 0.26, 0)
    blade.rotation.z = 0.4
    g.add(blade)
  } else if (item.id === 'hand-scroll') {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), main)
    roll.rotation.z = Math.PI / 2
    roll.position.set(0.08, 0.02, 0)
    g.add(roll)
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.06), accent)
    ribbon.position.set(0.08, 0.02, 0.04)
    g.add(ribbon)
  }
  return g
}

/** Attach / replace handheld gear on a protagonist group. */
export function applyHandheldToProtagonist(root: THREE.Object3D, look: HarborLook) {
  const toRemove: THREE.Object3D[] = []
  root.traverse((o) => {
    if (o.userData.harborGear && o.name === 'gear-hand') toRemove.push(o)
  })
  for (const o of toRemove) o.parent?.remove(o)

  let hand: THREE.Object3D | null = null
  root.traverse((o) => {
    if (o.name === 'hand_r') hand = o
  })
  if (!hand) return
  const prop = buildHandheldProp(look.hand)
  if (prop) (hand as THREE.Object3D).add(prop)
}

/** Colors for body parts driven by the equipped look. */
export function lookColors(look: HarborLook) {
  const hat = BY_ID.get(look.hat) ?? BY_ID.get(HARBOR_DEFAULT_LOOK.hat)!
  const top = BY_ID.get(look.top) ?? BY_ID.get(HARBOR_DEFAULT_LOOK.top)!
  const bottom = BY_ID.get(look.bottom) ?? BY_ID.get(HARBOR_DEFAULT_LOOK.bottom)!
  const shoes = BY_ID.get(look.shoes) ?? BY_ID.get(HARBOR_DEFAULT_LOOK.shoes)!
  return {
    hat: hat.color,
    hatAccent: hat.accent ?? hat.color,
    top: top.color,
    topAccent: top.accent ?? top.color,
    bottom: bottom.color,
    shoes: shoes.color,
    shoesAccent: shoes.accent ?? shoes.color,
  }
}


/** Recolor tagged body parts + attach handheld from an equipped look. */
export function applyLookToProtagonist(root: THREE.Object3D, look: HarborLook) {
  const colors = lookColors(look)
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const part = mesh.userData.harborPart as string | undefined
    if (!part) return
    const mat = mesh.material as THREE.MeshLambertMaterial
    if (!mat || !('color' in mat)) return
    if (part === 'hat') mat.color.setHex(colors.hat)
    else if (part === 'hatAccent') mat.color.setHex(colors.hatAccent)
    else if (part === 'top') mat.color.setHex(colors.top)
    else if (part === 'topAccent') mat.color.setHex(colors.topAccent)
    else if (part === 'bottom') mat.color.setHex(colors.bottom)
    else if (part === 'shoes') mat.color.setHex(colors.shoes)
  })
  applyHandheldToProtagonist(root, look)
}
