/**
 * Harbor Quest gift rules (API) — mirrors apps/web harborGift.ts.
 * Cosmetic lanterns + titles only.
 */

const STARTER_LANTERN = 'lantern-paper-amber'

const GIFTABLE_LANTERNS = new Set([
  'lantern-paper-crimson',
  'lantern-paper-jade',
  'lantern-silk-gold',
  'lantern-silk-azure',
  'lantern-oil-iron',
  'lantern-glass-ruby',
  'lantern-glass-sapphire',
  'lantern-porcelain',
  'lantern-phoenix',
  'lantern-dragon',
  'lantern-starlight',
])

const GIFTABLE_TITLES = new Set([
  'title-river-scout',
  'title-harbor-coach',
  'title-generous',
  'title-dock-mate',
])

export type HarborGiftKind = 'lantern' | 'title'

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
      giverTitleAward?: string
      receiverTitleAward?: string
    }
  | { ok: false; reason: string }

export function isGiftableLanternId(id: string): boolean {
  return GIFTABLE_LANTERNS.has(id)
}

export function isGiftableTitleId(id: string): boolean {
  return GIFTABLE_TITLES.has(id)
}

export function applyCosmeticGift(input: HarborGiftApplyInput): HarborGiftApplyResult {
  const itemId = input.itemId
  if (input.kind === 'lantern') {
    if (!isGiftableLanternId(itemId)) {
      return { ok: false, reason: 'That lantern cannot be gifted.' }
    }
    const fromHas = input.fromOwned.includes(itemId) || input.fromBanked.includes(itemId)
    if (!fromHas) return { ok: false, reason: 'You do not own that lantern.' }
    if (input.toOwned.includes(itemId) || input.toBanked.includes(itemId)) {
      return { ok: false, reason: 'They already have that lantern.' }
    }
    const fromOwned = input.fromOwned.filter((id) => id !== itemId)
    const fromBanked = input.fromBanked.filter((id) => id !== itemId)
    const fromLookLantern =
      input.fromLookLantern === itemId ? STARTER_LANTERN : input.fromLookLantern
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
