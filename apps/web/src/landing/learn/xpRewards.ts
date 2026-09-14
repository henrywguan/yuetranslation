import type { HarborLevel } from './curriculum'
import type { HarborProgress } from './progressMerge'

/** Base XP for clearing a pier the first time. */
export function missionBaseXp(level: HarborLevel): number {
  // Intro is lighter; later chapters scale with chapter + step count.
  const chapterBoost = Math.max(0, level.chapter) * 25
  const stepBoost = Math.max(1, level.steps.length) * 12
  return 80 + chapterBoost + stepBoost
}

/**
 * XP awarded for completing a mission.
 * First clear → full base; every repeat → 50% of base (floored).
 */
export function missionXpAward(baseXp: number, priorClears: number): number {
  const base = Math.max(0, Math.floor(baseXp))
  if (priorClears <= 0) return base
  return Math.floor(base * 0.5)
}

export function priorMissionClears(progress: HarborProgress, levelId: string): number {
  return progress.missionClears[levelId] ?? 0
}

/** Soft sailor level from lifetime XP (cosmetic). */
export function sailorLevelFromXp(xp: number): number {
  const n = Math.max(0, Math.floor(xp))
  return Math.floor(Math.sqrt(n / 100)) + 1
}
