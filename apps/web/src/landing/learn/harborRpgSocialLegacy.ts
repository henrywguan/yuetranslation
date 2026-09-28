/**
 * Companion hire kept as a tiny legacy shim so social can import without cycles.
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
