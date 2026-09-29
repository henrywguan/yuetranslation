/**
 * HarborRPG player trade windows (soft Realtime, client-authoritative).
 */
import { isHarborRpgItemId, type HarborRpgItemId } from './harborRpgData'
import {
  addRpgInventoryItem,
  countRpgItem,
  removeRpgInventoryItem,
  type HarborRpgBag,
  type HarborRpgInvStack,
} from './harborRpgProgress'

export const HARBOR_RPG_TRADE_EVENT = 'harbor-rpg-trade' as const
export const HARBOR_RPG_TRADE_SLOTS = 6

export type HarborRpgTradeOffer = {
  type: 'offer' | 'accept' | 'cancel' | 'complete'
  tradeId: string
  fromId: string
  fromName: string
  toId: string
  gold: number
  items: HarborRpgInvStack[]
  locked: boolean
  t: number
}

export type HarborRpgTradeSession = {
  tradeId: string
  peerId: string
  peerName: string
  selfGold: number
  selfItems: HarborRpgInvStack[]
  peerGold: number
  peerItems: HarborRpgInvStack[]
  selfLocked: boolean
  peerLocked: boolean
}

export function createRpgTradeId(a: string, b: string): string {
  const [x, y] = [a, b].sort()
  return `trade-${x.slice(0, 8)}-${y.slice(0, 8)}-${Date.now().toString(36).slice(-4)}`
}

export function emptyRpgTradeSession(
  peerId: string,
  peerName: string,
  tradeId: string,
): HarborRpgTradeSession {
  return {
    tradeId,
    peerId,
    peerName,
    selfGold: 0,
    selfItems: [],
    peerGold: 0,
    peerItems: [],
    selfLocked: false,
    peerLocked: false,
  }
}

export function sanitizeRpgTradeOffer(raw: unknown): HarborRpgTradeOffer | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (
    o.type !== 'offer' &&
    o.type !== 'accept' &&
    o.type !== 'cancel' &&
    o.type !== 'complete'
  ) {
    return null
  }
  if (typeof o.tradeId !== 'string' || typeof o.fromId !== 'string') return null
  if (typeof o.toId !== 'string') return null
  const items: HarborRpgInvStack[] = []
  if (Array.isArray(o.items)) {
    for (const row of o.items) {
      if (items.length >= HARBOR_RPG_TRADE_SLOTS) break
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (!isHarborRpgItemId(r.id)) continue
      const qty =
        typeof r.qty === 'number' && Number.isFinite(r.qty) && r.qty > 0
          ? Math.min(Math.floor(r.qty), 99)
          : 0
      if (qty <= 0) continue
      items.push({ id: r.id, qty })
    }
  }
  return {
    type: o.type,
    tradeId: o.tradeId.slice(0, 64),
    fromId: o.fromId.slice(0, 64),
    fromName:
      typeof o.fromName === 'string' && o.fromName.trim()
        ? o.fromName.trim().slice(0, 20)
        : 'Trader',
    toId: o.toId.slice(0, 64),
    gold:
      typeof o.gold === 'number' && Number.isFinite(o.gold) && o.gold >= 0
        ? Math.min(Math.floor(o.gold), 1_000_000)
        : 0,
    items,
    locked: o.locked === true,
    t: typeof o.t === 'number' && Number.isFinite(o.t) ? o.t : Date.now(),
  }
}

export function canPutInTrade(
  bag: HarborRpgBag,
  itemId: HarborRpgItemId,
  qty: number,
  alreadyOffered: HarborRpgInvStack[],
): boolean {
  const offered = alreadyOffered.find((s) => s.id === itemId)?.qty ?? 0
  return countRpgItem(bag, itemId) >= offered + qty
}

/** Execute a completed two-sided trade on the local bag (self side). */
export function applyRpgTradeComplete(
  bag: HarborRpgBag,
  giveGold: number,
  giveItems: HarborRpgInvStack[],
  recvGold: number,
  recvItems: HarborRpgInvStack[],
): HarborRpgBag | null {
  if (bag.gold < giveGold) return null
  let next: HarborRpgBag | null = { ...bag, gold: bag.gold - giveGold }
  for (const s of giveItems) {
    next = removeRpgInventoryItem(next, s.id, s.qty)
    if (!next) return null
  }
  next = { ...next, gold: Math.min(10_000_000, next.gold + recvGold) }
  for (const s of recvItems) {
    next = addRpgInventoryItem(next, s.id, s.qty)
  }
  return next
}
