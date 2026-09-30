/**
 * A short scene after a path section clears.
 * Turns reuse lines the learner already passed. No new deck.
 */
import { WUXIA_CHAPTERS } from './practicePartnerMapLayout'

export function scenePlaceFor(category: string) {
  return WUXIA_CHAPTERS.find((row) => row.id === category) ?? null
}

/** Four to six turns. Fewer saved lines still cycle up to four. */
export function sceneTurnCount(lineCount: number): number {
  if (lineCount <= 0) return 0
  return Math.min(6, Math.max(4, lineCount))
}

export function sceneLineAt<T>(lines: readonly T[], turn: number): T | null {
  if (!lines.length || turn < 0) return null
  return lines[turn % lines.length] ?? null
}
