/**
 * Harbor Quest progress — localStorage + optional cloud sync when signed in.
 * Merge is monotonic (union cleared, max step/correct) so devices never lose progress.
 */

import { fetchHarborQuestProgress, putHarborQuestProgress } from '../../lib/api'
import { getSession } from '../../lib/auth'
import {
  emptyHarborProgress,
  harborProgressEqual,
  isLevelCleared as isLevelClearedPure,
  isLevelUnlocked as isLevelUnlockedPure,
  mergeHarborProgress,
  sanitizeHarborProgress,
  type HarborProgress,
} from './progressMerge'
import { sanitizeHarborFishingBag, type HarborFishingBag } from './harborFishing'
import {
  createHarborRpgCharacter,
  HARBOR_RPG_DUMMY_GOLD,
  HARBOR_RPG_MAX_CHARS,
  HARBOR_RPG_SHRINE_XP,
  addRpgInventoryItem,
  countRpgItem,
  depositRpgBank,
  equipRpgGearSlot,
  removeRpgInventoryItem,
  rpgCreditMultiplier,
  rpgXpMultiplier,
  sanitizeHarborRpgBag,
  selectHarborRpgClass,
  selectHarborRpgSpec,
  setHarborRpgDifficulty,
  spendHarborRpgTalent,
  prestigeHarborRpgClass,
  withdrawRpgBank,
  type HarborRpgBag,
} from './harborRpgProgress'
import {
  HARBOR_RPG_ITEM_DEFS,
  harborRpgQuestById,
  isHarborRpgZoneId,
  type HarborRpgDifficulty,
  type HarborRpgItemId,
  type HarborRpgQuestId,
  type HarborRpgZoneId,
} from './harborRpgData'
import type { HarborRpgClassId } from './harborRpgClasses'
import { hireRpgCompanion } from './harborRpgSocial'
import {
  buyRpgMarketListing,
  craftRpgRecipe,
  gatherRpgNode,
  listRpgMarketItem,
} from './harborRpgProfessions'
import { HARBOR_LEVELS } from './curriculum'
import {
  HARBOR_DEFAULT_LOOK,
  HARBOR_STARTER_OWNED,
  harborGearById,
  harborGearCanEquipToSlot,
  sanitizeBankedGear,
  sanitizeCarriedGear,
  sanitizeHarborLook,
  type HarborGearId,
  type HarborGearSlot,
  type HarborLook,
} from './harborGear'
import { missionXpAward } from './xpRewards'
import {
  sanitizeHarborAppearance,
  sanitizeHarborGender,
  type HarborAppearance,
  type HarborGender,
} from './harborAppearance'
import {
  harborBeautyIsUnlocked,
  harborBeautySkuById,
  harborBeautyUnlockCost,
  sanitizeHarborBeautyOwned,
} from './harborBeauty'
import {
  claimHarborFreeEvent,
  harborShowoffById,
  sanitizeHarborShowoffBag,
  type HarborEventId,
} from './harborShowoff'
import { HARBOR_GOLD_TO_COINS } from './matchDefinitionBank'

export type { HarborProgress }
export {
  emptyHarborProgress,
  harborProgressEqual,
  mergeHarborProgress,
  sanitizeHarborProgress,
}

/** Coins awarded per correct answer (quest + practice). */
export const HARBOR_COINS_PER_CORRECT = 8

const STORAGE_KEY = 'yue-harbor-quest-v1'

function read(): HarborProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyHarborProgress()
    return sanitizeHarborProgress(JSON.parse(raw))
  } catch {
    return emptyHarborProgress()
  }
}

function write(p: HarborProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* private mode */
  }
}

let persistLoggedIn = false
let persistTimer: ReturnType<typeof setTimeout> | null = null

export function setHarborPersistLoggedIn(loggedIn: boolean) {
  persistLoggedIn = loggedIn
}

function scheduleCloudPush(p: HarborProgress) {
  if (!persistLoggedIn) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void putHarborQuestProgress(p).catch(() => {
      /* offline — local still kept */
    })
  }, 700)
}

/** Push the full progress blob to Supabase now (Save Shack / critical writes). */
function flushHarborProgressCloud(p: HarborProgress) {
  if (!persistLoggedIn) return
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  void putHarborQuestProgress(p).catch(() => {
    /* offline — local still kept */
  })
}

function commit(p: HarborProgress): HarborProgress {
  write(p)
  scheduleCloudPush(p)
  return p
}

export function loadHarborProgress(): HarborProgress {
  return read()
}

export function isLevelCleared(levelId: string, progress = read()): boolean {
  return isLevelClearedPure(levelId, progress)
}

export function isLevelUnlocked(levelId: string, orderedIds: string[], progress = read()): boolean {
  return isLevelUnlockedPure(levelId, orderedIds, progress)
}

/** Next pier to sail: first unlocked uncleared level, else the final chart stop. */
export function continueHarborLevelId(progress = read()): string {
  const ids = HARBOR_LEVELS.map((l) => l.id)
  for (const id of ids) {
    if (!isLevelCleared(id, progress) && isLevelUnlocked(id, ids, progress)) return id
  }
  return ids[ids.length - 1] ?? ids[0]!
}

export function markStepReached(levelId: string, stepIndex: number) {
  const p = read()
  const prev = p.stepCursor[levelId] ?? 0
  if (stepIndex > prev) p.stepCursor[levelId] = stepIndex
  return commit(p)
}

export function markCorrect() {
  const p = read()
  p.correctCount += 1
  p.coins = Math.max(0, Math.floor(p.coins)) + HARBOR_COINS_PER_CORRECT
  return commit(p)
}

/** Delve hit: +1 correctCount and delve coins (not pier coin amount). */
export function markDelveHit(coins: number): HarborProgress {
  const p = read()
  const n = Math.max(0, Math.floor(coins))
  p.correctCount += 1
  p.coins = Math.max(0, Math.floor(p.coins)) + n
  return commit(p)
}

/** Grant a cosmetic title if not already owned. */
export function awardHarborTitle(titleId: string): HarborProgress {
  const p = read()
  const owned = [...(p.ownedTitles ?? [])]
  if (!owned.includes(titleId)) owned.push(titleId)
  return commit({
    ...p,
    ownedTitles: owned,
    titleId: p.titleId ?? titleId,
  })
}

/** Replace local progress after a server gift response. */
export function replaceHarborProgress(next: HarborProgress): HarborProgress {
  return commit(sanitizeHarborProgress(next))
}

/** Persist Guan fishing bag (+ optional coin delta from buy/sell). */
export function updateHarborFishing(fishing: HarborFishingBag, coinsDelta = 0): HarborProgress {
  const p = read()
  const coins = Math.max(0, Math.floor((p.coins ?? 0) + coinsDelta))
  return commit({
    ...p,
    fishing: sanitizeHarborFishingBag(fishing),
    coins,
    lastSavedAt: Date.now(),
  })
}

/** Replace HarborRPG soft bag (2 chars, XP, gold, cosmetics). */
export function updateHarborRpg(rpg: HarborRpgBag): HarborProgress {
  const p = read()
  return commit({
    ...p,
    rpg: sanitizeHarborRpgBag(rpg),
    lastSavedAt: Date.now(),
  })
}

/** Soft shrine claim — client XP only (does not touch pedagogy XP). */
export function claimHarborRpgShrine(): HarborProgress {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const mult = rpgXpMultiplier(bag)
  bag.xp = Math.min(50_000_000, bag.xp + HARBOR_RPG_SHRINE_XP * mult)
  bag.shrineClaims += 1
  return commit({ ...p, rpg: bag, lastSavedAt: Date.now() })
}

/** Soft training-dummy hit — client gold only. */
export function hitHarborRpgDummy(): HarborProgress {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const mult = rpgCreditMultiplier(bag)
  bag.gold = Math.min(10_000_000, bag.gold + HARBOR_RPG_DUMMY_GOLD * mult)
  bag.dummyKills += 1
  return commit({ ...p, rpg: bag, lastSavedAt: Date.now() })
}

/** Create an RPG character slot (max 2). */
export function createHarborRpgCharacterSlot(input: {
  name: string
  gender?: HarborGender
  appearance?: HarborAppearance
}): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  if (bag.characters.length >= HARBOR_RPG_MAX_CHARS) return null
  const c = createHarborRpgCharacter(input)
  bag.characters = [...bag.characters, c]
  bag.activeCharacterId = c.id
  return commit({ ...p, rpg: bag, lastSavedAt: Date.now() })
}

/** Switch active RPG character. */
export function setHarborRpgActiveCharacter(id: string): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  if (!bag.characters.some((c) => c.id === id)) return null
  bag.activeCharacterId = id
  return commit({ ...p, rpg: bag, lastSavedAt: Date.now() })
}

export function setHarborRpgZone(zone: HarborRpgZoneId): HarborProgress {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  if (!isHarborRpgZoneId(zone)) return p
  bag.zone = zone
  return commit({ ...p, rpg: bag, lastSavedAt: Date.now() })
}

export function setHarborRpgInstanceDifficulty(
  difficulty: HarborRpgDifficulty,
): HarborProgress {
  const p = read()
  const bag = setHarborRpgDifficulty(sanitizeHarborRpgBag(p.rpg), difficulty)
  return commit({ ...p, rpg: bag, lastSavedAt: Date.now() })
}

export function equipHarborRpgItem(itemId: HarborRpgItemId): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const next = equipRpgGearSlot(bag, itemId)
  if (!next) return null
  return commit({ ...p, rpg: next, lastSavedAt: Date.now() })
}

export function buyHarborRpgVendorItem(itemId: HarborRpgItemId): HarborProgress | null {
  const p = read()
  let bag = sanitizeHarborRpgBag(p.rpg)
  const def = HARBOR_RPG_ITEM_DEFS[itemId]
  if (!def || def.kind === 'loot' || def.kind === 'reagent') return null
  if (bag.gold < def.value) return null
  bag = {
    ...addRpgInventoryItem(bag, itemId, 1),
    gold: bag.gold - def.value,
  }
  return commit({ ...p, rpg: sanitizeHarborRpgBag(bag), lastSavedAt: Date.now() })
}

export function sellHarborRpgItem(itemId: HarborRpgItemId, qty = 1): HarborProgress | null {
  const p = read()
  let bag = sanitizeHarborRpgBag(p.rpg)
  const def = HARBOR_RPG_ITEM_DEFS[itemId]
  if (!def) return null
  const next = removeRpgInventoryItem(bag, itemId, qty)
  if (!next) return null
  bag = {
    ...next,
    gold: Math.min(10_000_000, next.gold + def.value * Math.max(1, Math.floor(qty))),
  }
  return commit({ ...p, rpg: bag, lastSavedAt: Date.now() })
}

export function acceptHarborRpgQuest(questId: HarborRpgQuestId): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const def = harborRpgQuestById(questId)
  if (!def) return null
  if (bag.quests.some((q) => q.id === questId)) return null
  const req = 'requires' in def ? def.requires : undefined
  if (req && req.length > 0) {
    for (const id of req) {
      if (!bag.quests.some((q) => q.id === id && q.claimed)) return null
    }
  }
  bag.quests = [
    ...bag.quests,
    { id: questId, progress: 0, complete: false, claimed: false },
  ]
  return commit({ ...p, rpg: bag, lastSavedAt: Date.now() })
}

export function claimHarborRpgQuest(questId: HarborRpgQuestId): HarborProgress | null {
  const p = read()
  let bag = sanitizeHarborRpgBag(p.rpg)
  const def = harborRpgQuestById(questId)
  if (!def) return null
  const q = bag.quests.find((row) => row.id === questId)
  if (!q || q.claimed) return null
  if (def.kind === 'gather') {
    const have = countRpgItem(bag, def.targetItem)
    if (have < def.need) return null
    const removed = removeRpgInventoryItem(bag, def.targetItem, def.need)
    if (!removed) return null
    bag = removed
  } else if (!q.complete && q.progress < def.need) {
    return null
  }
  const multXp = rpgXpMultiplier(bag)
  const multGold = rpgCreditMultiplier(bag)
  bag = {
    ...bag,
    xp: Math.min(50_000_000, bag.xp + def.xp * multXp),
    gold: Math.min(10_000_000, bag.gold + def.gold * multGold),
    quests: bag.quests.map((row) =>
      row.id === questId
        ? { ...row, progress: def.need, complete: true, claimed: true }
        : row,
    ),
  }
  return commit({ ...p, rpg: bag, lastSavedAt: Date.now() })
}

export function hireHarborRpgCompanion(): HarborProgress | { error: string } {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const res = hireRpgCompanion(bag)
  if (!res.ok) return { error: res.reason }
  return commit({ ...p, rpg: res.bag, lastSavedAt: Date.now() })
}

export function gatherHarborRpgNode(nodeId: string): HarborProgress | { error: string } {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const res = gatherRpgNode(bag, nodeId)
  if (!res.ok) return { error: res.reason }
  return commit({ ...p, rpg: sanitizeHarborRpgBag(res.bag), lastSavedAt: Date.now() })
}

export function craftHarborRpgRecipe(recipeId: string): HarborProgress | { error: string } {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const res = craftRpgRecipe(bag, recipeId)
  if (!res.ok) return { error: res.reason }
  return commit({ ...p, rpg: sanitizeHarborRpgBag(res.bag), lastSavedAt: Date.now() })
}

export function listHarborRpgMarketItem(opts: {
  sellerId: string
  sellerName: string
  itemId: HarborRpgItemId
  qty: number
  price: number
}): HarborProgress | { error: string } {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const res = listRpgMarketItem(bag, opts)
  if (!res.ok) return { error: res.reason }
  return commit({ ...p, rpg: sanitizeHarborRpgBag(res.bag), lastSavedAt: Date.now() })
}

export function buyHarborRpgMarketListing(
  listingId: string,
  buyerId: string,
): HarborProgress | { error: string } {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const res = buyRpgMarketListing(bag, listingId, buyerId)
  if (!res.ok) return { error: res.reason }
  return commit({ ...p, rpg: sanitizeHarborRpgBag(res.bag), lastSavedAt: Date.now() })
}

export function depositHarborRpgBank(
  itemId: HarborRpgItemId,
  qty = 1,
): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const next = depositRpgBank(bag, itemId, qty)
  if (!next) return null
  return commit({ ...p, rpg: next, lastSavedAt: Date.now() })
}

export function withdrawHarborRpgBank(
  itemId: HarborRpgItemId,
  qty = 1,
): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const next = withdrawRpgBank(bag, itemId, qty)
  if (!next) return null
  return commit({ ...p, rpg: next, lastSavedAt: Date.now() })
}

export function selectHarborRpgClassPick(classId: HarborRpgClassId): HarborProgress {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  return commit({
    ...p,
    rpg: sanitizeHarborRpgBag(selectHarborRpgClass(bag, classId)),
    lastSavedAt: Date.now(),
  })
}

export function selectHarborRpgSpecPick(
  specId: import('./harborRpgSpecs').HarborRpgSpecId,
): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const next = selectHarborRpgSpec(bag, specId)
  if (!next) return null
  return commit({ ...p, rpg: next, lastSavedAt: Date.now() })
}

export function spendHarborRpgTalentPoint(talentId: string): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const next = spendHarborRpgTalent(bag, talentId)
  if (!next) return null
  return commit({ ...p, rpg: next, lastSavedAt: Date.now() })
}

export function prestigeHarborRpgClassPick(): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborRpgBag(p.rpg)
  const next = prestigeHarborRpgClass(bag)
  if (!next) return null
  return commit({ ...p, rpg: next, lastSavedAt: Date.now() })
}

export function markGoldEarned(amount: number) {
  const p = read()
  const n = Math.max(0, Math.floor(amount))
  if (n > 0) p.gold = Math.max(0, Math.floor(p.gold ?? 0)) + n
  return commit(p)
}

/** Arena gold → ferry coins for the River Outfitter. `goldAmount` of 0 exchanges all. */
export function exchangeGoldForCoins(
  goldAmount = 0,
):
  | { ok: true; progress: HarborProgress; coinsGained: number; goldSpent: number }
  | { ok: false; reason: string } {
  const p = read()
  const have = Math.max(0, Math.floor(p.gold ?? 0))
  if (have <= 0) return { ok: false, reason: 'No arena gold to exchange.' }
  const want = goldAmount > 0 ? Math.floor(goldAmount) : have
  const spend = Math.min(have, Math.max(0, want))
  if (spend <= 0) return { ok: false, reason: 'Pick an amount of gold to exchange.' }
  const coinsGained = spend * HARBOR_GOLD_TO_COINS
  const progress = commit({
    ...p,
    gold: have - spend,
    coins: Math.max(0, Math.floor(p.coins)) + coinsGained,
  })
  return { ok: true, progress, coinsGained, goldSpent: spend }
}

export { HARBOR_GOLD_TO_COINS }

/** Stamp a visit to the Save Shack (persists look + progress timestamp). */
export function visitSaveShack(): HarborProgress {
  const p = read()
  const banked = sanitizeBankedGear(p.banked)
  const next = commit({
    ...p,
    look: sanitizeHarborLook(p.look),
    owned: sanitizeCarriedGear(p.owned, banked),
    banked,
    lastSavedAt: Date.now(),
  })
  // Save Shack is an explicit cloud checkpoint — don't wait on the debounce.
  flushHarborProgressCloud(next)
  return next
}

export function buyHarborGear(
  id: HarborGearId,
): { ok: true; progress: HarborProgress } | { ok: false; reason: string } {
  const item = harborGearById(id)
  if (!item) return { ok: false, reason: 'Unknown item.' }
  const p = read()
  const banked = new Set(sanitizeBankedGear(p.banked))
  if (banked.has(id)) return { ok: false, reason: 'Already in the bank — withdraw it first.' }
  const owned = new Set(sanitizeCarriedGear(p.owned, banked))
  if (owned.has(id)) return { ok: false, reason: 'Already owned.' }
  const price = Math.max(0, Math.floor(item.price))
  const coins = Math.max(0, Math.floor(p.coins))
  if (coins < price) return { ok: false, reason: 'Not enough coins.' }
  owned.add(id)
  const look: HarborLook = { ...sanitizeHarborLook(p.look), [item.slot]: id }
  const progress = commit({
    ...p,
    coins: coins - price,
    owned: sanitizeCarriedGear([...owned], banked),
    banked: [...banked] as HarborGearId[],
    look: sanitizeHarborLook(look),
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress }
}

/** Sell carried gear back to the Outfitter for half price (starters stay with the Scout). */
export function sellHarborGear(
  id: HarborGearId,
): { ok: true; progress: HarborProgress; refund: number } | { ok: false; reason: string } {
  const item = harborGearById(id)
  if (!item) return { ok: false, reason: 'Unknown item.' }
  if (item.price <= 0) return { ok: false, reason: 'Starter kit stays with the Scout.' }
  const p = read()
  const banked = new Set(sanitizeBankedGear(p.banked))
  if (banked.has(id)) return { ok: false, reason: 'Withdraw from the bank first.' }
  const owned = new Set(sanitizeCarriedGear(p.owned, banked))
  if (!owned.has(id)) return { ok: false, reason: 'Not in your pack.' }
  owned.delete(id)
  const refund = Math.max(1, Math.floor(item.price / 2))
  let look = sanitizeHarborLook(p.look)
  if (look[item.slot] === id) {
    look = { ...look, [item.slot]: HARBOR_DEFAULT_LOOK[item.slot] }
  }
  const progress = commit({
    ...p,
    coins: Math.max(0, Math.floor(p.coins)) + refund,
    owned: sanitizeCarriedGear([...owned], banked),
    banked: [...banked] as HarborGearId[],
    look,
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress, refund }
}

export function equipHarborGear(
  slot: HarborGearSlot,
  id: HarborGearId,
): { ok: true; progress: HarborProgress } | { ok: false; reason: string } {
  const item = harborGearById(id)
  if (!item) return { ok: false, reason: 'Unknown item.' }
  if (!harborGearCanEquipToSlot(item, slot)) return { ok: false, reason: 'Wrong slot.' }
  const p = read()
  const banked = sanitizeBankedGear(p.banked)
  const owned = new Set(
    sanitizeCarriedGear(p.owned.length ? p.owned : [...HARBOR_STARTER_OWNED], banked),
  )
  if (!owned.has(id)) return { ok: false, reason: 'Not in your pack — buy or withdraw it first.' }
  const look: HarborLook = { ...sanitizeHarborLook(p.look), [slot]: id }
  const progress = commit({
    ...p,
    owned: [...owned],
    banked,
    look: sanitizeHarborLook(look),
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress }
}


/** Move a carried piece into the Harbor Bank (starters stay on the Scout). */
export function depositHarborGear(
  id: HarborGearId,
): { ok: true; progress: HarborProgress } | { ok: false; reason: string } {
  const item = harborGearById(id)
  if (!item) return { ok: false, reason: 'Unknown item.' }
  if ((HARBOR_STARTER_OWNED as readonly string[]).includes(id)) {
    return { ok: false, reason: 'Starter gear stays with the Scout.' }
  }
  const p = read()
  const banked = new Set(sanitizeBankedGear(p.banked))
  if (banked.has(id)) return { ok: false, reason: 'Already banked.' }
  const owned = new Set(sanitizeCarriedGear(p.owned, banked))
  if (!owned.has(id)) return { ok: false, reason: 'Not in your pack.' }
  owned.delete(id)
  banked.add(id)
  let look = sanitizeHarborLook(p.look)
  if (look[item.slot] === id) {
    look = { ...look, [item.slot]: HARBOR_DEFAULT_LOOK[item.slot] }
  }
  // Lanterns may also be held — clear the hand if this piece was carried there.
  if (item.slot === 'lantern' && look.hand === id) {
    look = { ...look, hand: HARBOR_DEFAULT_LOOK.hand }
  }
  const progress = commit({
    ...p,
    owned: sanitizeCarriedGear([...owned], banked),
    banked: sanitizeBankedGear([...banked]),
    look,
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress }
}

/** Withdraw a banked piece back into the Scout's pack. */
export function withdrawHarborGear(
  id: HarborGearId,
): { ok: true; progress: HarborProgress } | { ok: false; reason: string } {
  const item = harborGearById(id)
  if (!item) return { ok: false, reason: 'Unknown item.' }
  const p = read()
  const banked = new Set(sanitizeBankedGear(p.banked))
  if (!banked.has(id)) return { ok: false, reason: 'Not in the bank.' }
  banked.delete(id)
  const owned = new Set(sanitizeCarriedGear(p.owned, banked))
  owned.add(id)
  const progress = commit({
    ...p,
    owned: sanitizeCarriedGear([...owned], banked),
    banked: sanitizeBankedGear([...banked]),
    look: sanitizeHarborLook(p.look),
  })
  flushHarborProgressCloud(progress)
  return { ok: true, progress }
}

export type MissionClearResult = {
  progress: HarborProgress
  /** XP granted for this clear (full on first, half on repeats). */
  xpGained: number
  /** True when this pier was already cleared before. */
  repeat: boolean
  /** Times completed after this clear. */
  clearCount: number
}

/**
 * Complete a pier mission.
 * First clear → full `baseXp`; every repeat → 50% of `baseXp` (floored).
 */
export function markLevelCleared(levelId: string, baseXp = 0): MissionClearResult {
  const p = read()
  const prior = p.missionClears[levelId] ?? 0
  const award = missionXpAward(baseXp, prior)
  p.missionClears[levelId] = prior + 1
  if (!p.cleared.includes(levelId)) p.cleared = [...p.cleared, levelId]
  if (award > 0) p.xp = Math.max(0, Math.floor(p.xp ?? 0)) + award
  return {
    progress: commit(p),
    xpGained: award,
    repeat: prior > 0,
    clearCount: prior + 1,
  }
}

/**
 * Load local + account progress after Learn open / sign-in.
 * Always writes the merged result locally; pushes cloud when local was ahead.
 */

/** Persist first-time character creation (gender, looks, optional local username). */
export function completeHarborCharacter(input: {
  gender: HarborGender
  appearance: HarborAppearance
  look?: HarborLook
  localUsername?: string | null
}): HarborProgress {
  const p = read()
  const username =
    typeof input.localUsername === 'string' && input.localUsername.trim()
      ? input.localUsername.trim().slice(0, 24)
      : p.localUsername
  const titles = [...(p.ownedTitles ?? [])]
  if (!titles.includes('title-river-scout')) titles.push('title-river-scout')
  const next = commit({
    ...p,
    characterCreated: true,
    gender: sanitizeHarborGender(input.gender),
    appearance: sanitizeHarborAppearance(input.appearance),
    look: input.look ? sanitizeHarborLook(input.look) : sanitizeHarborLook(p.look),
    localUsername: username,
    ownedTitles: titles,
    titleId: p.titleId ?? 'title-river-scout',
    lastSavedAt: Date.now(),
  })
  flushHarborProgressCloud(next)
  return next
}

/**
 * Unlock one beauty salon SKU with ferry coins.
 * Returns null when already owned, unknown, or purse too light.
 */
export function purchaseHarborBeautySku(skuId: string): HarborProgress | null {
  const p = read()
  const sku = harborBeautySkuById(skuId)
  if (!sku) return null
  if (harborBeautyIsUnlocked(skuId, p.beautyOwned)) return null
  if (p.coins < sku.price) return null
  const next = commit({
    ...p,
    coins: p.coins - sku.price,
    beautyOwned: sanitizeHarborBeautyOwned([...p.beautyOwned, skuId]),
    lastSavedAt: Date.now(),
  })
  flushHarborProgressCloud(next)
  return next
}

/**
 * Unlock every still-locked beauty SKU required for an appearance (barber Accept).
 * Returns null if the purse cannot cover the bundle.
 */
export function purchaseHarborBeautyForAppearance(
  appearance: HarborAppearance,
): HarborProgress | null {
  const p = read()
  const { cost, missing } = harborBeautyUnlockCost(appearance, p.beautyOwned)
  if (missing.length === 0) return p
  if (p.coins < cost) return null
  const next = commit({
    ...p,
    coins: p.coins - cost,
    beautyOwned: sanitizeHarborBeautyOwned([...p.beautyOwned, ...missing]),
    lastSavedAt: Date.now(),
  })
  flushHarborProgressCloud(next)
  return next
}

/** Equip a showoff cosmetic the sailor already owns. */
export function equipHarborShowoff(
  kind: 'nametag' | 'bubble' | 'chair' | 'pet',
  id: string,
): HarborProgress | null {
  const p = read()
  const bag = sanitizeHarborShowoffBag(p.showoff)
  const item = harborShowoffById(id)
  if (!item || item.kind !== kind) return null
  if (!bag.owned.includes(id)) return null
  const look = { ...bag.look, [kind]: id }
  const next = commit({
    ...p,
    showoff: { ...bag, look },
    lastSavedAt: Date.now(),
  })
  flushHarborProgressCloud(next)
  return next
}

/** Claim a free seasonal event once — grants cosmetics into the showoff bag. */
export function claimHarborFreeEventProgress(eventId: HarborEventId): {
  progress: HarborProgress
  granted: string[]
  already: boolean
} {
  const p = read()
  const { bag, granted, already } = claimHarborFreeEvent(p.showoff, eventId)
  if (already) return { progress: p, granted: [], already: true }
  const next = commit({
    ...p,
    showoff: bag,
    lastSavedAt: Date.now(),
  })
  flushHarborProgressCloud(next)
  return { progress: next, granted, already: false }
}

export async function hydrateHarborProgress(loggedIn?: boolean): Promise<HarborProgress> {
  const session = loggedIn === undefined ? await getSession() : null
  const isLoggedIn = loggedIn ?? Boolean(session)
  setHarborPersistLoggedIn(isLoggedIn)

  const local = read()
  if (!isLoggedIn) return local

  try {
    const remoteRaw = await fetchHarborQuestProgress()
    if (!remoteRaw) return local
    const remote = sanitizeHarborProgress(remoteRaw)
    const merged = mergeHarborProgress(local, remote)
    write(merged)
    if (!harborProgressEqual(merged, remote)) {
      void putHarborQuestProgress(merged).catch(() => {
        /* offline */
      })
    }
    return merged
  } catch {
    return local
  }
}
