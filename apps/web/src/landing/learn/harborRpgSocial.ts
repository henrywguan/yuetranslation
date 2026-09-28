/**
 * HarborRPG soft social — local companion hire + party panel state.
 * No Realtime / contested loot (no dedicated host).
 */
import type { HarborRpgBag } from './harborRpgProgress'

export const HARBOR_RPG_COMPANION_MS = 10 * 60 * 1000
export const HARBOR_RPG_COMPANION_COST = 15

const COMPANION_NAMES = [
  'Lantern Fox',
  'Reed Scout',
  'Jade Spar',
  'Ash Walker',
  'Pine Blade',
] as const

export function hireRpgCompanion(
  bag: HarborRpgBag,
  now = Date.now(),
): { ok: true; bag: HarborRpgBag; name: string } | { ok: false; reason: string } {
  if (bag.gold < HARBOR_RPG_COMPANION_COST) {
    return { ok: false, reason: `Need ${HARBOR_RPG_COMPANION_COST} soft gold.` }
  }
  if (bag.companionUntil > now) {
    return { ok: false, reason: 'Companion already hired.' }
  }
  const name = COMPANION_NAMES[Math.floor(Math.random() * COMPANION_NAMES.length)]!
  return {
    ok: true,
    name,
    bag: {
      ...bag,
      gold: bag.gold - HARBOR_RPG_COMPANION_COST,
      companionUntil: now + HARBOR_RPG_COMPANION_MS,
      companionName: name,
    },
  }
}

export type HarborRpgPartyState = {
  /** Soft local party code (shareable UI only). */
  code: string
  members: string[]
  looking: boolean
}

export function emptyRpgParty(leaderName: string): HarborRpgPartyState {
  const code = `H-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  return {
    code,
    members: [leaderName || 'Adventurer'],
    looking: false,
  }
}

export function toggleRpgFinderLooking(party: HarborRpgPartyState): HarborRpgPartyState {
  return { ...party, looking: !party.looking }
}
