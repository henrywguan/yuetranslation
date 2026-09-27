/**
 * Practice Partner course path.
 * A Harbor Score from 0–160, paced like A1–B2, then a short advanced tail.
 * Four sections (the decks, in teaching order). Each section has three units.
 * A unit is four lesson circles. A pass fills one circle for that rung.
 * Score follows the path in order. Later circles are kept until you arrive.
 * This is a practice scale, not a formal CEFR exam.
 */

import type { PracticePartnerMove } from './practicePartnerLadder'

export const PRACTICE_PARTNER_PATH_KEY = 'yue-practice-partner-path-v1'
export const PATH_LESSONS_PER_UNIT = 4
export const PATH_SCORE_MAX = 160
/** Extra finishes after B2, so 129 + 31 = 160. */
export const PATH_MASTERY_MAX = 31

export const PATH_CATEGORIES = ['common', 'foods', 'animals', 'expert'] as const
export type PathCategory = (typeof PATH_CATEGORIES)[number]

export type PathUnits = [number, number, number]

export type PracticePartnerPathState = {
  units: Record<PathCategory, PathUnits>
  mastery: number
}

export type PathUnitId = 0 | 1 | 2

export const PATH_UNIT_LABELS = ['With me', 'From memory', 'Finish'] as const

export const PRACTICE_PARTNER_PATH_SECTIONS = [
  {
    id: 'common' as const,
    labelEn: 'Common phrases',
    labelZh: '常用',
    cefr: 'A1',
    band: 'Beginner',
    scoreStart: 0,
    scoreEnd: 29,
    blurb: 'Greetings and the short lines you need for a simple exchange.',
  },
  {
    id: 'foods' as const,
    labelEn: 'Foods',
    labelZh: '食物',
    cefr: 'A2',
    band: 'Everyday',
    scoreStart: 30,
    scoreEnd: 59,
    blurb: 'Familiar topics — order, taste, and getting through a meal.',
  },
  {
    id: 'animals' as const,
    labelEn: 'Animals',
    labelZh: '動物',
    cefr: 'B1',
    band: 'Intermediate',
    scoreStart: 60,
    scoreEnd: 99,
    blurb: 'Name what you see and keep a short description going.',
  },
  {
    id: 'expert' as const,
    labelEn: 'Expert phrases',
    labelZh: '進階',
    cefr: 'B2',
    band: 'Independent',
    scoreStart: 100,
    scoreEnd: 129,
    blurb: 'Longer lines you can carry in most social moments.',
  },
] as const

const SCORE_BANDS = [
  {
    cefr: 'A1',
    label: 'Beginner',
    min: 0,
    max: 29,
    blurb: 'Basic words and greetings. Say the line with 港灣.',
  },
  {
    cefr: 'A2',
    label: 'Everyday',
    min: 30,
    max: 59,
    blurb: 'Familiar topics — food, taste, and the things around you.',
  },
  {
    cefr: 'B1',
    label: 'Intermediate',
    min: 60,
    max: 99,
    blurb: 'Describe what you see and keep a short conversation going.',
  },
  {
    cefr: 'B2',
    label: 'Independent',
    min: 100,
    max: 129,
    blurb: 'Sophisticated lines for most social moments. The course ends here.',
  },
  {
    cefr: 'C1',
    label: 'Advanced',
    min: 130,
    max: 160,
    blurb: 'Past the course. Extra finishes still raise the score.',
  },
] as const

export type PathScoreBand = (typeof SCORE_BANDS)[number]

export type PathCreditNote =
  | { kind: 'unit'; label: string }
  | { kind: 'section'; label: string }
  | { kind: 'mastery'; score: number }

export type PathFresh = {
  category: PathCategory
  unit: PathUnitId
  index: number
}

export type PathCredit = {
  next: PracticePartnerPathState
  note: PathCreditNote | null
  fresh: PathFresh | null
}

function clampInt(raw: unknown, max: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(max, Math.floor(n)))
}

function emptyUnits(): PathUnits {
  return [0, 0, 0]
}

export function emptyPracticePartnerPath(): PracticePartnerPathState {
  return {
    units: {
      common: emptyUnits(),
      foods: emptyUnits(),
      animals: emptyUnits(),
      expert: emptyUnits(),
    },
    mastery: 0,
  }
}

export function isPathCategory(raw: unknown): raw is PathCategory {
  return (PATH_CATEGORIES as readonly string[]).includes(String(raw || ''))
}

export function practicePartnerUnitForMove(move: PracticePartnerMove): PathUnitId {
  if (move === 'repeat') return 0
  if (move === 'finish') return 2
  return 1
}

export function pathLessonsInSection(state: PracticePartnerPathState, id: PathCategory): number {
  const units = state.units[id]
  return units[0] + units[1] + units[2]
}

export function pathSectionLessonCount(): number {
  return PATH_LESSONS_PER_UNIT * 3
}

export function pathSectionComplete(state: PracticePartnerPathState, id: PathCategory): boolean {
  const units = state.units[id]
  return units.every((n) => n >= PATH_LESSONS_PER_UNIT)
}

export function pathComplete(state: PracticePartnerPathState): boolean {
  return PATH_CATEGORIES.every((id) => pathSectionComplete(state, id))
}

export function sanitizePracticePartnerPath(raw: unknown): PracticePartnerPathState {
  const empty = emptyPracticePartnerPath()
  if (!raw || typeof raw !== 'object') return empty
  const row = raw as Record<string, unknown>
  const unitsRaw = row.units
  const units = empty.units
  if (unitsRaw && typeof unitsRaw === 'object') {
    for (const id of PATH_CATEGORIES) {
      const triple = (unitsRaw as Record<string, unknown>)[id]
      if (!Array.isArray(triple)) continue
      units[id] = [
        clampInt(triple[0], PATH_LESSONS_PER_UNIT),
        clampInt(triple[1], PATH_LESSONS_PER_UNIT),
        clampInt(triple[2], PATH_LESSONS_PER_UNIT),
      ]
    }
  }
  return { units, mastery: clampInt(row.mastery, PATH_MASTERY_MAX) }
}

export function harborScore(state: PracticePartnerPathState): number {
  if (pathComplete(state)) {
    return Math.min(PATH_SCORE_MAX, 129 + clampInt(state.mastery, PATH_MASTERY_MAX))
  }
  let score = 0
  for (const section of PRACTICE_PARTNER_PATH_SECTIONS) {
    if (!pathSectionComplete(state, section.id) && pathLessonsInSection(state, section.id) <= 0) {
      break
    }
    const cleared = pathLessonsInSection(state, section.id)
    const total = pathSectionLessonCount()
    if (cleared >= total) {
      score = section.scoreEnd
      continue
    }
    const span = section.scoreEnd - section.scoreStart
    const stepped = Math.floor((cleared / total) * span)
    score = Math.min(section.scoreEnd - 1, section.scoreStart + stepped)
    break
  }
  return score
}

export function bandForHarborScore(score: number): PathScoreBand {
  const s = clampInt(score, PATH_SCORE_MAX)
  for (let i = SCORE_BANDS.length - 1; i >= 0; i -= 1) {
    const band = SCORE_BANDS[i]
    if (band && s >= band.min) return band
  }
  return SCORE_BANDS[0]
}

function clonePath(state: PracticePartnerPathState): PracticePartnerPathState {
  return {
    mastery: state.mastery,
    units: {
      common: [...state.units.common],
      foods: [...state.units.foods],
      animals: [...state.units.animals],
      expert: [...state.units.expert],
    },
  }
}

/** One pass fills the circle for that rung. Score math stays in harborScore. */
export function creditPracticePartnerPath(
  state: PracticePartnerPathState,
  category: unknown,
  move: PracticePartnerMove,
): PathCredit {
  const current = sanitizePracticePartnerPath(state)
  if (!isPathCategory(category)) return { next: current, note: null, fresh: null }
  if (pathComplete(current)) {
    if (current.mastery >= PATH_MASTERY_MAX) return { next: current, note: null, fresh: null }
    const next = clonePath(current)
    next.mastery += 1
    return {
      next,
      note: { kind: 'mastery', score: harborScore(next) },
      fresh: null,
    }
  }
  const unit = practicePartnerUnitForMove(move)
  const filled = current.units[category][unit]
  if (filled >= PATH_LESSONS_PER_UNIT) return { next: current, note: null, fresh: null }
  const next = clonePath(current)
  next.units[category][unit] = filled + 1
  const fresh: PathFresh = { category, unit, index: filled }
  const section = PRACTICE_PARTNER_PATH_SECTIONS.find((row) => row.id === category)
  if (pathSectionComplete(next, category)) {
    return {
      next,
      note: { kind: 'section', label: section?.labelEn || category },
      fresh,
    }
  }
  if (next.units[category][unit] >= PATH_LESSONS_PER_UNIT) {
    return {
      next,
      note: { kind: 'unit', label: PATH_UNIT_LABELS[unit] },
      fresh,
    }
  }
  return { next, note: null, fresh }
}

export function readPracticePartnerPath(): PracticePartnerPathState {
  if (typeof window === 'undefined') return emptyPracticePartnerPath()
  try {
    const raw = localStorage.getItem(PRACTICE_PARTNER_PATH_KEY)
    if (!raw) return emptyPracticePartnerPath()
    return sanitizePracticePartnerPath(JSON.parse(raw))
  } catch {
    return emptyPracticePartnerPath()
  }
}

export function writePracticePartnerPath(state: PracticePartnerPathState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      PRACTICE_PARTNER_PATH_KEY,
      JSON.stringify(sanitizePracticePartnerPath(state)),
    )
  } catch {
    /* private mode */
  }
}

/** First section that still has an open circle. */
export function pathFocusSection(state: PracticePartnerPathState): PathCategory {
  for (const section of PRACTICE_PARTNER_PATH_SECTIONS) {
    if (!pathSectionComplete(state, section.id)) return section.id
  }
  return 'expert'
}
