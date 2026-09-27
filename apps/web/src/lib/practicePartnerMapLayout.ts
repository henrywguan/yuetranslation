/**
 * Scroll markers on the Practice Partner voyage map.
 * Positions are 0–1 over a tall chart (top = A1, bottom = Guan / B2).
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

/** Layer height relative to the viewport frame. Tall enough to drag like a phone. */
export const PARTNER_MAP_HEIGHT = 2.45

/** Two 16:9 continent paintings, slightly overlapped. Height ÷ width of the chart. */
const STACK_H_OVER_W = (9 / 16) * (2 - 0.08)

/**
 * Painted chart size in pixels. Always at least PARTNER_MAP_HEIGHT screens tall,
 * and wide enough that each continent keeps its 16:9 frame.
 */
export function partnerMapLayerSize(frameW: number, frameH: number): { w: number; h: number } {
  const h = Math.max(frameH * PARTNER_MAP_HEIGHT, frameW * STACK_H_OVER_W)
  return { w: h / STACK_H_OVER_W, h }
}

export const PARTNER_MAP_VOYAGE_ART = '/assets/harbor-quest/world-map/harbor-continent-voyage.png'
export const PARTNER_MAP_GUAN_ART = '/assets/harbor-quest/world-map/harbor-continent-guan.png'

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
  x: number
  y: number
}

/** Voyage painting is the top half; Guan harbor is the bottom half. */
const BANDS: { y0: number; y1: number }[] = [
  { y0: 0.07, y1: 0.24 },
  { y0: 0.28, y1: 0.46 },
  { y0: 0.56, y1: 0.74 },
  { y0: 0.78, y1: 0.94 },
]

function clamp01(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

export function practicePartnerMapRegions(): PartnerMapRegion[] {
  return PRACTICE_PARTNER_PATH_SECTIONS.map((section, i) => {
    const band = BANDS[i] ?? BANDS[0]!
    return {
      id: section.id,
      cefr: section.cefr,
      labelEn: section.labelEn,
      labelZh: section.labelZh,
      x: 0.5,
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
    for (let unit = 0; unit < 3; unit += 1) {
      const unitId = unit as PathUnitId
      const ut = unit / 2
      const y = band.y0 + (band.y1 - band.y0) * (0.28 + ut * 0.64)
      const sway = Math.sin((sectionIndex * 3 + unit) * 1.15) * 0.05
      const xMid = 0.5 + sway
      const filled = units[unitId] ?? 0
      for (let index = 0; index < PATH_LESSONS_PER_UNIT; index += 1) {
        const x = clamp01(xMid + (index - 1.5) * 0.078, 0.1, 0.9)
        const yk = clamp01(y + (index % 2 === 0 ? -0.007 : 0.007), 0.04, 0.97)
        out.push({
          id: `${section.id}-${unit}-${index}`,
          category: section.id,
          unit: unitId,
          index,
          x,
          y: yk,
          colored: index < filled,
          fresh: Boolean(
            fresh &&
              fresh.category === section.id &&
              fresh.unit === unitId &&
              fresh.index === index,
          ),
          cefr: section.cefr,
          mark: section.labelZh.slice(0, 1),
          title: `${section.labelEn} · ${PATH_UNIT_LABELS[unitId]} · ${index + 1} of ${PATH_LESSONS_PER_UNIT}`,
        })
      }
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
