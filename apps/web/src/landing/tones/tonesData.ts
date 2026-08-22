/** Contour control points: x 0→1 through the syllable, y 0 (low) → 1 (high). */
export type TonePoint = { x: number; y: number }

export type ToneDef = {
  n: 1 | 2 | 3 | 4 | 5 | 6
  /** Short ELI5 shape name (English). */
  shapeEn: string
  /** Short ELI5 shape name (粵). */
  shapeZh: string
  han: string
  jp: string
  /** Chao tone letters for display. */
  chao: string
  meaningEn: string
  contour: TonePoint[]
  /** Relative pitch anchors for Web Audio hum (Hz). */
  freqs: number[]
}

/**
 * Classic 詩史試時市是 set — six tones, one syllable family.
 * Contours follow LSHK Chao descriptions (relative, not absolute pitch).
 */
export const TONES: ToneDef[] = [
  {
    n: 1,
    shapeEn: 'High · flat',
    shapeZh: '高 · 平',
    han: '詩',
    jp: 'si1',
    chao: '˥',
    meaningEn: 'poem',
    contour: [
      { x: 0, y: 0.92 },
      { x: 0.5, y: 0.94 },
      { x: 1, y: 0.9 },
    ],
    freqs: [290, 295, 288],
  },
  {
    n: 2,
    shapeEn: 'Climb up',
    shapeZh: '向上爬',
    han: '史',
    jp: 'si2',
    chao: '˧˥',
    meaningEn: 'history',
    contour: [
      { x: 0, y: 0.42 },
      { x: 0.45, y: 0.55 },
      { x: 1, y: 0.92 },
    ],
    freqs: [175, 210, 290],
  },
  {
    n: 3,
    shapeEn: 'Mid · flat',
    shapeZh: '中 · 平',
    han: '試',
    jp: 'si3',
    chao: '˧',
    meaningEn: 'try',
    contour: [
      { x: 0, y: 0.58 },
      { x: 0.5, y: 0.56 },
      { x: 1, y: 0.55 },
    ],
    freqs: [220, 218, 215],
  },
  {
    n: 4,
    shapeEn: 'Drift down',
    shapeZh: '向下沉',
    han: '時',
    jp: 'si4',
    chao: '˨˩',
    meaningEn: 'time',
    contour: [
      { x: 0, y: 0.38 },
      { x: 0.4, y: 0.28 },
      { x: 1, y: 0.12 },
    ],
    freqs: [175, 145, 115],
  },
  {
    n: 5,
    shapeEn: 'Soft climb',
    shapeZh: '輕輕上',
    han: '市',
    jp: 'si5',
    chao: '˩˧',
    meaningEn: 'market',
    contour: [
      { x: 0, y: 0.18 },
      { x: 0.5, y: 0.32 },
      { x: 1, y: 0.48 },
    ],
    freqs: [130, 160, 195],
  },
  {
    n: 6,
    shapeEn: 'Low · flat',
    shapeZh: '低 · 平',
    han: '是',
    jp: 'si6',
    chao: '˨',
    meaningEn: 'is',
    contour: [
      { x: 0, y: 0.28 },
      { x: 0.5, y: 0.26 },
      { x: 1, y: 0.24 },
    ],
    freqs: [155, 152, 148],
  },
]

export const TONE_TWINS = {
  buy: {
    n: 5 as const,
    han: '買',
    jp: 'maai5',
    chao: '˩˧',
    contour: TONES[4]!.contour,
    freqs: [135, 165, 200],
  },
  sell: {
    n: 6 as const,
    han: '賣',
    jp: 'maai6',
    chao: '˨',
    contour: TONES[5]!.contour,
    freqs: [158, 155, 150],
  },
}

/** Smooth SVG path through contour points in a viewBox. */
export function contourPath(
  points: TonePoint[],
  width = 320,
  height = 140,
  padX = 16,
  padY = 18,
): string {
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const coords = points.map((p) => ({
    x: padX + p.x * innerW,
    y: padY + (1 - p.y) * innerH,
  }))
  if (coords.length < 2) return ''
  const [first, ...rest] = coords
  let d = `M ${first!.x.toFixed(1)} ${first!.y.toFixed(1)}`
  for (let i = 0; i < rest.length; i++) {
    const prev = coords[i]!
    const curr = rest[i]!
    const cpx = (prev.x + curr.x) / 2
    d += ` Q ${cpx.toFixed(1)} ${prev.y.toFixed(1)} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`
  }
  return d
}
