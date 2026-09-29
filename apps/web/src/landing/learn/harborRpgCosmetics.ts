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
] as const

export type HarborRpgCosmeticId = (typeof HARBOR_RPG_COSMETIC_IDS)[number]

export type HarborRpgCosmeticKind = 'soft' | 'outfit' | 'attach'

export type HarborRpgCosmeticSlot = 'body' | 'head' | 'shoulder' | 'back'

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
}

const Q = `${HARBOR_RPG_COSMETIC_BASE}/quaternius`

/** Quaternius humanoids ≈1.86m; Scout standingH = 1.42 → ~0.76. */
const OUTFIT_SCALE_RANGER = 0.76
const OUTFIT_SCALE_PEASANT = 0.91
/** Attach parts authored in same armature space as ranger body. */
const ATTACH_SCALE = OUTFIT_SCALE_RANGER

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
    blurb: { en: 'Modular hood — layers on Scout head.', zh: '模組風帽——疊在斥候頭上。' },
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
    blurb: { en: 'Modular hood — layers on Scout head.', zh: '模組風帽——疊在斥候頭上。' },
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
