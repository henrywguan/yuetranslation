/**
 * Harbor Quest outfit catalog — hats, tops, bottoms, shoes, handhelds.
 * Original low-poly kit (not Jagex gear). Used by the riverside outfitter shop
 * and the Save Shack look snapshot.
 */
import * as THREE from 'three'
import {
  HARBOR_CRAFT_PALETTE as P,
  hqBox,
  hqBoxTex,
  hqMat,
  hqMatTex,
  hqPost,
  hqWoodTexture,
} from './harborCraft'
import {
  applyVipOverlaysToProtagonist,
  buildVipHandheldProp,
  tagVipLanternAnim,
} from './harborVipGear'
import { applyTierDetailOverlays, enrichHandheldProp } from './harborGearDetail'
import {
  buildClothingMesh,
  clearHarborClothingMeshes,
  clothingUsesScoutBase,
  setScoutBaseClothingVisible,
} from './harborClothingMeshes'

export type HarborGearSlot = 'hat' | 'top' | 'bottom' | 'shoes' | 'hand' | 'boat' | 'lantern'

export type HarborGearTier = 'common' | 'mid' | 'high' | 'vip'

export type HarborGearItem = {
  id: string
  slot: HarborGearSlot
  name: { en: string; zh: string }
  /** Primary Lambert color for the piece. */
  color: number
  /** Optional accent (bead, trim, blade tip / sail / glow). */
  accent?: number
  /** Price in ferry coins at the outfitter. */
  price: number
  /** Shop tier — common → VIP. */
  tier: HarborGearTier
}

export { HARBOR_VIP_MIN_PRICE, HARBOR_VIP_SETS, harborVipSetFor } from './harborVipGear'

/** Clothing + boats & boat-lanterns. VIP sets cost ≥ HARBOR_VIP_MIN_PRICE. */
export const HARBOR_GEAR_CATALOG: readonly HarborGearItem[] = [
  // —— Hats ——
  { id: 'hat-straw', slot: 'hat', name: { en: 'Straw traveler hat', zh: '稻草旅笠' }, color: 0xc4a860, accent: 0x3dcfb6, price: 0, tier: 'common' },
  { id: 'hat-bamboo', slot: 'hat', name: { en: 'Bamboo coolie hat', zh: '竹笠' }, color: 0xd8c078, accent: 0x5a7a40, price: 8, tier: 'common' },
  { id: 'hat-scholar', slot: 'hat', name: { en: 'Scholar soft cap', zh: '書生軟帽' }, color: 0x2a3440, accent: 0xc4a35a, price: 12, tier: 'mid' },
  { id: 'hat-fisherman', slot: 'hat', name: { en: 'Fisherman headscarf', zh: '漁夫頭巾' }, color: 0x3a6a88, accent: 0xe8d8b0, price: 10, tier: 'common' },
  // VIP · Phoenix Sovereign
  { id: 'hat-festival', slot: 'hat', name: { en: 'Phoenix fire crown', zh: '鳳凰火冠' }, color: 0x8a2a30, accent: 0xf0d060, price: 5200, tier: 'vip' },
  // VIP · Jade Immortal
  { id: 'hat-jade-diadem', slot: 'hat', name: { en: 'Jade immortal diadem', zh: '玉仙冠' }, color: 0x1a4038, accent: 0x3dcfb6, price: 5400, tier: 'vip' },
  // VIP · Starlit Admiral
  { id: 'hat-starlit-helm', slot: 'hat', name: { en: 'Starlit admiral helm', zh: '星光提督盔' }, color: 0x1a2438, accent: 0xa0d0ff, price: 5600, tier: 'vip' },

  // —— Tops ——
  { id: 'top-harbor', slot: 'top', name: { en: 'Harbor ink robe', zh: '港灣墨袍' }, color: 0x1e3a48, accent: 0x162830, price: 0, tier: 'common' },
  { id: 'top-jade', slot: 'top', name: { en: 'Jade river tunic', zh: '玉河短褂' }, color: 0x2a6a58, accent: 0x3dcfb6, price: 14, tier: 'mid' },
  { id: 'top-merchant', slot: 'top', name: { en: 'Merchant plum coat', zh: '商賈紫褂' }, color: 0x5a2a48, accent: 0xc4a35a, price: 16, tier: 'high' },
  { id: 'top-ferry', slot: 'top', name: { en: 'Ferry linen wrap', zh: '渡船麻衣' }, color: 0xd8c8a0, accent: 0x8a7050, price: 11, tier: 'mid' },
  { id: 'top-night', slot: 'top', name: { en: 'Phoenix sovereign robe', zh: '鳳凰帝袍' }, color: 0x6a1828, accent: 0xf0d060, price: 5800, tier: 'vip' },
  { id: 'top-jade-immortal', slot: 'top', name: { en: 'Jade immortal mantle', zh: '玉仙霞帔' }, color: 0x1e5a48, accent: 0x80ffe0, price: 6000, tier: 'vip' },
  { id: 'top-starlit-coat', slot: 'top', name: { en: 'Starlit admiral coat', zh: '星光提督褂' }, color: 0x142038, accent: 0xa0d0ff, price: 6200, tier: 'vip' },

  // —— Bottoms ——
  { id: 'bottom-travel', slot: 'bottom', name: { en: 'Travel trousers', zh: '旅褲' }, color: 0x3a3028, price: 0, tier: 'common' },
  { id: 'bottom-slate', slot: 'bottom', name: { en: 'Slate work pants', zh: '石板工褲' }, color: 0x3a4450, price: 9, tier: 'common' },
  { id: 'bottom-reed', slot: 'bottom', name: { en: 'Reed-dyed wrap', zh: '蘆染裹腿' }, color: 0x4a5a38, price: 11, tier: 'mid' },
  { id: 'bottom-crimson', slot: 'bottom', name: { en: 'Crimson festival pants', zh: '節慶紅褲' }, color: 0x8a2a30, price: 15, tier: 'high' },
  { id: 'bottom-ink', slot: 'bottom', name: { en: 'Deep ink culottes', zh: '深墨闊褲' }, color: 0x1a2430, price: 17, tier: 'high' },
  { id: 'bottom-phoenix', slot: 'bottom', name: { en: 'Phoenix flame wrap', zh: '鳳焰裹腿' }, color: 0x5a1018, accent: 0xf0a040, price: 5100, tier: 'vip' },
  { id: 'bottom-jade-flow', slot: 'bottom', name: { en: 'Jade flow culottes', zh: '玉瀾闊褲' }, color: 0x163830, accent: 0x3dcfb6, price: 5200, tier: 'vip' },
  { id: 'bottom-starlit-greaves', slot: 'bottom', name: { en: 'Starlit night greaves', zh: '星夜護腿' }, color: 0x101828, accent: 0x6080c0, price: 5300, tier: 'vip' },

  // —— Shoes ——
  { id: 'shoes-leather', slot: 'shoes', name: { en: 'Leather river boots', zh: '河皮靴' }, color: 0x6a4a30, price: 0, tier: 'common' },
  { id: 'shoes-straw', slot: 'shoes', name: { en: 'Straw sandals', zh: '草鞋' }, color: 0xc8b070, accent: 0x5a4a30, price: 6, tier: 'common' },
  { id: 'shoes-lacquer', slot: 'shoes', name: { en: 'Lacquer court shoes', zh: '漆木朝鞋' }, color: 0x1a1814, accent: 0xc4a35a, price: 14, tier: 'mid' },
  { id: 'shoes-jade', slot: 'shoes', name: { en: 'Jade-stitched boots', zh: '玉線靴' }, color: 0x2a4038, accent: 0x3dcfb6, price: 16, tier: 'high' },
  { id: 'shoes-storm', slot: 'shoes', name: { en: 'Phoenix ash boots', zh: '鳳灰靴' }, color: 0x2a1818, accent: 0xf0a040, price: 5050, tier: 'vip' },
  { id: 'shoes-jade-cloud', slot: 'shoes', name: { en: 'Jade cloud slippers', zh: '玉雲履' }, color: 0x204038, accent: 0xa0ffe8, price: 5150, tier: 'vip' },
  { id: 'shoes-starlit-boots', slot: 'shoes', name: { en: 'Starlit deck boots', zh: '星光甲板靴' }, color: 0x141c28, accent: 0xa0d0ff, price: 5250, tier: 'vip' },

  // —— Handheld ——
  { id: 'hand-none', slot: 'hand', name: { en: 'Empty hands', zh: '空手' }, color: 0xe8c4a8, price: 0, tier: 'common' },
  { id: 'hand-fan', slot: 'hand', name: { en: 'Paper folding fan', zh: '紙扇' }, color: 0xf0e0c0, accent: 0x3dcfb6, price: 8, tier: 'common' },
  { id: 'hand-lantern', slot: 'hand', name: { en: 'Jade paper lantern', zh: '玉紙燈籠' }, color: 0xe07040, accent: 0x3dcfb6, price: 12, tier: 'mid' },
  { id: 'hand-oar', slot: 'hand', name: { en: 'Mini ferry oar', zh: '渡船小槳' }, color: 0x8a6038, accent: 0xc4a860, price: 10, tier: 'common' },
  { id: 'hand-scroll', slot: 'hand', name: { en: 'Lesson scroll', zh: '課卷' }, color: 0xe8d8b0, accent: 0x5a2a20, price: 9, tier: 'common' },
  { id: 'hand-phoenix-fan', slot: 'hand', name: { en: 'Phoenix fire fan', zh: '鳳凰火扇' }, color: 0x8a2a30, accent: 0xf0d060, price: 5500, tier: 'vip' },
  { id: 'hand-jade-orb', slot: 'hand', name: { en: 'Jade immortal orb', zh: '玉仙寶珠' }, color: 0x2a8a6a, accent: 0x80ffe0, price: 5700, tier: 'vip' },
  { id: 'hand-starlit-compass', slot: 'hand', name: { en: 'Starlit admiral compass', zh: '星光提督羅盤' }, color: 0x1a2840, accent: 0xffe080, price: 5900, tier: 'vip' },

  // —— Boats (3 varieties × 4 tiers) ——
  { id: 'boat-canoe', slot: 'boat', name: { en: 'Pine river canoe', zh: '松木河舟' }, color: 0x8a6038, accent: 0x3dcfb6, price: 0, tier: 'common' },
  { id: 'boat-reed', slot: 'boat', name: { en: 'Reed bank skiff', zh: '蘆岸小艇' }, color: 0xa89050, accent: 0x5a7a40, price: 18, tier: 'common' },
  { id: 'boat-bamboo', slot: 'boat', name: { en: 'Bamboo flat punt', zh: '竹排' }, color: 0xc4a860, accent: 0x6a8a40, price: 24, tier: 'common' },
  { id: 'boat-sampan', slot: 'boat', name: { en: 'Lacquer sampan', zh: '漆木舢舨' }, color: 0x3a2818, accent: 0xc4a35a, price: 48, tier: 'mid' },
  { id: 'boat-barge', slot: 'boat', name: { en: 'Ferry deck barge', zh: '渡船甲板' }, color: 0x6a4a30, accent: 0x4a90a8, price: 56, tier: 'mid' },
  { id: 'boat-junk', slot: 'boat', name: { en: 'Fishing junk', zh: '漁船' }, color: 0x5a4030, accent: 0xe8d8b0, price: 64, tier: 'mid' },
  { id: 'boat-scholar', slot: 'boat', name: { en: 'Scholar yacht', zh: '書生快艇' }, color: 0xd8c8a0, accent: 0x2a3440, price: 110, tier: 'high' },
  { id: 'boat-merchant', slot: 'boat', name: { en: 'Merchant river junk', zh: '商賈河船' }, color: 0x5a2a48, accent: 0xc4a35a, price: 125, tier: 'high' },
  { id: 'boat-jade', slot: 'boat', name: { en: 'Jade trim riverboat', zh: '玉飾河船' }, color: 0x2a4a40, accent: 0x3dcfb6, price: 140, tier: 'high' },
  { id: 'boat-dragon', slot: 'boat', name: { en: 'Phoenix dragon racer', zh: '鳳龍快船' }, color: 0x8a2a30, accent: 0xf0d060, price: 7200, tier: 'vip' },
  { id: 'boat-pearl', slot: 'boat', name: { en: 'Jade immortal pavilion', zh: '玉仙舫' }, color: 0xe8e0d0, accent: 0x3dcfb6, price: 7800, tier: 'vip' },
  { id: 'boat-imperial', slot: 'boat', name: { en: 'Starlit imperial barge', zh: '星光御舫' }, color: 0xc4a35a, accent: 0xf5e6a8, price: 8500, tier: 'vip' },

  // —— Boat lanterns ——
  { id: 'lantern-paper-amber', slot: 'lantern', name: { en: 'Amber paper lantern', zh: '琥珀紙燈' }, color: 0xe07040, accent: 0xffa040, price: 0, tier: 'common' },
  { id: 'lantern-paper-crimson', slot: 'lantern', name: { en: 'Crimson paper lantern', zh: '絳紅紙燈' }, color: 0xc03030, accent: 0xff6060, price: 14, tier: 'common' },
  { id: 'lantern-paper-jade', slot: 'lantern', name: { en: 'Jade paper lantern', zh: '玉紙燈' }, color: 0x3dcfb6, accent: 0xa0ffe8, price: 16, tier: 'common' },
  { id: 'lantern-silk-gold', slot: 'lantern', name: { en: 'Gold silk lantern', zh: '金絲燈籠' }, color: 0xf0d060, accent: 0xfff0a0, price: 36, tier: 'mid' },
  { id: 'lantern-silk-azure', slot: 'lantern', name: { en: 'Azure silk lantern', zh: '天青絲燈' }, color: 0x4080d0, accent: 0xa0d0ff, price: 40, tier: 'mid' },
  { id: 'lantern-oil-iron', slot: 'lantern', name: { en: 'Iron oil cage', zh: '鐵油燈籠' }, color: 0x4a4038, accent: 0xff9040, price: 44, tier: 'mid' },
  { id: 'lantern-glass-ruby', slot: 'lantern', name: { en: 'Ruby glass lantern', zh: '紅寶玻璃燈' }, color: 0xa02040, accent: 0xff4060, price: 80, tier: 'high' },
  { id: 'lantern-glass-sapphire', slot: 'lantern', name: { en: 'Sapphire glass lantern', zh: '藍寶玻璃燈' }, color: 0x2040a0, accent: 0x60a0ff, price: 90, tier: 'high' },
  { id: 'lantern-porcelain', slot: 'lantern', name: { en: 'Celadon porcelain lantern', zh: '青瓷燈' }, color: 0x80b090, accent: 0xd0f0e0, price: 100, tier: 'high' },
  { id: 'lantern-phoenix', slot: 'lantern', name: { en: 'Phoenix gold lantern', zh: '鳳凰金燈' }, color: 0xf0a020, accent: 0xffe080, price: 5100, tier: 'vip' },
  { id: 'lantern-dragon', slot: 'lantern', name: { en: 'Jade dragon lantern', zh: '玉龍燈' }, color: 0x20a060, accent: 0x80ffc0, price: 5400, tier: 'vip' },
  { id: 'lantern-starlight', slot: 'lantern', name: { en: 'Starlight pearl lantern', zh: '星光珍珠燈' }, color: 0xe8f0ff, accent: 0xffffff, price: 5800, tier: 'vip' },
] as const

export type HarborGearId = (typeof HARBOR_GEAR_CATALOG)[number]['id']

export type HarborLook = {
  hat: HarborGearId
  top: HarborGearId
  bottom: HarborGearId
  shoes: HarborGearId
  hand: HarborGearId
  boat: HarborGearId
  lantern: HarborGearId
}

/** Starter outfit — free defaults. */
export const HARBOR_DEFAULT_LOOK: HarborLook = {
  hat: 'hat-straw',
  top: 'top-harbor',
  bottom: 'bottom-travel',
  shoes: 'shoes-leather',
  hand: 'hand-none',
  boat: 'boat-canoe',
  lantern: 'lantern-paper-amber',
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
  'boat',
  'lantern',
] as const

export const HARBOR_GEAR_TIER_ORDER: readonly HarborGearTier[] = [
  'common',
  'mid',
  'high',
  'vip',
] as const

export const HARBOR_GEAR_TIER_LABEL: Record<HarborGearTier, { en: string; zh: string }> = {
  common: { en: 'Common', zh: '普通' },
  mid: { en: 'Mid', zh: '中階' },
  high: { en: 'High', zh: '高階' },
  vip: { en: 'VIP', zh: '貴賓' },
}

const BY_ID = new Map(HARBOR_GEAR_CATALOG.map((i) => [i.id, i]))

export function harborGearById(id: string): HarborGearItem | undefined {
  return BY_ID.get(id)
}

export function harborGearForSlot(slot: HarborGearSlot): HarborGearItem[] {
  // Boat lanterns can also be held — list them under Hand in the outfitter.
  if (slot === 'hand') {
    return HARBOR_GEAR_CATALOG.filter((i) => i.slot === 'hand' || i.slot === 'lantern')
  }
  return HARBOR_GEAR_CATALOG.filter((i) => i.slot === slot)
}

/** True when a catalog piece may be worn in the given look slot. */
export function harborGearCanEquipToSlot(item: HarborGearItem, slot: HarborGearSlot): boolean {
  if (item.slot === slot) return true
  // Boat lanterns may also be held in the hand.
  if (slot === 'hand' && item.slot === 'lantern') return true
  return false
}

/** True when this piece is currently worn in any compatible slot. */
export function harborGearIsWorn(look: HarborLook, item: HarborGearItem): boolean {
  if (look[item.slot] === item.id) return true
  if (item.slot === 'lantern' && look.hand === item.id) return true
  return false
}

/** Prefer the selected worn slot when the piece can go there (lantern → hand). */
export function harborGearWearTarget(
  item: HarborGearItem,
  selectedSlot: HarborGearSlot,
): HarborGearSlot {
  if (harborGearCanEquipToSlot(item, selectedSlot)) return selectedSlot
  return item.slot
}

/**
 * How this catalog row is drawn in 3D today.
 * Clothing shares one River Scout mannequin (recolor). Hands/boats/lanterns
 * have a handful of mesh families — many IDs are palette variants.
 */
export type HarborGearMeshKind =
  | 'recolor'
  | 'prop'
  | 'empty'
  | 'hull'
  | 'lantern'

export type HarborGearMeshInfo = {
  kind: HarborGearMeshKind
  /** Shared mesh family id (same silhouette / topology). */
  family: string
  /** Short label for the codex. */
  label: string
  /** True when this ID has its own topology branch (not just a palette swap). */
  uniqueMesh: boolean
}

export function harborGearMeshInfo(item: HarborGearItem): HarborGearMeshInfo {
  const { id, slot } = item
  if (slot === 'hat') {
    if (id === 'hat-festival' || id === 'hat-jade-diadem' || id === 'hat-starlit-helm') {
      return {
        kind: 'prop',
        family: `vip-hat-${id}`,
        label: 'VIP crest overlay · unique silhouette',
        uniqueMesh: true,
      }
    }
    if (id === 'hat-bamboo') {
      return { kind: 'prop', family: 'hat-bamboo-coolie', label: 'Bamboo coolie cone', uniqueMesh: true }
    }
    if (id === 'hat-scholar') {
      return { kind: 'prop', family: 'hat-scholar-soft-cap', label: 'Scholar soft cap', uniqueMesh: true }
    }
    if (id === 'hat-fisherman') {
      return { kind: 'prop', family: 'hat-fisherman-scarf', label: 'Fisherman headscarf', uniqueMesh: true }
    }
    return {
      kind: 'recolor',
      family: 'scout-hat',
      label: 'Shared scout straw · recolor',
      uniqueMesh: false,
    }
  }
  if (slot === 'top') {
    if (id === 'top-night' || id === 'top-jade-immortal' || id === 'top-starlit-coat') {
      return {
        kind: 'prop',
        family: id === 'top-night' ? 'top-phoenix-sovereign' : id === 'top-jade-immortal' ? 'top-jade-immortal-mantle' : 'top-starlit-admiral-coat',
        label: 'VIP robe · unique silhouette',
        uniqueMesh: true,
      }
    }
    if (id === 'top-jade') {
      return { kind: 'prop', family: 'top-jade-river-tunic', label: 'Jade river tunic', uniqueMesh: true }
    }
    if (id === 'top-merchant') {
      return { kind: 'prop', family: 'top-merchant-plum', label: 'Merchant plum coat', uniqueMesh: true }
    }
    if (id === 'top-ferry') {
      return { kind: 'prop', family: 'top-ferry-linen-wrap', label: 'Ferry linen wrap', uniqueMesh: true }
    }
    return {
      kind: 'recolor',
      family: 'scout-top',
      label: 'Shared scout robe · recolor',
      uniqueMesh: false,
    }
  }
  if (slot === 'bottom') {
    if (id === 'bottom-phoenix' || id === 'bottom-jade-flow' || id === 'bottom-starlit-greaves') {
      return {
        kind: 'prop',
        family:
          id === 'bottom-phoenix'
            ? 'bottom-phoenix-flame'
            : id === 'bottom-jade-flow'
              ? 'bottom-jade-flow-culotte'
              : 'bottom-starlit-greaves',
        label: 'VIP legs · unique silhouette',
        uniqueMesh: true,
      }
    }
    if (id === 'bottom-reed' || id === 'bottom-crimson' || id === 'bottom-ink') {
      return {
        kind: 'prop',
        family: id === 'bottom-reed' ? 'bottom-reed-wrap' : id === 'bottom-crimson' ? 'bottom-crimson-festival' : 'bottom-ink-culotte',
        label: 'Wide wrap / culotte',
        uniqueMesh: true,
      }
    }
    return {
      kind: 'recolor',
      family: 'scout-bottom',
      label: 'Shared scout trousers · recolor',
      uniqueMesh: false,
    }
  }
  if (slot === 'shoes') {
    if (id === 'shoes-storm' || id === 'shoes-jade-cloud' || id === 'shoes-starlit-boots') {
      return {
        kind: 'prop',
        family:
          id === 'shoes-storm'
            ? 'shoes-phoenix-ash'
            : id === 'shoes-jade-cloud'
              ? 'shoes-jade-cloud-slipper'
              : 'shoes-starlit-deck',
        label: 'VIP footwear · unique silhouette',
        uniqueMesh: true,
      }
    }
    if (id === 'shoes-straw') {
      return { kind: 'prop', family: 'shoes-straw-sandal', label: 'Straw sandals', uniqueMesh: true }
    }
    if (id === 'shoes-lacquer') {
      return { kind: 'prop', family: 'shoes-lacquer-court', label: 'Lacquer court shoes', uniqueMesh: true }
    }
    if (id === 'shoes-jade') {
      return { kind: 'prop', family: 'shoes-jade-stitch', label: 'Jade-stitched boots', uniqueMesh: true }
    }
    return {
      kind: 'recolor',
      family: 'scout-shoes',
      label: 'Shared scout boots · recolor',
      uniqueMesh: false,
    }
  }
  if (slot === 'hand') {
    if (id === 'hand-none') {
      return { kind: 'empty', family: 'hand-none', label: 'No prop', uniqueMesh: true }
    }
    if (
      id === 'hand-fan' ||
      id === 'hand-lantern' ||
      id === 'hand-oar' ||
      id === 'hand-scroll' ||
      id === 'hand-phoenix-fan' ||
      id === 'hand-jade-orb' ||
      id === 'hand-starlit-compass'
    ) {
      return {
        kind: 'prop',
        family: id,
        label: id.startsWith('hand-phoenix') || id.startsWith('hand-jade') || id.startsWith('hand-starlit')
          ? 'VIP handheld · animated'
          : 'Dedicated handheld prop',
        uniqueMesh: true,
      }
    }
    return { kind: 'prop', family: 'hand-unknown', label: 'Empty hand prop', uniqueMesh: false }
  }
  if (slot === 'boat') {
    if (id === 'boat-reed') {
      return { kind: 'hull', family: 'hull-reed', label: 'Reed deck hull', uniqueMesh: true }
    }
    if (id === 'boat-bamboo') {
      return { kind: 'hull', family: 'hull-bamboo', label: 'Bamboo-slat hull', uniqueMesh: true }
    }
    if (id === 'boat-barge') {
      return { kind: 'hull', family: 'hull-barge', label: 'Wide barge hull', uniqueMesh: true }
    }
    if (id === 'boat-junk' || id === 'boat-merchant') {
      return {
        kind: 'hull',
        family: 'hull-junk',
        label: id === 'boat-junk' ? 'Junk cabin hull' : 'Junk cabin hull · recolor',
        uniqueMesh: id === 'boat-junk',
      }
    }
    if (id === 'boat-jade') {
      return { kind: 'hull', family: 'hull-jade', label: 'Jade-rail hull', uniqueMesh: true }
    }
    if (id === 'boat-dragon') {
      return { kind: 'hull', family: 'hull-dragon', label: 'VIP dragon prow · animated', uniqueMesh: true }
    }
    if (id === 'boat-pearl') {
      return { kind: 'hull', family: 'hull-pearl', label: 'VIP pavilion · animated', uniqueMesh: true }
    }
    if (id === 'boat-imperial') {
      return { kind: 'hull', family: 'hull-imperial', label: 'VIP imperial · animated', uniqueMesh: true }
    }
    // canoe / sampan / scholar share the default canoe silhouette
    return {
      kind: 'hull',
      family: 'hull-canoe',
      label: id === 'boat-canoe' ? 'Default canoe hull' : 'Canoe hull · recolor',
      uniqueMesh: id === 'boat-canoe',
    }
  }
  // lantern
  if (id.startsWith('lantern-silk') || id === 'lantern-phoenix' || id === 'lantern-starlight') {
    return {
      kind: 'lantern',
      family: 'lantern-silk',
      label:
        id === 'lantern-phoenix' || id === 'lantern-starlight'
          ? 'VIP silk lantern · animated'
          : id === 'lantern-silk-gold'
            ? 'Silk cylinder lantern'
            : 'Silk cylinder · recolor',
      uniqueMesh: id === 'lantern-silk-gold' || id === 'lantern-phoenix' || id === 'lantern-starlight',
    }
  }
  if (id.startsWith('lantern-glass') || id === 'lantern-porcelain') {
    return {
      kind: 'lantern',
      family: 'lantern-glass',
      label: id === 'lantern-glass-ruby' ? 'Glass octahedron lantern' : 'Glass lantern · recolor',
      uniqueMesh: id === 'lantern-glass-ruby',
    }
  }
  if (id === 'lantern-oil-iron' || id === 'lantern-dragon') {
    return {
      kind: 'lantern',
      family: 'lantern-iron',
      label: id === 'lantern-dragon' ? 'VIP iron lantern · animated' : 'Iron cage lantern',
      uniqueMesh: true,
    }
  }
  return {
    kind: 'lantern',
    family: 'lantern-paper',
    label: id === 'lantern-paper-amber' ? 'Paper box lantern' : 'Paper lantern · recolor',
    uniqueMesh: id === 'lantern-paper-amber',
  }
}

export function harborGearCodexStats() {
  const rows = HARBOR_GEAR_CATALOG.map((item) => ({ item, mesh: harborGearMeshInfo(item) }))
  const unique = rows.filter((r) => r.mesh.uniqueMesh).length
  const families = new Set(rows.map((r) => r.mesh.family)).size
  return { total: rows.length, uniqueMeshes: unique, families, rows }
}

export function sanitizeHarborLook(raw: unknown): HarborLook {
  const base = { ...HARBOR_DEFAULT_LOOK }
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  for (const slot of HARBOR_GEAR_SLOTS) {
    const id = o[slot]
    if (typeof id !== 'string') continue
    const item = BY_ID.get(id)
    if (item && harborGearCanEquipToSlot(item, slot)) base[slot] = item.id
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

function handheldGlowMat(color: number, emissive: number, intensity = 0.9) {
  return new THREE.MeshLambertMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    flatShading: true,
  })
}

function attachHandheldLanternLight(
  parent: THREE.Object3D,
  y: number,
  color: number,
  scale = 0.55,
) {
  const light = new THREE.PointLight(color, scale, 3.2, 2)
  light.position.set(0.06, y, 0)
  light.userData.harborLanternLight = true
  light.userData.baseIntensity = scale
  parent.add(light)
  return light
}

/** Build boat-lantern mesh families at hand scale (paper / silk / glass / iron). */
function buildHandheldBoatLantern(item: HarborGearItem): THREE.Group {
  const g = new THREE.Group()
  g.name = 'gear-hand'
  g.userData.harborGear = true
  g.userData.harborHandheldLantern = true
  const wood = hqWoodTexture()
  const paper = item.color
  const glowCol = item.accent ?? paper
  const id = item.id

  if (id.startsWith('lantern-silk') || id === 'lantern-phoenix' || id === 'lantern-starlight') {
    g.add(hqPost(0.012, 0.016, 0.1, P.woodDark, 0.06, 0.04, 0, 5))
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.14, 6),
      handheldGlowMat(paper, glowCol, 0.85),
    )
    lamp.position.set(0.06, 0.14, 0)
    g.add(lamp)
    g.add(hqBoxTex(0.07, 0.02, 0.07, P.woodDeep, wood, 0.06, 0.22, 0))
    g.add(hqBox(0.08, 0.015, 0.08, P.iron, 0.06, 0.2, 0))
    g.add(hqBox(0.06, 0.015, 0.06, P.trimGold, 0.06, 0.08, 0))
    attachHandheldLanternLight(g, 0.14, glowCol, id === 'lantern-starlight' ? 0.75 : 0.6)
  } else if (id.startsWith('lantern-glass') || id === 'lantern-porcelain') {
    g.add(hqPost(0.014, 0.018, 0.09, P.woodDark, 0.06, 0.035, 0, 5))
    const lamp = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.06, 0),
      handheldGlowMat(paper, glowCol, 0.9),
    )
    lamp.position.set(0.06, 0.13, 0)
    g.add(lamp)
    g.add(hqBox(0.025, 0.025, 0.025, P.trimGold, 0.06, 0.19, 0))
    attachHandheldLanternLight(g, 0.13, glowCol, 0.65)
  } else if (id === 'lantern-oil-iron' || id === 'lantern-dragon') {
    g.add(hqPost(0.014, 0.018, 0.08, P.woodDark, 0.06, 0.03, 0, 5))
    g.add(hqBox(0.08, 0.1, 0.08, paper, 0.06, 0.12, 0))
    g.add(hqBox(0.09, 0.02, 0.09, P.iron, 0.06, 0.07, 0))
    g.add(hqBox(0.09, 0.02, 0.09, P.iron, 0.06, 0.17, 0))
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.06, 0.05),
      handheldGlowMat(glowCol, glowCol, 1.0),
    )
    core.position.set(0.06, 0.12, 0)
    g.add(core)
    attachHandheldLanternLight(g, 0.12, glowCol, id === 'lantern-dragon' ? 0.7 : 0.55)
  } else {
    // Paper box family (amber / crimson / jade) — same silhouette as hand-lantern
    g.add(hqBox(0.1, 0.12, 0.1, paper, 0.06, 0.08, 0))
    g.add(hqBoxTex(0.08, 0.03, 0.08, P.woodMid, wood, 0.06, 0.16, 0))
    g.add(hqBox(0.11, 0.02, 0.11, P.iron, 0.06, 0.02, 0))
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.04),
      handheldGlowMat(glowCol, glowCol, 0.85),
    )
    glow.position.set(0.06, 0.08, 0.06)
    g.add(glow)
    attachHandheldLanternLight(g, 0.08, glowCol, 0.55)
  }

  tagVipLanternAnim(g, id)
  return g
}

/** Build a handheld prop mesh for the hand_r socket. */
export function buildHandheldProp(itemId: string): THREE.Object3D | null {
  const item = BY_ID.get(itemId)
  if (!item) return null
  if (item.slot === 'lantern') return buildHandheldBoatLantern(item)
  if (item.slot !== 'hand' || item.id === 'hand-none') return null
  const vip = buildVipHandheldProp(item.id, item.color, item.accent ?? item.color)
  if (vip) return vip
  const g = new THREE.Group()
  g.name = 'gear-hand'
  g.userData.harborGear = true
  const wood = hqWoodTexture()
  const main = item.color
  const accent = item.accent ?? item.color
  if (item.id === 'hand-fan') {
    // Leaf panels with value steps + stick
    g.add(hqBox(0.22, 0.02, 0.12, main, 0.08, 0.02, 0))
    g.add(hqBox(0.18, 0.015, 0.1, accent, 0.08, 0.035, 0))
    g.add(hqBoxTex(0.02, 0.12, 0.02, P.woodDark, wood, 0, -0.01, 0))
    g.add(hqBox(0.03, 0.02, 0.03, P.trimGold, 0, 0.04, 0))
  } else if (item.id === 'hand-lantern') {
    g.add(hqBox(0.1, 0.12, 0.1, main, 0.06, 0.08, 0))
    g.add(hqBoxTex(0.08, 0.03, 0.08, P.woodMid, wood, 0.06, 0.16, 0))
    g.add(hqBox(0.11, 0.02, 0.11, P.iron, 0.06, 0.02, 0))
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.04),
      handheldGlowMat(accent, accent, 0.85),
    )
    glow.position.set(0.06, 0.08, 0.06)
    g.add(glow)
    attachHandheldLanternLight(g, 0.08, accent, 0.5)
  } else if (item.id === 'hand-oar') {
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.36, 0.03),
      hqMatTex(main, wood),
    )
    shaft.position.set(0.05, 0.1, 0)
    shaft.rotation.z = 0.4
    g.add(shaft)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.02), hqMat(accent))
    blade.position.set(0.14, 0.26, 0)
    blade.rotation.z = 0.4
    g.add(blade)
    // Blade spine
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.025), hqMat(P.woodDeep))
    spine.position.set(0.14, 0.26, 0.01)
    spine.rotation.z = 0.4
    g.add(spine)
  } else if (item.id === 'hand-scroll') {
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6),
      hqMatTex(main, wood),
    )
    roll.rotation.z = Math.PI / 2
    roll.position.set(0.08, 0.02, 0)
    g.add(roll)
    g.add(hqBox(0.04, 0.02, 0.06, accent, 0.08, 0.02, 0.04))
    g.add(hqPost(0.035, 0.035, 0.02, P.woodDeep, -0.01, 0.02, 0, 6))
    g.add(hqPost(0.035, 0.035, 0.02, P.woodDeep, 0.17, 0.02, 0, 6))
  }
  enrichHandheldProp(g, item)
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


/**
 * Apply wardrobe: swap unique clothing silhouettes (v1), recolor tagged parts,
 * attach handheld + VIP overlays + tier detail.
 */
export function applyLookToProtagonist(root: THREE.Object3D, look: HarborLook) {
  const gender = (root.userData.gender as 'male' | 'female' | undefined) ?? 'male'
  const pelvisY = typeof root.userData.pelvisY === 'number' ? root.userData.pelvisY : 0.72
  const headY = typeof root.userData.headY === 'number' ? root.userData.headY : pelvisY + 0.58

  clearHarborClothingMeshes(root)

  const slots: HarborGearSlot[] = ['hat', 'top', 'bottom', 'shoes']
  let anySwap = false
  for (const slot of slots) {
    const id = look[slot]
    const item = BY_ID.get(id) ?? BY_ID.get(HARBOR_DEFAULT_LOOK[slot])!
    const meshInfo = harborGearMeshInfo(item)
    if (clothingUsesScoutBase(meshInfo.family)) continue
    const piece = buildClothingMesh(slot, meshInfo.family, {
      color: item.color,
      accent: item.accent ?? item.color,
      pelvisY,
      headY,
      gender,
    })
    if (piece) {
      root.add(piece)
      anySwap = true
    }
  }
  // When any slot uses a custom silhouette, hide the overlapping scout base clothes.
  setScoutBaseClothingVisible(root, !anySwap)
  // If only some slots swap, still hide base parts for swapped slots only.
  if (anySwap) {
    const swapped = new Set<string>()
    for (const slot of slots) {
      const item = BY_ID.get(look[slot]) ?? BY_ID.get(HARBOR_DEFAULT_LOOK[slot])!
      if (!clothingUsesScoutBase(harborGearMeshInfo(item).family)) swapped.add(slot)
    }
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || mesh.userData.harborClothing) return
      const part = mesh.userData.harborPart as string | undefined
      if (!part) return
      if (part === 'hat' || part === 'hatAccent') mesh.visible = !swapped.has('hat')
      else if (part === 'top' || part === 'topAccent') mesh.visible = !swapped.has('top')
      else if (part === 'bottom') mesh.visible = !swapped.has('bottom')
      else if (part === 'shoes') mesh.visible = !swapped.has('shoes')
    })
  }

  // Cinematic GLB body: hide when unique wardrobe silhouettes are worn.
  void import('./harborProtagonistGlb').then(({ syncScoutGlbWithLook }) => {
    syncScoutGlbWithLook(root, anySwap)
  })

  const colors = lookColors(look)
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible) return
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
  applyVipOverlaysToProtagonist(root, look)
  applyTierDetailOverlays(root, {
    hat: BY_ID.get(look.hat),
    top: BY_ID.get(look.top),
    bottom: BY_ID.get(look.bottom),
    shoes: BY_ID.get(look.shoes),
  })
}
