/** Sample source text / background colors from a camera still (Google Translate–style). */

export type Rgb = { r: number; g: number; b: number }

export type RegionColors = { bg: Rgb; fg: Rgb }

export function rgbCss(c: Rgb, alpha = 1): string {
  if (alpha >= 1) return `rgb(${c.r|0},${c.g|0},${c.b|0})`
  return `rgba(${c.r|0},${c.g|0},${c.b|0},${alpha})`
}

export function luminance(c: Rgb): number {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255
}

/** Pick black or white text when sampled foreground is too close to the background. */
export function contrastInk(bg: Rgb): Rgb {
  return luminance(bg) > 0.55 ? { r: 18, g: 18, b: 20 } : { r: 248, g: 248, b: 246 }
}

function dist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

function medianChannel(values: number[]): number {
  if (!values.length) return 128
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
}

function medianRgb(samples: Rgb[]): Rgb {
  if (!samples.length) return { r: 240, g: 240, b: 240 }
  return {
    r: medianChannel(samples.map((s) => s.r)),
    g: medianChannel(samples.map((s) => s.g)),
    b: medianChannel(samples.map((s) => s.b)),
  }
}

type NormBox = { x: number; y: number; w: number; h: number }

/**
 * Estimate background (border) and foreground (ink) colors inside a normalized box.
 * Border ring ≈ scene/sign fill; interior pixels far from that fill ≈ original glyphs.
 */
export function sampleRegionColors(
  imageData: ImageData,
  box: NormBox,
): RegionColors {
  const { width: iw, height: ih, data } = imageData
  const x0 = Math.max(0, Math.floor(box.x * iw))
  const y0 = Math.max(0, Math.floor(box.y * ih))
  const x1 = Math.min(iw, Math.ceil((box.x + box.w) * iw))
  const y1 = Math.min(ih, Math.ceil((box.y + box.h) * ih))
  const bw = Math.max(1, x1 - x0)
  const bh = Math.max(1, y1 - y0)

  const border: Rgb[] = []
  const interior: Rgb[] = []
  const borderFrac = 0.18
  const step = Math.max(1, Math.floor(Math.min(bw, bh) / 28))

  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * iw + x) * 4
      const px: Rgb = { r: data[i]!, g: data[i + 1]!, b: data[i + 2]! }
      const u = (x - x0) / bw
      const v = (y - y0) / bh
      const onBorder =
        u <= borderFrac || u >= 1 - borderFrac || v <= borderFrac || v >= 1 - borderFrac
      if (onBorder) border.push(px)
      else interior.push(px)
    }
  }

  const bg = medianRgb(border.length ? border : interior)
  const inkish = interior.filter((p) => dist2(p, bg) > 45 * 45)
  let fg = inkish.length >= 4 ? medianRgb(inkish) : contrastInk(bg)

  // Ensure readable contrast against the sampled background.
  if (dist2(fg, bg) < 55 * 55) {
    fg = contrastInk(bg)
  }

  return { bg, fg }
}

/** Decode a data-URL / blob URL still and sample colors for each normalized region. */
export async function sampleColorsFromImageUrl(
  url: string,
  boxes: NormBox[],
): Promise<RegionColors[]> {
  if (!boxes.length) return []
  const img = await loadImage(url)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) {
    return boxes.map(() => ({
      bg: { r: 245, g: 245, b: 240 },
      fg: { r: 18, g: 18, b: 20 },
    }))
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return boxes.map(() => ({
      bg: { r: 245, g: 245, b: 240 },
      fg: { r: 18, g: 18, b: 20 },
    }))
  }
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, w, h)
  return boxes.map((box) => sampleRegionColors(data, box))
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode capture still'))
    img.src = url
  })
}
