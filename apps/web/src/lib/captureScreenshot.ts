/**
 * Best-effort viewport capture for optional bug-report screenshots.
 *
 * Uses `modern-screenshot` (not html-to-image’s SVG foreignObject clone alone),
 * with capture-safe styles so dock controls / glass layers don’t double-paint.
 */

function isAppleWebKit(): boolean {
  if (typeof navigator === 'undefined') return false
  return /AppleWebKit/i.test(navigator.userAgent) && !/Chrom(e|ium)|CriOS|Edg/i.test(navigator.userAgent)
}

function hideBugUiForCapture(): Array<() => void> {
  const restores: Array<() => void> = []
  for (const el of document.querySelectorAll<HTMLElement>(
    '.bug-report-overlay, .bug-report-panel, .bug-report-backdrop',
  )) {
    const prev = el.style.display
    el.style.display = 'none'
    restores.push(() => {
      el.style.display = prev
    })
  }
  return restores
}

function markCapturing(): () => void {
  const root = document.documentElement
  root.classList.add('is-bug-capturing')
  return () => root.classList.remove('is-bug-capturing')
}

function waitFrames(n = 2): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => {
      if (left <= 0) resolve()
      else requestAnimationFrame(() => step(left - 1))
    }
    step(n)
  })
}

/** Strip effects that SVG foreignObject clones paint incorrectly. */
function sanitizeClone(cloned: Node) {
  if (!(cloned instanceof HTMLElement) && !(cloned instanceof SVGElement)) return
  const el = cloned as HTMLElement
  el.style.setProperty('animation', 'none', 'important')
  el.style.setProperty('transition', 'none', 'important')
  el.style.setProperty('backdrop-filter', 'none', 'important')
  el.style.setProperty('-webkit-backdrop-filter', 'none', 'important')
  el.style.setProperty('filter', 'none', 'important')
  el.style.setProperty('mix-blend-mode', 'normal', 'important')
  el.style.setProperty('text-shadow', 'none', 'important')

  // Hidden radios with position:absolute confuse clone layout (Direction row overlap).
  if (el.matches?.('input[type="radio"], input[type="checkbox"]')) {
    el.style.setProperty('position', 'static', 'important')
    el.style.setProperty('opacity', '0', 'important')
    el.style.setProperty('width', '0', 'important')
    el.style.setProperty('height', '0', 'important')
    el.style.setProperty('margin', '0', 'important')
    el.style.setProperty('padding', '0', 'important')
    el.style.setProperty('pointer-events', 'none', 'important')
  }

  if (el.classList?.contains('dir-switch')) {
    el.style.setProperty('position', 'relative', 'important')
    el.style.setProperty('transform', 'none', 'important')
    el.style.setProperty('display', 'flex', 'important')
  }

  if (el.classList?.contains('opt-cell') || el.classList?.contains('opt-dir')) {
    el.style.setProperty('display', 'flex', 'important')
    el.style.setProperty('flex-direction', 'column', 'important')
    el.style.setProperty('align-items', 'center', 'important')
    el.style.setProperty('gap', '4px', 'important')
    el.style.setProperty('transform', 'none', 'important')
  }
}

function shouldIncludeNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return true
  if (node.classList.contains('bug-report-overlay')) return false
  if (node.classList.contains('bug-report-panel')) return false
  if (node.classList.contains('bug-report-backdrop')) return false
  if (node.classList.contains('jp-pop')) return false
  if (node.classList.contains('jg-grain')) return false
  if (node.classList.contains('jade-glass-field')) return false
  if (node.classList.contains('app-cloth-bg')) return false
  if (node.tagName === 'CANVAS') return false
  if (node.tagName === 'VIDEO') return false
  return true
}

async function compressJpegDataUrl(dataUrl: string, maxChars: number): Promise<string | null> {
  if (dataUrl.length <= maxChars) return dataUrl
  const img = new Image()
  img.decoding = 'async'
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('image load failed'))
  })
  img.src = dataUrl
  await loaded

  const canvas = document.createElement('canvas')
  let scale = 1
  let quality = 0.72
  for (let attempt = 0; attempt < 6; attempt++) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#07131f'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const next = canvas.toDataURL('image/jpeg', quality)
    if (next.length <= maxChars) return next
    quality = Math.max(0.45, quality - 0.1)
    scale = Math.max(0.45, scale * 0.85)
  }
  return null
}

/**
 * Capture the visible app viewport as a JPEG data URL.
 * Avoids forcing clone layout styles (those made captures look like a “redraw”).
 */
export async function captureAppScreenshot(): Promise<string | null> {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null

  const restores = hideBugUiForCapture()
  const unmark = markCapturing()

  try {
    await waitFrames(3)
    // Let Safari paint after hiding the modal + applying capture CSS.
    if (isAppleWebKit()) await new Promise((r) => setTimeout(r, 120))

    const { domToJpeg } = await import('modern-screenshot')
    const target =
      (document.querySelector('.app-shell') as HTMLElement | null) ||
      (document.getElementById('root') as HTMLElement | null) ||
      document.body

    const width = Math.max(1, Math.round(window.innerWidth))
    const height = Math.max(1, Math.round(window.innerHeight))
    const bg =
      getComputedStyle(document.body).backgroundColor ||
      getComputedStyle(target).backgroundColor ||
      '#07131f'

    const opts = {
      quality: 0.9,
      // High DPR + foreignObject often double-paints text on mobile WebKit.
      scale: Math.min(1.5, window.devicePixelRatio || 1),
      width,
      height,
      backgroundColor: bg,
      drawImageInterval: isAppleWebKit() ? 250 : 100,
      filter: shouldIncludeNode,
      onCloneEachNode: sanitizeClone,
    }

    // Safari often returns an incomplete first paint — warm up, then capture.
    if (isAppleWebKit()) {
      try {
        await domToJpeg(target, opts)
      } catch {
        /* warm-up only */
      }
      await waitFrames(2)
      await new Promise((r) => setTimeout(r, 80))
    }

    const raw = await domToJpeg(target, opts)
    if (!raw || raw.length < 2_000) return null

    // Cap payload (~450KB encoded) for API body limits.
    return compressJpegDataUrl(raw, 600_000)
  } catch {
    // Fallback: previous html-to-image path without layout-breaking style overrides.
    try {
      const { toJpeg } = await import('html-to-image')
      const target =
        (document.querySelector('.app-shell') as HTMLElement | null) ||
        (document.getElementById('root') as HTMLElement | null) ||
        document.body
      const bg =
        getComputedStyle(document.body).backgroundColor ||
        getComputedStyle(target).backgroundColor ||
        '#07131f'
      const raw = await toJpeg(target, {
        quality: 0.82,
        pixelRatio: Math.min(1.5, window.devicePixelRatio || 1),
        cacheBust: true,
        skipFonts: true,
        backgroundColor: bg,
        filter: shouldIncludeNode,
      })
      if (!raw || raw.length < 2_000) return null
      return compressJpegDataUrl(raw, 600_000)
    } catch {
      return null
    }
  } finally {
    unmark()
    for (const restore of restores) restore()
  }
}
