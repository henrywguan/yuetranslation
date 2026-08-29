/** Best-effort viewport capture for optional bug-report screenshots. */
export async function captureAppScreenshot(): Promise<string | null> {
  if (typeof document === 'undefined') return null

  const overlay = document.querySelector('.bug-report-overlay') as HTMLElement | null
  const prevVisibility = overlay?.style.visibility
  if (overlay) overlay.style.visibility = 'hidden'

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    const { toJpeg } = await import('html-to-image')
    const target =
      (document.querySelector('.app-shell') as HTMLElement | null) ||
      (document.getElementById('root') as HTMLElement | null) ||
      document.body

    const dataUrl = await toJpeg(target, {
      quality: 0.55,
      pixelRatio: Math.min(1.25, window.devicePixelRatio || 1),
      cacheBust: true,
      skipFonts: true,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true
        return !node.classList.contains('bug-report-overlay')
      },
    })

    // Cap payload size (~450KB) — drop if still too large.
    if (dataUrl.length > 600_000) return null
    return dataUrl
  } catch {
    return null
  } finally {
    if (overlay) overlay.style.visibility = prevVisibility || ''
  }
}
