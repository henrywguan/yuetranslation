/** Best-effort viewport capture for optional bug-report screenshots. */

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

/**
 * Capture what the user actually sees: the layout viewport of `.app-shell`
 * (or `#root`), not a scrolled full-document dump. Tuned for mobile Safari
 * where html-to-image often washes out or crops incorrectly.
 */
export async function captureAppScreenshot(): Promise<string | null> {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null

  const restores = hideBugUiForCapture()

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    const { toJpeg } = await import('html-to-image')
    const target =
      (document.querySelector('.app-shell') as HTMLElement | null) ||
      (document.getElementById('root') as HTMLElement | null) ||
      document.body

    const width = Math.max(1, Math.round(window.innerWidth || target.clientWidth || 390))
    const height = Math.max(1, Math.round(window.innerHeight || target.clientHeight || 844))
    const bg =
      getComputedStyle(document.body).backgroundColor ||
      getComputedStyle(target).backgroundColor ||
      '#07131f'

    const dataUrl = await toJpeg(target, {
      quality: 0.72,
      pixelRatio: Math.min(2, window.devicePixelRatio || 1),
      cacheBust: true,
      // Keep webfonts when possible so Cantonese glyphs match the live UI.
      skipFonts: false,
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      backgroundColor: bg,
      style: {
        // Pin capture to the visible viewport (avoids tall scrolled clones).
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        transform: 'none',
      },
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true
        if (node.classList.contains('bug-report-overlay')) return false
        if (node.classList.contains('bug-report-panel')) return false
        if (node.classList.contains('bug-report-backdrop')) return false
        return true
      },
    })

    // Cap payload size (~450KB encoded) — drop if still too large.
    if (dataUrl.length > 600_000) return null
    return dataUrl
  } catch {
    return null
  } finally {
    for (const restore of restores) restore()
  }
}
