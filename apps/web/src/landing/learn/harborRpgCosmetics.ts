/**
 * HarborRPG cosmetic catalogue — Quaternius Modular Outfits (CC0) + soft placeholders.
 * Soft trust: bag ids only; no power.
 */
export const HARBOR_RPG_COSMETIC_BASE = '/assets/harbor-quest/cosmetics'

/** Soft / Quaternius ids — keep in sync with API sanitize set. */
export const HARBOR_RPG_COSMETIC_IDS = [
  // Soft placeholders (no GLB yet)
  'rpg-cloak-traveler',
  'rpg-cloak-jade',
  'rpg-helm-leather',
  'rpg-helm-bronze',
  'rpg-cape-ember',
  // Quaternius Modular Outfits Fantasy (CC0)
  'rpg-outfit-ranger-m',
  'rpg-outfit-ranger-f',
  'rpg-outfit-peasant-m',
  'rpg-outfit-peasant-f',
  'rpg-outfit-ranger-m-3',
  'rpg-outfit-ranger-f-3',
  'rpg-outfit-peasant-m-2',
  'rpg-outfit-peasant-f-2',
  'rpg-hood-ranger-m',
  'rpg-hood-ranger-f',
  'rpg-pauldron-ranger-m',
  'rpg-pauldrons-ranger-f',
  // Starting modular kit — same skeleton, CC0 Standard + Universal Base hairs
  'rpg-base-m',
  'rpg-base-f',
  'rpg-arms-peasant-m',
  'rpg-arms-peasant-m-2',
  'rpg-arms-ranger-m',
  'rpg-arms-ranger-m-3',
  'rpg-arms-peasant-f',
  'rpg-arms-peasant-f-2',
  'rpg-arms-ranger-f',
  'rpg-arms-ranger-f-3',
  'rpg-top-peasant-m',
  'rpg-top-peasant-m-2',
  'rpg-top-ranger-m',
  'rpg-top-ranger-m-3',
  'rpg-top-peasant-f',
  'rpg-top-peasant-f-2',
  'rpg-top-ranger-f',
  'rpg-top-ranger-f-3',
  'rpg-bottom-peasant-m',
  'rpg-bottom-peasant-m-2',
  'rpg-bottom-ranger-m',
  'rpg-bottom-ranger-m-3',
  'rpg-bottom-peasant-f',
  'rpg-bottom-peasant-f-2',
  'rpg-bottom-ranger-f',
  'rpg-bottom-ranger-f-3',
  'rpg-feet-peasant-m',
  'rpg-feet-peasant-m-2',
  'rpg-feet-ranger-m',
  'rpg-feet-ranger-m-3',
  'rpg-feet-peasant-f',
  'rpg-feet-peasant-f-2',
  'rpg-feet-ranger-f',
  'rpg-feet-ranger-f-3',
  'rpg-hair-buzzed',
  'rpg-hair-parted',
  'rpg-hair-beard',
  'rpg-hair-buzzed-f',
  'rpg-hair-buns',
  'rpg-hair-long',
] as const

export type HarborRpgCosmeticId = (typeof HARBOR_RPG_COSMETIC_IDS)[number]

export type HarborRpgCosmeticKind = 'soft' | 'outfit' | 'attach'

export type HarborRpgCosmeticSlot = 'body' | 'head' | 'shoulder' | 'back' | 'top' | 'bottom' | 'feet' | 'sleeve'

export type HarborRpgCosmeticDef = {
  id: HarborRpgCosmeticId
  name: { en: string; zh: string }
  kind: HarborRpgCosmeticKind
  slot: HarborRpgCosmeticSlot
  /** Public URL under Vite — null for soft placeholders. */
  src: string | null
  pack: 'soft' | 'quaternius'
  /** Uniform scale after load (outfit / attach). */
  scale: number
  /** Gold cost at Town wardrobe (0 = starter unlock). */
  cost: number
  gender: 'any' | 'male' | 'female'
  blurb: { en: string; zh: string }
  /** Keep the authored origin so hair and clothes share one skeleton. */
  bindWithBody?: boolean
}

const Q = `${HARBOR_RPG_COSMETIC_BASE}/quaternius`

/** Quaternius humanoids ≈1.86m; Scout standingH = 1.42 → ~0.76. */
const OUTFIT_SCALE_RANGER = 0.76
const OUTFIT_SCALE_PEASANT = 0.91
/** Attach parts authored in same armature space as ranger body. */
const ATTACH_SCALE = OUTFIT_SCALE_RANGER
/** Modular starter pieces share the peasant skeleton scale. */
const MODULAR_SCALE = OUTFIT_SCALE_PEASANT

function modularPiece(
  id: HarborRpgCosmeticId,
  file: string,
  name: { en: string; zh: string },
  slot: HarborRpgCosmeticSlot,
  gender: 'any' | 'male' | 'female',
  kind: 'outfit' | 'attach' = 'attach',
): HarborRpgCosmeticDef {
  return {
    id,
    name,
    kind,
    slot,
    src: `${Q}/${file}`,
    pack: 'quaternius',
    scale: MODULAR_SCALE,
    cost: 0,
    gender,
    blurb: {
      en: 'Starting piece on the shared harbor rig.',
      zh: '入門部件，穿在同一套港灣骨架上。',
    },
    bindWithBody: true,
  }
}

export const HARBOR_RPG_COSMETIC_DEFS: Record<HarborRpgCosmeticId, HarborRpgCosmeticDef> = {
  'rpg-cloak-traveler': {
    id: 'rpg-cloak-traveler',
    name: { en: 'Traveler Cloak', zh: '旅人披風' },
    kind: 'soft',
    slot: 'back',
    src: null,
    pack: 'soft',
    scale: 1,
    cost: 0,
    gender: 'any',
    blurb: { en: 'Starter soft cloak — bag flair until a mesh ships.', zh: '入門軟披風——有網格前僅背包炫耀。' },
  },
  'rpg-cloak-jade': {
    id: 'rpg-cloak-jade',
    name: { en: 'Jade Cloak', zh: '翡翠披風' },
    kind: 'soft',
    slot: 'back',
    src: null,
    pack: 'soft',
    scale: 1,
    cost: 40,
    gender: 'any',
    blurb: { en: 'Soft jade trim (placeholder).', zh: '軟翡翠飾邊（佔位）。' },
  },
  'rpg-helm-leather': {
    id: 'rpg-helm-leather',
    name: { en: 'Leather Helm', zh: '皮盔' },
    kind: 'soft',
    slot: 'head',
    src: null,
    pack: 'soft',
    scale: 1,
    cost: 35,
    gender: 'any',
    blurb: { en: 'Soft leather helm (placeholder).', zh: '軟皮盔（佔位）。' },
  },
  'rpg-helm-bronze': {
    id: 'rpg-helm-bronze',
    name: { en: 'Bronze Helm', zh: '青銅盔' },
    kind: 'soft',
    slot: 'head',
    src: null,
    pack: 'soft',
    scale: 1,
    cost: 55,
    gender: 'any',
    blurb: { en: 'Soft bronze helm (placeholder).', zh: '軟青銅盔（佔位）。' },
  },
  'rpg-cape-ember': {
    id: 'rpg-cape-ember',
    name: { en: 'Ember Cape', zh: '餘燼披風' },
    kind: 'soft',
    slot: 'back',
    src: null,
    pack: 'soft',
    scale: 1,
    cost: 70,
    gender: 'any',
    blurb: { en: 'Soft ember cape (placeholder).', zh: '軟餘燼披風（佔位）。' },
  },
  'rpg-outfit-ranger-m': {
    id: 'rpg-outfit-ranger-m',
    name: { en: 'Ranger Kit (M)', zh: '遊俠套裝（男）' },
    kind: 'outfit',
    slot: 'body',
    src: `${Q}/male-ranger.glb`,
    pack: 'quaternius',
    scale: OUTFIT_SCALE_RANGER,
    cost: 120,
    gender: 'male',
    blurb: { en: 'Full Quaternius ranger outfit — hood + pauldron baked in.', zh: 'Quaternius 遊俠全身——含風帽與肩甲。' },
  },
  'rpg-outfit-ranger-f': {
    id: 'rpg-outfit-ranger-f',
    name: { en: 'Ranger Kit (F)', zh: '遊俠套裝（女）' },
    kind: 'outfit',
    slot: 'body',
    src: `${Q}/female-ranger.glb`,
    pack: 'quaternius',
    scale: OUTFIT_SCALE_RANGER,
    cost: 120,
    gender: 'female',
    blurb: { en: 'Full Quaternius ranger outfit — hood + pauldrons baked in.', zh: 'Quaternius 遊俠全身——含風帽與雙肩甲。' },
  },
  'rpg-outfit-peasant-m': {
    id: 'rpg-outfit-peasant-m',
    name: { en: 'Peasant Kit (M)', zh: '農夫套裝（男）' },
    kind: 'outfit',
    slot: 'body',
    src: `${Q}/male-peasant.glb`,
    pack: 'quaternius',
    scale: OUTFIT_SCALE_PEASANT,
    cost: 45,
    gender: 'male',
    blurb: { en: 'Simple Quaternius peasant clothes.', zh: '樸素 Quaternius 農夫衣。' },
  },
  'rpg-outfit-peasant-f': {
    id: 'rpg-outfit-peasant-f',
    name: { en: 'Peasant Kit (F)', zh: '農夫套裝（女）' },
    kind: 'outfit',
    slot: 'body',
    src: `${Q}/female-peasant.glb`,
    pack: 'quaternius',
    scale: OUTFIT_SCALE_PEASANT,
    cost: 45,
    gender: 'female',
    blurb: { en: 'Simple Quaternius peasant clothes.', zh: '樸素 Quaternius 農夫衣。' },
  },
  'rpg-outfit-ranger-m-3': {
    id: 'rpg-outfit-ranger-m-3',
    name: { en: 'Dusk Ranger (M)', zh: '暮色遊俠（男）' },
    kind: 'outfit',
    slot: 'body',
    src: `${Q}/male-ranger-3.glb`,
    pack: 'quaternius',
    scale: OUTFIT_SCALE_RANGER,
    cost: 100,
    gender: 'male',
    blurb: { en: 'Ranger kit in the free dusk dye (T_Ranger_3).', zh: '遊俠套裝・免費暮色染（T_Ranger_3）。' },
  },
  'rpg-outfit-ranger-f-3': {
    id: 'rpg-outfit-ranger-f-3',
    name: { en: 'Dusk Ranger (F)', zh: '暮色遊俠（女）' },
    kind: 'outfit',
    slot: 'body',
    src: `${Q}/female-ranger-3.glb`,
    pack: 'quaternius',
    scale: OUTFIT_SCALE_RANGER,
    cost: 100,
    gender: 'female',
    blurb: { en: 'Ranger kit in the free dusk dye (T_Ranger_3).', zh: '遊俠套裝・免費暮色染（T_Ranger_3）。' },
  },
  'rpg-outfit-peasant-m-2': {
    id: 'rpg-outfit-peasant-m-2',
    name: { en: 'Field Peasant (M)', zh: '田野農夫（男）' },
    kind: 'outfit',
    slot: 'body',
    src: `${Q}/male-peasant-2.glb`,
    pack: 'quaternius',
    scale: OUTFIT_SCALE_PEASANT,
    cost: 40,
    gender: 'male',
    blurb: { en: 'Peasant kit in the free field dye (T_Peasant_2).', zh: '農夫套裝・免費田野染（T_Peasant_2）。' },
  },
  'rpg-outfit-peasant-f-2': {
    id: 'rpg-outfit-peasant-f-2',
    name: { en: 'Field Peasant (F)', zh: '田野農夫（女）' },
    kind: 'outfit',
    slot: 'body',
    src: `${Q}/female-peasant-2.glb`,
    pack: 'quaternius',
    scale: OUTFIT_SCALE_PEASANT,
    cost: 40,
    gender: 'female',
    blurb: { en: 'Peasant kit in the free field dye (T_Peasant_2).', zh: '農夫套裝・免費田野染（T_Peasant_2）。' },
  },
  'rpg-hood-ranger-m': {
    id: 'rpg-hood-ranger-m',
    name: { en: 'Ranger Hood (M)', zh: '遊俠風帽（男）' },
    kind: 'attach',
    slot: 'head',
    src: `${Q}/ranger-hood-m.glb`,
    pack: 'quaternius',
    scale: ATTACH_SCALE,
    cost: 55,
    gender: 'male',
    blurb: { en: 'Modular hood — layers on the library body.', zh: '模組風帽——疊在動作庫身體上。' },
  },
  'rpg-hood-ranger-f': {
    id: 'rpg-hood-ranger-f',
    name: { en: 'Ranger Hood (F)', zh: '遊俠風帽（女）' },
    kind: 'attach',
    slot: 'head',
    src: `${Q}/ranger-hood-f.glb`,
    pack: 'quaternius',
    scale: ATTACH_SCALE,
    cost: 55,
    gender: 'female',
    blurb: { en: 'Modular hood — layers on the library body.', zh: '模組風帽——疊在動作庫身體上。' },
  },
  'rpg-pauldron-ranger-m': {
    id: 'rpg-pauldron-ranger-m',
    name: { en: 'Ranger Pauldron (M)', zh: '遊俠肩甲（男）' },
    kind: 'attach',
    slot: 'shoulder',
    src: `${Q}/ranger-pauldron-m.glb`,
    pack: 'quaternius',
    scale: ATTACH_SCALE,
    cost: 50,
    gender: 'male',
    blurb: { en: 'Single modular pauldron.', zh: '單件模組肩甲。' },
  },
  'rpg-pauldrons-ranger-f': {
    id: 'rpg-pauldrons-ranger-f',
    name: { en: 'Ranger Pauldrons (F)', zh: '遊俠雙肩甲（女）' },
    kind: 'attach',
    slot: 'shoulder',
    src: `${Q}/ranger-pauldrons-f.glb`,
    pack: 'quaternius',
    scale: ATTACH_SCALE,
    cost: 50,
    gender: 'female',
    blurb: { en: 'Paired modular pauldrons.', zh: '成對模組肩甲。' },
  },
  'rpg-base-m': modularPiece('rpg-base-m', 'base-m.glb', { en: 'Harbor Body (M)', zh: '港灣身型（男）' }, 'body', 'male', 'outfit'),
  'rpg-base-f': modularPiece('rpg-base-f', 'base-f.glb', { en: 'Harbor Body (F)', zh: '港灣身型（女）' }, 'body', 'female', 'outfit'),
  'rpg-arms-peasant-m': modularPiece('rpg-arms-peasant-m', 'arms-peasant-m.glb', { en: 'Peasant Sleeves (M)', zh: '農袖（男）' }, 'sleeve', 'male'),
  'rpg-arms-peasant-m-2': modularPiece('rpg-arms-peasant-m-2', 'arms-peasant-m-2.glb', { en: 'Field Sleeves (M)', zh: '田野袖（男）' }, 'sleeve', 'male'),
  'rpg-arms-ranger-m': modularPiece('rpg-arms-ranger-m', 'arms-ranger-m.glb', { en: 'Ranger Sleeves (M)', zh: '遊俠袖（男）' }, 'sleeve', 'male'),
  'rpg-arms-ranger-m-3': modularPiece('rpg-arms-ranger-m-3', 'arms-ranger-m-3.glb', { en: 'Dusk Sleeves (M)', zh: '暮色袖（男）' }, 'sleeve', 'male'),
  'rpg-arms-peasant-f': modularPiece('rpg-arms-peasant-f', 'arms-peasant-f.glb', { en: 'Peasant Sleeves (F)', zh: '農袖（女）' }, 'sleeve', 'female'),
  'rpg-arms-peasant-f-2': modularPiece('rpg-arms-peasant-f-2', 'arms-peasant-f-2.glb', { en: 'Field Sleeves (F)', zh: '田野袖（女）' }, 'sleeve', 'female'),
  'rpg-arms-ranger-f': modularPiece('rpg-arms-ranger-f', 'arms-ranger-f.glb', { en: 'Ranger Sleeves (F)', zh: '遊俠袖（女）' }, 'sleeve', 'female'),
  'rpg-arms-ranger-f-3': modularPiece('rpg-arms-ranger-f-3', 'arms-ranger-f-3.glb', { en: 'Dusk Sleeves (F)', zh: '暮色袖（女）' }, 'sleeve', 'female'),
  'rpg-top-peasant-m': modularPiece('rpg-top-peasant-m', 'top-peasant-m.glb', { en: 'Peasant Tunic', zh: '農衣' }, 'top', 'male'),
  'rpg-top-peasant-m-2': modularPiece('rpg-top-peasant-m-2', 'top-peasant-m-2.glb', { en: 'Field Tunic', zh: '田野衣' }, 'top', 'male'),
  'rpg-top-ranger-m': modularPiece('rpg-top-ranger-m', 'top-ranger-m.glb', { en: 'Ranger Coat', zh: '遊俠衣' }, 'top', 'male'),
  'rpg-top-ranger-m-3': modularPiece('rpg-top-ranger-m-3', 'top-ranger-m-3.glb', { en: 'Dusk Coat', zh: '暮色衣' }, 'top', 'male'),
  'rpg-top-peasant-f': modularPiece('rpg-top-peasant-f', 'top-peasant-f.glb', { en: 'Peasant Tunic', zh: '農衣' }, 'top', 'female'),
  'rpg-top-peasant-f-2': modularPiece('rpg-top-peasant-f-2', 'top-peasant-f-2.glb', { en: 'Field Tunic', zh: '田野衣' }, 'top', 'female'),
  'rpg-top-ranger-f': modularPiece('rpg-top-ranger-f', 'top-ranger-f.glb', { en: 'Ranger Coat', zh: '遊俠衣' }, 'top', 'female'),
  'rpg-top-ranger-f-3': modularPiece('rpg-top-ranger-f-3', 'top-ranger-f-3.glb', { en: 'Dusk Coat', zh: '暮色衣' }, 'top', 'female'),
  'rpg-bottom-peasant-m': modularPiece('rpg-bottom-peasant-m', 'bottom-peasant-m.glb', { en: 'Peasant Trousers', zh: '農褲' }, 'bottom', 'male'),
  'rpg-bottom-peasant-m-2': modularPiece('rpg-bottom-peasant-m-2', 'bottom-peasant-m-2.glb', { en: 'Field Trousers', zh: '田野褲' }, 'bottom', 'male'),
  'rpg-bottom-ranger-m': modularPiece('rpg-bottom-ranger-m', 'bottom-ranger-m.glb', { en: 'Ranger Leggings', zh: '遊俠褲' }, 'bottom', 'male'),
  'rpg-bottom-ranger-m-3': modularPiece('rpg-bottom-ranger-m-3', 'bottom-ranger-m-3.glb', { en: 'Dusk Leggings', zh: '暮色褲' }, 'bottom', 'male'),
  'rpg-bottom-peasant-f': modularPiece('rpg-bottom-peasant-f', 'bottom-peasant-f.glb', { en: 'Peasant Trousers', zh: '農褲' }, 'bottom', 'female'),
  'rpg-bottom-peasant-f-2': modularPiece('rpg-bottom-peasant-f-2', 'bottom-peasant-f-2.glb', { en: 'Field Trousers', zh: '田野褲' }, 'bottom', 'female'),
  'rpg-bottom-ranger-f': modularPiece('rpg-bottom-ranger-f', 'bottom-ranger-f.glb', { en: 'Ranger Leggings', zh: '遊俠褲' }, 'bottom', 'female'),
  'rpg-bottom-ranger-f-3': modularPiece('rpg-bottom-ranger-f-3', 'bottom-ranger-f-3.glb', { en: 'Dusk Leggings', zh: '暮色褲' }, 'bottom', 'female'),
  'rpg-feet-peasant-m': modularPiece('rpg-feet-peasant-m', 'feet-peasant-m.glb', { en: 'Peasant Shoes', zh: '農鞋' }, 'feet', 'male'),
  'rpg-feet-peasant-m-2': modularPiece('rpg-feet-peasant-m-2', 'feet-peasant-m-2.glb', { en: 'Field Shoes', zh: '田野鞋' }, 'feet', 'male'),
  'rpg-feet-ranger-m': modularPiece('rpg-feet-ranger-m', 'feet-ranger-m.glb', { en: 'Ranger Boots', zh: '遊俠靴' }, 'feet', 'male'),
  'rpg-feet-ranger-m-3': modularPiece('rpg-feet-ranger-m-3', 'feet-ranger-m-3.glb', { en: 'Dusk Boots', zh: '暮色靴' }, 'feet', 'male'),
  'rpg-feet-peasant-f': modularPiece('rpg-feet-peasant-f', 'feet-peasant-f.glb', { en: 'Peasant Shoes', zh: '農鞋' }, 'feet', 'female'),
  'rpg-feet-peasant-f-2': modularPiece('rpg-feet-peasant-f-2', 'feet-peasant-f-2.glb', { en: 'Field Shoes', zh: '田野鞋' }, 'feet', 'female'),
  'rpg-feet-ranger-f': modularPiece('rpg-feet-ranger-f', 'feet-ranger-f.glb', { en: 'Ranger Boots', zh: '遊俠靴' }, 'feet', 'female'),
  'rpg-feet-ranger-f-3': modularPiece('rpg-feet-ranger-f-3', 'feet-ranger-f-3.glb', { en: 'Dusk Boots', zh: '暮色靴' }, 'feet', 'female'),
  'rpg-hair-buzzed': modularPiece('rpg-hair-buzzed', 'hair-buzzed.glb', { en: 'Buzzed', zh: '平頭' }, 'head', 'male'),
  'rpg-hair-parted': modularPiece('rpg-hair-parted', 'hair-parted.glb', { en: 'Parted', zh: '分髮' }, 'head', 'male'),
  'rpg-hair-beard': modularPiece('rpg-hair-beard', 'hair-beard.glb', { en: 'Beard', zh: '鬚' }, 'head', 'male'),
  'rpg-hair-buzzed-f': modularPiece('rpg-hair-buzzed-f', 'hair-buzzed-f.glb', { en: 'Buzzed', zh: '平頭' }, 'head', 'female'),
  'rpg-hair-buns': modularPiece('rpg-hair-buns', 'hair-buns.glb', { en: 'Buns', zh: '雙髻' }, 'head', 'female'),
  'rpg-hair-long': modularPiece('rpg-hair-long', 'hair-long.glb', { en: 'Long', zh: '長髮' }, 'head', 'female'),
}

export function isHarborRpgCosmeticId(id: string): id is HarborRpgCosmeticId {
  return (HARBOR_RPG_COSMETIC_IDS as readonly string[]).includes(id)
}

export function harborRpgCosmeticById(id: string): HarborRpgCosmeticDef | null {
  if (!isHarborRpgCosmeticId(id)) return null
  return HARBOR_RPG_COSMETIC_DEFS[id]
}

/** Cosmetics with a loadable GLB. */
export function harborRpgCosmeticHasMesh(id: HarborRpgCosmeticId): boolean {
  return HARBOR_RPG_COSMETIC_DEFS[id].src != null
}
