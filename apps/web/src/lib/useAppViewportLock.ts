import { useEffect } from 'react'

/**
 * Native-app viewport lock for `#/app` only.
 * Locks document scroll / rubber-band on html+body.
 * Does not resize for the soft keyboard — shell stays on `100dvh`.
 */
export function useAppViewportLock(active = true) {
  useEffect(() => {
    if (!active) return

    const root = document.documentElement
    const body = document.body
    root.classList.add('yue-app-lock')

    return () => {
      root.classList.remove('yue-app-lock')
      // Landing / marketing pages scroll normally again.
      body.style.removeProperty('position')
      body.style.removeProperty('top')
      body.style.removeProperty('width')
    }
  }, [active])
}
