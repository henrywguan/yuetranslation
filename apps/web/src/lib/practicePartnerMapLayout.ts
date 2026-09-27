/**
 * Scrolls on the Ink Road — a tall wuxia practice scroll.
 * Positions are 0–1 from the lantern gate (top) to the cloud terrace (bottom).
 */
import {
  PATH_LESSONS_PER_UNIT,
  PATH_UNIT_LABELS,
  PRACTICE_PARTNER_PATH_SECTIONS,
  type PathCategory,
  type PathFresh,
  type PathUnitId,
  type PracticePartnerPathState,
} from './practicePartnerPath'

/** Layer height relative to the viewport frame. Long enough that lesson stops have room between them. */
export const PARTNER_MAP_HEIGHT = 6.2

const LESSONS_PER_CHAPTER = PATH_LESSONS_PER_UNIT * 3

/**
 * Hanging-scroll size. The painting fills the frame width and runs
 * PARTNER_MAP_HEIGHT screens so the road can be dragged top to bottom.
 */
export function partnerMapLayerSize(frameW: number, frameH: number): { w: number; h: number } {
  return { w: frameW, h: frameH * PARTNER_MAP_HEIGHT }
}

export const WUXIA_CHAPTERS = [
  {
    id: 'common' as const,
    placeEn: 'Lantern Gate',
    placeZh: '山門',
    plaqueX: 0.2,
    sealed: 'The stone gate is still ink. Speak, and the lanterns find their color.',
    stirring: 'Lanterns are waking along the gate.',
    open: 'The gate is open. Your first words stay lit.',
  },
  {
    id: 'foods' as const,
    placeEn: 'Night Market',
    placeZh: '夜市',
    plaqueX: 0.8,
    sealed: 'Further down the scroll, a market waits under grey awnings.',
    stirring: 'Steam is returning to the stalls.',
    open: 'The night market knows your order.',
  },
  {
    id: 'animals' as const,
    placeEn: 'Bamboo Wilds',
    placeZh: '竹林',
    plaqueX: 0.2,
    sealed: 'A bamboo sea lies further on, still asleep in the ink.',
    stirring: 'The grove is remembering its greens.',
    open: 'The wilds answer when you name them.',
  },
  {
    id: 'expert' as const,
    placeEn: 'Cloud Terrace',
    placeZh: '雲臺',
    plaqueX: 0.8,
    sealed: 'Above the last cloud, a terrace has not yet been drawn.',
    stirring: 'The pavilion is taking on cinnabar and gold.',
    open: 'You reached the terrace. The words are yours.',
  },
] as const

export function practicePartnerChapterReveal(
  state: PracticePartnerPathState,
  id: PathCategory,
): number {
  const units = state.units[id]
  const filled = (units?.[0] ?? 0) + (units?.[1] ?? 0) + (units?.[2] ?? 0)
  return Math.max(0, Math.min(1, filled / LESSONS_PER_CHAPTER))
}

/** Story line for the chapter the learner is standing in. */
export function practicePartnerChapterTale(
  state: PracticePartnerPathState,
  id: PathCategory,
): string {
  const chapter = WUXIA_CHAPTERS.find((row) => row.id === id) ?? WUXIA_CHAPTERS[0]
  const reveal = practicePartnerChapterReveal(state, id)
  if (reveal >= 1) return chapter.open
  if (reveal > 0) return chapter.stirring
  return chapter.sealed
}

export type PartnerMapScroll = {
  id: string
  category: PathCategory
  unit: PathUnitId
  index: number
  x: number
  y: number
  colored: boolean
  fresh: boolean
  cefr: string
  mark: string
  title: string
}

export type PartnerMapRegion = {
  id: PathCategory
  cefr: string
  labelEn: string
  labelZh: string
  placeEn: string
  placeZh: string
  x: number
  y: number
}

/**
 * One stop per lesson, alternating sides of the road.
 * Left-hand chapters keep the plaque on the left, so the path runs to the right, and the reverse.
 */
const BANDS: { y0: number; y1: number; xA: number; xB: number }[] = [
  { y0: 0.045, y1: 0.255, xA: 0.46, xB: 0.74 },
  { y0: 0.295, y1: 0.505, xA: 0.26, xB: 0.54 },
  { y0: 0.545, y1: 0.755, xA: 0.46, xB: 0.74 },
  { y0: 0.79, y1: 0.968, xA: 0.26, xB: 0.54 },
]

function clamp01(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

export function practicePartnerMapRegions(): PartnerMapRegion[] {
  return PRACTICE_PARTNER_PATH_SECTIONS.map((section, i) => {
    const band = BANDS[i] ?? BANDS[0]!
    const chapter = WUXIA_CHAPTERS[i] ?? WUXIA_CHAPTERS[0]
    return {
      id: section.id,
      cefr: section.cefr,
      labelEn: section.labelEn,
      labelZh: section.labelZh,
      placeEn: chapter.placeEn,
      placeZh: chapter.placeZh,
      x: chapter.plaqueX,
      y: band.y0,
    }
  })
}

export function practicePartnerMapScrolls(
  state: PracticePartnerPathState,
  fresh: PathFresh | null = null,
): PartnerMapScroll[] {
  const out: PartnerMapScroll[] = []
  PRACTICE_PARTNER_PATH_SECTIONS.forEach((section, sectionIndex) => {
    const band = BANDS[sectionIndex] ?? BANDS[0]!
    const units = state.units[section.id]
    const chapter = WUXIA_CHAPTERS[sectionIndex] ?? WUXIA_CHAPTERS[0]
    const lessonCount = PATH_LESSONS_PER_UNIT * 3
    for (let lesson = 0; lesson < lessonCount; lesson += 1) {
      const unit = Math.floor(lesson / PATH_LESSONS_PER_UNIT) as PathUnitId
      const index = lesson % PATH_LESSONS_PER_UNIT
      const t = lesson / (lessonCount - 1)
      const y = clamp01(band.y0 + (band.y1 - band.y0) * (0.08 + t * 0.86), 0.04, 0.97)
      const x = clamp01(lesson % 2 === 0 ? band.xA : band.xB, 0.18, 0.82)
      const filled = units[unit] ?? 0
      out.push({
        id: `${section.id}-${unit}-${index}`,
        category: section.id,
        unit,
        index,
        x,
        y,
        colored: index < filled,
        fresh: Boolean(
          fresh && fresh.category === section.id && fresh.unit === unit && fresh.index === index,
        ),
        cefr: section.cefr,
        mark: chapter.placeZh.slice(0, 1),
        title: `${chapter.placeEn} · ${section.labelEn} · ${PATH_UNIT_LABELS[unit]} · ${index + 1} of ${PATH_LESSONS_PER_UNIT}`,
      })
    }
  })
  return out
}

/** Y of a section's first scroll, for opening the map already looking at “next”. */
export function practicePartnerMapFocusY(category: PathCategory): number {
  const scrolls = practicePartnerMapScrolls({
    units: {
      common: [0, 0, 0],
      foods: [0, 0, 0],
      animals: [0, 0, 0],
      expert: [0, 0, 0],
    },
    mastery: 0,
  })
  return scrolls.find((row) => row.category === category)?.y ?? 0.1
}
