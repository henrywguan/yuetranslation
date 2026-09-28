/**
 * HarborRPG quest gating helpers — catalog lives in harborRpgData.ts.
 */
import {
  HARBOR_RPG_QUESTS,
  harborRpgQuestById,
  type HarborRpgQuestId,
} from './harborRpgData'
import type { HarborRpgBag } from './harborRpgProgress'

export function harborRpgQuestClaimed(
  bag: HarborRpgBag,
  id: HarborRpgQuestId,
): boolean {
  return bag.quests.some((q) => q.id === id && q.claimed)
}

/** True when all `requires` quests are claimed (or none). */
export function harborRpgQuestUnlocked(
  bag: HarborRpgBag,
  questId: HarborRpgQuestId,
): boolean {
  const def = harborRpgQuestById(questId)
  if (!def) return false
  const req = 'requires' in def ? def.requires : undefined
  if (!req || req.length === 0) return true
  return req.every((id) => harborRpgQuestClaimed(bag, id as HarborRpgQuestId))
}

export function harborRpgAvailableQuests(bag: HarborRpgBag) {
  return HARBOR_RPG_QUESTS.filter((q) => harborRpgQuestUnlocked(bag, q.id))
}

export function harborRpgChapterProgress(bag: HarborRpgBag): {
  claimed: number
  total: number
} {
  const story = HARBOR_RPG_QUESTS.filter(
    (q) => 'chapter' in q && typeof q.chapter === 'string' && q.chapter.startsWith('ch-'),
  )
  let claimed = 0
  for (const q of story) {
    if (harborRpgQuestClaimed(bag, q.id)) claimed += 1
  }
  return { claimed, total: story.length }
}
