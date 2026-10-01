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

const PATH_CATEGORIES = ['common', 'foods', 'animals', 'expert'] as const

/** Start a scene from lines already kept. A section stamp is not required. */
export function keptSceneBundle<T extends { category: string }>(lines: readonly T[]) {
  const pathLines = lines.filter((row) =>
    (PATH_CATEGORIES as readonly string[]).includes(row.category),
  )
  const pool = pathLines.length ? pathLines : lines
  if (!pool.length) return null
  const category = pathLines.length ? pathLines[pathLines.length - 1]?.category || 'common' : 'common'
  const picked = pool.filter((row) => row.category === category)
  const use = (picked.length ? picked : pool).slice(-12)
  const place = scenePlaceFor(category)
  return {
    category,
    placeEn: place?.placeEn || 'The road',
    placeZh: place?.placeZh || '路上',
    lines: use,
  }
}
