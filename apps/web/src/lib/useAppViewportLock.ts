import { useEffect } from 'react'

/**
 * Native-app viewport lock for `#/app` only.
 * - Locks document scroll / rubber-band on html+body
 * - Tracks `visualViewport` so the soft keyboard shrinks the shell instead of pushing the page
 */
export function useAppViewportLock(active = true) {
  useEffect(() => {
    if (!active) return

    const root = document.documentElement
    const body = document.body
    root.classList.add('yue-app-lock')

    const sync = () => {
      const vv = window.visualViewport
      const height = Math.max(1, Math.round(vv?.height ?? window.innerHeight))
      const top = Math.max(0, Math.round(vv?.offsetTop ?? 0))
      root.style.setProperty('--app-vvh', `${height}px`)
      root.style.setProperty('--app-vv-top', `${top}px`)
    }

    sync()
    const vv = window.visualViewport
    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)

    return () => {
      root.classList.remove('yue-app-lock')
      root.style.removeProperty('--app-vvh')
      root.style.removeProperty('--app-vv-top')
      vv?.removeEventListener('resize', sync)
      vv?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      // Landing / marketing pages scroll normally again.
      body.style.removeProperty('position')
      body.style.removeProperty('top')
      body.style.removeProperty('width')
    }
  }, [active])
}
