/**
 * HarborRPG professions + World Market (soft / client-authoritative).
 */
import {
  HARBOR_RPG_CRAFT_RECIPES,
  HARBOR_RPG_GATHER_NODES,
  HARBOR_RPG_ITEM_DEFS,
  HARBOR_RPG_PROFESSIONS,
  isHarborRpgItemId,
  type HarborRpgCraftRecipe,
  type HarborRpgItemId,
  type HarborRpgProfessionId,
  type HarborRpgZoneId,
} from './harborRpgData'
import {
  addRpgInventoryItem,
  countRpgItem,
  removeRpgInventoryItem,
  type HarborRpgBag,
} from './harborRpgProgress'

export const HARBOR_RPG_MAX_MARKET_LISTINGS = 12

export type HarborRpgMarketListing = {
  id: string
  sellerId: string
  sellerName: string
  itemId: HarborRpgItemId
  qty: number
  price: number
  createdAt: number
}

export function emptyRpgProfessions(): Record<HarborRpgProfessionId, number> {
  return { herbalism: 0, mining: 0, alchemy: 0, smithing: 0 }
}

export function professionLevelFromXp(xp: number): number {
  return Math.min(50, 1 + Math.floor(Math.max(0, xp) / 40))
}

export function sanitizeRpgProfessions(
  raw: unknown,
): Record<HarborRpgProfessionId, number> {
  const out = emptyRpgProfessions()
  if (!raw || typeof raw !== 'object') return out
  const o = raw as Record<string, unknown>
  for (const id of HARBOR_RPG_PROFESSIONS) {
    const v = o[id]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      out[id] = Math.min(Math.floor(v), 500_000)
    }
  }
  return out
}

export function sanitizeRpgMarketListings(raw: unknown): HarborRpgMarketListing[] {
  if (!Array.isArray(raw)) return []
  const out: HarborRpgMarketListing[] = []
  for (const row of raw) {
    if (out.length >= HARBOR_RPG_MAX_MARKET_LISTINGS) break
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id.trim()) continue
    if (typeof o.sellerId !== 'string' || !o.sellerId.trim()) continue
    if (!isHarborRpgItemId(o.itemId)) continue
    const qty =
      typeof o.qty === 'number' && Number.isFinite(o.qty) && o.qty > 0
        ? Math.min(Math.floor(o.qty), 99)
        : 0
    const price =
      typeof o.price === 'number' && Number.isFinite(o.price) && o.price > 0
        ? Math.min(Math.floor(o.price), 1_000_000)
        : 0
    if (qty <= 0 || price <= 0) continue
    out.push({
      id: o.id.trim().slice(0, 40),
      sellerId: o.sellerId.trim().slice(0, 64),
      sellerName:
        typeof o.sellerName === 'string' && o.sellerName.trim()
          ? o.sellerName.trim().slice(0, 20)
          : 'Trader',
      itemId: o.itemId,
      qty,
      price,
      createdAt:
        typeof o.createdAt === 'number' && Number.isFinite(o.createdAt)
          ? Math.floor(o.createdAt)
          : Date.now(),
    })
  }
  return out
}

export function nearestGatherNode(
  zone: HarborRpgZoneId,
  x: number,
  z: number,
  maxDist = 2.2,
) {
  let best = null as (typeof HARBOR_RPG_GATHER_NODES)[number] | null
  let bestD = maxDist
  for (const n of HARBOR_RPG_GATHER_NODES) {
    if (n.zone !== zone) continue
    const d = Math.hypot(n.x - x, n.z - z)
    if (d < bestD) {
      bestD = d
      best = n
    }
  }
  return best
}

export function gatherRpgNode(
  bag: HarborRpgBag,
  nodeId: string,
): { ok: true; bag: HarborRpgBag; itemId: HarborRpgItemId; xp: number } | { ok: false; reason: string } {
  const node = HARBOR_RPG_GATHER_NODES.find((n) => n.id === nodeId)
  if (!node) return { ok: false, reason: 'Unknown node.' }
  let next = addRpgInventoryItem(bag, node.item, 1)
  const professions = { ...bag.professions }
  professions[node.profession] = Math.min(
    500_000,
    (professions[node.profession] ?? 0) + node.xp,
  )
  // Gather quests that target this reagent
  next = {
    ...next,
    professions,
    quests: next.quests.map((q) => {
      if (q.claimed || q.complete) return q
      // progress gather quests via inventory count elsewhere; gathering itself is free XP
      return q
    }),
  }
  return { ok: true, bag: next, itemId: node.item, xp: node.xp }
}

export function craftRpgRecipe(
  bag: HarborRpgBag,
  recipeId: string,
):
  | { ok: true; bag: HarborRpgBag; recipe: HarborRpgCraftRecipe }
  | { ok: false; reason: string } {
  const recipe = HARBOR_RPG_CRAFT_RECIPES.find((r) => r.id === recipeId)
  if (!recipe) return { ok: false, reason: 'Unknown recipe.' }
  const skill = professionLevelFromXp(bag.professions[recipe.profession] ?? 0)
  if (skill < recipe.skillNeed) {
    return { ok: false, reason: `Need ${recipe.profession} level ${recipe.skillNeed}.` }
  }
  let next: HarborRpgBag | null = bag
  for (const input of recipe.inputs) {
    if (!next || countRpgItem(next, input.id) < input.qty) {
      return { ok: false, reason: `Need ${input.qty}× ${HARBOR_RPG_ITEM_DEFS[input.id].name.en}.` }
    }
    next = removeRpgInventoryItem(next, input.id, input.qty)
  }
  if (!next) return { ok: false, reason: 'Missing reagents.' }
  next = addRpgInventoryItem(next, recipe.output, recipe.qty)
  const professions = { ...next.professions }
  professions[recipe.profession] = Math.min(
    500_000,
    (professions[recipe.profession] ?? 0) + recipe.xp,
  )
  next = { ...next, professions }
  // Craft-target gather quests
  next = {
    ...next,
    quests: next.quests.map((q) => {
      if (q.claimed || q.complete) return q
      if (q.id !== 'quest-first-craft') return q
      const have = countRpgItem(next!, 'rpg-potion-heal')
      const progress = Math.min(1, have)
      return { ...q, progress, complete: progress >= 1 }
    }),
  }
  return { ok: true, bag: next, recipe }
}

export function listRpgMarketItem(
  bag: HarborRpgBag,
  opts: {
    sellerId: string
    sellerName: string
    itemId: HarborRpgItemId
    qty: number
    price: number
  },
): { ok: true; bag: HarborRpgBag; listing: HarborRpgMarketListing } | { ok: false; reason: string } {
  if (bag.market.length >= HARBOR_RPG_MAX_MARKET_LISTINGS) {
    return { ok: false, reason: 'Market full.' }
  }
  if (opts.price <= 0 || opts.qty <= 0) return { ok: false, reason: 'Bad price/qty.' }
  if (countRpgItem(bag, opts.itemId) < opts.qty) return { ok: false, reason: 'Not enough items.' }
  const removed = removeRpgInventoryItem(bag, opts.itemId, opts.qty)
  if (!removed) return { ok: false, reason: 'Not enough items.' }
  const listing: HarborRpgMarketListing = {
    id: `mkt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    sellerId: opts.sellerId.slice(0, 64),
    sellerName: opts.sellerName.trim().slice(0, 20) || 'Trader',
    itemId: opts.itemId,
    qty: opts.qty,
    price: Math.floor(opts.price),
    createdAt: Date.now(),
  }
  return {
    ok: true,
    listing,
    bag: { ...removed, market: [...removed.market, listing] },
  }
}

export function buyRpgMarketListing(
  bag: HarborRpgBag,
  listingId: string,
  buyerId: string,
): { ok: true; bag: HarborRpgBag } | { ok: false; reason: string } {
  const listing = bag.market.find((l) => l.id === listingId)
  if (!listing) return { ok: false, reason: 'Listing gone.' }
  if (listing.sellerId === buyerId) return { ok: false, reason: 'Cannot buy own listing.' }
  if (bag.gold < listing.price) return { ok: false, reason: 'Not enough gold.' }
  let next = addRpgInventoryItem(
    { ...bag, gold: bag.gold - listing.price },
    listing.itemId,
    listing.qty,
  )
  next = {
    ...next,
    market: next.market.filter((l) => l.id !== listingId),
  }
  return { ok: true, bag: next }
}

/** Soft merge remote market listings into local view (other sellers). */
export function mergeRemoteMarketListings(
  local: HarborRpgMarketListing[],
  remote: HarborRpgMarketListing[],
  selfId: string,
): HarborRpgMarketListing[] {
  const map = new Map<string, HarborRpgMarketListing>()
  for (const l of local) map.set(l.id, l)
  for (const l of remote) {
    if (l.sellerId === selfId) continue
    map.set(l.id, l)
  }
  return [...map.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, HARBOR_RPG_MAX_MARKET_LISTINGS)
}
