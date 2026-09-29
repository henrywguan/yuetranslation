/**
 * HarborRPG layered wardrobe — body, head, shoulder, and back can be worn together.
 * `equippedCosmetic` stays the body slot so older bags still load.
 */
import {
  harborRpgCosmeticById,
  isHarborRpgCosmeticId,
  type HarborRpgCosmeticId,
  type HarborRpgCosmeticSlot,
} from './harborRpgCosmetics'

export const HARBOR_RPG_LOOK_SLOTS = ['body', 'head', 'shoulder', 'back', 'top', 'bottom', 'feet'] as const

export type HarborRpgLookSlot = (typeof HARBOR_RPG_LOOK_SLOTS)[number]

export type HarborRpgEquippedLooks = Record<HarborRpgLookSlot, string | null>

export function emptyHarborRpgLooks(): HarborRpgEquippedLooks {
  return { body: null, head: null, shoulder: null, back: null, top: null, bottom: null, feet: null }
}

/** Starter bag wears the soft traveler cloak on the back. Body stays empty so the peasant kit shows. */
export function starterHarborRpgLooks(): HarborRpgEquippedLooks {
  return {
    body: null,
    head: null,
    shoulder: null,
    back: 'rpg-cloak-traveler',
    top: null,
    bottom: null,
    feet: null,
  }
}

export function harborRpgLookSlot(id: string): HarborRpgLookSlot {
  const slot = harborRpgCosmeticById(id)?.slot
  if (slot && (HARBOR_RPG_LOOK_SLOTS as readonly string[]).includes(slot)) return slot as HarborRpgLookSlot
  return 'body'
}

function starterPieceIds(
  slot: 'top' | 'bottom' | 'feet',
  gender: 'male' | 'female',
): HarborRpgCosmeticId[] {
  const g = gender === 'female' ? 'f' : 'm'
  return [
    `rpg-${slot}-peasant-${g}`,
    `rpg-${slot}-peasant-${g}-2`,
    `rpg-${slot}-ranger-${g}`,
    `rpg-${slot}-ranger-${g}-3`,
  ].filter(isHarborRpgCosmeticId)
}

export function harborRpgStarterTops(gender: 'male' | 'female'): HarborRpgCosmeticId[] {
  return starterPieceIds('top', gender)
}

export function harborRpgStarterBottoms(gender: 'male' | 'female'): HarborRpgCosmeticId[] {
  return starterPieceIds('bottom', gender)
}

export function harborRpgStarterFeet(gender: 'male' | 'female'): HarborRpgCosmeticId[] {
  return starterPieceIds('feet', gender)
}

export function harborRpgStarterHair(
  gender: 'male' | 'female',
): { id: HarborRpgCosmeticId | null; label: string }[] {
  if (gender === 'female') {
    return [
      { id: null, label: 'Bare' },
      { id: 'rpg-hair-buzzed-f', label: 'Buzzed' },
      { id: 'rpg-hair-buns', label: 'Buns' },
      { id: 'rpg-hair-long', label: 'Long' },
    ]
  }
  return [
    { id: null, label: 'Bare' },
    { id: 'rpg-hair-buzzed', label: 'Buzzed' },
    { id: 'rpg-hair-parted', label: 'Parted' },
    { id: 'rpg-hair-beard', label: 'Beard' },
  ]
}

export function harborRpgDefaultStarterPick(gender: 'male' | 'female'): {
  hair: HarborRpgCosmeticId | null
  top: HarborRpgCosmeticId
  bottom: HarborRpgCosmeticId
  feet: HarborRpgCosmeticId
} {
  const hair = harborRpgStarterHair(gender)[1]?.id ?? null
  const top = harborRpgStarterTops(gender)[0]
  const bottom = harborRpgStarterBottoms(gender)[0]
  const feet = harborRpgStarterFeet(gender)[0]
  if (!top || !bottom || !feet) {
    throw new Error('starter kit missing')
  }
  return { hair, top, bottom, feet }
}

export function harborRpgComposeStarterLook(
  gender: 'male' | 'female',
  pick: {
    hair: HarborRpgCosmeticId | null
    top: HarborRpgCosmeticId
    bottom: HarborRpgCosmeticId
    feet: HarborRpgCosmeticId
  },
): HarborRpgEquippedLooks {
  return {
    body: gender === 'female' ? 'rpg-base-f' : 'rpg-base-m',
    head: pick.hair,
    shoulder: null,
    back: 'rpg-cloak-traveler',
    top: pick.top,
    bottom: pick.bottom,
    feet: pick.feet,
  }
}

export function harborRpgIsModularBody(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('rpg-base-')
}

/** Sleeves follow the tunic so the dye matches. */
export function harborRpgArmsForTop(topId: string | null | undefined): HarborRpgCosmeticId | null {
  if (!topId?.startsWith('rpg-top-')) return null
  const arms = `rpg-arms-${topId.slice('rpg-top-'.length)}`
  return isHarborRpgCosmeticId(arms) ? arms : null
}

/** Attach meshes worn with the current body. */
export function harborRpgWornLayerIds(
  looks: HarborRpgEquippedLooks | null | undefined,
): HarborRpgCosmeticId[] {
  if (!looks) return []
  const modular = harborRpgIsModularBody(looks.body)
  const slots = modular
    ? (['head', 'shoulder', 'back', 'top', 'bottom', 'feet'] as const)
    : (['head', 'shoulder', 'back'] as const)
  const ids: HarborRpgCosmeticId[] = []
  if (modular) {
    const arms = harborRpgArmsForTop(looks.top)
    if (arms) ids.push(arms)
  }
  for (const slot of slots) {
    const id = looks[slot]
    if (!id || !isHarborRpgCosmeticId(id)) continue
    const def = harborRpgCosmeticById(id)
    if (def?.src && def.kind === 'attach') ids.push(id)
  }
  return ids
}

export function sanitizeHarborRpgLooks(
  raw: unknown,
  owned: Set<string>,
  equippedCosmetic: unknown,
): HarborRpgEquippedLooks {
  const looks = emptyHarborRpgLooks()
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    for (const slot of HARBOR_RPG_LOOK_SLOTS) {
      const id = o[slot]
      if (typeof id === 'string' && owned.has(id) && harborRpgLookSlot(id) === slot) looks[slot] = id
    }
  }
  if (typeof equippedCosmetic === 'string' && owned.has(equippedCosmetic)) {
    const slot = harborRpgLookSlot(equippedCosmetic)
    if (!looks[slot]) looks[slot] = equippedCosmetic
  } else if (equippedCosmetic !== null && raw == null && owned.has('rpg-cloak-traveler')) {
    looks.back = 'rpg-cloak-traveler'
  }
  return looks
}

export function equipHarborRpgLook(
  looks: HarborRpgEquippedLooks,
  cosmeticId: string | null,
): HarborRpgEquippedLooks {
  if (cosmeticId == null) return emptyHarborRpgLooks()
  const slot: HarborRpgCosmeticSlot | HarborRpgLookSlot = harborRpgLookSlot(cosmeticId)
  return { ...looks, [slot]: cosmeticId }
}

/** Peasant kit is the UAL body when the body slot has no outfit mesh. */
export function harborRpgFallbackBodyId(gender: 'male' | 'female'): 'rpg-outfit-peasant-m' | 'rpg-outfit-peasant-f' {
  return gender === 'female' ? 'rpg-outfit-peasant-f' : 'rpg-outfit-peasant-m'
}

/** Outfit mesh others should render. Soft cloaks stay in their slot and do not replace this body. */
export function harborRpgVisualBodyId(
  looks: HarborRpgEquippedLooks | null | undefined,
  gender: 'male' | 'female',
): 'rpg-outfit-peasant-m' | 'rpg-outfit-peasant-f' | string {
  const body = looks?.body
  const def = body ? harborRpgCosmeticById(body) : null
  if (def?.kind === 'outfit' && def.src && body) return body
  return harborRpgFallbackBodyId(gender)
}

/** Town stall folk — Quaternius outfits, library idles, not River Scout. */
export const HARBOR_RPG_TOWN_FOLK = [
  { id: 'rpg-outfit-ranger-f', clip: 'Idle_Talking_Loop', x: 6, z: -4.95 },
  { id: 'rpg-outfit-peasant-m', clip: 'Idle_FoldArms_Loop', x: 0, z: 3.15 },
  { id: 'rpg-outfit-peasant-f-2', clip: 'Idle_Loop', x: 8, z: 5.15 },
  { id: 'rpg-outfit-ranger-m-3', clip: 'Idle_Lantern_Loop', x: 0, z: -10.95 },
  { id: 'rpg-outfit-ranger-m', clip: 'Idle_Rail_Loop', x: -8, z: 5.15 },
  { id: 'rpg-outfit-peasant-f', clip: 'Idle_Shield_Loop', x: -4, z: 9.15 },
  { id: 'rpg-outfit-ranger-f-3', clip: 'Idle_Torch_Loop', x: 16, z: -6.95 },
  { id: 'rpg-outfit-peasant-m-2', clip: 'Idle_Talking_Loop', x: -16, z: -2.95 },
] as const
