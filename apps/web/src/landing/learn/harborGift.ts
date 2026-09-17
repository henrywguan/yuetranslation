/**
 * Harbor Quest · cosmetic gift rules (pure).
 * Lanterns + titles only — never XP, coins-as-power, or answer credit.
 */
import { harborGearById, HARBOR_STARTER_OWNED } from './harborGear'
import { isHarborTitleId } from './harborTitles'

const STARTERS = new Set<string>(HARBOR_STARTER_OWNED)

/** Lanterns with a shop price (not the free amber starter). */
export function isGiftableLanternId(id: string): boolean {
  const item = harborGearById(id)
  if (!item) return false
  if (item.slot !== 'lantern') return false
  if (STARTERS.has(id) || item.price <= 0) return false
  return true
}

export function isGiftableTitleId(id: string): boolean {
  return isHarborTitleId(id)
}

export type HarborGiftKind = 'lantern' | 'title'

export type HarborGiftRequest = {
  toUserId: string
  kind: HarborGiftKind
  itemId: string
}

export type HarborGiftApplyInput = {
  fromOwned: string[]
  fromBanked: string[]
  fromLookLantern: string
  fromTitles: string[]
  toOwned: string[]
  toBanked: string[]
  toTitles: string[]
  kind: HarborGiftKind
  itemId: string
}

export type HarborGiftApplyResult =
  | {
      ok: true
      fromOwned: string[]
      fromBanked: string[]
      fromLookLantern: string
      fromTitles: string[]
      toOwned: string[]
      toBanked: string[]
      toTitles: string[]
      /** Title auto-granted to giver (first gift). */
      giverTitleAward?: string
      /** Title auto-granted to receiver (first receive). */
      receiverTitleAward?: string
    }
  | { ok: false; reason: string }

/**
 * Apply a cosmetic gift transfer. Pure — no I/O.
 * Lanterns leave the giver’s carried/banked inventory; titles are copied (giver keeps a copy).
 */
export function applyCosmeticGift(input: HarborGiftApplyInput): HarborGiftApplyResult {
  const itemId = input.itemId
  if (input.kind === 'lantern') {
    if (!isGiftableLanternId(itemId)) {
      return { ok: false, reason: 'That lantern cannot be gifted.' }
    }
    const fromHas =
      input.fromOwned.includes(itemId) || input.fromBanked.includes(itemId)
    if (!fromHas) return { ok: false, reason: 'You do not own that lantern.' }
    if (input.toOwned.includes(itemId) || input.toBanked.includes(itemId)) {
      return { ok: false, reason: 'They already have that lantern.' }
    }

    const fromOwned = input.fromOwned.filter((id) => id !== itemId)
    const fromBanked = input.fromBanked.filter((id) => id !== itemId)
    // Unequip if worn — fall back to starter amber
    const fromLookLantern =
      input.fromLookLantern === itemId ? 'lantern-paper-amber' : input.fromLookLantern
    if (!fromOwned.includes(fromLookLantern) && fromLookLantern === 'lantern-paper-amber') {
      /* starter always available */
    }
    const toOwned = [...input.toOwned, itemId]

    let fromTitles = [...input.fromTitles]
    let toTitles = [...input.toTitles]
    let giverTitleAward: string | undefined
    let receiverTitleAward: string | undefined
    if (!fromTitles.includes('title-generous')) {
      fromTitles.push('title-generous')
      giverTitleAward = 'title-generous'
    }
    if (!toTitles.includes('title-dock-mate')) {
      toTitles.push('title-dock-mate')
      receiverTitleAward = 'title-dock-mate'
    }

    return {
      ok: true,
      fromOwned,
      fromBanked,
      fromLookLantern,
      fromTitles,
      toOwned,
      toBanked: [...input.toBanked],
      toTitles,
      giverTitleAward,
      receiverTitleAward,
    }
  }

  // Title — copy, not move (both keep bragging rights)
  if (!isGiftableTitleId(itemId)) {
    return { ok: false, reason: 'That title cannot be gifted.' }
  }
  if (!input.fromTitles.includes(itemId)) {
    return { ok: false, reason: 'You do not own that title.' }
  }
  if (input.toTitles.includes(itemId)) {
    return { ok: false, reason: 'They already have that title.' }
  }
  return {
    ok: true,
    fromOwned: [...input.fromOwned],
    fromBanked: [...input.fromBanked],
    fromLookLantern: input.fromLookLantern,
    fromTitles: [...input.fromTitles],
    toOwned: [...input.toOwned],
    toBanked: [...input.toBanked],
    toTitles: [...input.toTitles, itemId],
  }
}
